// -*- coding: utf-8 -*-
import { normalizePreferenceBoolean } from "@/shared/utils/preference";

export type AiDeliveryPromptConfig = {
  prompt: string;
  extraPrompt?: string;
  includeUserProfile: boolean;
  includeTraditionalSnapshot: boolean;
};

export type AiDeliveryFallbackStage = "ai-error" | "invalid-result";

export type AiDeliveryFallbackResolution = {
  enabled: boolean;
  parseMode: string;
};

type PlainRecord = Record<string, unknown>;
type SourceNode = { path: string; record: PlainRecord };
type CollectSourceNodeOptions = {
  excludePathPrefixes?: string[];
  excludeKeyNames?: string[];
};

const RESUME_TEXT_SEARCH_KEYS = [
  "resumeText",
  "resumePlainText",
  "resumeBodyText",
  "resumePageText",
  "runtimeResumeText",
  "resumeContent",
  "cvText",
  "attachmentResumeText",
  "parsedResumeText",
  "ocrText",
  "resumeRawText",
  "text",
  "content"
];
const IMPORTED_RESUME_SNIPPET_MAX_LENGTH = 900;
const RESUME_NARRATIVE_SNIPPET_MAX_LENGTH = 360;
const JOB_DESCRIPTION_SNIPPET_MAX_LENGTH = 1200;
const CANDIDATE_EVIDENCE_MAX_LENGTH = 720;
const MAX_RULE_KEYWORD_ITEMS = 12;
const AI_DELIVERY_OUTPUT_CONTRACT = "仅输出一行JSON，且只能包含两个键：match(boolean) 与 reason(string)。禁止输出Markdown、代码块或额外解释。信息不足时返回 {\"match\":false,\"reason\":\"[INFO_MISSING] 信息不足\"}。";

const toRecord = (value: unknown): PlainRecord => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as PlainRecord;
  }
  return {};
};

const toArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const normalizeLookupKey = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
};

const toText = (value: unknown, fallback = ""): string => {
  return `${value ?? fallback}`;
};

const getPreferenceValue = (
  preference: PlainRecord,
  canonicalKey: string,
  legacyKey: string
): unknown => {
  return preference[canonicalKey] ?? preference[legacyKey];
};

const normalizeInlineText = (value: unknown, fallback = "未提供"): string => {
  const normalized = toText(value)
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
};

const normalizeMultilineText = (value: unknown, fallback = "未提供"): string => {
  const raw = toText(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = raw.split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const collapsed: string[] = [];
  let previousBlank = false;

  for (const line of lines) {
    if (!line) {
      if (!previousBlank) {
        collapsed.push("");
      }
      previousBlank = true;
      continue;
    }
    collapsed.push(line);
    previousBlank = false;
  }

  const normalized = collapsed.join("\n").trim();
  return normalized || fallback;
};

const formatList = (value: unknown, fallback = "无"): string => {
  const list = toArray(value)
    .map((item) => normalizeInlineText(item, ""))
    .filter(Boolean);
  return list.length ? list.join("、") : fallback;
};

const normalizeKeywordList = (value: unknown, maxItems = MAX_RULE_KEYWORD_ITEMS): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of toArray(value)) {
    const text = normalizeInlineText(item, "");
    if (!text) {
      continue;
    }
    const normalized = normalizeLookupKey(text);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(text);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
};

const excludeConflictedKeywords = (includes: string[], excludes: string[]): string[] => {
  const excludedSet = new Set(excludes.map((item) => normalizeLookupKey(item)).filter(Boolean));
  return includes.filter((item) => !excludedSet.has(normalizeLookupKey(item)));
};

const collectKeywordConflicts = (includes: string[], excludes: string[]): string[] => {
  const excludedSet = new Set(excludes.map((item) => normalizeLookupKey(item)).filter(Boolean));
  return includes.filter((item) => excludedSet.has(normalizeLookupKey(item)));
};

const isPrimitive = (value: unknown): boolean => {
  return ["string", "number", "boolean"].includes(typeof value) || value == null;
};

const isMeaningful = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as PlainRecord).length > 0;
  }
  return true;
};

const compactRecord = (record: PlainRecord): PlainRecord => {
  const next: PlainRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (isMeaningful(value)) {
      next[key] = value;
    }
  }
  return next;
};

const collectSourceNodes = (
  value: unknown,
  maxDepth = 5,
  options: CollectSourceNodeOptions = {},
  rootPath = "user"
): SourceNode[] => {
  const result: SourceNode[] = [];
  const visited = new Set<object>();
  const excludedPaths = toArray(options.excludePathPrefixes).map((item) => normalizeInlineText(item, "")).filter(Boolean);
  const excludedKeySet = new Set(toArray(options.excludeKeyNames).map((item) => normalizeLookupKey(normalizeInlineText(item, ""))).filter(Boolean));

  const isExcludedPath = (path: string): boolean => {
    return excludedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`));
  };

  const walk = (current: unknown, path: string, depth: number): void => {
    if (depth > maxDepth) {
      return;
    }
    if (isExcludedPath(path)) {
      return;
    }
    if (!current || typeof current !== "object") {
      return;
    }
    if (visited.has(current as object)) {
      return;
    }
    visited.add(current as object);

    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${path}[${index}]`, depth + 1));
      return;
    }

    const record = current as PlainRecord;
    result.push({ path, record });

    for (const [key, child] of Object.entries(record)) {
      if (excludedKeySet.has(normalizeLookupKey(key))) {
        continue;
      }
      if (child && typeof child === "object") {
        walk(child, path ? `${path}.${key}` : key, depth + 1);
      }
    }
  };

  walk(value, rootPath, 0);
  return result;
};

const findLikelyResumeRootNodes = (userInput: PlainRecord): Array<{ path: string; value: unknown }> => {
  const user = toRecord(userInput);
  const roots: Array<{ path: string; value: unknown }> = [];
  const preferredKeys = [
    "importedResume",
    "resume",
    "resumeInfo",
    "resumeProfile",
    "resumeDetail",
    "resumeData",
    "attachmentResume",
    "attachmentResumeInfo",
    "parsedResume",
    "parsedResumeData",
    "cv",
    "profile",
    "geekResume"
  ];
  const normalizedPreferredKeys = new Set(preferredKeys.map(normalizeLookupKey));
  const weakTokens = ["resume", "cv", "profile", "geek", "job", "career", "intent", "education", "experience", "简历", "履历", "求职"];

  for (const [key, value] of Object.entries(user)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const normalizedKey = normalizeLookupKey(key);
    if (!normalizedKey || normalizedKey === "preference" || normalizedKey === "preferencemap") {
      continue;
    }
    if (normalizedPreferredKeys.has(normalizedKey)) {
      roots.push({ path: `user.${key}`, value });
      continue;
    }
    if (weakTokens.some((token) => normalizedKey.includes(normalizeLookupKey(token)))) {
      roots.push({ path: `user.${key}`, value });
    }
  }

  return roots;
};

const collectResumeSourceNodes = (userInput: PlainRecord, resumeSourceInput?: unknown): SourceNode[] => {
  const user = toRecord(userInput);
  const nodes: SourceNode[] = [];
  const nodeSeen = new Set<PlainRecord>();
  const rootSeen = new Set<string>();

  const appendNodes = (value: unknown, rootPath: string, maxDepth = 6): void => {
    if (!value || typeof value !== "object") {
      return;
    }
    if (rootSeen.has(rootPath)) {
      return;
    }
    rootSeen.add(rootPath);
    const collected = collectSourceNodes(
      value,
      maxDepth,
      {
        excludePathPrefixes: ["user.preference", "user.preferenceMap"],
        excludeKeyNames: ["preference", "preferenceMap"]
      },
      rootPath
    );
    for (const node of collected) {
      if (nodeSeen.has(node.record)) {
        continue;
      }
      nodeSeen.add(node.record);
      nodes.push(node);
    }
  };

  appendNodes(resumeSourceInput, "resumeSource", 7);
  for (const root of findLikelyResumeRootNodes(user)) {
    appendNodes(root.value, root.path, 7);
  }
  appendNodes(user, "user", 5);

  return nodes;
};

const valueToSearchableText = (value: unknown): string => {
  if (!isPrimitive(value)) {
    if (Array.isArray(value) && value.every((item) => isPrimitive(item))) {
      return value
        .map((item) => normalizeInlineText(item, ""))
        .filter(Boolean)
        .join("、");
    }
    return "";
  }
  return normalizeInlineText(value, "");
};

const pickFirstTextValue = (
  sourceNodes: SourceNode[],
  keys: string[]
): { value: string; source: string } => {
  const normalizedKeys = new Set(keys.map(normalizeLookupKey));

  for (const sourceNode of sourceNodes) {
    for (const [key, value] of Object.entries(sourceNode.record)) {
      const normalizedKey = normalizeLookupKey(key);
      if (!normalizedKeys.has(normalizedKey)) {
        continue;
      }
      const text = valueToSearchableText(value);
      if (text) {
        return {
          value: text,
          source: `${sourceNode.path}.${key}`
        };
      }
    }
  }

  return { value: "", source: "" };
};

const getSearchResult = (
  sourceNodes: SourceNode[],
  keys: string[]
): { value: string; source: string } => {
  const exactHit = pickFirstTextValue(sourceNodes, keys);
  if (exactHit.value) {
    return exactHit;
  }

  const normalizedTokens = keys.map(normalizeLookupKey).filter(Boolean);
  for (const sourceNode of sourceNodes) {
    for (const [key, value] of Object.entries(sourceNode.record)) {
      const normalizedKey = normalizeLookupKey(key);
      if (!normalizedKey) {
        continue;
      }
      const maybeMatch = normalizedTokens.some((token) => normalizedKey.includes(token) || token.includes(normalizedKey));
      if (!maybeMatch) {
        continue;
      }
      const text = valueToSearchableText(value);
      if (text) {
        return {
          value: text,
          source: `${sourceNode.path}.${key}`
        };
      }
    }
  }

  return { value: "", source: "" };
};

const buildResumeIdentitySnapshot = (userInput: PlainRecord, resumeSourceInput?: unknown): PlainRecord => {
  const user = toRecord(userInput);
  const sourceNodes = collectResumeSourceNodes(user, resumeSourceInput);
  const fieldSearchMap: Record<string, string[]> = {
    fullName: ["realName", "name", "fullName", "userName", "nickName", "nickname", "resumeName", "geekName"],
    gender: ["gender", "sex", "genderDesc"],
    age: ["age"],
    workYears: ["workYear", "workYears", "workExperience", "experienceYears", "workExp", "experience"],
    education: ["degree", "education", "educationLevel", "highestDegree", "eduLevel", "schoolDegree"],
    school: ["school", "schoolName", "graduateSchool", "college", "university"],
    major: ["major", "majorName", "speciality", "specialty"],
    currentCity: ["city", "cityName", "currentCity", "liveCity", "location"],
    expectedCity: ["expectCity", "expectedCity", "intentionCity", "expectLocation"],
    expectedJob: ["expectJob", "expectedJob", "expectPosition", "expectedPosition", "jobIntention", "desiredPosition"],
    currentCompany: ["company", "lastCompany", "recentCompany", "companyName", "curCompany"],
    currentPosition: ["position", "lastPosition", "recentJobTitle", "jobTitle", "curPosition"],
    expectedSalary: ["expectSalary", "expectedSalary", "desiredSalary", "salaryExpectation"],
    workStatus: ["workStatus", "jobStatus", "careerStatus", "employmentStatus"],
    profileSummary: [
      "selfIntroduction",
      "introduction",
      "summary",
      "personalSummary",
      "advantage",
      "resumeSummary",
      "profileDesc",
      "selfDescription"
    ],
    resumeTextSnippet: RESUME_TEXT_SEARCH_KEYS
  };

  const identityFieldSources: PlainRecord = {};
  const identityDraft: PlainRecord = {};

  for (const [field, searchKeys] of Object.entries(fieldSearchMap)) {
    const hit = getSearchResult(sourceNodes, searchKeys);
    if (!hit.value) {
      continue;
    }
    if (field === "resumeTextSnippet") {
      identityDraft[field] = normalizeMultilineText(hit.value, "").slice(0, RESUME_NARRATIVE_SNIPPET_MAX_LENGTH);
    } else {
      identityDraft[field] = hit.value;
    }
    if (hit.source) {
      identityFieldSources[field] = hit.source;
    }
  }

  const identity = compactRecord(identityDraft);
  const foundIdentityFields = Object.keys(identity);

  if (foundIdentityFields.length === 0) {
    identity.note = "未读取到更多简历身份字段(仅检测到基础账号信息)";
  } else {
    const missingFields = Object.keys(fieldSearchMap).filter((field) => !foundIdentityFields.includes(field));
    if (missingFields.length) {
      identity.missingFields = missingFields.join(", ");
    }
  }

  if (Object.keys(identityFieldSources).length) {
    identity.identityFieldSources = identityFieldSources;
    identity.sourceSummary = Object.entries(identityFieldSources)
      .map(([field, source]) => `${field}<=${source}`)
      .join("; ");
  }

  return identity;
};

const toDisplayText = (value: unknown, fallback = "未提供"): string => {
  if (Array.isArray(value)) {
    return formatList(value, fallback);
  }
  if (value && typeof value === "object") {
    const record = value as PlainRecord;
    return Object.keys(record).length ? JSON.stringify(record) : fallback;
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  return normalizeInlineText(value, fallback);
};

const truncateInline = (value: unknown, maxLength = 160): string => {
  const text = normalizeInlineText(value, "");
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const buildResumeNarrativeText = (resumeIdentityInput: PlainRecord): string => {
  const resumeIdentity = toRecord(resumeIdentityInput);

  const profile = [
    `姓名${truncateInline(resumeIdentity.fullName, 24)}`,
    `性别${truncateInline(resumeIdentity.gender, 16)}`,
    `年龄${truncateInline(resumeIdentity.age, 16)}`,
    `工作年限${truncateInline(resumeIdentity.workYears, 20)}`,
    `最高学历${truncateInline(resumeIdentity.education, 24)}`,
    `毕业院校${truncateInline(resumeIdentity.school, 40)}`,
    `专业${truncateInline(resumeIdentity.major, 40)}`
  ].filter((item) => !item.endsWith("姓名") && !item.endsWith("性别") && !item.endsWith("年龄") && !item.endsWith("工作年限") && !item.endsWith("最高学历") && !item.endsWith("毕业院校") && !item.endsWith("专业"));

  const intent = [
    truncateInline(resumeIdentity.expectedJob, 40) ? `期望岗位${truncateInline(resumeIdentity.expectedJob, 40)}` : "",
    truncateInline(resumeIdentity.expectedCity, 30) ? `期望城市${truncateInline(resumeIdentity.expectedCity, 30)}` : "",
    truncateInline(resumeIdentity.expectedSalary, 30) ? `期望薪资${truncateInline(resumeIdentity.expectedSalary, 30)}` : "",
    truncateInline(resumeIdentity.workStatus, 24) ? `求职状态${truncateInline(resumeIdentity.workStatus, 24)}` : ""
  ].filter(Boolean);

  const experience = [
    truncateInline(resumeIdentity.currentCompany, 50) ? `最近公司${truncateInline(resumeIdentity.currentCompany, 50)}` : "",
    truncateInline(resumeIdentity.currentPosition, 40) ? `最近岗位${truncateInline(resumeIdentity.currentPosition, 40)}` : "",
    truncateInline(resumeIdentity.currentCity, 30) ? `当前城市${truncateInline(resumeIdentity.currentCity, 30)}` : ""
  ].filter(Boolean);

  const lines: string[] = [];
  if (profile.length) {
    lines.push(`候选人概况：${profile.join("，")}。`);
  }
  if (intent.length) {
    lines.push(`求职意向：${intent.join("，")}。`);
  }
  if (experience.length) {
    lines.push(`近期经历：${experience.join("，")}。`);
  }

  const profileSummary = truncateInline(resumeIdentity.profileSummary, 240);
  if (profileSummary) {
    lines.push(`个人简介：${profileSummary}`);
  }

  const resumeTextSnippet = normalizeMultilineText(resumeIdentity.resumeTextSnippet, "");
  if (resumeTextSnippet) {
    lines.push(`简历原文摘录：${resumeTextSnippet.slice(0, RESUME_NARRATIVE_SNIPPET_MAX_LENGTH)}`);
  }

  if (!lines.length) {
    return "未读取到可用的个人简历文本，请先在账户信息中导入个人页简历。";
  }

  return lines.join("\n");
};

const buildImportedResumeSnippet = (userInput: PlainRecord): { text: string; source: string } => {
  const user = toRecord(userInput);
  const importedResume = toRecord(user.importedResume);
  if (!Object.keys(importedResume).length) {
    return { text: "", source: "" };
  }

  const sourceNodes = collectSourceNodes(
    importedResume,
    6,
    {
      excludePathPrefixes: ["user.preference", "user.preferenceMap"],
      excludeKeyNames: ["preference", "preferenceMap"]
    },
    "user.importedResume"
  );
  const hit = getSearchResult(sourceNodes, RESUME_TEXT_SEARCH_KEYS);
  const text = normalizeMultilineText(hit.value, "").slice(0, IMPORTED_RESUME_SNIPPET_MAX_LENGTH);
  if (!text) {
    return { text: "", source: "" };
  }

  const explicitSource = normalizeInlineText(importedResume.resumeTextSource, "");
  return {
    text,
    source: explicitSource || hit.source || "user.importedResume"
  };
};

const formatResumeIdentityText = (resumeIdentityInput: PlainRecord): string => {
  const resumeIdentity = toRecord(resumeIdentityInput);
  const ignoredKeys = new Set(["identityFieldSources", "sourceSummary"]);
  const labelMap: Record<string, string> = {
    fullName: "姓名",
    gender: "性别",
    age: "年龄",
    workYears: "工作年限",
    education: "最高学历",
    school: "毕业院校",
    major: "专业",
    currentCity: "当前城市",
    expectedCity: "期望城市",
    expectedJob: "期望岗位",
    currentCompany: "最近公司",
    currentPosition: "最近岗位",
    expectedSalary: "期望薪资",
    workStatus: "求职状态",
    profileSummary: "个人简介",
    resumeTextSnippet: "简历文本摘要",
    missingFields: "未命中字段",
    note: "备注"
  };

  const lines = Object.entries(resumeIdentity)
    .filter(([key, value]) => !ignoredKeys.has(key) && isMeaningful(value))
    .map(([key, value]) => {
      const label = labelMap[key] || key;
      return `${label}：${toDisplayText(value)}`;
    });

  return lines.length ? lines.join("\n") : "备注：未读取到更多简历身份字段";
};

export const buildTraditionalRuleSnapshot = (preferenceInput: PlainRecord): PlainRecord => {
  const preference = toRecord(preferenceInput);
  const salaryEnabled = normalizePreferenceBoolean(preference.srE, false);
  return {
    companyInclude: normalizePreferenceBoolean(preference.cniE, false) ? toArray(preference.cni) : [],
    companyExclude: normalizePreferenceBoolean(preference.cneE, false) ? toArray(preference.cne) : [],
    jobInclude: normalizePreferenceBoolean(preference.jniE, false) ? toArray(preference.jni) : [],
    jobExclude: normalizePreferenceBoolean(preference.jneE, false) ? toArray(preference.jne) : [],
    contentInclude: normalizePreferenceBoolean(preference.jciE, false) ? toArray(preference.jci) : [],
    contentExclude: normalizePreferenceBoolean(preference.jceE, false) ? toArray(preference.jce) : [],
    salaryRange: salaryEnabled ? toText(preference.sr) : "",
    salaryType: salaryEnabled ? toText(preference.srT, "1") : "",
    companyScaleRange: normalizePreferenceBoolean(preference.csrE, false) ? toText(preference.csr) : "",
    filterHunter: normalizePreferenceBoolean(preference.fhE, false),
    onlyBossOnline: normalizePreferenceBoolean(preference.polE, false),
    activeFilter: {
      enabled: normalizePreferenceBoolean(preference.acE, false),
      week: normalizePreferenceBoolean(preference.acW, true),
      month: normalizePreferenceBoolean(preference.acM, true),
      year: normalizePreferenceBoolean(preference.acY, true)
    }
  };
};

export const buildAiDeliveryUserProfile = (userInput: PlainRecord, preferenceInput: PlainRecord): PlainRecord => {
  const user = toRecord(userInput);
  const preference = toRecord(preferenceInput);
  const sourceNodes = collectSourceNodes(
    user,
    4,
    {
      excludePathPrefixes: ["user.preference", "user.preferenceMap"],
      excludeKeyNames: ["preference", "preferenceMap"]
    },
    "user"
  );
  const resumeId = getSearchResult(sourceNodes, ["resumeId", "attachmentResumeId", "geekResumeId"]).value || toText(user.resumeId);
  const resumeIdentity = buildResumeIdentitySnapshot(
    user,
    user.importedResume || user.parsedResume || user.attachmentResume || user.resume || user.resumeInfo || user.resumeProfile
  );
  const importedResumeSnippet = buildImportedResumeSnippet(user);
  const identityRecord = toRecord(resumeIdentity);
  const resumeNarrative = buildResumeNarrativeText(identityRecord);
  const expectedJobIncludeRaw = normalizeKeywordList(preference.jni);
  const expectedCompanyIncludeRaw = normalizeKeywordList(preference.cni);
  const expectedContentIncludeRaw = normalizeKeywordList(preference.jci);
  const excludedJob = normalizeKeywordList(preference.jne);
  const excludedCompany = normalizeKeywordList(preference.cne);
  const excludedContent = normalizeKeywordList(preference.jce);
  const conflictJobKeywords = collectKeywordConflicts(expectedJobIncludeRaw, excludedJob);
  const conflictCompanyKeywords = collectKeywordConflicts(expectedCompanyIncludeRaw, excludedCompany);
  const conflictContentKeywords = collectKeywordConflicts(expectedContentIncludeRaw, excludedContent);
  const expectedJobInclude = excludeConflictedKeywords(expectedJobIncludeRaw, excludedJob);
  const expectedCompanyInclude = excludeConflictedKeywords(expectedCompanyIncludeRaw, excludedCompany);
  const expectedContentInclude = excludeConflictedKeywords(expectedContentIncludeRaw, excludedContent);
  const hasIdentityFields = Object.keys(identityRecord).some(
    (key) => !["note", "missingFields", "sourceSummary", "identityFieldSources"].includes(key)
  );
  const hasImportedResume = !!resumeId || !!importedResumeSnippet.text || hasIdentityFields;
  return {
    phone: toText(user.phone),
    email: toText(user.email),
    resumeId,
    importedResumeTextSnippet: importedResumeSnippet.text,
    importedResumeTextSource: importedResumeSnippet.source,
    resumeNarrative,
    hasImportedResume,
    hasImageResume: !!toText(getPreferenceValue(preference, "customImageSet", "cI")),
    resumeIdentity,
    expectedJobInclude,
    expectedCompanyInclude,
    expectedContentInclude,
    excludedJob,
    excludedCompany,
    excludedContent,
    conflictJobKeywords,
    conflictCompanyKeywords,
    conflictContentKeywords,
    hasRuleConflict: conflictJobKeywords.length > 0 || conflictCompanyKeywords.length > 0 || conflictContentKeywords.length > 0,
    expectedSalary: toText(preference.sr),
    expectedSalaryType: toText(preference.srT, "1"),
    resolvedConstraints: {
      includeJobKeywords: expectedJobInclude,
      includeCompanyKeywords: expectedCompanyInclude,
      includeContentKeywords: expectedContentInclude,
      excludeJobKeywords: excludedJob,
      excludeCompanyKeywords: excludedCompany,
      excludeContentKeywords: excludedContent,
      salaryRange: toText(preference.sr),
      salaryType: toText(preference.srT, "1")
    }
  };
};

const buildProfileCompleteness = (resumeIdentityInput: PlainRecord): { score: number; total: number; missingLabels: string[] } => {
  const resumeIdentity = toRecord(resumeIdentityInput);
  const criticalFields: Array<{ key: string; label: string }> = [
    { key: "workYears", label: "工作年限" },
    { key: "education", label: "最高学历" },
    { key: "expectedJob", label: "期望岗位" },
    { key: "expectedCity", label: "期望城市" },
    { key: "resumeTextSnippet", label: "简历文本" }
  ];

  let score = 0;
  const missingLabels: string[] = [];
  for (const field of criticalFields) {
    if (isMeaningful(resumeIdentity[field.key])) {
      score += 1;
    } else {
      missingLabels.push(field.label);
    }
  }

  return {
    score,
    total: criticalFields.length,
    missingLabels
  };
};

const buildCandidateEvidenceText = (userProfileInput: PlainRecord): string => {
  const userProfile = toRecord(userProfileInput);
  const resumeIdentity = toRecord(userProfile.resumeIdentity);
  const sourceText = [
    normalizeMultilineText(userProfile.importedResumeTextSnippet, ""),
    normalizeMultilineText(userProfile.resumeNarrative, ""),
    normalizeMultilineText(resumeIdentity.resumeTextSnippet, "")
  ].find(Boolean);

  if (!sourceText) {
    return "未读取到可用简历证据，请先在账户信息中导入个人页简历。";
  }

  const evidenceLines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of sourceText.split("\n")) {
    const line = rawLine.replace(/^[\s\-•*\d.、()（）]+/, "").trim();
    if (!line) {
      continue;
    }
    const key = normalizeLookupKey(line.slice(0, 64));
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }
    evidenceLines.push(`- ${line}`);
    if (evidenceLines.length >= 10) {
      break;
    }
  }

  const merged = (evidenceLines.length ? evidenceLines.join("\n") : sourceText).trim();
  return merged.slice(0, CANDIDATE_EVIDENCE_MAX_LENGTH);
};

export const buildAiDeliveryUserProfileText = (userProfileInput: PlainRecord): string => {
  const userProfile = toRecord(userProfileInput);
  const resumeIdentity = toRecord(userProfile.resumeIdentity);
  const resolvedConstraints = toRecord(userProfile.resolvedConstraints);
  const completeness = buildProfileCompleteness(resumeIdentity);
  const lines = [
    "[候选人匹配卡]",
    `联系方式：手机号=${toDisplayText(userProfile.phone)}；邮箱=${toDisplayText(userProfile.email)}`,
    `是否已导入个人页简历：${toDisplayText(userProfile.hasImportedResume)}`,
    `是否已配置图片简历：${toDisplayText(userProfile.hasImageResume)}`,
    `个人页简历来源：${toDisplayText(userProfile.importedResumeTextSource, "未提供")}`,
    `资料完整度：${completeness.score}/${completeness.total}；缺失关键字段：${completeness.missingLabels.length ? completeness.missingLabels.join("、") : "无"}`,
    `目标岗位关键词：${formatList(resolvedConstraints.includeJobKeywords || userProfile.expectedJobInclude)}`,
    `目标公司关键词：${formatList(resolvedConstraints.includeCompanyKeywords || userProfile.expectedCompanyInclude)}`,
    `目标内容关键词：${formatList(resolvedConstraints.includeContentKeywords || userProfile.expectedContentInclude)}`,
    `硬性排除岗位关键词：${formatList(resolvedConstraints.excludeJobKeywords || userProfile.excludedJob)}`,
    `硬性排除公司关键词：${formatList(resolvedConstraints.excludeCompanyKeywords || userProfile.excludedCompany)}`,
    `硬性排除内容关键词：${formatList(resolvedConstraints.excludeContentKeywords || userProfile.excludedContent)}`,
    `薪资约束：范围=${toDisplayText(resolvedConstraints.salaryRange || userProfile.expectedSalary, "未配置")}；类型=${toDisplayText(resolvedConstraints.salaryType || userProfile.expectedSalaryType, "1")}`,
    `规则冲突标记：岗位=${formatList(userProfile.conflictJobKeywords)}；公司=${formatList(userProfile.conflictCompanyKeywords)}；内容=${formatList(userProfile.conflictContentKeywords)}；存在冲突=${toDisplayText(userProfile.hasRuleConflict)}`,
    "核心简历证据：",
    buildCandidateEvidenceText(userProfile),
    "简历身份补充：",
    formatResumeIdentityText(resumeIdentity)
  ];

  return lines.join("\n");
};

export const buildTraditionalRuleSnapshotText = (snapshotInput: PlainRecord): string => {
  const snapshot = toRecord(snapshotInput);
  const activeFilter = toRecord(snapshot.activeFilter);
  return [
    `公司名包含：${formatList(snapshot.companyInclude)}`,
    `公司名排除：${formatList(snapshot.companyExclude)}`,
    `岗位名包含：${formatList(snapshot.jobInclude)}`,
    `岗位名排除：${formatList(snapshot.jobExclude)}`,
    `内容关键词包含：${formatList(snapshot.contentInclude)}`,
    `内容关键词排除：${formatList(snapshot.contentExclude)}`,
    `薪资范围：${toDisplayText(snapshot.salaryRange)}`,
    `薪资类型：${toDisplayText(snapshot.salaryType)}`,
    `公司规模范围：${toDisplayText(snapshot.companyScaleRange)}`,
    `过滤猎头：${toDisplayText(snapshot.filterHunter)}`,
    `仅Boss在线：${toDisplayText(snapshot.onlyBossOnline)}`,
    `活跃度过滤：启用=${toDisplayText(activeFilter.enabled)}，过滤周=${toDisplayText(activeFilter.week)}，过滤月=${toDisplayText(activeFilter.month)}，过滤年=${toDisplayText(activeFilter.year)}`
  ].join("\n");
};

export const buildAiDeliveryJudgePrompt = (
  config: AiDeliveryPromptConfig,
  userProfileInput: PlainRecord,
  traditionalSnapshotInput: PlainRecord
): string => {
  const sections: string[] = [];
  const prompt = normalizeInlineText(config.prompt, "");
  if (prompt) {
    sections.push(prompt);
  }

  const extraPrompt = normalizeInlineText(config.extraPrompt, "");
  if (extraPrompt) {
    sections.push(`[附加指令]\n${extraPrompt}`);
  }

  if (config.includeUserProfile) {
    sections.push(`[求职者个人信息]\n${buildAiDeliveryUserProfileText(userProfileInput)}`);
  }

  if (config.includeTraditionalSnapshot) {
    sections.push(`[传统规则摘要(仅供AI参考)]\n${buildTraditionalRuleSnapshotText(traditionalSnapshotInput)}`);
  }

  sections.push(`[输出约束]\n${AI_DELIVERY_OUTPUT_CONTRACT}`);

  return sections.join("\n\n");
};

export const buildAiDeliveryJobBaseInfoText = (baseInfoInput: PlainRecord): string => {
  const baseInfo = toRecord(baseInfoInput);
  const location = [baseInfo.cityName, baseInfo.areaDistrict, baseInfo.businessDistrict]
    .map((item) => normalizeInlineText(item, ""))
    .filter(Boolean)
    .join(" / ");

  const companyParts = [normalizeInlineText(baseInfo.brandName, ""), normalizeInlineText(baseInfo.brandIndustry, "")].filter(Boolean);

  return [
    "[岗位匹配卡]",
    `岗位职能：${toDisplayText(baseInfo.jobName)}`,
    `行业领域：${toDisplayText(baseInfo.brandIndustry)}`,
    `经验要求：${toDisplayText(baseInfo.jobExperience)}`,
    `学历要求：${toDisplayText(baseInfo.jobDegree)}`,
    `技能关键词：${formatList(baseInfo.skills)}`,
    `工作地点：${location || "未提供"}`,
    `薪资描述：${toDisplayText(baseInfo.salaryDesc)}`,
    `岗位标签：${formatList(baseInfo.jobLabels)}`,
    `公司信息：${companyParts.length ? companyParts.join(" | ") : "未提供"}`,
    `公司阶段：${toDisplayText(baseInfo.brandStageName)}`,
    `公司规模：${toDisplayText(baseInfo.brandScaleName)}`,
    `岗位福利：${formatList(baseInfo.welfareList)}`
  ].join("\n");
};

const buildJobDescriptionEvidenceText = (postDescriptionInput: unknown): string => {
  const normalized = normalizeMultilineText(postDescriptionInput, "");
  if (!normalized) {
    return "未提供可用岗位描述。";
  }

  const pickedLines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.replace(/^[\s\-•*\d.、()（）一二三四五六七八九十]+/, "").trim();
    if (!line) {
      continue;
    }
    const key = normalizeLookupKey(line.slice(0, 64));
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }
    pickedLines.push(`- ${line}`);
    if (pickedLines.length >= 12) {
      break;
    }
  }

  const merged = (pickedLines.length ? pickedLines.join("\n") : normalized).trim();
  return merged.slice(0, JOB_DESCRIPTION_SNIPPET_MAX_LENGTH);
};

export const buildAiDeliveryJobExtInfoText = (extInfoInput: PlainRecord): string => {
  const extInfo = toRecord(extInfoInput);
  return [
    "[岗位扩展证据]",
    `Boss活跃度：${toDisplayText(extInfo.activeTimeDesc)}`,
    `工作地址：${toDisplayText(extInfo.address)}`,
    "岗位描述关键证据：",
    buildJobDescriptionEvidenceText(extInfo.postDescription)
  ].join("\n");
};

export const buildAiDeliveryFilterJobInput = (
  baseInfoInput: PlainRecord,
  extInfoInput: PlainRecord
): { jobBaseInfo: string; jobExtInfo: string } => {
  return {
    jobBaseInfo: buildAiDeliveryJobBaseInfoText(baseInfoInput),
    jobExtInfo: buildAiDeliveryJobExtInfoText(extInfoInput)
  };
};

export const resolveAiDeliveryFallback = (
  strategyInput: unknown,
  stage: AiDeliveryFallbackStage,
  parseModeInput = ""
): AiDeliveryFallbackResolution => {
  const strategy = normalizeInlineText(strategyInput, "reject");
  if (strategy !== "fallback-traditional") {
    return {
      enabled: false,
      parseMode: ""
    };
  }

  if (stage === "ai-error") {
    return {
      enabled: true,
      parseMode: "ai-error.fallback-traditional"
    };
  }

  const baseParseMode = normalizeInlineText(parseModeInput, "invalid");
  return {
    enabled: true,
    parseMode: `${baseParseMode}.fallback-traditional`
  };
};
