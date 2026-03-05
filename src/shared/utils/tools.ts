// -*- coding: utf-8 -*-

import { Logger } from "./logger";

declare const unsafeWindow: Window & Record<string, unknown>;
declare const GM_getValue:
  | (<T = unknown>(key: string, defaultValue?: T) => T)
  | undefined;
declare const GM_setValue:
  | (<T = unknown>(key: string, value: T) => void)
  | undefined;

export type SalaryType = "month" | "day" | "hour";
export type SalaryFilterType = "1" | "2" | string;

export interface AiConfigExt {
  currentConfig: {
    provider: number;
    modelName: string;
  };
  memoryProfiles: Record<string, unknown>;
  promptPresetStore: {
    global: unknown[];
    personal: Record<string, unknown>;
  };
  uiLayout: {
    style: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AiDeliveryJudgeConfig {
  enabled: boolean;
  prompt: string;
  extraPrompt: string;
  includeUserProfile: boolean;
  includeTraditionalSnapshot: boolean;
  onAiError: "reject" | "fallback-traditional";
  onInvalidResult: "reject" | "fallback-traditional";
}

export const DEFAULT_AI_DELIVERY_JUDGE_PROMPT =
  "你是求职投递决策助手。请先检查硬性约束（排除关键词/排除公司/薪资明显不符/信息不足），任一命中则返回 match=false；再基于候选人匹配卡与岗位匹配卡评估职能、行业、技能、经验、学历、城市匹配度。仅输出一行JSON：{\"match\":true|false,\"reason\":\"[CODE] 原因\"}，其中 CODE 建议使用 MATCH、DOMAIN_MISMATCH、SKILL_MISMATCH、LEVEL_MISMATCH、SALARY_MISMATCH、PREF_CONFLICT、INFO_MISSING。";

const DEFAULT_AI_DELIVERY_JUDGE_CONFIG: AiDeliveryJudgeConfig = {
  enabled: true,
  prompt: DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
  extraPrompt: "",
  includeUserProfile: true,
  includeTraditionalSnapshot: false,
  onAiError: "reject",
  onInvalidResult: "reject"
};

const logger = Logger.rootLogger;
const AI_CONFIG_EXT_STORAGE_KEY = "ai-job-ai-config-ext";
const USER_PROFILE_STORAGE_KEY = "ai-job-user";
const AI_CONFIG_API_KEY_STORAGE_PREFIX = "ai-job-ai-config-key:";
const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : undefined;
const _unsafeWindow =
  (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as unknown as Window & Record<string, unknown>;
const OUTBOUND_HOST_ALLOWLIST_DEFAULT = [
  "zhipin.com",
  "43.138.246.37",
  "api.openai.com",
  "openrouter.ai",
  "api.deepseek.com",
  "api.siliconflow.cn",
  "api.moonshot.cn",
  "ark.cn-beijing.volces.com"
];
const MANUAL_VERIFY_KEYWORDS = [
  "验证码",
  "滑块",
  "人机",
  "安全验证",
  "请完成验证",
  "行为验证",
  "点选验证",
  "拖动",
  "captcha",
  "challenge",
  "verify",
  "geetest",
  "yidun"
];
const MAX_MIGRATION_JSON_SIZE = 512 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStoredJsonString(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (isPlainObject(raw) || Array.isArray(raw)) {
    try {
      return JSON.stringify(raw);
    } catch (_e) {
      return "";
    }
  }
  return "";
}

function hasGmStorageRuntime(): boolean {
  return typeof _GM_getValue === "function" && typeof _GM_setValue === "function";
}

function isSafeDomainText(value: unknown): boolean {
  const host = `${value || ""}`.trim().toLowerCase();
  if (!host || host.length > 120) {
    return false;
  }

  return /^[a-z0-9.-]+$/.test(host) && !host.startsWith(".") && !host.endsWith(".");
}

export class Tools {
  static window: Window & Record<string, unknown> = _unsafeWindow;

  static fuzzyMatch(arr: string[], input: string, emptyStatus: boolean): boolean {
    if (arr.length === 0) {
      return emptyStatus;
    }
    input = input.toLowerCase();
    let emptyEle = false;
    for (let i = 0; i < arr.length; i++) {
      const arrEleStr = arr[i].toLowerCase();
      if (arrEleStr.length === 0) {
        emptyEle = true;
        continue;
      }
      if (arrEleStr.includes(input) || input.includes(arrEleStr)) {
        return true;
      }
    }
    if (emptyEle) {
      return emptyStatus;
    }
    return false;
  }

  static isRangeOverlap(range: string, input: string): boolean {
    const parseRange = (str: string): [number, number] => {
      const match = str.match(/(\d+)(?:\s*-\s*(\d+))?/);
      if (!match) {
        throw new Error("Invalid range format");
      }
      const start = parseFloat(match[1]);
      const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
      return [start, end];
    };
    const [rangeStart, rangeEnd] = parseRange(range);
    const [inputStart, inputEnd] = parseRange(input);
    return !(rangeEnd < inputStart || inputEnd < rangeStart);
  }

  static isSalaryRangeMatched(range: string | null | undefined, input: string | null | undefined): boolean {
    const parseRange = (str: string | null | undefined): [number, number] | null => {
      const match = `${str || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
      if (!match) {
        return null;
      }
      const start = parseFloat(match[1]);
      const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
      return [start, end];
    };
    const rangeParsed = parseRange(range);
    const inputParsed = parseRange(input);
    if (!rangeParsed || !inputParsed) {
      return false;
    }
    const [rangeStart, rangeEnd] = rangeParsed;
    const [inputStart] = inputParsed;
    if (inputStart < rangeStart) {
      return false;
    }
    if (Number.isFinite(rangeEnd) && inputStart > rangeEnd) {
      return false;
    }
    return true;
  }

  static getSalaryType(salaryText: string | null | undefined): SalaryType {
    const text = `${salaryText || ""}`.toLowerCase();
    if (/\/\s*时|时薪|每小时|小时/.test(text)) {
      return "hour";
    }
    if (/\/\s*天|\/\s*日|日薪|每天/.test(text)) {
      return "day";
    }
    if (/k|月薪|\/\s*月|月/.test(text)) {
      return "month";
    }
    return "month";
  }

  static convertSalaryHourToDayRange(salaryText: string | null | undefined): string | null | undefined {
    const match = `${salaryText || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
    if (!match) {
      return salaryText;
    }
    const start = parseFloat(match[1]);
    const end = match[2] ? parseFloat(match[2]) : null;
    const formatNumber = (num: number): string =>
      Number.isInteger(num) ? `${num}` : `${Math.round(num * 100) / 100}`;
    if (end === null) {
      return `${formatNumber(start * 8)}`;
    }
    return `${formatNumber(start * 8)}-${formatNumber(end * 8)}`;
  }

  static isSalaryTypeSupportedForFilter(
    salaryText: string | null | undefined,
    salaryFilterType: SalaryFilterType
  ): boolean {
    const detectedType = Tools.getSalaryType(salaryText);
    if (salaryFilterType === "1") {
      return detectedType === "month";
    }
    if (salaryFilterType === "2") {
      return detectedType === "day" || detectedType === "hour";
    }
    return true;
  }

  static getComparableSalaryRange(
    salaryText: string | null | undefined,
    salaryFilterType: SalaryFilterType
  ): string | null | undefined {
    const detectedType = Tools.getSalaryType(salaryText);
    if (salaryFilterType === "2" && detectedType === "hour") {
      return Tools.convertSalaryHourToDayRange(salaryText);
    }
    return salaryText;
  }

  static buildModelChannelKey(provider: number | string | null | undefined, modelName: string | null | undefined): string {
    return `${provider || 0}:${modelName || ""}`;
  }

  static getAiConfigExt(): AiConfigExt {
    const defaultExt: AiConfigExt = {
      currentConfig: {
        provider: 1,
        modelName: ""
      },
      memoryProfiles: {},
      promptPresetStore: {
        global: [],
        personal: {}
      },
      uiLayout: {
        style: "dashboard-2col"
      }
    };
    try {
      let parsed: Partial<AiConfigExt> | null = null;
      const gmRaw = _GM_getValue?.(AI_CONFIG_EXT_STORAGE_KEY, "") ?? "";
      const normalizedGMRaw = normalizeStoredJsonString(gmRaw);
      if (normalizedGMRaw) {
        if (normalizedGMRaw.length > MAX_MIGRATION_JSON_SIZE) {
          parsed = null;
        } else {
          try {
            const candidate = JSON.parse(normalizedGMRaw) as Partial<AiConfigExt>;
            if (isPlainObject(candidate)) {
              parsed = candidate;
              if (typeof gmRaw !== "string") {
                _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, normalizedGMRaw);
              }
            } else {
              parsed = null;
            }
          } catch (_e) {
            parsed = null;
          }
        }
      }

      if (!parsed) {
        const legacyRaw = localStorage.getItem(AI_CONFIG_EXT_STORAGE_KEY);
        if (legacyRaw && legacyRaw.length <= MAX_MIGRATION_JSON_SIZE) {
          try {
            const candidate = JSON.parse(legacyRaw) as Partial<AiConfigExt>;
            if (isPlainObject(candidate)) {
              parsed = candidate;
              _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, legacyRaw);
              localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
            } else {
              parsed = null;
            }
          } catch (_e) {
            parsed = null;
          }
        }
      }

      if (!parsed) {
        return defaultExt;
      }

      const parsedApiConfigs = Array.isArray((parsed as Record<string, unknown>).apiConfigs)
        ? ((parsed as Record<string, unknown>).apiConfigs as Array<Record<string, unknown>>).map((item) => {
            const id = `${item?.id || ""}`;
            const persistedApiKey = id
              ? `${_GM_getValue?.(`${AI_CONFIG_API_KEY_STORAGE_PREFIX}${id}`, "") || ""}`
              : "";
            const fallbackApiKey = `${item?.apiKey || ""}`;
            return {
              ...item,
              apiKey: persistedApiKey || fallbackApiKey
            };
          })
        : [];
      const parsedTrustedApiHosts = Array.isArray((parsed as Record<string, unknown>).trustedApiHosts)
        ? ((parsed as Record<string, unknown>).trustedApiHosts as unknown[])
            .filter(isSafeDomainText)
            .map((item) => `${item}`.toLowerCase())
        : [];

      return {
        ...defaultExt,
        ...parsed,
        ...(parsedApiConfigs.length ? { apiConfigs: parsedApiConfigs } : {}),
        ...(parsedTrustedApiHosts.length ? { trustedApiHosts: parsedTrustedApiHosts } : {}),
        currentConfig: {
          ...defaultExt.currentConfig,
          ...(parsed?.currentConfig || {})
        },
        promptPresetStore: {
          ...defaultExt.promptPresetStore,
          ...(parsed?.promptPresetStore || {}),
          personal: {
            ...defaultExt.promptPresetStore.personal,
            ...(parsed?.promptPresetStore?.personal || {})
          }
        },
        uiLayout: {
          ...defaultExt.uiLayout,
          ...(parsed?.uiLayout || {})
        }
      };
    } catch (error) {
      logger.warn("读取AI扩展配置失败，使用默认配置", (error as Error | undefined)?.message);
      return defaultExt;
    }
  }

  static saveAiConfigExt(ext: Partial<AiConfigExt>): AiConfigExt {
    const data = {
      ...Tools.getAiConfigExt(),
      ...(ext || {})
    } as AiConfigExt;
    const gmAvailable = hasGmStorageRuntime();

    if (!gmAvailable) {
      localStorage.setItem(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
      return data;
    }

    try {
      const persistedData = { ...data } as Record<string, unknown>;
      if (Array.isArray((persistedData as Record<string, unknown>).apiConfigs)) {
        const sanitizedApiConfigs = ((persistedData as Record<string, unknown>).apiConfigs as Array<Record<string, unknown>>).map((item) => {
          const next = { ...item };
          const id = `${next?.id || ""}`;
          const apiKey = `${next?.apiKey || ""}`;
          if (id && apiKey) {
            _GM_setValue?.(`${AI_CONFIG_API_KEY_STORAGE_PREFIX}${id}`, apiKey);
          }
          if (id) {
            next.apiKey = "";
          }
          return next;
        });
        persistedData.apiConfigs = sanitizedApiConfigs;
      }
      _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(persistedData));
      localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
    } catch (error) {
      logger.warn("写入AI扩展配置到GM存储失败，回退到localStorage", (error as Error | undefined)?.message);
      localStorage.setItem(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
    }

    return data;
  }

  static getCurrentAiModelChannelKey(): string {
    const ext = Tools.getAiConfigExt();
    const currentConfig = ext.currentConfig || { provider: 1, modelName: "" };
    return Tools.buildModelChannelKey(currentConfig.provider, currentConfig.modelName);
  }

  static getRandomNumber(startMs: number, endMs: number): number {
    return Math.floor(Math.random() * (endMs - startMs + 1)) + startMs;
  }

  static getCookieValue(key: string): string | null {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.trim().split("=");
      if (cookieKey === key) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  static parseURL(url: string): { securityId: string | null; jobId: string; lid: string | null } {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/");
    const jobId = pathSegments[2].replace(".html", "");
    const lid = urlObj.searchParams.get("lid");
    const securityId = urlObj.searchParams.get("securityId");
    return {
      securityId,
      jobId,
      lid
    };
  }

  static queryString(baseURL: string, queryParams: Record<string, string | number | boolean>): string {
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    return `${baseURL}?${queryString}`;
  }

  static getCurDay(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static getStoredUserProfileRaw(): string | null {
    const gmRaw = _GM_getValue?.(USER_PROFILE_STORAGE_KEY, "") ?? "";
    const rawFromGM = normalizeStoredJsonString(gmRaw);
    if (rawFromGM) {
      if (rawFromGM.length > MAX_MIGRATION_JSON_SIZE) {
      } else {
        try {
          const parsed = JSON.parse(rawFromGM);
          if (isPlainObject(parsed) && isPlainObject((parsed as Record<string, unknown>).preference || {})) {
            if (typeof gmRaw !== "string") {
              _GM_setValue?.(USER_PROFILE_STORAGE_KEY, rawFromGM);
            }
            return rawFromGM;
          }
        } catch (_e) {
        }
      }
    }

    const legacyRaw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (legacyRaw) {
      if (legacyRaw.length <= MAX_MIGRATION_JSON_SIZE) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (isPlainObject(parsed) && isPlainObject((parsed as Record<string, unknown>).preference || {})) {
            _GM_setValue?.(USER_PROFILE_STORAGE_KEY, legacyRaw);
            localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
            return legacyRaw;
          }
        } catch (_e) {
          // ignore invalid legacy payload
        }
      }
      return null;
    }

    return null;
  }

  static saveStoredUserProfile(profile: unknown): void {
    const serialized = JSON.stringify(profile ?? {});
    if (hasGmStorageRuntime()) {
      try {
        _GM_setValue?.(USER_PROFILE_STORAGE_KEY, serialized);
        localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        return;
      } catch (error) {
        logger.warn("写入用户资料到GM存储失败，回退到localStorage", (error as Error | undefined)?.message);
      }
    }
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, serialized);
  }

  static getAiDeliveryJudgeConfig(preference?: Record<string, unknown>): AiDeliveryJudgeConfig {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    const extCfg = isPlainObject(ext.aiDeliveryJudge) ? (ext.aiDeliveryJudge as Record<string, unknown>) : {};
    const pref = isPlainObject(preference) ? preference : {};

    const normalizeFallbackPolicy = (value: unknown, fallback: "reject" | "fallback-traditional"): "reject" | "fallback-traditional" => {
      return value === "fallback-traditional" || value === "reject" ? value : fallback;
    };

    const enabled =
      typeof extCfg.enabled === "boolean"
        ? extCfg.enabled
        : typeof pref.aiDeliveryJudgeEnabled === "boolean"
          ? (pref.aiDeliveryJudgeEnabled as boolean)
          : typeof pref.aiDeliverJudgeE === "boolean"
            ? (pref.aiDeliverJudgeE as boolean)
          : DEFAULT_AI_DELIVERY_JUDGE_CONFIG.enabled;

    const prompt = `${extCfg.prompt || pref.aiDeliveryJudgePrompt || pref.aiDeliverJudgePrompt || ""}`.trim()
      || DEFAULT_AI_DELIVERY_JUDGE_CONFIG.prompt;
    const extraPrompt = `${extCfg.extraPrompt || pref.aiDeliveryJudgeExtraPrompt || pref.aiDeliverJudgeExtraPrompt || ""}`.trim();
    const includeUserProfile =
      typeof extCfg.includeUserProfile === "boolean"
        ? extCfg.includeUserProfile
        : typeof pref.aiDeliveryJudgeIncludeUserProfile === "boolean"
          ? (pref.aiDeliveryJudgeIncludeUserProfile as boolean)
          : typeof pref.aiDeliverJudgeIncludeUserProfile === "boolean"
            ? (pref.aiDeliverJudgeIncludeUserProfile as boolean)
          : DEFAULT_AI_DELIVERY_JUDGE_CONFIG.includeUserProfile;
    const includeTraditionalSnapshot =
      typeof extCfg.includeTraditionalSnapshot === "boolean"
        ? extCfg.includeTraditionalSnapshot
        : typeof pref.aiDeliveryJudgeIncludeTraditionalSnapshot === "boolean"
          ? (pref.aiDeliveryJudgeIncludeTraditionalSnapshot as boolean)
          : typeof pref.aiDeliverJudgeIncludeTraditionalSnapshot === "boolean"
            ? (pref.aiDeliverJudgeIncludeTraditionalSnapshot as boolean)
          : DEFAULT_AI_DELIVERY_JUDGE_CONFIG.includeTraditionalSnapshot;
    const onAiError = normalizeFallbackPolicy(
      extCfg.onAiError || pref.aiDeliveryJudgeOnAiError || pref.aiDeliverJudgeOnAiError,
      DEFAULT_AI_DELIVERY_JUDGE_CONFIG.onAiError
    );
    const onInvalidResult = normalizeFallbackPolicy(
      extCfg.onInvalidResult || pref.aiDeliveryJudgeOnInvalidResult || pref.aiDeliverJudgeOnInvalidResult,
      DEFAULT_AI_DELIVERY_JUDGE_CONFIG.onInvalidResult
    );

    return {
      enabled,
      prompt,
      extraPrompt,
      includeUserProfile,
      includeTraditionalSnapshot,
      onAiError,
      onInvalidResult
    };
  }

  static saveAiDeliveryJudgeConfig(config: Partial<AiDeliveryJudgeConfig>): AiDeliveryJudgeConfig {
    const current = Tools.getAiDeliveryJudgeConfig();
    const normalizeFallbackPolicy = (value: unknown, fallback: "reject" | "fallback-traditional"): "reject" | "fallback-traditional" => {
      return value === "fallback-traditional" || value === "reject" ? value : fallback;
    };
    const next: AiDeliveryJudgeConfig = {
      enabled: typeof config.enabled === "boolean" ? config.enabled : current.enabled,
      prompt: `${config.prompt || current.prompt || ""}`.trim() || DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
      extraPrompt: `${config.extraPrompt || current.extraPrompt || ""}`.trim(),
      includeUserProfile: typeof config.includeUserProfile === "boolean" ? config.includeUserProfile : current.includeUserProfile,
      includeTraditionalSnapshot:
        typeof config.includeTraditionalSnapshot === "boolean"
          ? config.includeTraditionalSnapshot
          : current.includeTraditionalSnapshot,
      onAiError: normalizeFallbackPolicy(config.onAiError, current.onAiError),
      onInvalidResult: normalizeFallbackPolicy(config.onInvalidResult, current.onInvalidResult)
    };

    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    ext.aiDeliveryJudge = {
      enabled: next.enabled,
      prompt: next.prompt,
      extraPrompt: next.extraPrompt,
      includeUserProfile: next.includeUserProfile,
      includeTraditionalSnapshot: next.includeTraditionalSnapshot,
      onAiError: next.onAiError,
      onInvalidResult: next.onInvalidResult
    };
    Tools.saveAiConfigExt(ext);
    return next;
  }

  static migrateAiDeliveryJudgeConfigFromPreference(preference?: Record<string, unknown>): AiDeliveryJudgeConfig {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    const hasExtConfig = isPlainObject(ext.aiDeliveryJudge);
    if (hasExtConfig) {
      return Tools.getAiDeliveryJudgeConfig(preference);
    }

    const next = Tools.getAiDeliveryJudgeConfig(preference);
    ext.aiDeliveryJudge = {
      enabled: next.enabled,
      prompt: next.prompt,
      extraPrompt: next.extraPrompt,
      includeUserProfile: next.includeUserProfile,
      includeTraditionalSnapshot: next.includeTraditionalSnapshot,
      onAiError: next.onAiError,
      onInvalidResult: next.onInvalidResult
    };
    Tools.saveAiConfigExt(ext);
    return next;
  }

  static getCurrentHostname(): string {
    const hostFromUnsafe = `${Tools.window?.location?.hostname || ""}`.trim();
    if (hostFromUnsafe) {
      return hostFromUnsafe.toLowerCase();
    }
    return `${window.location.hostname || ""}`.trim().toLowerCase();
  }

  static normalizeHostname(hostname: string | null | undefined): string {
    return `${hostname || ""}`.trim().toLowerCase();
  }

  static isPrivateOrLocalHost(hostname: string | null | undefined): boolean {
    const host = Tools.normalizeHostname(hostname);
    if (!host) {
      return true;
    }

    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return true;
    }

    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^0\.0\.0\.0$/.test(host)) {
      return true;
    }

    const match172 = host.match(/^172\.(\d{1,3})\./);
    if (match172) {
      const second = Number(match172[1]);
      if (second >= 16 && second <= 31) {
        return true;
      }
    }

    return false;
  }

  static getTrustedOutboundHosts(extraHosts: string[] = []): string[] {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    const apiConfigHosts = Array.isArray(ext.apiConfigs)
      ? (ext.apiConfigs as Array<Record<string, unknown>>)
          .map((config) => {
            const baseUrl = `${config?.baseUrl || ""}`.trim();
            if (!baseUrl) {
              return "";
            }
            try {
              const parsed = /^https?:\/\//i.test(baseUrl)
                ? new URL(baseUrl)
                : new URL(`https://${baseUrl}`);
              return Tools.normalizeHostname(parsed.hostname);
            } catch (_e) {
              return "";
            }
          })
          .filter((host) => !!host && !Tools.isPrivateOrLocalHost(host))
      : [];
    const customHosts = Array.isArray(ext.trustedApiHosts)
      ? ext.trustedApiHosts.map((host) => Tools.normalizeHostname(`${host || ""}`)).filter(Boolean)
      : [];

    const merged = [...OUTBOUND_HOST_ALLOWLIST_DEFAULT, ...apiConfigHosts, ...customHosts, ...extraHosts]
      .map((host) => Tools.normalizeHostname(host))
      .filter(Boolean);

    return [...new Set(merged)];
  }

  static isAllowedNetworkUrl(url: string, extraHosts: string[] = []): boolean {
    try {
      const parsed = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, window.location.origin);
      if (parsed.protocol !== "https:") {
        return false;
      }

      const host = Tools.normalizeHostname(parsed.hostname);
      if (Tools.isPrivateOrLocalHost(host)) {
        return false;
      }

      const trustedHosts = Tools.getTrustedOutboundHosts(extraHosts);
      return trustedHosts.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
    } catch (_e) {
      return false;
    }
  }

  static ensureAllowedNetworkUrl(url: string, action: string, extraHosts: string[] = []): void {
    if (!Tools.isAllowedNetworkUrl(url, extraHosts)) {
      throw new Error(`${action}目标地址不在受信任白名单中: ${url}`);
    }
  }

  static isManualVerificationText(text: string | null | undefined): boolean {
    const value = `${text || ""}`.trim().toLowerCase();
    if (!value) {
      return false;
    }

    return MANUAL_VERIFY_KEYWORDS.some((keyword) => value.includes(keyword));
  }

  static getManualVerificationReason(): string | null {
    if (!Tools.isBossDomainHost(Tools.getCurrentHostname())) {
      return null;
    }

    const overlaySelectors = [
      ".geetest_panel",
      ".geetest_widget",
      ".yidun_tips",
      ".yidun_modal",
      "[class*='captcha']",
      "[class*='verify']",
      "[class*='risk']",
      "[id*='captcha']",
      "[id*='verify']"
    ];

    for (const selector of overlaySelectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (!element) {
        continue;
      }

      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        continue;
      }

      const text = `${element.textContent || ""}`.trim();
      if (Tools.isManualVerificationText(text) || !!element.querySelector("iframe")) {
        return `检测到验证弹窗(${selector})`;
      }
    }

    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const frame of iframes) {
      const src = `${frame.getAttribute("src") || ""}`;
      if (Tools.isManualVerificationText(src)) {
        return "检测到验证 iframe";
      }
    }

    return null;
  }

  static ensureNoManualVerificationOrThrow(action: string): void {
    const reason = Tools.getManualVerificationReason();
    if (reason) {
      throw new Error(`${action}前检测到人工验证: ${reason}`);
    }
  }

  static isBossDomainHost(hostname: string | null | undefined): boolean {
    const host = Tools.normalizeHostname(hostname);
    return host === "www.zhipin.com" || host === "zhipin.com";
  }

  static isTrustedBossStaticHost(hostname: string | null | undefined): boolean {
    const host = Tools.normalizeHostname(hostname);
    return host === "static.zhipin.com" || Tools.isBossDomainHost(host);
  }

  static isBossDomainUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return Tools.isBossDomainHost(parsed.hostname);
    } catch (_e) {
      return false;
    }
  }

  static isTrustedBossStaticUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return Tools.isTrustedBossStaticHost(parsed.hostname);
    } catch (_e) {
      return false;
    }
  }

  static ensureBossDomainOrThrow(action: string): void {
    const host = Tools.getCurrentHostname();
    if (!Tools.isBossDomainHost(host)) {
      throw new Error(`${action}仅允许在BOSS官方域名执行，当前域名: ${host || "unknown"}`);
    }
  }

  static getSafePageContext(): { token?: string; uid?: string | number } {
    const page = (Tools.window as { _PAGE?: unknown })._PAGE;
    if (!page || typeof page !== "object") {
      return {};
    }

    const raw = page as Record<string, unknown>;
    const token = typeof raw.token === "string" ? raw.token : undefined;
    const uid = typeof raw.uid === "string" || typeof raw.uid === "number" ? raw.uid : undefined;
    return {
      token,
      uid
    };
  }

  static getPageUidString(): string {
    const uid = Tools.getSafePageContext().uid;
    return uid === undefined ? "" : String(uid);
  }

  static getPageToken(): string {
    return `${Tools.getSafePageContext().token || ""}`;
  }

  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static getEndChar(): string {
    return String.fromCharCode(0);
  }
}

/** 提示词变量定义 */
export const PROMPT_VARIABLE_DEFS: Array<{ key: string; label: string; desc: string }> = [
  { key: '岗位名称', label: '{{岗位名称}}', desc: '职位名称，如 前端开发工程师' },
  { key: '公司名称', label: '{{公司名称}}', desc: '公司/品牌名' },
  { key: '薪资范围', label: '{{薪资范围}}', desc: '薪资描述，如 15-25K·14薪' },
  { key: '城市', label: '{{城市}}', desc: '工作城市' },
  { key: '区域', label: '{{区域}}', desc: '行政区' },
  { key: '商圈', label: '{{商圈}}', desc: '商圈/地段' },
  { key: '工作经验', label: '{{工作经验}}', desc: '经验要求，如 3-5年' },
  { key: '学历要求', label: '{{学历要求}}', desc: '学历要求，如 本科' },
  { key: '行业', label: '{{行业}}', desc: '公司所属行业' },
  { key: '公司规模', label: '{{公司规模}}', desc: '公司人数规模' },
  { key: '技能标签', label: '{{技能标签}}', desc: '岗位技能要求' },
  { key: '福利', label: '{{福利}}', desc: '福利待遇列表' },
];

/**
 * 从 jobDetail 构建变量上下文
 * @param jobDetail BOSS 岗位详情对象
 */
export function buildPromptVarsFromJob(jobDetail: Record<string, any> | null | undefined): Record<string, string> {
  if (!jobDetail) return {};
  const arr = (v: unknown): string => Array.isArray(v) ? v.join(', ') : `${v || ''}`;
  return {
    '岗位名称': `${jobDetail.jobName || ''}`,
    '公司名称': `${jobDetail.brandName || ''}`,
    '薪资范围': `${jobDetail.salaryDesc || ''}`,
    '城市': `${jobDetail.cityName || ''}`,
    '区域': `${jobDetail.areaDistrict || ''}`,
    '商圈': `${jobDetail.businessDistrict || ''}`,
    '工作经验': `${jobDetail.jobExperience || ''}`,
    '学历要求': `${jobDetail.jobDegree || ''}`,
    '行业': `${jobDetail.brandIndustry || ''}`,
    '公司规模': `${jobDetail.brandScaleName || ''}`,
    '技能标签': arr(jobDetail.skills),
    '福利': arr(jobDetail.welfareList),
  };
}

/**
 * 替换提示词模板中的 {{变量名}} 占位符
 * @param template 含 {{变量名}} 的模板字符串
 * @param vars 变量名→值映射
 * @returns 替换后的字符串，未匹配的变量保留原样
 */
export function resolvePromptVariables(template: string, vars: Record<string, string>): string {
  if (!template) return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    return trimmed in vars ? vars[trimmed] : match;
  });
}

export const simulateScrollToEnd = async (platform: string): Promise<void> => {
  const isMac = platform === "mac" || navigator.platform.toUpperCase().includes("MAC");
  const modifierKey = isMac ? "Meta" : "Control";
  try {
    const activeElement = document.activeElement;
    const eventOptions = {
      key: "End",
      code: "End",
      [modifierKey.toLowerCase() + "Key"]: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window
    } as KeyboardEventInit;
    const downEvent = new KeyboardEvent("keydown", eventOptions);
    const upEvent = new KeyboardEvent("keyup", eventOptions);
    document.dispatchEvent(downEvent);
    document.dispatchEvent(upEvent);
    if (activeElement) {
      activeElement.dispatchEvent(downEvent);
      activeElement.dispatchEvent(upEvent);
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  } catch (_error) {
    console.warn("键盘事件触发失败，使用备选方案");
  }
  const getMaxScroll = (): number => {
    const documentElement = document.documentElement;
    return (
      Math.max(
        document.body.scrollHeight,
        documentElement.scrollHeight,
        document.body.offsetHeight,
        documentElement.offsetHeight,
        document.body.clientHeight,
        documentElement.clientHeight
      ) - window.innerHeight
    );
  };
  const maxScroll = getMaxScroll();
  if (window.scrollY !== maxScroll) {
    window.scrollTo({
      top: maxScroll,
      behavior: "smooth"
    });
  }
};
