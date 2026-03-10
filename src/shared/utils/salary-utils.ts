// -*- coding: utf-8 -*-

export type SalaryType = "month" | "day" | "hour";
export type SalaryFilterType = "1" | "2" | string;

/**
 * 模糊匹配工具函数
 */
export function fuzzyMatch(arr: string[], input: string, emptyStatus: boolean): boolean {
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

/**
 * 判断两个范围是否重叠
 */
export function isRangeOverlap(range: string, input: string): boolean {
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

/**
 * 判断薪资范围是否匹配
 */
export function isSalaryRangeMatched(range: string | null | undefined, input: string | null | undefined): boolean {
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

/**
 * 获取薪资类型
 */
export function getSalaryType(salaryText: string | null | undefined): SalaryType {
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

/**
 * 将时薪转换为日薪范围
 */
export function convertSalaryHourToDayRange(salaryText: string | null | undefined): string | null | undefined {
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

/**
 * 判断薪资类型是否支持过滤
 */
export function isSalaryTypeSupportedForFilter(
  salaryText: string | null | undefined,
  salaryFilterType: SalaryFilterType
): boolean {
  const detectedType = getSalaryType(salaryText);
  if (salaryFilterType === "1") {
    return detectedType === "month";
  }
  if (salaryFilterType === "2") {
    return detectedType === "day" || detectedType === "hour";
  }
  return true;
}

/**
 * 获取可比较的薪资范围
 */
export function getComparableSalaryRange(
  salaryText: string | null | undefined,
  salaryFilterType: SalaryFilterType
): string | null | undefined {
  const detectedType = getSalaryType(salaryText);
  if (salaryFilterType === "2" && detectedType === "hour") {
    return convertSalaryHourToDayRange(salaryText);
  }
  return salaryText;
}
