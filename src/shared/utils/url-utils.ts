// -*- coding: utf-8 -*-

/**
 * URL、Cookie 和查询字符串相关工具函数
 */

/**
 * 获取指定 Cookie 的值
 * 
 * 从浏览器 Cookie 中查找指定键名的值，并对其进行 URI 解码。
 * 
 * @param {string} key - Cookie 键名
 * @returns {string | null} Cookie 值，如果不存在则返回 null
 * @throws {Error} 当 Cookie 格式异常时可能抛出错误
 * 
 * @example
 * const sessionId = getCookieValue('sessionId');
 * // 返回: "abc123" 或 null
 */
export function getCookieValue(key: string): string | null {
  // 将 Cookie 字符串按分号分割成数组
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    // 提取 Cookie 键值对，并去除前后空格
    const [cookieKey, cookieValue] = cookie.trim().split("=");
    if (cookieKey === key) {
      // 对 Cookie 值进行 URI 解码并返回
      return decodeURIComponent(cookieValue);
    }
  }
  // 未找到指定键名的 Cookie，返回 null
  return null;
}

/**
 * 解析 BOSS 职位 URL，提取职位 ID、来源 ID 和安全 ID
 * 
 * 从职位详情页 URL 中提取关键参数：
 * - jobId：从 URL 路径第三段提取（去除 .html 后缀）
 * - lid：从查询参数中提取（来源 ID）
 * - securityId：从查询参数中提取（安全验证 ID）
 * 
 * @param {string} url - 职位详情页完整 URL，格式如：https://www.zhipin.com/job_detail/[jobId].html?lid=xxx&securityId=yyy
 * @returns {Object} 包含职位信息的对象
 * @returns {string | null} returns.securityId - 安全验证 ID，可能为 null
 * @returns {string} returns.jobId - 职位 ID（必定存在）
 * @returns {string | null} returns.lid - 来源 ID，可能为 null
 * @throws {TypeError} 当 URL 格式无效或路径段数不足时抛出错误
 * 
 * @example
 * const result = parseURL('https://www.zhipin.com/job_detail/12345.html?lid=67890&securityId=abc');
 * // 返回: { securityId: 'abc', jobId: '12345', lid: '67890' }
 */
export function parseURL(url: string): { securityId: string | null; jobId: string; lid: string | null } {
  // 使用 URL 构造函数解析 URL，自动处理编码和参数提取
  const urlObj = new URL(url);
  // 按 / 分割路径，获取路径段数组
  const pathSegments = urlObj.pathname.split("/");
  // 提取第三段路径（索引为 2），并移除 .html 后缀
  const jobId = pathSegments[2].replace(".html", "");
  // 从查询参数中提取 lid（来源 ID）
  const lid = urlObj.searchParams.get("lid");
  // 从查询参数中提取 securityId（安全验证 ID）
  const securityId = urlObj.searchParams.get("securityId");
  return {
    securityId,
    jobId,
    lid
  };
}

/**
 * 构建带查询参数的完整 URL
 * 
 * 将基础 URL 和查询参数对象组合成完整的 URL 字符串。
 * 所有参数键和值都会进行 URI 编码处理。
 * 
 * @param {string} baseURL - 基础 URL（不包含查询字符串）
 * @param {Record<string, string | number | boolean>} queryParams - 查询参数对象，键值对形式
 * @returns {string} 完整的 URL 字符串，格式为：baseURL?key1=value1&key2=value2
 * 
 * @example
 * const url = queryString('https://api.example.com/search', { q: 'test', page: 1, active: true });
 * // 返回: 'https://api.example.com/search?q=test&page=1&active=true'
 */
export function queryString(baseURL: string, queryParams: Record<string, string | number | boolean>): string {
  // 将参数对象转换为 URL 查询字符串
  // 对每个键值对进行 URI 编码，然后用 & 连接
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  // 将基础 URL 和查询字符串组合，用 ? 分隔
  return `${baseURL}?${queryString}`;
}

/**
 * 生成指定范围内的随机整数
 * 
 * 使用 Math.random() 生成指定范围内的随机整数（包含起始值和结束值）。
 * 常用于生成随机延迟时间或随机 ID。
 * 
 * @param {number} startMs - 起始值（包含），通常表示毫秒
 * @param {number} endMs - 结束值（包含），通常表示毫秒
 * @returns {number} 范围内的随机整数 [startMs, endMs]
 * 
 * @example
 * const delay = getRandomNumber(1000, 5000);
 * // 返回: 1000 到 5000 之间的随机整数
 */
export function getRandomNumber(startMs: number, endMs: number): number {
  // 计算范围内的随机数：Math.random() 返回 [0, 1) 的浮点数
  // 乘以 (endMs - startMs + 1) 得到 [0, endMs - startMs + 1) 的范围
  // 加上 startMs 得到 [startMs, endMs] 的范围
  // Math.floor() 向下取整得到整数
  return Math.floor(Math.random() * (endMs - startMs + 1)) + startMs;
}

/**
 * 获取当前日期的格式化字符串
 * 
 * 返回当前日期的 YYYY-MM-DD 格式字符串。
 * 月份和日期不足两位时会自动补零。
 * 
 * @returns {string} 格式化的日期字符串，格式为 YYYY-MM-DD
 * 
 * @example
 * const today = getCurDay();
 * // 返回: '2026-03-11'
 */
export function getCurDay(): string {
  // 获取当前日期对象
  const currentDate = new Date();
  // 获取年份
  const year = currentDate.getFullYear();
  // 获取月份（0-11），加 1 转换为 1-12，然后补零至两位
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  // 获取日期（1-31），补零至两位
  const day = String(currentDate.getDate()).padStart(2, "0");
  // 组合成 YYYY-MM-DD 格式的字符串
  return `${year}-${month}-${day}`;
}
