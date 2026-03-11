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

/**
 * 工具类 - 聚合所有共享工具方法的静态类
 * 
 * 包含薪资处理、URL 处理、安全验证、配置管理等多个模块的工具方法。
 * 通过静态方法提供统一的工具接口，便于在整个应用中使用。
 */
export class Tools {
  /**
   * 浏览器 window 对象引用
   * 
   * 在 Tampermonkey 脚本环境中，优先使用 unsafeWindow 以访问页面上下文，
   * 否则回退到普通 window 对象。
   * 
   * @type {Window & Record<string, unknown>}
   */
  static window: Window & Record<string, unknown> = _unsafeWindow;

  // ==================== 薪资工具方法 ====================
  /** @see salary-utils.fuzzyMatch */
  static fuzzyMatch = fuzzyMatch;
  /** @see salary-utils.isRangeOverlap */
  static isRangeOverlap = isRangeOverlap;
  /** @see salary-utils.isSalaryRangeMatched */
  static isSalaryRangeMatched = isSalaryRangeMatched;
  /** @see salary-utils.getSalaryType */
  static getSalaryType = getSalaryType;
  /** @see salary-utils.convertSalaryHourToDayRange */
  static convertSalaryHourToDayRange = convertSalaryHourToDayRange;
  /** @see salary-utils.isSalaryTypeSupportedForFilter */
  static isSalaryTypeSupportedForFilter = isSalaryTypeSupportedForFilter;
  /** @see salary-utils.getComparableSalaryRange */
  static getComparableSalaryRange = getComparableSalaryRange;

  // ==================== URL 工具方法 ====================
  /** @see url-utils.getCookieValue */
  static getCookieValue = getCookieValue;
  /** @see url-utils.parseURL */
  static parseURL = parseURL;
  /** @see url-utils.queryString */
  static queryString = queryString;
  /** @see url-utils.getRandomNumber */
  static getRandomNumber = getRandomNumber;
  /** @see url-utils.getCurDay */
  static getCurDay = getCurDay;

  // ==================== 安全工具方法 ====================
  /** @see security-utils.getCurrentHostname */
  static getCurrentHostname = getCurrentHostname;
  /** @see security-utils.normalizeHostname */
  static normalizeHostname = normalizeHostname;
  /** @see security-utils.isPrivateOrLocalHost */
  static isPrivateOrLocalHost = isPrivateOrLocalHost;
  /** @see security-utils.isManualVerificationText */
  static isManualVerificationText = isManualVerificationText;
  /** @see security-utils.getManualVerificationReason */
  static getManualVerificationReason = getManualVerificationReason;
  /** @see security-utils.ensureNoManualVerificationOrThrow */
  static ensureNoManualVerificationOrThrow = ensureNoManualVerificationOrThrow;
  /** @see security-utils.isBossDomainHost */
  static isBossDomainHost = isBossDomainHost;
  /** @see security-utils.isTrustedBossStaticHost */
  static isTrustedBossStaticHost = isTrustedBossStaticHost;
  /** @see security-utils.isBossDomainUrl */
  static isBossDomainUrl = isBossDomainUrl;
  /** @see security-utils.isTrustedBossStaticUrl */
  static isTrustedBossStaticUrl = isTrustedBossStaticUrl;
  /** @see security-utils.ensureBossDomainOrThrow */
  static ensureBossDomainOrThrow = ensureBossDomainOrThrow;
  /** @see security-utils.getSafePageContext */
  static getSafePageContext = getSafePageContext;
  /** @see security-utils.getPageUidString */
  static getPageUidString = getPageUidString;
  /** @see security-utils.getPageToken */
  static getPageToken = getPageToken;

  // ==================== 配置管理方法 ====================
  /** @see config-manager.buildModelChannelKey */
  static buildModelChannelKey = buildModelChannelKey;
  /** @see config-manager.getAiConfigExt */
  static getAiConfigExt = getAiConfigExt;
  /** @see config-manager.saveAiConfigExt */
  static saveAiConfigExt = saveAiConfigExt;
  /** @see config-manager.getCurrentAiModelChannelKey */
  static getCurrentAiModelChannelKey = getCurrentAiModelChannelKey;
  /** @see config-manager.getStoredUserProfileRaw */
  static getStoredUserProfileRaw = getStoredUserProfileRaw;
  /** @see config-manager.saveStoredUserProfile */
  static saveStoredUserProfile = saveStoredUserProfile;
  /** @see config-manager.getAiDeliveryJudgeConfig */
  static getAiDeliveryJudgeConfig = getAiDeliveryJudgeConfig;
  /** @see config-manager.saveAiDeliveryJudgeConfig */
  static saveAiDeliveryJudgeConfig = saveAiDeliveryJudgeConfig;
  /** @see config-manager.migrateAiDeliveryJudgeConfigFromPreference */
  static migrateAiDeliveryJudgeConfigFromPreference = migrateAiDeliveryJudgeConfigFromPreference;

  // ==================== 依赖配置的安全工具方法 ====================

  /**
   * 获取受信任的出站主机列表
   * 
   * 从 AI 配置中读取受信任的主机列表，并合并额外指定的主机。
   * 用于验证网络请求的目标主机是否被允许。
   * 
   * @param {string[]} [extraHosts=[]] - 额外的受信任主机列表
   * @returns {string[]} 合并后的受信任主机列表
   * 
   * @example
   * const hosts = Tools.getTrustedOutboundHosts(['example.com']);
   * // 返回配置中的主机 + 'example.com'
   */
  static getTrustedOutboundHosts(extraHosts: string[] = []): string[] {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    return getTrustedOutboundHosts(ext, extraHosts);
  }

  /**
   * 检查 URL 是否被允许的网络地址
   * 
   * 根据 AI 配置中的受信任主机列表验证给定 URL 是否被允许。
   * 用于安全检查网络请求的目标地址。
   * 
   * @param {string} url - 要检查的 URL
   * @param {string[]} [extraHosts=[]] - 额外的受信任主机列表
   * @returns {boolean} 如果 URL 被允许则返回 true，否则返回 false
   * 
   * @example
   * if (Tools.isAllowedNetworkUrl('https://api.example.com/data')) {
   *   // 执行网络请求
   * }
   */
  static isAllowedNetworkUrl(url: string, extraHosts: string[] = []): boolean {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    return isAllowedNetworkUrl(url, ext, extraHosts);
  }

  /**
   * 确保 URL 是被允许的网络地址，否则抛出异常
   * 
   * 验证 URL 是否被允许。如果不被允许，将抛出错误异常。
   * 用于在执行网络操作前进行安全检查。
   * 
   * @param {string} url - 要检查的 URL
   * @param {string} action - 操作描述，用于错误消息中说明被拒绝的操作
   * @param {string[]} [extraHosts=[]] - 额外的受信任主机列表
   * @throws {Error} 当 URL 不被允许时抛出异常
   * 
   * @example
   * try {
   *   Tools.ensureAllowedNetworkUrl('https://api.example.com/data', '获取用户数据');
   * } catch (error) {
   *   console.error('网络请求被拒绝:', error.message);
   * }
   */
  static ensureAllowedNetworkUrl(url: string, action: string, extraHosts: string[] = []): void {
    const ext = Tools.getAiConfigExt() as Record<string, unknown>;
    ensureAllowedNetworkUrl(url, action, ext, extraHosts);
  }

  // ==================== 通用工具方法 ====================

  /**
   * 延迟执行指定毫秒数
   * 
   * 返回一个 Promise，在指定的毫秒数后 resolve。
   * 常用于异步流程中的延迟操作。
   * 
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise<void>} 在指定时间后 resolve 的 Promise
   * 
   * @example
   * await Tools.sleep(1000); // 延迟 1 秒
   * console.log('1 秒后执行');
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取空字符（NUL 字符）
   * 
   * 返回 Unicode 字符 U+0000（空字符），通常用于字符串分隔或特殊标记。
   * 
   * @returns {string} 空字符（NUL 字符）
   * 
   * @example
   * const separator = Tools.getEndChar();
   * const combined = 'value1' + separator + 'value2';
   */
  static getEndChar(): string {
    return String.fromCharCode(0);
  }
}

/**
 * 提示词变量定义列表
 * 
 * 定义了所有可在提示词模板中使用的变量。每个变量包含：
 * - key: 变量的唯一标识符
 * - label: 在模板中使用的占位符格式（{{变量名}}）
 * - desc: 变量的描述说明
 * 
 * @type {Array<{key: string, label: string, desc: string}>}
 */
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
 * 从职位详情对象构建提示词变量上下文
 * 
 * 从 BOSS 直聘的职位详情对象中提取相关信息，构建可用于提示词模板的变量映射。
 * 数组类型的字段会被转换为逗号分隔的字符串。
 * 
 * @param {Record<string, any> | null | undefined} jobDetail - BOSS 职位详情对象
 * @returns {Record<string, string>} 变量名到值的映射对象
 * 
 * @example
 * const jobDetail = {
 *   jobName: '前端开发工程师',
 *   brandName: '字节跳动',
 *   salaryDesc: '15-25K·14薪',
 *   cityName: '北京',
 *   skills: ['React', 'TypeScript', 'Vue']
 * };
 * const vars = buildPromptVarsFromJob(jobDetail);
 * // 返回: {
 * //   '岗位名称': '前端开发工程师',
 * //   '公司名称': '字节跳动',
 * //   '薪资范围': '15-25K·14薪',
 * //   '城市': '北京',
 * //   '技能标签': 'React, TypeScript, Vue',
 * //   ...
 * // }
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
 * 替换提示词模板中的变量占位符
 * 
 * 将模板字符串中的 {{变量名}} 占位符替换为对应的变量值。
 * 如果变量不存在于提供的映射中，占位符将保留原样。
 * 
 * @param {string} template - 包含 {{变量名}} 占位符的模板字符串
 * @param {Record<string, string>} vars - 变量名到值的映射对象
 * @returns {string} 替换后的字符串，未匹配的变量保留原样
 * 
 * @example
 * const template = '我是{{公司名称}}的{{岗位名称}}，期望薪资{{薪资范围}}';
 * const vars = {
 *   '公司名称': '字节跳动',
 *   '岗位名称': '前端开发工程师',
 *   '薪资范围': '15-25K'
 * };
 * const result = resolvePromptVariables(template, vars);
 * // 返回: '我是字节跳动的前端开发工程师，期望薪资15-25K'
 * 
 * // 未定义的变量保留原样
 * const template2 = '城市: {{城市}}, 行业: {{行业}}';
 * const vars2 = { '城市': '北京' };
 * const result2 = resolvePromptVariables(template2, vars2);
 * // 返回: '城市: 北京, 行业: {{行业}}'
 */
export function resolvePromptVariables(template: string, vars: Record<string, string>): string {
  if (!template) return template;
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    return trimmed in vars ? vars[trimmed] : match;
  });
}

/**
 * 模拟滚动到页面底部
 * 
 * 通过模拟键盘事件（End 键）和滚动操作，将页面滚动到底部。
 * 首先尝试触发键盘事件，如果失败则使用 scrollTo 方法作为备选方案。
 * 用于加载动态内容或确保页面完全加载。
 * 
 * @param {string} platform - 平台标识（'mac' 或其他），用于确定修饰键
 * @returns {Promise<void>} 异步操作完成后 resolve
 * 
 * @example
 * // 在 Mac 平台上模拟滚动
 * await simulateScrollToEnd('mac');
 * 
 * // 在其他平台上模拟滚动
 * await simulateScrollToEnd('windows');
 * 
 * @remarks
 * - 在 Mac 平台使用 Meta 键，其他平台使用 Control 键
 * - 如果键盘事件触发失败，会输出警告日志并使用平滑滚动作为备选方案
 * - 使用 requestAnimationFrame 确保 DOM 更新完成
 */
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
