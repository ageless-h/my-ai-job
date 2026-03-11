// 本文件使用 UTF-8 编码。

/**
 * 网络访问安全、域名白名单校验与人工验证检测相关工具函数。
 *
 * 该模块主要用于：
 * 1. 规范化并验证主机名与 URL，避免请求误发到不受信任地址；
 * 2. 识别本地 / 私有网络地址，降低 SSRF 类风险；
 * 3. 检测页面中的人工验证要素，避免自动化流程在风险场景下继续执行；
 * 4. 以最小暴露原则读取页面上下文中的敏感字段。
 */

declare const unsafeWindow: Window & Record<string, unknown>;

const _unsafeWindow = (typeof unsafeWindow !== 'undefined'
  ? unsafeWindow
  : window) as unknown as Window & Record<string, unknown>;

/**
 * 默认允许访问的出站主机白名单。
 *
 * 这些域名代表当前脚本允许主动发起请求的可信外部服务，
 * 通过集中维护白名单的方式，降低请求被重定向到恶意目标的风险。
 */
const OUTBOUND_HOST_ALLOWLIST_DEFAULT = [
  'zhipin.com',
  '43.138.246.37',
  'api.openai.com',
  'openrouter.ai',
  'api.deepseek.com',
  'api.siliconflow.cn',
  'api.moonshot.cn',
  'ark.cn-beijing.volces.com',
];

/**
 * 人工验证相关关键词列表。
 *
 * 用于从弹窗文本、iframe 地址、节点内容中识别验证码、人机校验、风控挑战等场景。
 */
const MANUAL_VERIFY_KEYWORDS = [
  '验证码',
  '滑块',
  '人机',
  '安全验证',
  '请完成验证',
  '行为验证',
  '点选验证',
  '拖动',
  'captcha',
  'challenge',
  'verify',
  'geetest',
  'yidun',
];

/**
 * 获取当前页面主机名，并统一转换为小写形式。
 *
 * 在用户脚本环境下，优先从页面真实上下文的 `unsafeWindow.location.hostname`
 * 读取主机名；如果不可用，则退回到当前沙箱环境的 `window.location.hostname`。
 *
 * @returns 当前页面主机名；如果无法读取，则返回空字符串。
 */
export function getCurrentHostname(): string {
  // 优先读取真实页面上下文，避免用户脚本沙箱环境与页面上下文不一致导致域名判断失真。
  const hostFromUnsafe = `${_unsafeWindow?.location?.hostname || ''}`.trim();
  if (hostFromUnsafe) {
    return hostFromUnsafe.toLowerCase();
  }

  // 当 unsafeWindow 不可用时，回退到当前窗口对象，保证函数始终返回可预测结果。
  return `${window.location.hostname || ''}`.trim().toLowerCase();
}

/**
 * 规范化主机名字符串。
 *
 * 该函数会将输入值安全地转为字符串、去除首尾空白并统一为小写，
 * 便于后续执行主机名匹配、白名单校验和域名比较，避免因大小写或空格差异造成误判。
 *
 * @param hostname 待规范化的主机名，可为字符串、`null` 或 `undefined`。
 * @returns 规范化后的主机名；当输入为空值时返回空字符串。
 */
export function normalizeHostname(hostname: string | null | undefined): string {
  return `${hostname || ''}`.trim().toLowerCase();
}

/**
 * 判断主机名是否指向本地或私有网络地址。
 *
 * 该校验用于防止请求被发送到本机回环地址、局域网地址或未明确指定的空主机，
 * 从而降低 SSRF、内网探测和误向本地服务发起请求的风险。
 *
 * @param hostname 待检查的主机名，可为字符串、`null` 或 `undefined`。
 * @returns 如果主机名为空、为本地地址或位于私有网段，则返回 `true`；否则返回 `false`。
 */
export function isPrivateOrLocalHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
  if (!host) {
    // 空主机名被视为不安全输入，默认按私有/本地地址处理，避免放行不完整地址。
    return true;
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    // 明确拦截常见回环地址，避免脚本访问宿主机本地服务。
    return true;
  }

  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^0\.0\.0\.0$/.test(host)
  ) {
    // 过滤典型 IPv4 回环地址、私有网段以及无效绑定地址，避免出站请求落到内网目标。
    return true;
  }

  // 172.16.0.0 - 172.31.255.255 属于 RFC 1918 规定的私有地址范围，需要单独解析第二段判断。
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
 * 汇总并返回受信任的出站主机白名单。
 *
 * 白名单来源包括：
 * 1. 模块内置的默认可信主机；
 * 2. AI 配置中的 API 基础地址；
 * 3. AI 配置中的自定义可信主机；
 * 4. 调用方额外追加的可信主机。
 *
 * 函数会对所有候选主机进行规范化、过滤空值，并剔除本地 / 私有网络地址，
 * 最终返回去重后的可信主机列表。
 *
 * @param aiConfigExt AI 配置扩展对象，支持通过 `apiConfigs` 和 `trustedApiHosts` 提供额外可信主机信息。
 * @param extraHosts 调用方临时追加的可信主机列表，默认为空数组。
 * @returns 去重后的可信出站主机数组。
 */
export function getTrustedOutboundHosts(
  aiConfigExt: Record<string, unknown>,
  extraHosts: string[] = []
): string[] {
  const apiConfigHosts = Array.isArray(aiConfigExt.apiConfigs)
    ? (aiConfigExt.apiConfigs as Array<Record<string, unknown>>)
        .map((config) => {
          const baseUrl = `${config?.baseUrl || ''}`.trim();
          if (!baseUrl) {
            return '';
          }
          try {
            // 将配置中的基础地址统一解析为 URL，既支持完整协议地址，也兼容只填写主机名的场景。
            const parsed = /^https?:\/\//i.test(baseUrl)
              ? new URL(baseUrl)
              : new URL(`https://${baseUrl}`);
            return normalizeHostname(parsed.hostname);
          } catch (_e) {
            // 非法地址不参与白名单构建，避免异常配置污染最终的可信主机集合。
            return '';
          }
        })
        // 即使来自配置项，也必须再次过滤本地/私有地址，防止用户误配置将请求导向内网。
        .filter((host) => !!host && !isPrivateOrLocalHost(host))
    : [];
  const customHosts = Array.isArray(aiConfigExt.trustedApiHosts)
    ? aiConfigExt.trustedApiHosts.map((host) => normalizeHostname(`${host || ''}`)).filter(Boolean)
    : [];

  // 合并默认白名单、配置白名单与临时白名单，并统一做规范化和去重，保证匹配行为稳定一致。
  const merged = [
    ...OUTBOUND_HOST_ALLOWLIST_DEFAULT,
    ...apiConfigHosts,
    ...customHosts,
    ...extraHosts,
  ]
    .map((host) => normalizeHostname(host))
    .filter(Boolean);

  return [...new Set(merged)];
}

/**
 * 判断指定 URL 是否属于允许访问的可信网络地址。
 *
 * 校验规则包括：
 * 1. 输入 URL 必须能够被成功解析；
 * 2. 最终协议必须为 HTTPS，避免明文传输；
 * 3. 目标主机不得为本地或私有网络地址；
 * 4. 目标主机必须命中可信白名单，且允许匹配白名单主机的子域名。
 *
 * @param url 待校验的 URL，可为绝对地址，也可为基于当前页面解析的相对地址。
 * @param aiConfigExt AI 配置扩展对象，用于补充可信出站主机来源。
 * @param extraHosts 调用方额外补充的可信主机列表，默认为空数组。
 * @returns 当 URL 满足全部安全条件时返回 `true`；否则返回 `false`。
 */
export function isAllowedNetworkUrl(
  url: string,
  aiConfigExt: Record<string, unknown>,
  extraHosts: string[] = []
): boolean {
  try {
    // 统一将输入解析为标准 URL 对象，确保后续协议、主机名校验都基于浏览器规范结果执行。
    const parsed = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, window.location.origin);
    if (parsed.protocol !== 'https:') {
      // 强制要求 HTTPS，避免敏感数据通过明文 HTTP 发送。
      return false;
    }

    const host = normalizeHostname(parsed.hostname);
    if (isPrivateOrLocalHost(host)) {
      // 二次拦截本地与私有网络目标，防止白名单遗漏或输入绕过导致访问内网资源。
      return false;
    }

    const trustedHosts = getTrustedOutboundHosts(aiConfigExt, extraHosts);
    // 仅允许访问白名单主机或其明确子域名，避免通过相似域名绕过安全校验。
    return trustedHosts.some(
      (trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`)
    );
  } catch (_e) {
    // 无法解析的 URL 一律按不可信处理，保持“默认拒绝”的安全策略。
    return false;
  }
}

/**
 * 断言指定 URL 位于受信任网络白名单中。
 *
 * 当目标地址未通过 HTTPS、主机白名单或私有地址校验时，函数会立即抛出异常，
 * 用于阻断后续敏感网络请求。
 *
 * @param url 待校验的目标 URL。
 * @param action 当前操作的业务描述，将拼接到异常消息中，便于定位问题场景。
 * @param aiConfigExt AI 配置扩展对象，用于补充可信出站主机来源。
 * @param extraHosts 调用方额外补充的可信主机列表，默认为空数组。
 * @returns 无返回值；当校验通过时静默结束。
 * @throws {Error} 当目标 URL 不在受信任白名单中时抛出异常。
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
 * 判断文本中是否包含人工验证相关特征词。
 *
 * 该方法会先对输入文本做空值兜底、去空格和小写化处理，随后使用关键词表
 * 检测验证码、挑战、人机校验等提示内容，以辅助识别页面是否进入安全验证流程。
 *
 * @param text 待检查的文本内容，可为字符串、`null` 或 `undefined`。
 * @returns 如果命中人工验证关键词则返回 `true`；否则返回 `false`。
 */
export function isManualVerificationText(text: string | null | undefined): boolean {
  const value = `${text || ''}`.trim().toLowerCase();
  if (!value) {
    return false;
  }

  return MANUAL_VERIFY_KEYWORDS.some((keyword) => value.includes(keyword));
}

/**
 * 检测当前页面中是否存在人工验证弹窗、风控控件或验证码 iframe。
 *
 * 为避免误判，仅在 BOSS 官方域名环境下执行检测；随后结合常见验证码节点选择器、
 * 可见性判断、节点文本和 iframe 信息综合识别人工验证场景。
 *
 * @returns 如果检测到人工验证，则返回可读的原因描述；否则返回 `null`。
 */
export function getManualVerificationReason(): string | null {
  if (!isBossDomainHost(getCurrentHostname())) {
    // 仅在官方站点执行验证检测，避免其他页面中存在相似类名时出现误报。
    return null;
  }

  const overlaySelectors = [
    '.geetest_panel',
    '.geetest_widget',
    '.yidun_tips',
    '.yidun_modal',
    "[class*='captcha']",
    "[class*='verify']",
    "[class*='risk']",
    "[id*='captcha']",
    "[id*='verify']",
  ];

  for (const selector of overlaySelectors) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) {
      continue;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      // 已隐藏的节点通常不代表当前正在阻塞流程的验证弹层，因此忽略不可见元素。
      continue;
    }

    const text = `${element.textContent || ''}`.trim();
    if (isManualVerificationText(text) || !!element.querySelector('iframe')) {
      // 同时检查节点文本和内嵌 iframe，覆盖滑块、图形点选、第三方验证码组件等多种实现方式。
      return `检测到验证弹窗(${selector})`;
    }
  }

  const iframes = Array.from(document.querySelectorAll('iframe'));
  for (const frame of iframes) {
    const src = `${frame.getAttribute('src') || ''}`;
    if (isManualVerificationText(src)) {
      // 某些验证码会以内嵌 iframe 承载，其地址本身就包含 captcha / verify 等关键字。
      return '检测到验证 iframe';
    }
  }

  return null;
}

/**
 * 断言当前页面不存在人工验证阻塞。
 *
 * 如果页面已出现验证码、行为验证或其他人工校验要求，则抛出异常，
 * 以阻止自动化流程在未完成人工处理前继续执行。
 *
 * @param action 当前操作的业务描述，将拼接到异常消息中，便于定位问题场景。
 * @returns 无返回值；当未检测到人工验证时静默结束。
 * @throws {Error} 当页面存在人工验证要素时抛出异常。
 */
export function ensureNoManualVerificationOrThrow(action: string): void {
  const reason = getManualVerificationReason();
  if (reason) {
    throw new Error(`${action}前检测到人工验证: ${reason}`);
  }
}

/**
 * 判断主机名是否属于 BOSS 官方站点域名。
 *
 * 当前仅将 `zhipin.com` 与 `www.zhipin.com` 视为官方业务域名，
 * 用于限制某些仅允许在主站执行的敏感操作。
 *
 * @param hostname 待检查的主机名，可为字符串、`null` 或 `undefined`。
 * @returns 当主机名属于 BOSS 官方业务域名时返回 `true`；否则返回 `false`。
 */
export function isBossDomainHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
  return host === 'www.zhipin.com' || host === 'zhipin.com';
}

/**
 * 判断主机名是否属于受信任的 BOSS 站点或静态资源域名。
 *
 * 除官方业务域名外，额外允许 `static.zhipin.com`，用于识别站点自身托管的可信静态资源。
 *
 * @param hostname 待检查的主机名，可为字符串、`null` 或 `undefined`。
 * @returns 当主机名属于 BOSS 官方域名或可信静态资源域名时返回 `true`；否则返回 `false`。
 */
export function isTrustedBossStaticHost(hostname: string | null | undefined): boolean {
  const host = normalizeHostname(hostname);
  return host === 'static.zhipin.com' || isBossDomainHost(host);
}

/**
 * 判断 URL 是否指向 BOSS 官方业务域名。
 *
 * 函数会先解析输入 URL，再基于主机名执行官方域名判断；非法 URL 将被视为不可信输入。
 *
 * @param url 待检查的 URL 字符串。
 * @returns 当 URL 可被成功解析且主机名属于 BOSS 官方业务域名时返回 `true`；否则返回 `false`。
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
 * 判断 URL 是否指向受信任的 BOSS 站点或静态资源域名。
 *
 * 该方法通常用于校验资源来源是否来自官方站点自身或可信静态资源域名，
 * 非法 URL 将被视为不可信输入。
 *
 * @param url 待检查的 URL 字符串。
 * @returns 当 URL 可被成功解析且主机名属于可信 BOSS 域名范围时返回 `true`；否则返回 `false`。
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
 * 断言当前脚本正在 BOSS 官方业务域名下执行。
 *
 * 该保护用于限制仅应在官方站点上下文中执行的敏感操作，
 * 防止脚本被误注入或误运行在非目标页面时继续执行后续流程。
 *
 * @param action 当前操作的业务描述，将拼接到异常消息中，便于定位问题场景。
 * @returns 无返回值；当域名校验通过时静默结束。
 * @throws {Error} 当当前页面不属于 BOSS 官方业务域名时抛出异常。
 */
export function ensureBossDomainOrThrow(action: string): void {
  const host = getCurrentHostname();
  if (!isBossDomainHost(host)) {
    throw new Error(`${action}仅允许在BOSS官方域名执行，当前域名: ${host || 'unknown'}`);
  }
}

/**
 * 安全读取页面上下文中的 `token` 与 `uid`。
 *
 * 该函数只从页面全局 `_PAGE` 对象中提取经过类型检查的最小必要字段，
 * 避免将整个页面上下文对象向外暴露，从而降低误用敏感信息的风险。
 *
 * @returns 包含可选 `token` 与 `uid` 的对象；当上下文不存在或字段类型不符合预期时返回空对象。
 */
export function getSafePageContext(): { token?: string; uid?: string | number } {
  const page = (_unsafeWindow as { _PAGE?: unknown })._PAGE;
  if (!page || typeof page !== 'object') {
    return {};
  }

  // 仅在确认 _PAGE 为对象后再做字段读取，避免对未知值执行不安全的属性访问。
  const raw = page as Record<string, unknown>;
  // token 只接受字符串，防止异常结构或恶意注入值进入后续鉴权流程。
  const token = typeof raw.token === 'string' ? raw.token : undefined;
  // uid 仅允许字符串或数字，保证下游消费时的类型边界明确可控。
  const uid = typeof raw.uid === 'string' || typeof raw.uid === 'number' ? raw.uid : undefined;
  return {
    token,
    uid,
  };
}

/**
 * 获取页面 `uid` 的字符串表示形式。
 *
 * 当页面上下文中不存在 `uid` 时返回空字符串，便于调用方直接用于拼接、日志记录或表单字段赋值。
 *
 * @returns 页面 `uid` 对应的字符串；如果不存在则返回空字符串。
 */
export function getPageUidString(): string {
  const uid = getSafePageContext().uid;
  return uid === undefined ? '' : String(uid);
}

/**
 * 获取页面上下文中的 `token` 字符串。
 *
 * 函数会通过安全读取逻辑提取 `token`，并在缺失时返回空字符串，
 * 以保证调用方无需再对 `undefined` 做额外判空处理。
 *
 * @returns 页面 `token` 字符串；如果不存在则返回空字符串。
 */
export function getPageToken(): string {
  return `${getSafePageContext().token || ''}`;
}
