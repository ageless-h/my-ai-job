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

const logger = Logger.rootLogger;
const AI_CONFIG_EXT_STORAGE_KEY = "ai-job-ai-config-ext";
const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : undefined;
const _unsafeWindow =
  typeof unsafeWindow !== "undefined" ? unsafeWindow : (window as Window & Record<string, unknown>);

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
      let raw = _GM_getValue?.(AI_CONFIG_EXT_STORAGE_KEY, "") ?? "";
      if (!raw) {
        const legacyRaw = localStorage.getItem(AI_CONFIG_EXT_STORAGE_KEY);
        if (legacyRaw) {
          _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, legacyRaw);
          localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
          raw = legacyRaw;
        }
      }
      if (!raw) {
        return defaultExt;
      }
      const parsed = JSON.parse(raw) as Partial<AiConfigExt>;
      return {
        ...defaultExt,
        ...parsed,
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
    _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
    localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
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
