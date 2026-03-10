// -*- coding: utf-8 -*-

/**
 * 网络安全、域名验证和人工验证检测相关工具函数
 */

declare const unsafeWindow: Window & Record<string, unknown>;

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

/**
 * 获取当前页面的主机名
 * @returns 小写的主机名字符串
 */
export function getCurrentHostname(): string {
  const hostFromUnsafe = `${_unsafeWindow?.location?.hostname || ""}`.trim();
  if (hostFromUnsafe) {
    return hostFromUnsafe.toLowerCase();
  }
  return `${window.location.hostname || ""}`.trim().toLowerCase();
}

/**
 * 规范化主机名（转小写并去除空格）
 * @param hostname 主机名
 * @returns 规范化后的主机名
 */
export function normalizeHostname(hostname: string | null | undefined): string {
  return `${hostname || ""}`.trim().toLowerCase();
}

/**
 * 检查是否为私有或本地主机
 * @param hostname 主机名
 * @returns 如果是私有/本地主机返回 true
 */
export function isPrivateOrLocalHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
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

/**
 * 获取受信任的出站主机列表
 * @param aiConfigExt AI 配置扩展对象（包含 apiConfigs 和 trustedApiHosts）
 * @param extraHosts 额外的受信任主机列表
 * @returns 受信任主机的数组
 */
export function getTrustedOutboundHosts(
  aiConfigExt: Record<string, unknown>,
  extraHosts: string[] = []
): string[] {
  const apiConfigHosts = Array.isArray(aiConfigExt.apiConfigs)
    ? (aiConfigExt.apiConfigs as Array<Record<string, unknown>>)
        .map((config) => {
          const baseUrl = `${config?.baseUrl || ""}`.trim();
          if (!baseUrl) {
            return "";
          }
          try {
            const parsed = /^https?:\/\//i.test(baseUrl)
              ? new URL(baseUrl)
              : new URL(`https://${baseUrl}`);
            return normalizeHostname(parsed.hostname);
          } catch (_e) {
            return "";
          }
        })
        .filter((host) => !!host && !isPrivateOrLocalHost(host))
    : [];
  const customHosts = Array.isArray(aiConfigExt.trustedApiHosts)
    ? aiConfigExt.trustedApiHosts.map((host) => normalizeHostname(`${host || ""}`)).filter(Boolean)
    : [];

  const merged = [...OUTBOUND_HOST_ALLOWLIST_DEFAULT, ...apiConfigHosts, ...customHosts, ...extraHosts]
    .map((host) => normalizeHostname(host))
    .filter(Boolean);

  return [...new Set(merged)];
}

/**
 * 检查 URL 是否在受信任的网络白名单中
 * @param url 要检查的 URL
 * @param aiConfigExt AI 配置扩展对象
 * @param extraHosts 额外的受信任主机列表
 * @returns 如果 URL 在白名单中返回 true
 */
export function isAllowedNetworkUrl(
  url: string,
  aiConfigExt: Record<string, unknown>,
  extraHosts: string[] = []
): boolean {
  try {
    const parsed = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, window.location.origin);
    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = normalizeHostname(parsed.hostname);
    if (isPrivateOrLocalHost(host)) {
      return false;
    }

    const trustedHosts = getTrustedOutboundHosts(aiConfigExt, extraHosts);
    return trustedHosts.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
  } catch (_e) {
    return false;
  }
}

/**
 * 确保 URL 在受信任白名单中，否则抛出错误
 * @param url 要检查的 URL
 * @param action 操作描述（用于错误消息）
 * @param aiConfigExt AI 配置扩展对象
 * @param extraHosts 额外的受信任主机列表
 * @throws 如果 URL 不在白名单中
 */
export function ensureAllowedNetworkUrl(
  url: string,
  action: string,
  aiConfigExt: Record<string, unknown>,
  extraHosts: string[] = []
): void {
  if (!isAllowedNetworkUrl(url, aiConfigExt, extraHosts)) {
    throw new Error(`${action}目标地址不在受信任白名单中: ${url}`);
  }
}

/**
 * 检查文本是否包含人工验证关键词
 * @param text 要检查的文本
 * @returns 如果包含验证关键词返回 true
 */
export function isManualVerificationText(text: string | null | undefined): boolean {
  const value = `${text || ""}`.trim().toLowerCase();
  if (!value) {
    return false;
  }

  return MANUAL_VERIFY_KEYWORDS.some((keyword) => value.includes(keyword));
}

/**
 * 检测页面是否存在人工验证弹窗或元素
 * @returns 如果检测到验证返回原因描述，否则返回 null
 */
export function getManualVerificationReason(): string | null {
  if (!isBossDomainHost(getCurrentHostname())) {
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
    if (isManualVerificationText(text) || !!element.querySelector("iframe")) {
      return `检测到验证弹窗(${selector})`;
    }
  }

  const iframes = Array.from(document.querySelectorAll("iframe"));
  for (const frame of iframes) {
    const src = `${frame.getAttribute("src") || ""}`;
    if (isManualVerificationText(src)) {
      return "检测到验证 iframe";
    }
  }

  return null;
}

/**
 * 确保没有人工验证，否则抛出错误
 * @param action 操作描述（用于错误消息）
 * @throws 如果检测到人工验证
 */
export function ensureNoManualVerificationOrThrow(action: string): void {
  const reason = getManualVerificationReason();
  if (reason) {
    throw new Error(`${action}前检测到人工验证: ${reason}`);
  }
}

/**
 * 检查主机名是否为 BOSS 官方域名
 * @param hostname 主机名
 * @returns 如果是 BOSS 域名返回 true
 */
export function isBossDomainHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
  return host === "www.zhipin.com" || host === "zhipin.com";
}

/**
 * 检查主机名是否为受信任的 BOSS 静态资源域名
 * @param hostname 主机名
 * @returns 如果是受信任的 BOSS 静态域名返回 true
 */
export function isTrustedBossStaticHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
  return host === "static.zhipin.com" || isBossDomainHost(host);
}

/**
 * 检查 URL 是否为 BOSS 官方域名
 * @param url 要检查的 URL
 * @returns 如果是 BOSS 域名返回 true
 */
export function isBossDomainUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isBossDomainHost(parsed.hostname);
  } catch (_e) {
    return false;
  }
}

/**
 * 检查 URL 是否为受信任的 BOSS 静态资源域名
 * @param url 要检查的 URL
 * @returns 如果是受信任的 BOSS 静态域名返回 true
 */
export function isTrustedBossStaticUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isTrustedBossStaticHost(parsed.hostname);
  } catch (_e) {
    return false;
  }
}

/**
 * 确保当前在 BOSS 官方域名，否则抛出错误
 * @param action 操作描述（用于错误消息）
 * @throws 如果不在 BOSS 域名
 */
export function ensureBossDomainOrThrow(action: string): void {
  const host = getCurrentHostname();
  if (!isBossDomainHost(host)) {
    throw new Error(`${action}仅允许在BOSS官方域名执行，当前域名: ${host || "unknown"}`);
  }
}

/**
 * 安全地获取页面上下文（token 和 uid）
 * @returns 包含 token 和 uid 的对象
 */
export function getSafePageContext(): { token?: string; uid?: string | number } {
  const page = (_unsafeWindow as { _PAGE?: unknown })._PAGE;
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

/**
 * 获取页面 uid 的字符串形式
 * @returns uid 字符串，如果不存在返回空字符串
 */
export function getPageUidString(): string {
  const uid = getSafePageContext().uid;
  return uid === undefined ? "" : String(uid);
}

/**
 * 获取页面 token
 * @returns token 字符串
 */
export function getPageToken(): string {
  return `${getSafePageContext().token || ""}`;
}
