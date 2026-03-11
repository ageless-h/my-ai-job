// -*- coding: utf-8 -*-

/** 薪资类型：月薪、日薪或时薪 */
export type SalaryType = "month" | "day" | "hour";

/** 薪资过滤类型：1 表示月薪，2 表示日薪或时薪，其他为自定义 */
export type SalaryFilterType = "1" | "2" | string;

/**
 * 模糊匹配工具函数
 * 
 * 检查输入字符串是否与数组中的任何元素模糊匹配。支持双向包含匹配：
 * - 数组元素包含输入字符串
 * - 输入字符串包含数组元素
 * 
 * @param arr - 待匹配的字符串数组
 * @param input - 输入的查询字符串
 * @param emptyStatus - 当数组为空或仅包含空字符串时的返回值
 * @returns 如果找到匹配项返回 true，否则返回 false；若数组为空或仅包含空字符串则返回 emptyStatus
 * 
 * @example
 * fuzzyMatch(['python', 'java'], 'py', false) // true
 * fuzzyMatch(['python'], 'python', false) // true
 * fuzzyMatch([], 'test', true) // true
 */
export function fuzzyMatch(arr: string[], input: string, emptyStatus: boolean): boolean {
  // 如果数组为空，返回指定的空状态值
  if (arr.length === 0) {
    return emptyStatus;
  }
  // 转换为小写以进行不区分大小写的比较
  input = input.toLowerCase();
  let emptyEle = false;
  for (let i = 0; i < arr.length; i++) {
    const arrEleStr = arr[i].toLowerCase();
    // 记录是否存在空字符串元素
    if (arrEleStr.length === 0) {
      emptyEle = true;
      continue;
    }
    // 检查双向包含关系：数组元素包含输入 或 输入包含数组元素
    if (arrEleStr.includes(input) || input.includes(arrEleStr)) {
      return true;
    }
  }
  // 如果存在空字符串元素但未找到其他匹配，返回空状态值
  if (emptyEle) {
    return emptyStatus;
  }
  return false;
}

/**
 * 判断两个范围是否重叠
 * 
 * 解析两个范围字符串并检查它们是否存在重叠。范围格式为 "数字" 或 "数字-数字"。
 * 如果范围没有上界，则视为无穷大。
 * 
 * @param range - 第一个范围字符串，格式如 "10" 或 "10-20"
 * @param input - 第二个范围字符串，格式如 "15" 或 "15-25"
 * @returns 如果两个范围重叠返回 true，否则返回 false
 * @throws 当范围格式无效时抛出 Error
 * 
 * @example
 * isRangeOverlap("10-20", "15-25") // true
 * isRangeOverlap("10-20", "25-30") // false
 * isRangeOverlap("10", "5-15") // true
 */
export function isRangeOverlap(range: string, input: string): boolean {
  // 解析范围字符串为 [起始值, 结束值] 元组
  const parseRange = (str: string): [number, number] => {
    // 正则表达式匹配：数字 或 数字-数字 的格式
    const match = str.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!match) {
      throw new Error("Invalid range format");
    }
    const start = parseFloat(match[1]);
    // 如果没有结束值，则设为正无穷大
    const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
    return [start, end];
  };
  const [rangeStart, rangeEnd] = parseRange(range);
  const [inputStart, inputEnd] = parseRange(input);
  // 两个范围不重叠的条件：一个范围完全在另一个范围之前
  // 反之则重叠
  return !(rangeEnd < inputStart || inputEnd < rangeStart);
}

/**
 * 判断薪资范围是否匹配
 * 
 * 检查输入薪资是否落在指定的薪资范围内。支持浮点数和开放式范围（如 "10000-"）。
 * 
 * @param range - 薪资范围字符串，格式如 "10000" 或 "10000-20000"，可为 null 或 undefined
 * @param input - 输入薪资字符串，格式如 "15000" 或 "15000-25000"，可为 null 或 undefined
 * @returns 如果输入薪资在范围内返回 true，否则返回 false；若任一参数无法解析则返回 false
 * 
 * @example
 * isSalaryRangeMatched("10000-20000", "15000") // true
 * isSalaryRangeMatched("10000-20000", "25000") // false
 * isSalaryRangeMatched("10000-", "15000") // true
 * isSalaryRangeMatched(null, "15000") // false
 */
export function isSalaryRangeMatched(range: string | null | undefined, input: string | null | undefined): boolean {
  // 解析薪资范围字符串为 [起始值, 结束值] 元组，支持浮点数
  const parseRange = (str: string | null | undefined): [number, number] | null => {
    // 正则表达式匹配：浮点数 或 浮点数-浮点数 的格式
    const match = `${str || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
    if (!match) {
      return null;
    }
    const start = parseFloat(match[1]);
    // 如果没有结束值，则设为正无穷大（表示开放式范围）
    const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
    return [start, end];
  };
  const rangeParsed = parseRange(range);
  const inputParsed = parseRange(input);
  // 如果任一范围无法解析，返回 false
  if (!rangeParsed || !inputParsed) {
    return false;
  }
  const [rangeStart, rangeEnd] = rangeParsed;
  const [inputStart] = inputParsed;
  // 检查输入起始值是否小于范围起始值
  if (inputStart < rangeStart) {
    return false;
  }
  // 检查输入起始值是否超过范围结束值（仅当范围有上界时）
  if (Number.isFinite(rangeEnd) && inputStart > rangeEnd) {
    return false;
  }
  return true;
}

/**
 * 获取薪资类型
 * 
 * 根据薪资文本内容识别薪资类型。通过正则表达式匹配关键词来判断是时薪、日薪还是月薪。
 * 默认返回月薪类型。
 * 
 * @param salaryText - 薪资文本，如 "15k-25k"、"150-200/天"、"50/小时"，可为 null 或 undefined
 * @returns 薪资类型：'hour'（时薪）、'day'（日薪）或 'month'（月薪，默认值）
 * 
 * @example
 * getSalaryType("15k-25k") // "month"
 * getSalaryType("150-200/天") // "day"
 * getSalaryType("50/小时") // "hour"
 * getSalaryType(null) // "month"
 */
export function getSalaryType(salaryText: string | null | undefined): SalaryType {
  const text = `${salaryText || ""}`.toLowerCase();
  // 检查时薪关键词：/时、时薪、每小时、小时
  if (/\/\s*时|时薪|每小时|小时/.test(text)) {
    return "hour";
  }
  // 检查日薪关键词：/天、/日、日薪、每天
  if (/\/\s*天|\/\s*日|日薪|每天/.test(text)) {
    return "day";
  }
  // 检查月薪关键词：k、月薪、/月、月
  if (/k|月薪|\/\s*月|月/.test(text)) {
    return "month";
  }
  // 默认返回月薪
  return "month";
}

/**
 * 将时薪转换为日薪范围
 * 
 * 将时薪转换为日薪（按 8 小时工作日计算）。如果薪资文本无法解析，返回原文本。
 * 支持单一时薪值和时薪范围的转换。
 * 
 * @param salaryText - 时薪文本，如 "50" 或 "50-100"，可为 null 或 undefined
 * @returns 转换后的日薪字符串（如 "400" 或 "400-800"），或原文本（若无法解析）
 * 
 * @example
 * convertSalaryHourToDayRange("50") // "400"
 * convertSalaryHourToDayRange("50-100") // "400-800"
 * convertSalaryHourToDayRange("50.5-100.5") // "404-804"
 * convertSalaryHourToDayRange("invalid") // "invalid"
 */
export function convertSalaryHourToDayRange(salaryText: string | null | undefined): string | null | undefined {
  // 正则表达式提取浮点数范围
  const match = `${salaryText || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
  if (!match) {
    return salaryText;
  }
  const start = parseFloat(match[1]);
  const end = match[2] ? parseFloat(match[2]) : null;
  // 格式化数字：整数不显示小数点，浮点数保留两位小数
  const formatNumber = (num: number): string =>
    Number.isInteger(num) ? `${num}` : `${Math.round(num * 100) / 100}`;
  // 如果没有范围上界，只返回转换后的起始值
  if (end === null) {
    return `${formatNumber(start * 8)}`;
  }
  // 返回转换后的范围（起始值和结束值都乘以 8）
  return `${formatNumber(start * 8)}-${formatNumber(end * 8)}`;
}

/**
 * 判断薪资类型是否支持过滤
 * 
 * 根据检测到的薪资类型和过滤类型判断是否支持过滤。
 * - 过滤类型 "1"：仅支持月薪
 * - 过滤类型 "2"：支持日薪和时薪
 * - 其他过滤类型：总是支持
 * 
 * @param salaryText - 薪资文本，用于检测薪资类型
 * @param salaryFilterType - 薪资过滤类型："1"（月薪）、"2"（日薪/时薪）或其他
 * @returns 如果薪资类型支持该过滤类型返回 true，否则返回 false
 * 
 * @example
 * isSalaryTypeSupportedForFilter("15k-25k", "1") // true
 * isSalaryTypeSupportedForFilter("150-200/天", "1") // false
 * isSalaryTypeSupportedForFilter("150-200/天", "2") // true
 * isSalaryTypeSupportedForFilter("50/小时", "2") // true
 */
export function isSalaryTypeSupportedForFilter(
  salaryText: string | null | undefined,
  salaryFilterType: SalaryFilterType
): boolean {
  const detectedType = getSalaryType(salaryText);
  // 过滤类型 "1" 仅支持月薪
  if (salaryFilterType === "1") {
    return detectedType === "month";
  }
  // 过滤类型 "2" 支持日薪和时薪
  if (salaryFilterType === "2") {
    return detectedType === "day" || detectedType === "hour";
  }
  // 其他过滤类型总是支持
  return true;
}

/**
 * 获取可比较的薪资范围
 * 
 * 根据薪资类型和过滤类型返回可用于比较的薪资范围。
 * 如果薪资为时薪且过滤类型为 "2"，则将其转换为日薪范围；否则返回原薪资文本。
 * 
 * @param salaryText - 薪资文本，可为 null 或 undefined
 * @param salaryFilterType - 薪资过滤类型："1"（月薪）、"2"（日薪/时薪）或其他
 * @returns 可比较的薪资范围字符串，或原薪资文本
 * 
 * @example
 * getComparableSalaryRange("50/小时", "2") // "400" (转换为日薪)
 * getComparableSalaryRange("15k-25k", "1") // "15k-25k" (月薪保持不变)
 * getComparableSalaryRange("150-200/天", "2") // "150-200/天" (日薪保持不变)
 */
export function getComparableSalaryRange(
  salaryText: string | null | undefined,
  salaryFilterType: SalaryFilterType
): string | null | undefined {
  const detectedType = getSalaryType(salaryText);
  // 如果过滤类型为 "2" 且检测到时薪，则转换为日薪范围
  if (salaryFilterType === "2" && detectedType === "hour") {
    return convertSalaryHourToDayRange(salaryText);
  }
  // 其他情况返回原薪资文本
  return salaryText;
}
