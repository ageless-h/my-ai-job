// 文件编码：UTF-8

/**
 * AI 配置和用户资料管理
 * 负责 AI 配置扩展、用户资料和投递判断配置的读写
 */

import { Logger } from './logger';

declare const GM_getValue: (<T = unknown>(key: string, defaultValue?: T) => T) | undefined;
declare const GM_setValue: (<T = unknown>(key: string, value: T) => void) | undefined;
declare const GM_notification:
  | ((options: { title: string; text: string; timeout?: number }) => void)
  | undefined;

/**
 * AI 扩展配置对象。
 *
 * 该结构用于持久化 AI 面板的运行配置，包括当前选中的模型通道、记忆档案、
 * 提示词预设仓库、界面布局，以及为后续版本预留的扩展字段。
 */
export interface AiConfigExt {
  /** 当前激活的 AI 模型配置。 */
  currentConfig: {
    /** 当前模型对应的提供商编号。 */
    provider: number;
    /** 当前选中的模型名称。 */
    modelName: string;
  };
  /** 按标识符索引的记忆档案集合。 */
  memoryProfiles: Record<string, unknown>;
  /** 提示词预设仓库，区分全局预设与个人预设。 */
  promptPresetStore: {
    /** 所有用户可共用的全局提示词预设列表。 */
    global: unknown[];
    /** 按用户、场景或业务维度保存的个人预设映射。 */
    personal: Record<string, unknown>;
  };
  /** 面板布局配置。 */
  uiLayout: {
    /** 当前界面布局风格标识。 */
    style: string;
    /** 允许布局配置携带额外扩展字段。 */
    [key: string]: unknown;
  };
  /** 允许历史版本或扩展功能写入附加字段。 */
  [key: string]: unknown;
}

/**
 * AI 投递判断配置。
 *
 * 该结构控制 AI 是否参与岗位匹配判断、使用什么提示词、如何补充上下文，
 * 以及在模型异常或返回结果非法时应采取的回退策略。
 */
export interface AiDeliveryJudgeConfig {
  /** 是否启用 AI 投递判断。 */
  enabled: boolean;
  /** 主提示词模板，用于定义 AI 的判断规则。 */
  prompt: string;
  /** 追加提示词，用于补充特定场景要求。 */
  extraPrompt: string;
  /** 需要重点关注的技能关键词列表。 */
  focusSkills: string[];
  /** 命中后应优先排除的关键词列表。 */
  excludeKeywords: string[];
  /** 是否将用户画像一并提供给 AI。 */
  includeUserProfile: boolean;
  /** AI 执行异常时的处理策略。 */
  onAiError: 'reject' | 'fallback-traditional';
  /** AI 返回非法结果时的处理策略。 */
  onInvalidResult: 'reject' | 'fallback-traditional';
}

/**
 * AI 投递判断的默认提示词模板。
 *
 * 该模板用于约束模型只输出一行 JSON，并先检查硬性过滤条件，
 * 再基于候选人与岗位的匹配信息给出最终投递建议。
 */
export const DEFAULT_AI_DELIVERY_JUDGE_PROMPT =
  '你是求职投递决策助手。请先检查硬性约束（排除关键词/排除公司/薪资明显不符/信息不足），任一命中则返回 match=false；再基于候选人匹配卡与岗位匹配卡评估职能、行业、技能、经验、学历、城市匹配度。仅输出一行JSON：{"match":true|false,"reason":"[CODE] 原因"}，其中 CODE 建议使用 MATCH、DOMAIN_MISMATCH、SKILL_MISMATCH、LEVEL_MISMATCH、SALARY_MISMATCH、PREF_CONFLICT、INFO_MISSING。';

const DEFAULT_AI_DELIVERY_JUDGE_CONFIG: AiDeliveryJudgeConfig = {
  enabled: true,
  prompt: DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
  extraPrompt: '',
  focusSkills: [],
  excludeKeywords: [],
  includeUserProfile: true,
  onAiError: 'reject',
  onInvalidResult: 'reject',
};

const logger = Logger.rootLogger;
const AI_CONFIG_EXT_STORAGE_KEY = 'ai-job-ai-config-ext';
const USER_PROFILE_STORAGE_KEY = 'ai-job-user';
const AI_CONFIG_API_KEY_STORAGE_PREFIX = 'ai-job-ai-config-key:';
const MAX_MIGRATION_JSON_SIZE = 2 * 1024 * 1024; // 单次迁移或恢复允许处理的最大 JSON 大小为 2MB

const _GM_getValue = typeof GM_getValue !== 'undefined' ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== 'undefined' ? GM_setValue : undefined;

/**
 * 判断给定值是否为普通对象。
 *
 * @param value 待判断的任意值。
 * @returns 如果值是非数组对象，则返回 `true`；否则返回 `false`。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 将存储层返回的值归一化为 JSON 字符串。
 *
 * 兼容 GM 存储直接返回对象、数组或字符串的情况；当序列化失败时返回空字符串，
 * 以便上层逻辑统一按“无有效配置”处理。
 *
 * @param raw 存储层读取到的原始值。
 * @returns 可安全参与 JSON 解析的字符串；若无法归一化则返回空字符串。
 */
function normalizeStoredJsonString(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw;
  }
  if (isPlainObject(raw) || Array.isArray(raw)) {
    try {
      return JSON.stringify(raw);
    } catch (_e) {
      return '';
    }
  }
  return '';
}

/**
 * 检查当前运行时是否具备完整的 GM 存储能力。
 *
 * @returns 当 `GM_getValue` 与 `GM_setValue` 均可用时返回 `true`，否则返回 `false`。
 */
function hasGmStorageRuntime(): boolean {
  return typeof _GM_getValue === 'function' && typeof _GM_setValue === 'function';
}

/**
 * 校验可信域名文本是否安全可用。
 *
 * 该校验只允许长度合理、由小写字母、数字、点和连字符组成的主机名文本，
 * 用于过滤掉异常输入，避免把无效域名写回配置。
 *
 * @param value 待校验的域名文本。
 * @returns 当值可作为可信主机名使用时返回 `true`，否则返回 `false`。
 */
function isSafeDomainText(value: unknown): boolean {
  const host = `${value || ''}`.trim().toLowerCase();
  if (!host || host.length > 120) {
    return false;
  }

  return /^[a-z0-9.-]+$/.test(host) && !host.startsWith('.') && !host.endsWith('.');
}

/**
 * 构建模型通道唯一键。
 *
 * 该键用于在配置管理、模型切换和缓存映射中稳定标识一个“提供商 + 模型名”组合。
 * 当任一参数为空时，会回退到可预测的默认值，确保键格式始终稳定。
 *
 * @param provider AI 服务提供商编号或标识；为空时按 `0` 处理。
 * @param modelName 模型名称；为空时按空字符串处理。
 * @returns 形如 `provider:modelName` 的模型通道键字符串。
 */
export function buildModelChannelKey(
  provider: number | string | null | undefined,
  modelName: string | null | undefined
): string {
  return `${provider || 0}:${modelName || ''}`;
}

/**
 * 读取并归一化 AI 扩展配置。
 *
 * 读取顺序遵循“GM 存储优先、localStorage 兜底、备份恢复补偿”的策略。
 * 函数会自动处理旧版数据迁移、超大配置保护、损坏配置备份，以及默认值补全，
 * 以确保调用方始终拿到结构完整且可用的配置对象。
 *
 * @returns 经过默认值补全和结构清洗后的 AI 扩展配置对象；若读取失败则返回默认配置。
 */
export function getAiConfigExt(): AiConfigExt {
  const defaultExt: AiConfigExt = {
    currentConfig: {
      provider: 1,
      modelName: '',
    },
    memoryProfiles: {},
    promptPresetStore: {
      global: [],
      personal: {},
    },
    uiLayout: {
      style: 'dashboard-2col',
    },
  };
  try {
    let parsed: Partial<AiConfigExt> | null = null;

    // 优先从用户脚本原生的 GM 存储读取，这是当前版本首选的持久化位置。
    const gmRaw = _GM_getValue?.(AI_CONFIG_EXT_STORAGE_KEY, '') ?? '';
    const normalizedGMRaw = normalizeStoredJsonString(gmRaw);
    if (normalizedGMRaw) {
      // 超大配置通常意味着异常数据或误写入内容，先阻断解析并提示用户处理。
      if (normalizedGMRaw.length > MAX_MIGRATION_JSON_SIZE) {
        logger.error('AI配置大小超过限制 (GM storage)', {
          size: normalizedGMRaw.length,
          limit: MAX_MIGRATION_JSON_SIZE,
          sizeKB: (normalizedGMRaw.length / 1024).toFixed(2),
          limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0),
        });

        // 通知用户
        if (typeof GM_notification !== 'undefined') {
          GM_notification({
            title: 'AI Job Hunting',
            text: `AI配置文件过大(${(normalizedGMRaw.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
            timeout: 15000,
          });
        }

        // 备份超大配置的前部分用于调试
        if (_GM_setValue) {
          try {
            _GM_setValue(
              `${AI_CONFIG_EXT_STORAGE_KEY}_oversized_backup`,
              normalizedGMRaw.slice(0, MAX_MIGRATION_JSON_SIZE)
            );
            logger.info('已备份超大AI配置的前部分到 ai-job-ai-config-ext_oversized_backup');
          } catch (backupError) {
            logger.warn('备份超大AI配置失败', backupError);
          }
        }

        parsed = null;
      } else {
        try {
          // 仅接受对象结构，避免数组、字符串等异常 JSON 被当作合法配置继续使用。
          const candidate = JSON.parse(normalizedGMRaw) as Partial<AiConfigExt>;
          if (isPlainObject(candidate)) {
            parsed = candidate;
            // 如果 GM 存储返回的不是字符串，顺手标准化回写，便于后续统一按字符串处理。
            if (typeof gmRaw !== 'string') {
              _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, normalizedGMRaw);
            }
          } else {
            parsed = null;
          }
        } catch (parseError) {
          logger.error('AI配置解析失败 (GM storage)', parseError, {
            rawLength: normalizedGMRaw.length,
            rawPreview: normalizedGMRaw.substring(0, 100),
          });
          // 备份损坏的配置
          if (_GM_setValue && normalizedGMRaw) {
            try {
              _GM_setValue(`${AI_CONFIG_EXT_STORAGE_KEY}_corrupted_backup`, normalizedGMRaw);
              logger.info('已备份损坏的AI配置到 ai-job-ai-config-ext_corrupted_backup');
            } catch (backupError) {
              logger.warn('备份损坏的AI配置失败', backupError);
            }
          }
          parsed = null;
        }
      }
    }

    // GM 存储没有可用配置时，回退读取旧版 localStorage，并在成功后自动迁移。
    if (!parsed) {
      const legacyRaw = localStorage.getItem(AI_CONFIG_EXT_STORAGE_KEY);
      if (legacyRaw && legacyRaw.length <= MAX_MIGRATION_JSON_SIZE) {
        try {
          const candidate = JSON.parse(legacyRaw) as Partial<AiConfigExt>;
          if (isPlainObject(candidate)) {
            parsed = candidate;
            _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, legacyRaw);
            localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
          } else {
            parsed = null;
          }
        } catch (parseError) {
          logger.error('AI配置解析失败 (localStorage)', parseError, {
            rawLength: legacyRaw.length,
            rawPreview: legacyRaw.substring(0, 100),
          });
          // 备份损坏的配置
          try {
            localStorage.setItem(`${AI_CONFIG_EXT_STORAGE_KEY}_corrupted_backup`, legacyRaw);
            logger.info('已备份损坏的AI配置到 localStorage');
          } catch (backupError) {
            logger.warn('备份损坏的AI配置失败', backupError);
          }
          parsed = null;
        }
      }
    }

    if (!parsed) {
      // 主配置不可用时，再尝试从备份槽恢复最近一次可用快照。
      if (_GM_getValue) {
        try {
          const backup = _GM_getValue(`${AI_CONFIG_EXT_STORAGE_KEY}_backup`, '');
          if (backup) {
            const normalizedBackup = normalizeStoredJsonString(backup);
            if (normalizedBackup && normalizedBackup.length <= MAX_MIGRATION_JSON_SIZE) {
              const candidate = JSON.parse(normalizedBackup) as Partial<AiConfigExt>;
              if (isPlainObject(candidate)) {
                logger.info('已从备份恢复AI配置');
                parsed = candidate;
                // 通知用户
                if (typeof GM_notification !== 'undefined') {
                  GM_notification({
                    title: 'AI Job Hunting',
                    text: 'AI配置损坏，已从备份恢复。',
                    timeout: 8000,
                  });
                }
              }
            }
          }
        } catch (backupError) {
          logger.warn('从备份恢复AI配置失败', backupError);
        }
      }
    }

    if (!parsed) {
      // 所有恢复路径都失败后，只能回退为默认配置，并明确提示用户重新设置。
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: 'AI配置损坏且无法恢复，已重置为默认配置。请重新设置。',
          timeout: 10000,
        });
      }
      return defaultExt;
    }

    // 主配置中的 API Key 会被剥离到独立存储槽，读取时需要按配置项 ID 补回敏感字段。
    const parsedApiConfigs = Array.isArray((parsed as Record<string, unknown>).apiConfigs)
      ? ((parsed as Record<string, unknown>).apiConfigs as Array<Record<string, unknown>>).map(
          (item) => {
            const id = `${item?.id || ''}`;
            const persistedApiKey = id
              ? `${_GM_getValue?.(`${AI_CONFIG_API_KEY_STORAGE_PREFIX}${id}`, '') || ''}`
              : '';
            const fallbackApiKey = `${item?.apiKey || ''}`;
            return {
              ...item,
              apiKey: persistedApiKey || fallbackApiKey,
            };
          }
        )
      : [];

    // 可信 API 主机列表只保留格式安全的域名，避免异常值污染运行时配置。
    const parsedTrustedApiHosts = Array.isArray((parsed as Record<string, unknown>).trustedApiHosts)
      ? ((parsed as Record<string, unknown>).trustedApiHosts as unknown[])
          .filter(isSafeDomainText)
          .map((item) => `${item}`.toLowerCase())
      : [];

    // 最终返回时逐层合并默认值，保证旧配置缺字段时仍能得到完整结构。
    return {
      ...defaultExt,
      ...parsed,
      ...(parsedApiConfigs.length ? { apiConfigs: parsedApiConfigs } : {}),
      ...(parsedTrustedApiHosts.length ? { trustedApiHosts: parsedTrustedApiHosts } : {}),
      currentConfig: {
        ...defaultExt.currentConfig,
        ...(parsed?.currentConfig || {}),
      },
      promptPresetStore: {
        ...defaultExt.promptPresetStore,
        ...(parsed?.promptPresetStore || {}),
        personal: {
          ...defaultExt.promptPresetStore.personal,
          ...(parsed?.promptPresetStore?.personal || {}),
        },
      },
      uiLayout: {
        ...defaultExt.uiLayout,
        ...(parsed?.uiLayout || {}),
      },
    };
  } catch (error) {
    logger.warn('读取AI扩展配置失败，使用默认配置', (error as Error | undefined)?.message);
    return defaultExt;
  }
}

/**
 * 合并并保存 AI 扩展配置。
 *
 * 函数会先读取当前完整配置，再与传入的增量配置合并，避免遗漏未传入字段。
 * 保存时优先使用 GM 存储；若运行时不支持或写入失败，则回退到 localStorage。
 * `apiConfigs` 中的 `apiKey` 会被单独写入独立存储槽，避免在主配置 JSON 中长期明文保存。
 *
 * @param ext 需要写入的部分 AI 扩展配置。
 * @returns 合并后的完整 AI 扩展配置对象。
 * @throws {TypeError} 当配置对象无法被 JSON 序列化（例如包含循环引用）时抛出。
 * @throws {DOMException} 当持久化存储不可用，且主存储与回退存储都写入失败时抛出。
 */
export function saveAiConfigExt(ext: Partial<AiConfigExt>): AiConfigExt {
  // 先基于当前有效配置构造完整对象，确保增量更新不会丢失现有字段。
  const data = {
    ...getAiConfigExt(),
    ...(ext || {}),
  } as AiConfigExt;
  const gmAvailable = hasGmStorageRuntime();

  // 没有 GM 运行时时，直接退化为 localStorage 存储。
  if (!gmAvailable) {
    localStorage.setItem(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  try {
    // 写入新配置前先备份旧值，便于后续在损坏或超限时恢复。
    if (_GM_getValue && _GM_setValue) {
      try {
        const current = _GM_getValue(AI_CONFIG_EXT_STORAGE_KEY, '');
        if (current) {
          _GM_setValue(`${AI_CONFIG_EXT_STORAGE_KEY}_backup`, current);
        }
      } catch (backupError) {
        logger.warn('备份当前AI配置失败', backupError);
      }
    }

    const persistedData = { ...data } as Record<string, unknown>;
    if (Array.isArray((persistedData as Record<string, unknown>).apiConfigs)) {
      // API Key 单独存储，主配置只保留无密钥结构，降低整体配置泄露风险。
      const sanitizedApiConfigs = (
        (persistedData as Record<string, unknown>).apiConfigs as Array<Record<string, unknown>>
      ).map((item) => {
        const next = { ...item };
        const id = `${next?.id || ''}`;
        const apiKey = `${next?.apiKey || ''}`;
        if (id && apiKey) {
          _GM_setValue?.(`${AI_CONFIG_API_KEY_STORAGE_PREFIX}${id}`, apiKey);
        }
        if (id) {
          next.apiKey = '';
        }
        return next;
      });
      persistedData.apiConfigs = sanitizedApiConfigs;
    }
    _GM_setValue?.(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(persistedData));
    // GM 写入成功后清理旧 localStorage，避免双写状态造成读取歧义。
    localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
  } catch (error) {
    logger.warn(
      '写入AI扩展配置到GM存储失败，回退到localStorage',
      (error as Error | undefined)?.message
    );
    localStorage.setItem(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
  }

  return data;
}

/**
 * 获取当前生效的 AI 模型通道键。
 *
 * 该方法会先读取完整 AI 扩展配置，再从 `currentConfig` 中提取当前选中的提供商与模型名，
 * 最终复用 `buildModelChannelKey` 生成稳定键值。
 *
 * @returns 当前配置对应的模型通道键；当配置缺失时返回默认提供商生成的键。
 */
export function getCurrentAiModelChannelKey(): string {
  const ext = getAiConfigExt();
  const currentConfig = ext.currentConfig || { provider: 1, modelName: '' };
  return buildModelChannelKey(currentConfig.provider, currentConfig.modelName);
}

/**
 * 读取并校验已持久化的用户资料原始 JSON 字符串。
 *
 * 读取顺序遵循“GM 存储优先、localStorage 兜底、旧数据自动迁移”的策略。
 * 仅当数据可解析为对象，且其中 `preference` 字段仍为对象时，才视为有效用户资料。
 * 超大或损坏的数据会被忽略，并尽可能备份以便问题排查。
 *
 * @returns 校验通过的用户资料 JSON 字符串；若不存在、损坏或超出限制则返回 `null`。
 * @throws {DOMException} 当浏览器环境禁止访问 `localStorage` 时可能抛出异常。
 */
export function getStoredUserProfileRaw(): string | null {
  // 先读 GM 存储，兼容新版本用户脚本的主要持久化路径。
  const gmRaw = _GM_getValue?.(USER_PROFILE_STORAGE_KEY, '') ?? '';
  const rawFromGM = normalizeStoredJsonString(gmRaw);
  if (rawFromGM) {
    // 超大用户资料通常不可安全解析，直接阻断并提示用户清理。
    if (rawFromGM.length > MAX_MIGRATION_JSON_SIZE) {
      logger.error('用户配置大小超过限制 (GM storage)', {
        size: rawFromGM.length,
        limit: MAX_MIGRATION_JSON_SIZE,
        sizeKB: (rawFromGM.length / 1024).toFixed(2),
        limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0),
      });

      // 通知用户
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: `用户配置文件过大(${(rawFromGM.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
          timeout: 15000,
        });
      }

      // 备份超大配置的前部分用于调试
      if (_GM_setValue) {
        try {
          _GM_setValue(
            `${USER_PROFILE_STORAGE_KEY}_oversized_backup`,
            rawFromGM.slice(0, MAX_MIGRATION_JSON_SIZE)
          );
          logger.info('已备份超大用户配置的前部分到 ai-job-user_oversized_backup');
        } catch (backupError) {
          logger.warn('备份超大用户配置失败', backupError);
        }
      }
    } else {
      try {
        const parsed = JSON.parse(rawFromGM);
        if (
          isPlainObject(parsed) &&
          isPlainObject((parsed as Record<string, unknown>).preference || {})
        ) {
          // 将 GM 中的非字符串格式统一改写为字符串，方便后续迁移与备份流程复用。
          if (typeof gmRaw !== 'string') {
            _GM_setValue?.(USER_PROFILE_STORAGE_KEY, rawFromGM);
          }
          return rawFromGM;
        }
      } catch (_e) {}
    }
  }

  // GM 中没有可用数据时，再尝试读取旧版 localStorage，并在成功后迁移至 GM 存储。
  const legacyRaw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (legacyRaw) {
    if (legacyRaw.length > MAX_MIGRATION_JSON_SIZE) {
      logger.error('用户配置大小超过限制 (localStorage)', {
        size: legacyRaw.length,
        limit: MAX_MIGRATION_JSON_SIZE,
        sizeKB: (legacyRaw.length / 1024).toFixed(2),
        limitKB: (MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0),
      });

      // 通知用户
      if (typeof GM_notification !== 'undefined') {
        GM_notification({
          title: 'AI Job Hunting',
          text: `用户配置文件过大(${(legacyRaw.length / 1024).toFixed(0)}KB > ${(MAX_MIGRATION_JSON_SIZE / 1024).toFixed(0)}KB)，已重置为默认配置。请清理配置或联系开发者。`,
          timeout: 15000,
        });
      }

      // 备份超大配置的前部分用于调试
      try {
        localStorage.setItem(
          `${USER_PROFILE_STORAGE_KEY}_oversized_backup`,
          legacyRaw.slice(0, MAX_MIGRATION_JSON_SIZE)
        );
        logger.info('已备份超大用户配置的前部分到 localStorage');
      } catch (backupError) {
        logger.warn('备份超大用户配置失败', backupError);
      }

      return null;
    }

    if (legacyRaw.length <= MAX_MIGRATION_JSON_SIZE) {
      try {
        const parsed = JSON.parse(legacyRaw);
        if (
          isPlainObject(parsed) &&
          isPlainObject((parsed as Record<string, unknown>).preference || {})
        ) {
          _GM_setValue?.(USER_PROFILE_STORAGE_KEY, legacyRaw);
          localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
          return legacyRaw;
        }
      } catch (_e) {
        // 旧版数据损坏时直接忽略，让调用方按“无可用用户资料”处理。
      }
    }
    return null;
  }

  return null;
}

/**
 * 序列化并保存用户资料。
 *
 * 函数会优先使用 GM 存储，以保证用户脚本上下文中的持久化一致性；
 * 若 GM 存储不可用或写入失败，则自动回退到 `localStorage`。
 *
 * @param profile 需要持久化的用户资料对象。
 * @returns 无返回值。
 * @throws {TypeError} 当 `profile` 无法被 JSON 序列化（例如包含循环引用）时抛出。
 * @throws {DOMException} 当 GM 存储不可用且 `localStorage` 写入失败时抛出异常。
 */
export function saveStoredUserProfile(profile: unknown): void {
  const serialized = JSON.stringify(profile ?? {});
  if (hasGmStorageRuntime()) {
    try {
      _GM_setValue?.(USER_PROFILE_STORAGE_KEY, serialized);
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      return;
    } catch (error) {
      logger.warn(
        '写入用户资料到GM存储失败，回退到localStorage',
        (error as Error | undefined)?.message
      );
    }
  }
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, serialized);
}

/**
 * 读取并规范化 AI 投递判断配置。
 *
 * 该方法会优先读取扩展配置中的 `aiDeliveryJudge`，同时兼容旧版 `preference` 中遗留的字段命名。
 * 所有布尔值、提示词、关键词列表与回退策略都会在返回前完成默认值补全与结构清洗。
 *
 * @param preference 可选的旧版偏好设置对象，用于兼容历史字段并参与配置回退。
 * @returns 经过归一化处理后的 AI 投递判断配置对象。
 */
export function getAiDeliveryJudgeConfig(
  preference?: Record<string, unknown>
): AiDeliveryJudgeConfig {
  const ext = getAiConfigExt() as Record<string, unknown>;
  // 扩展配置是当前首选来源；旧版 preference 仅作为兼容回退来源使用。
  const extCfg = isPlainObject(ext.aiDeliveryJudge)
    ? (ext.aiDeliveryJudge as Record<string, unknown>)
    : {};
  const pref = isPlainObject(preference) ? preference : {};

  const normalizeFallbackPolicy = (
    value: unknown,
    fallback: 'reject' | 'fallback-traditional'
  ): 'reject' | 'fallback-traditional' => {
    return value === 'fallback-traditional' || value === 'reject' ? value : fallback;
  };
  const normalizeKeywordList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const text = `${item ?? ''}`.trim();
      if (!text) {
        continue;
      }

      // 关键词按大小写不敏感去重，避免同义项重复影响匹配提示质量。
      const key = text.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(text);
    }

    return result;
  };

  // 每个字段都遵循“扩展配置 -> 历史 preference 字段 -> 默认值”的解析优先级。
  const enabled =
    typeof extCfg.enabled === 'boolean'
      ? extCfg.enabled
      : typeof pref.aiDeliveryJudgeEnabled === 'boolean'
        ? (pref.aiDeliveryJudgeEnabled as boolean)
        : typeof pref.aiDeliverJudgeE === 'boolean'
          ? (pref.aiDeliverJudgeE as boolean)
          : DEFAULT_AI_DELIVERY_JUDGE_CONFIG.enabled;

  const prompt =
    `${extCfg.prompt || pref.aiDeliveryJudgePrompt || pref.aiDeliverJudgePrompt || ''}`.trim() ||
    DEFAULT_AI_DELIVERY_JUDGE_CONFIG.prompt;
  const extraPrompt =
    `${extCfg.extraPrompt || pref.aiDeliveryJudgeExtraPrompt || pref.aiDeliverJudgeExtraPrompt || ''}`.trim();
  const focusSkills = normalizeKeywordList(
    extCfg.focusSkills || pref.aiDeliveryJudgeFocusSkills || pref.aiDeliverJudgeFocusSkills
  );
  const excludeKeywords = normalizeKeywordList(
    extCfg.excludeKeywords ||
      pref.aiDeliveryJudgeExcludeKeywords ||
      pref.aiDeliverJudgeExcludeKeywords
  );
  const includeUserProfile =
    typeof extCfg.includeUserProfile === 'boolean'
      ? extCfg.includeUserProfile
      : typeof pref.aiDeliveryJudgeIncludeUserProfile === 'boolean'
        ? (pref.aiDeliveryJudgeIncludeUserProfile as boolean)
        : typeof pref.aiDeliverJudgeIncludeUserProfile === 'boolean'
          ? (pref.aiDeliverJudgeIncludeUserProfile as boolean)
          : DEFAULT_AI_DELIVERY_JUDGE_CONFIG.includeUserProfile;
  const includeTraditionalSnapshot =
    typeof extCfg.includeTraditionalSnapshot === 'boolean'
  const onAiError = normalizeFallbackPolicy(
    extCfg.onAiError || pref.aiDeliveryJudgeOnAiError || pref.aiDeliverJudgeOnAiError,
    DEFAULT_AI_DELIVERY_JUDGE_CONFIG.onAiError
  );
  const onInvalidResult = normalizeFallbackPolicy(
    extCfg.onInvalidResult ||
      pref.aiDeliveryJudgeOnInvalidResult ||
      pref.aiDeliverJudgeOnInvalidResult,
    DEFAULT_AI_DELIVERY_JUDGE_CONFIG.onInvalidResult
  );

  return {
    enabled,
    prompt,
    extraPrompt,
    focusSkills,
    excludeKeywords,
    includeUserProfile,
    onAiError,
    onInvalidResult,
  };
}

/**
 * 保存 AI 投递判断配置。
 *
 * 该方法会先读取当前生效配置，再按字段合并新值并执行归一化，确保部分更新不会丢失其他设置。
 * 最终结果会统一写回 AI 扩展配置中的 `aiDeliveryJudge` 槽位，供后续读取与迁移逻辑复用。
 *
 * @param config 需要写入的 AI 投递判断配置增量对象。
 * @returns 合并并规范化后的完整 AI 投递判断配置对象。
 * @throws {TypeError} 当配置在写回扩展配置时无法被 JSON 序列化（例如包含循环引用）时抛出。
 * @throws {DOMException} 当扩展配置写入失败且无法回退保存时抛出异常。
 */
export function saveAiDeliveryJudgeConfig(
  config: Partial<AiDeliveryJudgeConfig>
): AiDeliveryJudgeConfig {
  // 先以当前有效配置为基线归一化，保证调用方只传部分字段时仍可得到完整结果。
  const current = getAiDeliveryJudgeConfig();
  const normalizeFallbackPolicy = (
    value: unknown,
    fallback: 'reject' | 'fallback-traditional'
  ): 'reject' | 'fallback-traditional' => {
    return value === 'fallback-traditional' || value === 'reject' ? value : fallback;
  };
  const normalizeKeywordList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const text = `${item ?? ''}`.trim();
      if (!text) {
        continue;
      }

      // 写回前同样做大小写不敏感去重，保持存储内容稳定、可预测。
      const key = text.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(text);
    }

    return result;
  };
  const next: AiDeliveryJudgeConfig = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : current.enabled,
    prompt: `${config.prompt || current.prompt || ''}`.trim() || DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
    extraPrompt: `${config.extraPrompt || current.extraPrompt || ''}`.trim(),
    focusSkills: normalizeKeywordList(config.focusSkills ?? current.focusSkills),
    excludeKeywords: normalizeKeywordList(config.excludeKeywords ?? current.excludeKeywords),
    includeUserProfile:
      typeof config.includeUserProfile === 'boolean'
        ? config.includeUserProfile
        : current.includeUserProfile,
    onAiError: normalizeFallbackPolicy(config.onAiError, current.onAiError),
    onInvalidResult: normalizeFallbackPolicy(config.onInvalidResult, current.onInvalidResult),
  };

  const ext = getAiConfigExt() as Record<string, unknown>;
  // 统一写入扩展配置固定槽位，避免新旧来源并存导致读取结果不一致。
  ext.aiDeliveryJudge = {
    enabled: next.enabled,
    prompt: next.prompt,
    extraPrompt: next.extraPrompt,
    focusSkills: next.focusSkills,
    excludeKeywords: next.excludeKeywords,
    includeUserProfile: next.includeUserProfile,
    onAiError: next.onAiError,
    onInvalidResult: next.onInvalidResult,
  };
  saveAiConfigExt(ext);
  return next;
}

/**
 * 将旧版偏好设置中的 AI 投递判断配置迁移到扩展配置。
 *
 * 当扩展配置中已经存在 `aiDeliveryJudge` 时，函数不会覆盖现有配置，
 * 只返回当前有效配置；仅在新配置槽位缺失时，才会根据旧版 `preference` 计算并落盘。
 *
 * @param preference 可选的旧版偏好设置对象，用于生成迁移后的配置值。
 * @returns 迁移后当前生效的 AI 投递判断配置对象。
 * @throws {TypeError} 当迁移结果写回扩展配置时无法被 JSON 序列化（例如包含循环引用）时抛出。
 * @throws {DOMException} 当扩展配置写入失败且无法回退保存时抛出异常。
 */
export function migrateAiDeliveryJudgeConfigFromPreference(
  preference?: Record<string, unknown>
): AiDeliveryJudgeConfig {
  const ext = getAiConfigExt() as Record<string, unknown>;
  const hasExtConfig = isPlainObject(ext.aiDeliveryJudge);

  // 已完成迁移时直接返回，避免旧 preference 再次覆盖用户后续在新配置中的修改。
  if (hasExtConfig) {
    return getAiDeliveryJudgeConfig(preference);
  }

  // 仅在新配置槽位缺失时，才根据旧 preference 生成一次迁移结果并持久化。
  const next = getAiDeliveryJudgeConfig(preference);
  ext.aiDeliveryJudge = {
    enabled: next.enabled,
    prompt: next.prompt,
    extraPrompt: next.extraPrompt,
    focusSkills: next.focusSkills,
    excludeKeywords: next.excludeKeywords,
    includeUserProfile: next.includeUserProfile,
    onAiError: next.onAiError,
    onInvalidResult: next.onInvalidResult,
  };
  saveAiConfigExt(ext);
  return next;
}
