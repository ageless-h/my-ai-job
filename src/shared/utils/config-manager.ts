// -*- coding: utf-8 -*-

/**
 * AI 配置和用户资料管理
 * 负责 AI 配置扩展、用户资料和投递判断配置的读写
 */

import { Logger } from "./logger";

declare const GM_getValue:
  | (<T = unknown>(key: string, defaultValue?: T) => T)
  | undefined;
declare const GM_setValue:
  | (<T = unknown>(key: string, value: T) => void)
  | undefined;
declare const GM_notification:
  | ((options: { title: string; text: string; timeout?: number }) => void)
  | undefined;

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
  focusSkills: string[];
  excludeKeywords: string[];
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
  focusSkills: [],
  excludeKeywords: [],
  includeUserProfile: true,
  includeTraditionalSnapshot: false,
  onAiError: "reject",
  onInvalidResult: "reject"
};

const logger = Logger.rootLogger;
const AI_CONFIG_EXT_STORAGE_KEY = "ai-job-ai-config-ext";
const USER_PROFILE_STORAGE_KEY = "ai-job-user";
const AI_CONFIG_API_KEY_STORAGE_PREFIX = "ai-job-ai-config-key:";
const MAX_MIGRATION_JSON_SIZE = 2 * 1024 * 1024; // 2MB

const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : undefined;

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

/**
 * 构建模型通道键
 * @param provider 提供商 ID
 * @param modelName 模型名称
 * @returns 通道键字符串
 */
export function buildModelChannelKey(provider: number | string | null | undefined, modelName: string | null | undefined): string {
  return `${provider || 0}:${modelName || ""}`;
}

/**
 * 获取 AI 配置扩展
 * @returns AI 配置扩展对象
 */
export function getAiConfigExt(): AiConfigExt {
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
        logger.error('AI配置大小超过限制 (GM storage)', {
          size: normalizedGMRaw.length,
          limit: MAX_MIGRATION_JSON_SIZE,
          sizeKB: (normalizedGMRaw.length / 1024).toFixed(2),
          limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)
        });
        
        // 通知用户
        if (typeof GM_notification !== 'undefined') {
          GM_notification({
            title: 'AI Job Hunting',
            text: `AI配置文件过大(${(normalizedGMRaw.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
            timeout: 15000
          });
        }
        
        // 备份超大配置的前部分用于调试
        if (_GM_setValue) {
          try {
            _GM_setValue(`${AI_CONFIG_EXT_STORAGE_KEY}_oversized_backup`, normalizedGMRaw.slice(0, MAX_MIGRATION_JSON_SIZE));
            logger.info('已备份超大AI配置的前部分到 ai-job-ai-config-ext_oversized_backup');
          } catch (backupError) {
            logger.warn('备份超大AI配置失败', backupError);
          }
        }
        
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
        } catch (parseError) {
          logger.error('AI配置解析失败 (GM storage)', parseError, {
            rawLength: normalizedGMRaw.length,
            rawPreview: normalizedGMRaw.substring(0, 100)
          });
          // 备份损坏的配置
          if (_GM_setValue && normalizedGMRaw) {
            try {
              _GM_setValue(`${AI_CONFIG_EXT_STORAGE_KEY}_corrupted_backup`, normalizedGMRaw);
              logger.info('已备份损坏的AI配置到 ai-job-ai-config-ext_corrupted_backup');
            } catch (backupError) {
              logger.warn('备份损坏的AI配置失败', backupError);
            }
          }
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
        } catch (parseError) {
          logger.error('AI配置解析失败 (localStorage)', parseError, {
            rawLength: legacyRaw.length,
            rawPreview: legacyRaw.substring(0, 100)
          });
          // 备份损坏的配置
          try {
            localStorage.setItem(`${AI_CONFIG_EXT_STORAGE_KEY}_corrupted_backup`, legacyRaw);
            logger.info('已备份损坏的AI配置到 localStorage');
          } catch (backupError) {
            logger.warn('备份损坏的AI配置失败', backupError);
          }
          parsed = null;
        }
      }
    }

    if (!parsed) {
      // 尝试从备份恢复
      if (_GM_getValue) {
        try {
          const backup = _GM_getValue(`${AI_CONFIG_EXT_STORAGE_KEY}_backup`, '');
          if (backup) {
            const normalizedBackup = normalizeStoredJsonString(backup);
            if (normalizedBackup && normalizedBackup.length <= MAX_MIGRATION_JSON_SIZE) {
              const candidate = JSON.parse(normalizedBackup) as Partial<AiConfigExt>;
              if (isPlainObject(candidate)) {
                logger.info('已从备份恢复AI配置');
                parsed = candidate;
                // 通知用户
                if (typeof GM_notification !== 'undefined') {
                  GM_notification({
                    title: 'AI Job Hunting',
                    text: 'AI配置损坏，已从备份恢复。',
                    timeout: 8000
                  });
                }
              }
            }
          }
        } catch (backupError) {
          logger.warn('从备份恢复AI配置失败', backupError);
        }
      }
    }

    if (!parsed) {
      // 通知用户配置损坏
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: 'AI配置损坏且无法恢复，已重置为默认配置。请重新设置。',
          timeout: 10000
        });
      }
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

/**
 * 保存 AI 配置扩展
 * @param ext 部分或完整的 AI 配置扩展对象
 * @returns 保存后的完整配置对象
 */
export function saveAiConfigExt(ext: Partial<AiConfigExt>): AiConfigExt {
  const data = {
    ...getAiConfigExt(),
    ...(ext || {})
  } as AiConfigExt;
  const gmAvailable = hasGmStorageRuntime();

  if (!gmAvailable) {
    localStorage.setItem(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  try {
    // 先备份当前配置
    if (_GM_getValue && _GM_setValue) {
      try {
        const current = _GM_getValue(AI_CONFIG_EXT_STORAGE_KEY, '');
        if (current) {
          _GM_setValue(`${AI_CONFIG_EXT_STORAGE_KEY}_backup`, current);
        }
      } catch (backupError) {
        logger.warn('备份当前AI配置失败', backupError);
      }
    }

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

/**
 * 获取当前 AI 模型通道键
 * @returns 当前模型通道键
 */
export function getCurrentAiModelChannelKey(): string {
  const ext = getAiConfigExt();
  const currentConfig = ext.currentConfig || { provider: 1, modelName: "" };
  return buildModelChannelKey(currentConfig.provider, currentConfig.modelName);
}

/**
 * 获取存储的用户资料原始 JSON 字符串
 * @returns 用户资料 JSON 字符串，如果不存在返回 null
 */
export function getStoredUserProfileRaw(): string | null {
  const gmRaw = _GM_getValue?.(USER_PROFILE_STORAGE_KEY, "") ?? "";
  const rawFromGM = normalizeStoredJsonString(gmRaw);
  if (rawFromGM) {
    if (rawFromGM.length > MAX_MIGRATION_JSON_SIZE) {
      logger.error('用户配置大小超过限制 (GM storage)', {
        size: rawFromGM.length,
        limit: MAX_MIGRATION_JSON_SIZE,
        sizeKB: (rawFromGM.length / 1024).toFixed(2),
        limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)
      });
      
      // 通知用户
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: `用户配置文件过大(${(rawFromGM.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
          timeout: 15000
        });
      }
      
      // 备份超大配置的前部分用于调试
      if (_GM_setValue) {
        try {
          _GM_setValue(`${USER_PROFILE_STORAGE_KEY}_oversized_backup`, rawFromGM.slice(0, MAX_MIGRATION_JSON_SIZE));
          logger.info('已备份超大用户配置的前部分到 ai-job-user_oversized_backup');
        } catch (backupError) {
          logger.warn('备份超大用户配置失败', backupError);
        }
      }
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
    if (legacyRaw.length > MAX_MIGRATION_JSON_SIZE) {
      logger.error('用户配置大小超过限制 (localStorage)', {
        size: legacyRaw.length,
        limit: MAX_MIGRATION_JSON_SIZE,
        sizeKB: (legacyRaw.length / 1024).toFixed(2),
        limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)
      });
      
      // 通知用户
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: `用户配置文件过大(${(legacyRaw.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
          timeout: 15000
        });
      }
      
      // 备份超大配置的前部分用于调试
      try {
        localStorage.setItem(`${USER_PROFILE_STORAGE_KEY}_oversized_backup`, legacyRaw.slice(0, MAX_MIGRATION_JSON_SIZE));
        logger.info('已备份超大用户配置的前部分到 localStorage');
      } catch (backupError) {
        logger.warn('备份超大用户配置失败', backupError);
      }
      
      return null;
    }
    
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

/**
 * 保存用户资料
 * @param profile 用户资料对象
 */
export function saveStoredUserProfile(profile: unknown): void {
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

/**
 * 获取 AI 投递判断配置
 * @param preference 可选的偏好设置对象（用于向后兼容）
 * @returns AI 投递判断配置对象
 */
export function getAiDeliveryJudgeConfig(preference?: Record<string, unknown>): AiDeliveryJudgeConfig {
  const ext = getAiConfigExt() as Record<string, unknown>;
  const extCfg = isPlainObject(ext.aiDeliveryJudge) ? (ext.aiDeliveryJudge as Record<string, unknown>) : {};
  const pref = isPlainObject(preference) ? preference : {};

  const normalizeFallbackPolicy = (value: unknown, fallback: "reject" | "fallback-traditional"): "reject" | "fallback-traditional" => {
    return value === "fallback-traditional" || value === "reject" ? value : fallback;
  };
  const normalizeKeywordList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const text = `${item ?? ""}`.trim();
      if (!text) {
        continue;
      }

      const key = text.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(text);
    }

    return result;
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
  const focusSkills = normalizeKeywordList(
    extCfg.focusSkills || pref.aiDeliveryJudgeFocusSkills || pref.aiDeliverJudgeFocusSkills
  );
  const excludeKeywords = normalizeKeywordList(
    extCfg.excludeKeywords || pref.aiDeliveryJudgeExcludeKeywords || pref.aiDeliverJudgeExcludeKeywords
  );
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
    focusSkills,
    excludeKeywords,
    includeUserProfile,
    includeTraditionalSnapshot,
    onAiError,
    onInvalidResult
  };
}

/**
 * 保存 AI 投递判断配置
 * @param config 部分或完整的 AI 投递判断配置对象
 * @returns 保存后的完整配置对象
 */
export function saveAiDeliveryJudgeConfig(config: Partial<AiDeliveryJudgeConfig>): AiDeliveryJudgeConfig {
  const current = getAiDeliveryJudgeConfig();
  const normalizeFallbackPolicy = (value: unknown, fallback: "reject" | "fallback-traditional"): "reject" | "fallback-traditional" => {
    return value === "fallback-traditional" || value === "reject" ? value : fallback;
  };
  const normalizeKeywordList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const text = `${item ?? ""}`.trim();
      if (!text) {
        continue;
      }

      const key = text.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(text);
    }

    return result;
  };
  const next: AiDeliveryJudgeConfig = {
    enabled: typeof config.enabled === "boolean" ? config.enabled : current.enabled,
    prompt: `${config.prompt || current.prompt || ""}`.trim() || DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
    extraPrompt: `${config.extraPrompt || current.extraPrompt || ""}`.trim(),
    focusSkills: normalizeKeywordList(config.focusSkills ?? current.focusSkills),
    excludeKeywords: normalizeKeywordList(config.excludeKeywords ?? current.excludeKeywords),
    includeUserProfile: typeof config.includeUserProfile === "boolean" ? config.includeUserProfile : current.includeUserProfile,
    includeTraditionalSnapshot:
      typeof config.includeTraditionalSnapshot === "boolean"
        ? config.includeTraditionalSnapshot
        : current.includeTraditionalSnapshot,
    onAiError: normalizeFallbackPolicy(config.onAiError, current.onAiError),
    onInvalidResult: normalizeFallbackPolicy(config.onInvalidResult, current.onInvalidResult)
  };

  const ext = getAiConfigExt() as Record<string, unknown>;
  ext.aiDeliveryJudge = {
    enabled: next.enabled,
    prompt: next.prompt,
    extraPrompt: next.extraPrompt,
    focusSkills: next.focusSkills,
    excludeKeywords: next.excludeKeywords,
    includeUserProfile: next.includeUserProfile,
    includeTraditionalSnapshot: next.includeTraditionalSnapshot,
    onAiError: next.onAiError,
    onInvalidResult: next.onInvalidResult
  };
  saveAiConfigExt(ext);
  return next;
}

/**
 * 从偏好设置迁移 AI 投递判断配置到扩展配置
 * @param preference 可选的偏好设置对象
 * @returns AI 投递判断配置对象
 */
export function migrateAiDeliveryJudgeConfigFromPreference(preference?: Record<string, unknown>): AiDeliveryJudgeConfig {
  const ext = getAiConfigExt() as Record<string, unknown>;
  const hasExtConfig = isPlainObject(ext.aiDeliveryJudge);
  if (hasExtConfig) {
    return getAiDeliveryJudgeConfig(preference);
  }

  const next = getAiDeliveryJudgeConfig(preference);
  ext.aiDeliveryJudge = {
    enabled: next.enabled,
    prompt: next.prompt,
    extraPrompt: next.extraPrompt,
    focusSkills: next.focusSkills,
    excludeKeywords: next.excludeKeywords,
    includeUserProfile: next.includeUserProfile,
    includeTraditionalSnapshot: next.includeTraditionalSnapshot,
    onAiError: next.onAiError,
    onInvalidResult: next.onInvalidResult
  };
  saveAiConfigExt(ext);
  return next;
}
