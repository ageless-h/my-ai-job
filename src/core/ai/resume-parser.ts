// -*- coding: utf-8 -*-
// ResumeParser: 零成本简历解析
// - 一阶段：pdf.js 在浏览器本地提取文本（无任何外部调用）
// - 二阶段：若用户配置了 AI（任意 OpenAI 兼容/Claude/Gemini），调用一次直采结构化字段
// - 兜底：仅用正则提取关键字段

import { directAiCall, type DirectAiConfig, type DirectAiMessage } from './direct-ai-client';
import { Logger } from '@/shared/utils/logger';
import type { ResumeData } from '@/core/storage/types';

const logger = Logger.rootLogger;

export interface ParsedResume {
  name?: string;
  phone?: string;
  email?: string;
  skills: string[];
  workExperience: string;
  projects: string;
  education: string;
}

const PDFJS_WORKER_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let workerConfigured = false;
function ensurePdfWorker(): void {
  if (workerConfigured) return;
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('pdf.js 未加载（请刷新页面或使用打包后的用户脚本）');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  workerConfigured = true;
}

/** 在浏览器本地提取 PDF 全文（零网络成本） */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  ensurePdfWorker();
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('pdf.js 未加载');
  }
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ');
    pageTexts.push(text);
  }
  return pageTexts.join('\n').replace(/[ \t]+/g, ' ').trim();
}

/** 用正则做兜底字段抽取 */
export function extractWithRegex(rawText: string): ParsedResume {
  const result: ParsedResume = {
    skills: [],
    workExperience: '',
    projects: '',
    education: '',
  };

  const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) result.email = emailMatch[0];

  // 中国大陆手机号
  const phoneMatch = rawText.match(/(?<!\d)1[3-9]\d{9}(?!\d)/);
  if (phoneMatch) result.phone = phoneMatch[0];

  // 简单姓名启发：前 200 字内，匹配 2-4 个汉字（且不是常见非姓名词）
  const head = rawText.slice(0, 200);
  const nameMatch = head.match(/[\u4e00-\u9fa5]{2,4}/);
  if (nameMatch && !/简历|个人|信息|求职|意向/.test(nameMatch[0])) {
    result.name = nameMatch[0];
  }

  // 段落抽取：按标题切片
  const sectionRegex =
    /(工作经[历验]|实习经[历验]|项目经[历验]|教育背景|教育经[历验]|专业技能|技能|个人技能)[\s\S]*?(?=工作经[历验]|实习经[历验]|项目经[历验]|教育背景|教育经[历验]|专业技能|自我评价|$)/g;
  const sections = rawText.match(sectionRegex) || [];
  for (const s of sections) {
    if (/项目经[历验]/.test(s)) result.projects = s.trim();
    else if (/工作经[历验]|实习经[历验]/.test(s)) result.workExperience = s.trim();
    else if (/教育/.test(s)) result.education = s.trim();
    else if (/技能/.test(s)) {
      const list = s
        .replace(/(专业技能|个人技能|技能)[:：]?/g, '')
        .split(/[、,，;；\s\/|]+/)
        .map((x) => x.trim())
        .filter((x) => x && x.length <= 30);
      result.skills = Array.from(new Set(list)).slice(0, 30);
    }
  }

  return result;
}

const STRUCTURE_PROMPT =
  '你是简历信息抽取器。读取以下纯文本简历，输出严格的 JSON（不要 markdown 代码块，不要多余说明），字段为：' +
  '{"name":string,"phone":string,"email":string,"skills":string[],"workExperience":string,"projects":string,"education":string}。' +
  '若某字段无法获得请输出空字符串或空数组。';

/** 用已配置的 AI 把粗文本转为结构化（用户已付的额度，本项目零额外成本） */
export async function structureWithAi(
  rawText: string,
  config: DirectAiConfig
): Promise<ParsedResume | null> {
  const trimmed = rawText.length > 8000 ? rawText.slice(0, 8000) : rawText;
  const messages: DirectAiMessage[] = [
    { role: 'system', content: STRUCTURE_PROMPT },
    { role: 'user', content: trimmed },
  ];
  try {
    const answer = await directAiCall(config, messages);
    const jsonText = pickJson(answer);
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText) as Partial<ParsedResume>;
    return {
      name: parsed.name || undefined,
      phone: parsed.phone || undefined,
      email: parsed.email || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
      workExperience: parsed.workExperience || '',
      projects: parsed.projects || '',
      education: parsed.education || '',
    };
  } catch (e) {
    logger.warn('AI 结构化简历失败，回退到正则提取', e);
    return null;
  }
}

function pickJson(text: string): string | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

export interface ParseOptions {
  userId: string;
  fileName?: string;
  aiConfig?: DirectAiConfig | null;
}

/** 一键解析：PDF -> 文本 -> （可选 AI 结构化 / 否则正则）-> ResumeData */
export async function parseResumeFromBuffer(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<ResumeData> {
  const rawText = await extractPdfText(buffer);

  let parsed: ParsedResume | null = null;
  if (options.aiConfig && options.aiConfig.apiKey) {
    parsed = await structureWithAi(rawText, options.aiConfig);
  }
  if (!parsed) {
    parsed = extractWithRegex(rawText);
  }

  return {
    userId: options.userId,
    rawText,
    parsedData: {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      skills: parsed.skills || [],
      workExperience: parsed.workExperience || '',
      projects: parsed.projects || '',
      education: parsed.education || '',
    },
    fileName: options.fileName || 'resume.pdf',
    uploadedAt: Date.now(),
  };
}
