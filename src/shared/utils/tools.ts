// -*- coding: utf-8 -*-

import {
  fuzzyMatch,
  isRangeOverlap,
  isSalaryRangeMatched,
  getSalaryType,
  convertSalaryHourToDayRange,
  isSalaryTypeSupportedForFilter,
  getComparableSalaryRange,
  type SalaryType,
  type SalaryFilterType
} from "./salary-utils";
import {
  getCookieValue,
  parseURL,
  queryString,
  getRandomNumber,
  getCurDay
} from "./url-utils";
import {
  getCurrentHostname,
  normalizeHostname,
  isPrivateOrLocalHost,
  getTrustedOutboundHosts,
  isAllowedNetworkUrl,
  ensureAllowedNetworkUrl,
  isManualVerificationText,
  getManualVerificationReason,
  ensureNoManualVerificationOrThrow,
  isBossDomainHost,
  isTrustedBossStaticHost,
  isBossDomainUrl,
  isTrustedBossStaticUrl,
  ensureBossDomainOrThrow,
  getSafePageContext,
  getPageUidString,
  getPageToken
} from "./security-utils";
import {
  buildModelChannelKey,
  getAiConfigExt,
  saveAiConfigExt,
  getCurrentAiModelChannelKey,
  getStoredUserProfileRaw,
  saveStoredUserProfile,
  getAiDeliveryJudgeConfig,
  saveAiDeliveryJudgeConfig,
  migrateAiDeliveryJudgeConfigFromPreference,
  type AiConfigExt,
  type AiDeliveryJudgeConfig,
  DEFAULT_AI_DELIVERY_JUDGE_PROMPT
} from "./config-manager";

export type { SalaryType, SalaryFilterType, AiConfigExt, AiDeliveryJudgeConfig };
export { DEFAULT_AI_DELIVERY_JUDGE_PROMPT };

declare const unsafeWindow: Window & Record<string, unknown>;

const _unsafeWindow =
  (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as unknown as Window & Record<string, unknown>;

export class Tools {
  static window: Window & Record<string, unknown> = _unsafeWindow;

  // Salary utils
  static fuzzyMatch = fuzzyMatch;
  static isRangeOverlap = isRangeOverlap;
  static isSalaryRangeMatched = isSalaryRangeMatched;
  static getSalaryType = getSalaryType;
  static convertSalaryHourToDayRange = convertSalaryHourToDayRange;
  static isSalaryTypeSupportedForFilter = isSalaryTypeSupportedForFilter;
  static getComparableSalaryRange = getComparableSalaryRange;

  // URL utils
  static getCookieValue = getCookieValue;
  static parseURL = parseURL;
  static queryString = queryString;
  static getRandomNumber = getRandomNumber;
  static getCurDay = getCurDay;

  // Security utils
  static getCurrentHostname = getCurrentHostname;
  static normalizeHostname = normalizeHostname;
  static isPrivateOrLocalHost = isPrivateOrLocalHost;
  static isManualVerificationText = isManualVerificationText;
  static getManualVerificationReason = getManualVerificationReason;
  static ensureNoManualVerificationOrThrow = ensureNoManualVerificationOrThrow;
  static isBossDomainHost = isBossDomainHost;
  static isTrustedBossStaticHost = isTrustedBossStaticHost;
  static isBossDomainUrl = isBossDomainUrl;
  static isTrustedBossStaticUrl = isTrustedBossStaticUrl;
  static ensureBossDomainOrThrow = ensureBossDomainOrThrow;
  static getSafePageContext = getSafePageContext;
  static getPageUidString = getPageUidString;
  static getPageToken = getPageToken;

  // Config manager
  static buildModelChannelKey = buildModelChannelKey;
  static getAiConfigExt = getAiConfigExt;
  static saveAiConfigExt = saveAiConfigExt;
  static getCurrentAiModelChannelKey = getCurrentAiModelChannelKey;
  static getStoredUserProfileRaw = getStoredUserProfileRaw;
  static saveStoredUserProfile = saveStoredUserProfile;
  static getAiDeliveryJudgeConfig = getAiDeliveryJudgeConfig;
  static saveAiDeliveryJudgeConfig = saveAiDeliveryJudgeConfig;
  static migrateAiDeliveryJudgeConfigFromPreference = migrateAiDeliveryJudgeConfigFromPreference;

  // Security utils with config dependency
  static getTrustedOutboundHosts(extraHosts: string[] = []): string[] {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    return getTrustedOutboundHosts(ext, extraHosts);
  }

  static isAllowedNetworkUrl(url: string, extraHosts: string[] = []): boolean {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    return isAllowedNetworkUrl(url, ext, extraHosts);
  }

  static ensureAllowedNetworkUrl(url: string, action: string, extraHosts: string[] = []): void {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    ensureAllowedNetworkUrl(url, action, ext, extraHosts);
  }

  // Utility methods
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
