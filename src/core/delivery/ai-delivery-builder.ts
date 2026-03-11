// 文件使用 UTF-8 编码保存。
import { normalizePreferenceBoolean } from '@/shared/utils/preference';

/**
 * AI 投递提示词配置。
 */
export type AiDeliveryPromptConfig = {
  /** 作为主判断依据的基础提示词。 */
  prompt: string;
  /** 追加到主提示词后的补充说明。 */
  extraPrompt?: string;
  /** 需要 AI 重点关注的技能关键词列表。 */
  focusSkills?: string[];
  /** 命中后应直接判定为不匹配的排除关键词列表。 */
  excludeKeywords?: string[];
  /** 是否在提示词中附带候选人画像。 */
  includeUserProfile: boolean;
  /** 是否在提示词中附带传统规则摘要。 */
  includeTraditionalSnapshot: boolean;
};

/**
 * AI 投递失败兜底触发阶段。
 */
export type AiDeliveryFallbackStage = 'ai-error' | 'invalid-result';

/**
 * AI 投递失败后的兜底解析结果。
 */
export type AiDeliveryFallbackResolution = {
  /** 是否启用传统规则兜底。 */
  enabled: boolean;
  /** 当前使用的解析模式标识。 */
  parseMode: string;
};

type PlainRecord = Record<string, unknown>;

/**
 * 简历或用户对象树中收集到的可搜索节点。
 */
type SourceNode = {
  /** 节点在原始对象中的访问路径。 */
  path: string;
  /** 当前路径对应的扁平对象记录。 */
  record: PlainRecord;
};

/**
 * 遍历候选人资料树时的过滤配置。
 */
type CollectSourceNodeOptions = {
  /** 需要整段跳过的路径前缀列表。 */
  excludePathPrefixes?: string[];
  /** 需要忽略的字段名列表。 */
  excludeKeyNames?: string[];
};

const RESUME_TEXT_SEARCH_KEYS = [
  'resumeText',
  'resumePlainText',
  'resumeBodyText',
  'resumePageText',
  'runtimeResumeText',
  'resumeContent',
  'cvText',
  'attachmentResumeText',
  'parsedResumeText',
  'ocrText',
  'resumeRawText',
  'text',
  'content',
];
const IMPORTED_RESUME_SNIPPET_MAX_LENGTH = 900;
const RESUME_NARRATIVE_SNIPPET_MAX_LENGTH = 360;
const JOB_DESCRIPTION_SNIPPET_MAX_LENGTH = 1200;
const CANDIDATE_EVIDENCE_MAX_LENGTH = 720;
const MAX_RULE_KEYWORD_ITEMS = 12;

/**
 * AI 评估输出约束，要求模型始终返回单行 JSON，便于后续稳定解析。
 */
const AI_DELIVERY_OUTPUT_CONTRACT =
  '仅输出一行JSON，且只能包含两个键：match(boolean) 与 reason(string)。禁止输出Markdown、代码块或额外解释。信息不足时返回 {"match":false,"reason":"[INFO_MISSING] 信息不足"}。';

const toRecord = (value: unknown): PlainRecord => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PlainRecord;
  }
  return {};
};

const toArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const normalizeLookupKey = (value: string): string => {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
};

const toText = (value: unknown, fallback = ''): string => {
  return `${value ?? fallback}`;
};

const getPreferenceValue = (
  preference: PlainRecord,
  canonicalKey: string,
  legacyKey: string
): unknown => {
  return preference[canonicalKey] ?? preference[legacyKey];
};

const normalizeInlineText = (value: unknown, fallback = '未提供'): string => {
  const normalized = toText(value).replace(/\s+/g, ' ').trim();
  return normalized || fallback;
};

const normalizeMultilineText = (value: unknown, fallback = '未提供'): string => {
  const raw = toText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').map((line) => line.replace(/\s+/g, ' ').trim());
  const collapsed: string[] = [];
  let previousBlank = false;

  for (const line of lines) {
    if (!line) {
      if (!previousBlank) {
        collapsed.push('');
      }
      previousBlank = true;
      continue;
    }
    collapsed.push(line);
    previousBlank = false;
  }

  const normalized = collapsed.join('\n').trim();
  return normalized || fallback;
};

const formatList = (value: unknown, fallback = '无'): string => {
  const list = toArray(value)
    .map((item) => normalizeInlineText(item, ''))
    .filter(Boolean);
  return list.length ? list.join('、') : fallback;
};

const normalizeKeywordList = (value: unknown, maxItems = MAX_RULE_KEYWORD_ITEMS): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of toArray(value)) {
    const text = normalizeInlineText(item, '');
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
  return ['string', 'number', 'boolean'].includes(typeof value) || value == null;
};

const isMeaningful = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
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

/**
 * 深度遍历对象树并收集可用于搜索的节点。
 *
 * @param value 待遍历的原始值，通常为用户信息、简历对象或其子树。
 * @param maxDepth 最大遍历深度，用于控制递归成本并避免无穷展开。
 * @param options 路径与字段过滤配置，用于排除无关或噪声数据。
 * @param rootPath 根节点路径标识，便于后续回溯命中来源。
 * @returns 返回按遍历顺序收集到的节点列表，每个节点都包含路径与对象记录。
 */
const collectSourceNodes = (
  value: unknown,
  maxDepth = 5,
  options: CollectSourceNodeOptions = {},
  rootPath = 'user'
): SourceNode[] => {
  const result: SourceNode[] = [];
  const visited = new Set<object>();
  const excludedPaths = toArray(options.excludePathPrefixes)
    .map((item) => normalizeInlineText(item, ''))
    .filter(Boolean);
  const excludedKeySet = new Set(
    toArray(options.excludeKeyNames)
      .map((item) => normalizeLookupKey(normalizeInlineText(item, '')))
      .filter(Boolean)
  );

  const isExcludedPath = (path: string): boolean => {
    return excludedPaths.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`)
    );
  };

  const walk = (current: unknown, path: string, depth: number): void => {
    if (depth > maxDepth) {
      return;
    }
    // 跳过明确排除的路径，避免把偏好配置等噪声字段混入简历检索上下文。
    if (isExcludedPath(path)) {
      return;
    }
    if (!current || typeof current !== 'object') {
      return;
    }
    // 记录已访问对象，避免循环引用或共享引用导致重复遍历。
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
      if (child && typeof child === 'object') {
        walk(child, path ? `${path}.${key}` : key, depth + 1);
      }
    }
  };

  walk(value, rootPath, 0);
  return result;
};

/**
 * 从用户对象顶层推断最可能承载简历信息的根节点。
 *
 * @param userInput 用户资料对象。
 * @returns 返回候选简历根节点列表，包含路径与原始值，供后续深度搜索使用。
 */
const findLikelyResumeRootNodes = (
  userInput: PlainRecord
): Array<{ path: string; value: unknown }> => {
  const user = toRecord(userInput);
  const roots: Array<{ path: string; value: unknown }> = [];
  const preferredKeys = [
    'importedResume',
    'resume',
    'resumeInfo',
    'resumeProfile',
    'resumeDetail',
    'resumeData',
    'attachmentResume',
    'attachmentResumeInfo',
    'parsedResume',
    'parsedResumeData',
    'cv',
    'profile',
    'geekResume',
  ];
  const normalizedPreferredKeys = new Set(preferredKeys.map(normalizeLookupKey));
  const weakTokens = [
    'resume',
    'cv',
    'profile',
    'geek',
    'job',
    'career',
    'intent',
    'education',
    'experience',
    '简历',
    '履历',
    '求职',
  ];

  for (const [key, value] of Object.entries(user)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    const normalizedKey = normalizeLookupKey(key);
    if (!normalizedKey || normalizedKey === 'preference' || normalizedKey === 'preferencemap') {
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

/**
 * 聚合所有可能包含简历信息的来源节点。
 *
 * @param userInput 用户资料对象。
 * @param resumeSourceInput 显式传入的简历来源对象，优先作为搜索入口。
 * @returns 返回去重后的节点列表，供简历字段搜索与证据构建复用。
 */
const collectResumeSourceNodes = (
  userInput: PlainRecord,
  resumeSourceInput?: unknown
): SourceNode[] => {
  const user = toRecord(userInput);
  const nodes: SourceNode[] = [];
  const nodeSeen = new Set<PlainRecord>();
  const rootSeen = new Set<string>();

  const appendNodes = (value: unknown, rootPath: string, maxDepth = 6): void => {
    if (!value || typeof value !== 'object') {
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
        excludePathPrefixes: ['user.preference', 'user.preferenceMap'],
        excludeKeyNames: ['preference', 'preferenceMap'],
      },
      rootPath
    );
    for (const node of collected) {
      // 同一个对象可能被多个路径引用，这里按对象引用去重，避免后续字段命中重复命中同一份内容。
      if (nodeSeen.has(node.record)) {
        continue;
      }
      nodeSeen.add(node.record);
      nodes.push(node);
    }
  };

  appendNodes(resumeSourceInput, 'resumeSource', 7);
  for (const root of findLikelyResumeRootNodes(user)) {
    appendNodes(root.value, root.path, 7);
  }
  appendNodes(user, 'user', 5);

  return nodes;
};

const valueToSearchableText = (value: unknown): string => {
  if (!isPrimitive(value)) {
    if (Array.isArray(value) && value.every((item) => isPrimitive(item))) {
      return value
        .map((item) => normalizeInlineText(item, ''))
        .filter(Boolean)
        .join('、');
    }
    return '';
  }
  return normalizeInlineText(value, '');
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
          source: `${sourceNode.path}.${key}`,
        };
      }
    }
  }

  return { value: '', source: '' };
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
      const maybeMatch = normalizedTokens.some(
        (token) => normalizedKey.includes(token) || token.includes(normalizedKey)
      );
      if (!maybeMatch) {
        continue;
      }
      const text = valueToSearchableText(value);
      if (text) {
        return {
          value: text,
          source: `${sourceNode.path}.${key}`,
        };
      }
    }
  }

  return { value: '', source: '' };
};

/**
 * 从候选人资料与简历对象中提取结构化身份快照。
 *
 * @param userInput 用户资料对象。
 * @param resumeSourceInput 可选的显式简历来源对象，会优先参与字段搜索。
 * @returns 返回提炼后的简历身份字段集合，并补充缺失字段说明与来源摘要。
 */
const buildResumeIdentitySnapshot = (
  userInput: PlainRecord,
  resumeSourceInput?: unknown
): PlainRecord => {
  const user = toRecord(userInput);
  const sourceNodes = collectResumeSourceNodes(user, resumeSourceInput);
  const fieldSearchMap: Record<string, string[]> = {
    fullName: [
      'realName',
      'name',
      'fullName',
      'userName',
      'nickName',
      'nickname',
      'resumeName',
      'geekName',
    ],
    gender: ['gender', 'sex', 'genderDesc'],
    age: ['age'],
    workYears: [
      'workYear',
      'workYears',
      'workExperience',
      'experienceYears',
      'workExp',
      'experience',
    ],
    education: [
      'degree',
      'education',
      'educationLevel',
      'highestDegree',
      'eduLevel',
      'schoolDegree',
    ],
    school: ['school', 'schoolName', 'graduateSchool', 'college', 'university'],
    major: ['major', 'majorName', 'speciality', 'specialty'],
    currentCity: ['city', 'cityName', 'currentCity', 'liveCity', 'location'],
    expectedCity: ['expectCity', 'expectedCity', 'intentionCity', 'expectLocation'],
    expectedJob: [
      'expectJob',
      'expectedJob',
      'expectPosition',
      'expectedPosition',
      'jobIntention',
      'desiredPosition',
    ],
    currentCompany: ['company', 'lastCompany', 'recentCompany', 'companyName', 'curCompany'],
    currentPosition: ['position', 'lastPosition', 'recentJobTitle', 'jobTitle', 'curPosition'],
    expectedSalary: ['expectSalary', 'expectedSalary', 'desiredSalary', 'salaryExpectation'],
    workStatus: ['workStatus', 'jobStatus', 'careerStatus', 'employmentStatus'],
    profileSummary: [
      'selfIntroduction',
      'introduction',
      'summary',
      'personalSummary',
      'advantage',
      'resumeSummary',
      'profileDesc',
      'selfDescription',
    ],
    resumeTextSnippet: RESUME_TEXT_SEARCH_KEYS,
  };

  const identityFieldSources: PlainRecord = {};
  const identityDraft: PlainRecord = {};

  for (const [field, searchKeys] of Object.entries(fieldSearchMap)) {
    const hit = getSearchResult(sourceNodes, searchKeys);
    if (!hit.value) {
      continue;
    }
    // 简历原文摘要单独截断，避免在后续 prompt 中注入过长文本。
    if (field === 'resumeTextSnippet') {
      identityDraft[field] = normalizeMultilineText(hit.value, '').slice(
        0,
        RESUME_NARRATIVE_SNIPPET_MAX_LENGTH
      );
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
    identity.note = '未读取到更多简历身份字段(仅检测到基础账号信息)';
  } else {
    // 将未命中的关键字段保留给上层，便于在 prompt 中提示资料完整度不足。
    const missingFields = Object.keys(fieldSearchMap).filter(
      (field) => !foundIdentityFields.includes(field)
    );
    if (missingFields.length) {
      identity.missingFields = missingFields.join(', ');
    }
  }

  if (Object.keys(identityFieldSources).length) {
    identity.identityFieldSources = identityFieldSources;
    identity.sourceSummary = Object.entries(identityFieldSources)
      .map(([field, source]) => `${field}<=${source}`)
      .join('; ');
  }

  return identity;
};

const toDisplayText = (value: unknown, fallback = '未提供'): string => {
  if (Array.isArray(value)) {
    return formatList(value, fallback);
  }
  if (value && typeof value === 'object') {
    const record = value as PlainRecord;
    return Object.keys(record).length ? JSON.stringify(record) : fallback;
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return normalizeInlineText(value, fallback);
};

const truncateInline = (value: unknown, maxLength = 160): string => {
  const text = normalizeInlineText(value, '');
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

/**
 * 将结构化简历身份快照压缩为可直接拼接到提示词中的候选人叙述文本。
 *
 * @param resumeIdentityInput 简历身份快照对象。
 * @returns 返回多行中文简历摘要文本；若缺少关键数据，则返回缺失提示。
 */
const buildResumeNarrativeText = (resumeIdentityInput: PlainRecord): string => {
  const resumeIdentity = toRecord(resumeIdentityInput);

  const profile = [
    `姓名${truncateInline(resumeIdentity.fullName, 24)}`,
    `性别${truncateInline(resumeIdentity.gender, 16)}`,
    `年龄${truncateInline(resumeIdentity.age, 16)}`,
    `工作年限${truncateInline(resumeIdentity.workYears, 20)}`,
    `最高学历${truncateInline(resumeIdentity.education, 24)}`,
    `毕业院校${truncateInline(resumeIdentity.school, 40)}`,
    `专业${truncateInline(resumeIdentity.major, 40)}`,
  ].filter(
    (item) =>
      !item.endsWith('姓名') &&
      !item.endsWith('性别') &&
      !item.endsWith('年龄') &&
      !item.endsWith('工作年限') &&
      !item.endsWith('最高学历') &&
      !item.endsWith('毕业院校') &&
      !item.endsWith('专业')
  );

  const intent = [
    truncateInline(resumeIdentity.expectedJob, 40)
      ? `期望岗位${truncateInline(resumeIdentity.expectedJob, 40)}`
      : '',
    truncateInline(resumeIdentity.expectedCity, 30)
      ? `期望城市${truncateInline(resumeIdentity.expectedCity, 30)}`
      : '',
    truncateInline(resumeIdentity.expectedSalary, 30)
      ? `期望薪资${truncateInline(resumeIdentity.expectedSalary, 30)}`
      : '',
    truncateInline(resumeIdentity.workStatus, 24)
      ? `求职状态${truncateInline(resumeIdentity.workStatus, 24)}`
      : '',
  ].filter(Boolean);

  const experience = [
    truncateInline(resumeIdentity.currentCompany, 50)
      ? `最近公司${truncateInline(resumeIdentity.currentCompany, 50)}`
      : '',
    truncateInline(resumeIdentity.currentPosition, 40)
      ? `最近岗位${truncateInline(resumeIdentity.currentPosition, 40)}`
      : '',
    truncateInline(resumeIdentity.currentCity, 30)
      ? `当前城市${truncateInline(resumeIdentity.currentCity, 30)}`
      : '',
  ].filter(Boolean);

  const lines: string[] = [];
  if (profile.length) {
    lines.push(`候选人概况：${profile.join('，')}。`);
  }
  if (intent.length) {
    lines.push(`求职意向：${intent.join('，')}。`);
  }
  if (experience.length) {
    lines.push(`近期经历：${experience.join('，')}。`);
  }

  const profileSummary = truncateInline(resumeIdentity.profileSummary, 240);
  if (profileSummary) {
    lines.push(`个人简介：${profileSummary}`);
  }

  const resumeTextSnippet = normalizeMultilineText(resumeIdentity.resumeTextSnippet, '');
  if (resumeTextSnippet) {
    lines.push(`简历原文摘录：${resumeTextSnippet.slice(0, RESUME_NARRATIVE_SNIPPET_MAX_LENGTH)}`);
  }

  if (!lines.length) {
    return '未读取到可用的个人简历文本，请先在账户信息中导入个人页简历。';
  }

  return lines.join('\n');
};

/**
 * 从已导入的个人页简历中提取可供 AI 判断使用的原文摘要。
 *
 * @param userInput 用户资料对象。
 * @returns 返回简历原文摘要及其来源路径；若未命中内容则返回空字符串。
 */
const buildImportedResumeSnippet = (userInput: PlainRecord): { text: string; source: string } => {
  const user = toRecord(userInput);
  const importedResume = toRecord(user.importedResume);
  if (!Object.keys(importedResume).length) {
    return { text: '', source: '' };
  }

  const sourceNodes = collectSourceNodes(
    importedResume,
    6,
    {
      excludePathPrefixes: ['user.preference', 'user.preferenceMap'],
      excludeKeyNames: ['preference', 'preferenceMap'],
    },
    'user.importedResume'
  );
  const hit = getSearchResult(sourceNodes, RESUME_TEXT_SEARCH_KEYS);
  const text = normalizeMultilineText(hit.value, '').slice(0, IMPORTED_RESUME_SNIPPET_MAX_LENGTH);
  if (!text) {
    return { text: '', source: '' };
  }

  // 优先保留上游明确写入的来源说明；若没有，再退回到自动搜索命中的路径。
  const explicitSource = normalizeInlineText(importedResume.resumeTextSource, '');
  return {
    text,
    source: explicitSource || hit.source || 'user.importedResume',
  };
};

/**
 * 将简历身份快照格式化为可读的中文字段说明。
 *
 * @param resumeIdentityInput 简历身份快照对象。
 * @returns 返回逐行列出的中文字段文本；若无有效字段，则返回默认提示。
 */
const formatResumeIdentityText = (resumeIdentityInput: PlainRecord): string => {
  const resumeIdentity = toRecord(resumeIdentityInput);
  const ignoredKeys = new Set(['identityFieldSources', 'sourceSummary']);
  const labelMap: Record<string, string> = {
    fullName: '姓名',
    gender: '性别',
    age: '年龄',
    workYears: '工作年限',
    education: '最高学历',
    school: '毕业院校',
    major: '专业',
    currentCity: '当前城市',
    expectedCity: '期望城市',
    expectedJob: '期望岗位',
    currentCompany: '最近公司',
    currentPosition: '最近岗位',
    expectedSalary: '期望薪资',
    workStatus: '求职状态',
    profileSummary: '个人简介',
    resumeTextSnippet: '简历文本摘要',
    missingFields: '未命中字段',
    note: '备注',
  };

  const lines = Object.entries(resumeIdentity)
    .filter(([key, value]) => !ignoredKeys.has(key) && isMeaningful(value))
    .map(([key, value]) => {
      const label = labelMap[key] || key;
      return `${label}：${toDisplayText(value)}`;
    });

  return lines.length ? lines.join('\n') : '备注：未读取到更多简历身份字段';
};

/**
 * 构建传统规则快照，供 AI 提示词与兜底决策统一复用。
 *
 * @param preferenceInput 偏好设置原始对象。
 * @returns 返回公司、岗位、内容、薪资、活跃度等传统筛选规则的结构化快照。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildTraditionalRuleSnapshot = (preferenceInput: PlainRecord): PlainRecord => {
  const preference = toRecord(preferenceInput);
  const salaryEnabled = normalizePreferenceBoolean(preference.srE, false);
  return {
    companyInclude: normalizePreferenceBoolean(preference.cniE, false)
      ? toArray(preference.cni)
      : [],
    companyExclude: normalizePreferenceBoolean(preference.cneE, false)
      ? toArray(preference.cne)
      : [],
    jobInclude: normalizePreferenceBoolean(preference.jniE, false) ? toArray(preference.jni) : [],
    jobExclude: normalizePreferenceBoolean(preference.jneE, false) ? toArray(preference.jne) : [],
    contentInclude: normalizePreferenceBoolean(preference.jciE, false)
      ? toArray(preference.jci)
      : [],
    contentExclude: normalizePreferenceBoolean(preference.jceE, false)
      ? toArray(preference.jce)
      : [],
    salaryRange: salaryEnabled ? toText(preference.sr) : '',
    salaryType: salaryEnabled ? toText(preference.srT, '1') : '',
    companyScaleRange: normalizePreferenceBoolean(preference.csrE, false)
      ? toText(preference.csr)
      : '',
    filterHunter: normalizePreferenceBoolean(preference.fhE, false),
    onlyBossOnline: normalizePreferenceBoolean(preference.polE, false),
    activeFilter: {
      enabled: normalizePreferenceBoolean(preference.acE, false),
      week: normalizePreferenceBoolean(preference.acW, true),
      month: normalizePreferenceBoolean(preference.acM, true),
      year: normalizePreferenceBoolean(preference.acY, true),
    },
  };
};

/**
 * 构建候选人画像，作为 AI 投递判断的核心输入之一。
 *
 * @param userInput 用户资料原始对象。
 * @param preferenceInput 偏好设置原始对象。
 * @returns 返回候选人的联系方式、简历摘要、规则约束、冲突标记与解析后的筛选条件。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryUserProfile = (
  userInput: PlainRecord,
  preferenceInput: PlainRecord
): PlainRecord => {
  const user = toRecord(userInput);
  const preference = toRecord(preferenceInput);
  const sourceNodes = collectSourceNodes(
    user,
    4,
    {
      excludePathPrefixes: ['user.preference', 'user.preferenceMap'],
      excludeKeyNames: ['preference', 'preferenceMap'],
    },
    'user'
  );
  const resumeId =
    getSearchResult(sourceNodes, ['resumeId', 'attachmentResumeId', 'geekResumeId']).value ||
    toText(user.resumeId);
  const resumeIdentity = buildResumeIdentitySnapshot(
    user,
    user.importedResume ||
      user.parsedResume ||
      user.attachmentResume ||
      user.resume ||
      user.resumeInfo ||
      user.resumeProfile
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
  // 先识别“既想要又排除”的矛盾关键词，供上层显式提示用户规则存在冲突。
  const conflictJobKeywords = collectKeywordConflicts(expectedJobIncludeRaw, excludedJob);
  const conflictCompanyKeywords = collectKeywordConflicts(
    expectedCompanyIncludeRaw,
    excludedCompany
  );
  const conflictContentKeywords = collectKeywordConflicts(
    expectedContentIncludeRaw,
    excludedContent
  );
  // 再从包含条件中剔除冲突关键词，避免把自相矛盾的约束继续传给 AI。
  const expectedJobInclude = excludeConflictedKeywords(expectedJobIncludeRaw, excludedJob);
  const expectedCompanyInclude = excludeConflictedKeywords(
    expectedCompanyIncludeRaw,
    excludedCompany
  );
  const expectedContentInclude = excludeConflictedKeywords(
    expectedContentIncludeRaw,
    excludedContent
  );
  const hasIdentityFields = Object.keys(identityRecord).some(
    (key) => !['note', 'missingFields', 'sourceSummary', 'identityFieldSources'].includes(key)
  );
  const hasImportedResume = !!resumeId || !!importedResumeSnippet.text || hasIdentityFields;
  return {
    // 联系方式与简历标识是后续跟踪与调试 AI 判断来源的基础信息。
    phone: toText(user.phone),
    email: toText(user.email),
    resumeId,
    importedResumeTextSnippet: importedResumeSnippet.text,
    importedResumeTextSource: importedResumeSnippet.source,
    resumeNarrative,
    // “已导入简历”并不只依赖简历 ID；只要存在原文摘要或成功提取到身份字段，也认为具备可用简历上下文。
    hasImportedResume,
    hasImageResume: !!toText(getPreferenceValue(preference, 'customImageSet', 'cI')),
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
    hasRuleConflict:
      conflictJobKeywords.length > 0 ||
      conflictCompanyKeywords.length > 0 ||
      conflictContentKeywords.length > 0,
    expectedSalary: toText(preference.sr),
    expectedSalaryType: toText(preference.srT, '1'),
    resolvedConstraints: {
      includeJobKeywords: expectedJobInclude,
      includeCompanyKeywords: expectedCompanyInclude,
      includeContentKeywords: expectedContentInclude,
      excludeJobKeywords: excludedJob,
      excludeCompanyKeywords: excludedCompany,
      excludeContentKeywords: excludedContent,
      salaryRange: toText(preference.sr),
      salaryType: toText(preference.srT, '1'),
    },
  };
};

/**
 * 评估候选人关键资料完整度。
 *
 * @param resumeIdentityInput 简历身份快照对象。
 * @returns 返回命中得分、总字段数以及缺失字段中文标签列表。
 */
const buildProfileCompleteness = (
  resumeIdentityInput: PlainRecord
): { score: number; total: number; missingLabels: string[] } => {
  const resumeIdentity = toRecord(resumeIdentityInput);
  const criticalFields: Array<{ key: string; label: string }> = [
    { key: 'workYears', label: '工作年限' },
    { key: 'education', label: '最高学历' },
    { key: 'expectedJob', label: '期望岗位' },
    { key: 'expectedCity', label: '期望城市' },
    { key: 'resumeTextSnippet', label: '简历文本' },
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
    missingLabels,
  };
};

/**
 * 从候选人画像中提炼最能支持 AI 判断的简历证据片段。
 *
 * @param userProfileInput 候选人画像对象。
 * @returns 返回去重后的证据条目文本；若无简历内容则返回缺失提示。
 */
const buildCandidateEvidenceText = (userProfileInput: PlainRecord): string => {
  const userProfile = toRecord(userProfileInput);
  const resumeIdentity = toRecord(userProfile.resumeIdentity);
  const sourceText = [
    normalizeMultilineText(userProfile.importedResumeTextSnippet, ''),
    normalizeMultilineText(userProfile.resumeNarrative, ''),
    normalizeMultilineText(resumeIdentity.resumeTextSnippet, ''),
  ].find(Boolean);

  if (!sourceText) {
    return '未读取到可用简历证据，请先在账户信息中导入个人页简历。';
  }

  const evidenceLines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of sourceText.split('\n')) {
    const line = rawLine.replace(/^[\s\-•*\d.、()（）]+/, '').trim();
    if (!line) {
      continue;
    }
    // 使用行首片段做近似去重，减少重复项目符号或重复经历对 prompt 的噪声影响。
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

  const merged = (evidenceLines.length ? evidenceLines.join('\n') : sourceText).trim();
  return merged.slice(0, CANDIDATE_EVIDENCE_MAX_LENGTH);
};

/**
 * 将候选人画像格式化为 AI 可直接消费的中文文本。
 *
 * @param userProfileInput 候选人画像对象。
 * @returns 返回包含联系方式、资料完整度、规则约束、简历证据与身份补充的多行文本。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryUserProfileText = (userProfileInput: PlainRecord): string => {
  const userProfile = toRecord(userProfileInput);
  const resumeIdentity = toRecord(userProfile.resumeIdentity);
  const resolvedConstraints = toRecord(userProfile.resolvedConstraints);
  const completeness = buildProfileCompleteness(resumeIdentity);
  const lines = [
    '[候选人匹配卡]',
    `联系方式：手机号=${toDisplayText(userProfile.phone)}；邮箱=${toDisplayText(userProfile.email)}`,
    `是否已导入个人页简历：${toDisplayText(userProfile.hasImportedResume)}`,
    `是否已配置图片简历：${toDisplayText(userProfile.hasImageResume)}`,
    `个人页简历来源：${toDisplayText(userProfile.importedResumeTextSource, '未提供')}`,
    `资料完整度：${completeness.score}/${completeness.total}；缺失关键字段：${completeness.missingLabels.length ? completeness.missingLabels.join('、') : '无'}`,
    `目标岗位关键词：${formatList(resolvedConstraints.includeJobKeywords || userProfile.expectedJobInclude)}`,
    `目标公司关键词：${formatList(resolvedConstraints.includeCompanyKeywords || userProfile.expectedCompanyInclude)}`,
    `目标内容关键词：${formatList(resolvedConstraints.includeContentKeywords || userProfile.expectedContentInclude)}`,
    `硬性排除岗位关键词：${formatList(resolvedConstraints.excludeJobKeywords || userProfile.excludedJob)}`,
    `硬性排除公司关键词：${formatList(resolvedConstraints.excludeCompanyKeywords || userProfile.excludedCompany)}`,
    `硬性排除内容关键词：${formatList(resolvedConstraints.excludeContentKeywords || userProfile.excludedContent)}`,
    `薪资约束：范围=${toDisplayText(resolvedConstraints.salaryRange || userProfile.expectedSalary, '未配置')}；类型=${toDisplayText(resolvedConstraints.salaryType || userProfile.expectedSalaryType, '1')}`,
    `规则冲突标记：岗位=${formatList(userProfile.conflictJobKeywords)}；公司=${formatList(userProfile.conflictCompanyKeywords)}；内容=${formatList(userProfile.conflictContentKeywords)}；存在冲突=${toDisplayText(userProfile.hasRuleConflict)}`,
    '核心简历证据：',
    buildCandidateEvidenceText(userProfile),
    '简历身份补充：',
    formatResumeIdentityText(resumeIdentity),
  ];

  return lines.join('\n');
};

/**
 * 将传统规则快照格式化为便于 AI 阅读的中文摘要。
 *
 * @param snapshotInput 传统规则快照对象。
 * @returns 返回逐行描述公司、岗位、内容、薪资与活跃度筛选规则的文本。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
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
    `活跃度过滤：启用=${toDisplayText(activeFilter.enabled)}，过滤周=${toDisplayText(activeFilter.week)}，过滤月=${toDisplayText(activeFilter.month)}，过滤年=${toDisplayText(activeFilter.year)}`,
  ].join('\n');
};

/**
 * 组合生成 AI 投递判断提示词。
 *
 * @param config AI 投递提示词配置。
 * @param userProfileInput 候选人画像对象。
 * @param traditionalSnapshotInput 传统规则快照对象。
 * @returns 返回最终发送给 AI 的完整提示词文本。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryJudgePrompt = (
  config: AiDeliveryPromptConfig,
  userProfileInput: PlainRecord,
  traditionalSnapshotInput: PlainRecord
): string => {
  const sections: string[] = [];
  const prompt = normalizeInlineText(config.prompt, '');
  if (prompt) {
    sections.push(prompt);
  }

  const extraPrompt = normalizeInlineText(config.extraPrompt, '');
  if (extraPrompt) {
    sections.push(`[附加指令]\n${extraPrompt}`);
  }

  const focusSkills = normalizeKeywordList(config.focusSkills);
  const excludeKeywords = normalizeKeywordList(config.excludeKeywords);
  if (focusSkills.length || excludeKeywords.length) {
    sections.push(
      [
        '[重点过滤规则]',
        `核心技能要求（应重点匹配）：${focusSkills.length ? focusSkills.join('、') : '无'}`,
        `绝对排除关键词（命中即拒绝）：${excludeKeywords.length ? excludeKeywords.join('、') : '无'}`,
      ].join('\n')
    );
  }

  if (config.includeUserProfile) {
    sections.push(`[求职者个人信息]\n${buildAiDeliveryUserProfileText(userProfileInput)}`);
  }

  if (config.includeTraditionalSnapshot) {
    sections.push(
      `[传统规则摘要(仅供AI参考)]\n${buildTraditionalRuleSnapshotText(traditionalSnapshotInput)}`
    );
  }

  // 输出约束始终放在最后，最大化降低模型追加解释、Markdown 或多段输出的概率。
  sections.push(`[输出约束]\n${AI_DELIVERY_OUTPUT_CONTRACT}`);

  return sections.join('\n\n');
};

/**
 * 构建岗位基础信息文本，供 AI 判断岗位是否值得投递。
 *
 * @param baseInfoInput 岗位基础信息对象。
 * @returns 返回岗位名称、经验、学历、地点、薪资、标签与公司信息的中文摘要。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryJobBaseInfoText = (baseInfoInput: PlainRecord): string => {
  const baseInfo = toRecord(baseInfoInput);
  const location = [baseInfo.cityName, baseInfo.areaDistrict, baseInfo.businessDistrict]
    .map((item) => normalizeInlineText(item, ''))
    .filter(Boolean)
    .join(' / ');

  const companyParts = [
    normalizeInlineText(baseInfo.brandName, ''),
    normalizeInlineText(baseInfo.brandIndustry, ''),
  ].filter(Boolean);

  return [
    '[岗位匹配卡]',
    `岗位职能：${toDisplayText(baseInfo.jobName)}`,
    `行业领域：${toDisplayText(baseInfo.brandIndustry)}`,
    `经验要求：${toDisplayText(baseInfo.jobExperience)}`,
    `学历要求：${toDisplayText(baseInfo.jobDegree)}`,
    `技能关键词：${formatList(baseInfo.skills)}`,
    `工作地点：${location || '未提供'}`,
    `薪资描述：${toDisplayText(baseInfo.salaryDesc)}`,
    `岗位标签：${formatList(baseInfo.jobLabels)}`,
    `公司信息：${companyParts.length ? companyParts.join(' | ') : '未提供'}`,
    `公司阶段：${toDisplayText(baseInfo.brandStageName)}`,
    `公司规模：${toDisplayText(baseInfo.brandScaleName)}`,
    `岗位福利：${formatList(baseInfo.welfareList)}`,
  ].join('\n');
};

/**
 * 从岗位描述中提炼可用于 AI 判断的关键证据行。
 *
 * @param postDescriptionInput 岗位描述原文。
 * @returns 返回去重后的岗位描述摘要；若无内容则返回默认提示。
 */
const buildJobDescriptionEvidenceText = (postDescriptionInput: unknown): string => {
  const normalized = normalizeMultilineText(postDescriptionInput, '');
  if (!normalized) {
    return '未提供可用岗位描述。';
  }

  const pickedLines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.replace(/^[\s\-•*\d.、()（）一二三四五六七八九十]+/, '').trim();
    if (!line) {
      continue;
    }
    // 岗位描述常带有重复编号和项目符号，先做归一化去重，再挑选代表性条目。
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

  const merged = (pickedLines.length ? pickedLines.join('\n') : normalized).trim();
  return merged.slice(0, JOB_DESCRIPTION_SNIPPET_MAX_LENGTH);
};

/**
 * 构建岗位扩展信息文本，补充 Boss 活跃度、地址与岗位描述证据。
 *
 * @param extInfoInput 岗位扩展信息对象。
 * @returns 返回岗位扩展信息中文摘要文本。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryJobExtInfoText = (extInfoInput: PlainRecord): string => {
  const extInfo = toRecord(extInfoInput);
  return [
    '[岗位扩展证据]',
    `Boss活跃度：${toDisplayText(extInfo.activeTimeDesc)}`,
    `工作地址：${toDisplayText(extInfo.address)}`,
    '岗位描述关键证据：',
    buildJobDescriptionEvidenceText(extInfo.postDescription),
  ].join('\n');
};

/**
 * 组合生成 AI 投递筛选所需的岗位输入文本。
 *
 * @param baseInfoInput 岗位基础信息对象。
 * @param extInfoInput 岗位扩展信息对象。
 * @returns 返回包含基础信息文本与扩展信息文本的对象，供上层统一传给 AI 过滤流程。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const buildAiDeliveryFilterJobInput = (
  baseInfoInput: PlainRecord,
  extInfoInput: PlainRecord
): { jobBaseInfo: string; jobExtInfo: string } => {
  return {
    jobBaseInfo: buildAiDeliveryJobBaseInfoText(baseInfoInput),
    jobExtInfo: buildAiDeliveryJobExtInfoText(extInfoInput),
  };
};

/**
 * 解析 AI 投递失败后的传统规则兜底策略。
 *
 * @param strategyInput AI 投递策略配置值。
 * @param stage 当前失败阶段，用于区分模型报错与结果无效两类场景。
 * @param parseModeInput 现有解析模式标识，供无效结果场景继续追加后缀。
 * @returns 返回是否启用兜底以及最终解析模式标识。
 * @throws {TypeError} 当前函数不主动抛出异常；若传入对象存在异常 getter、Proxy 拦截或宿主运行时异常行为，底层异常会被原样透传。
 */
export const resolveAiDeliveryFallback = (
  strategyInput: unknown,
  stage: AiDeliveryFallbackStage,
  parseModeInput = ''
): AiDeliveryFallbackResolution => {
  const strategy = normalizeInlineText(strategyInput, 'reject');
  // 只有显式启用 fallback-traditional 时才允许回退到传统规则，避免误触发兜底路径。
  if (strategy !== 'fallback-traditional') {
    return {
      enabled: false,
      parseMode: '',
    };
  }

  if (stage === 'ai-error') {
    return {
      enabled: true,
      parseMode: 'ai-error.fallback-traditional',
    };
  }

  // 无效结果场景保留原 parseMode 前缀，便于日志中追踪“哪种解析失败后进入了传统兜底”。
  const baseParseMode = normalizeInlineText(parseModeInput, 'invalid');
  return {
    enabled: true,
    parseMode: `${baseParseMode}.fallback-traditional`,
  };
};
