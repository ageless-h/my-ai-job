// -*- coding: utf-8 -*-

/**
 * URL、Cookie 和查询字符串相关工具函数
 */

/**
 * 获取指定 Cookie 的值
 * @param key Cookie 键名
 * @returns Cookie 值，如果不存在则返回 null
 */
export function getCookieValue(key: string): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieKey, cookieValue] = cookie.trim().split("=");
    if (cookieKey === key) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

/**
 * 解析 BOSS 职位 URL，提取 jobId、lid 和 securityId
 * @param url 职位详情页 URL
 * @returns 包含 securityId、jobId 和 lid 的对象
 */
export function parseURL(url: string): { securityId: string | null; jobId: string; lid: string | null } {
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

/**
 * 构建带查询参数的 URL
 * @param baseURL 基础 URL
 * @param queryParams 查询参数对象
 * @returns 完整的 URL 字符串
 */
export function queryString(baseURL: string, queryParams: Record<string, string | number | boolean>): string {
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${baseURL}?${queryString}`;
}

/**
 * 生成指定范围内的随机整数
 * @param startMs 起始值（包含）
 * @param endMs 结束值（包含）
 * @returns 随机整数
 */
export function getRandomNumber(startMs: number, endMs: number): number {
  return Math.floor(Math.random() * (endMs - startMs + 1)) + startMs;
}

/**
 * 获取当前日期的 YYYY-MM-DD 格式字符串
 * @returns 格式化的日期字符串
 */
export function getCurDay(): string {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
