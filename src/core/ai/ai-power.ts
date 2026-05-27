// -*- coding: utf-8 -*-
import { directAsk, directAiCall, getActiveDirectConfig } from '@/core/ai/direct-ai-client';
import type { DirectAiMessage, DirectAiConfig } from '@/core/ai/direct-ai-client';
import { SecureLocalDB } from '@/core/storage/secure-local-db';
import { LocalDB } from '@/core/storage/local-db';
import { Tools } from '@/shared/utils/tools';
import { Logger } from '@/shared/utils/logger';
import type { ChatSession } from '@/core/storage/types';

const AI_DELIVERY_DIRECT_RESPONSE_FORMAT =
  '请严格只输出一行 JSON，且只能包含键 match 与 reason：{"match":true|false,"reason":"[CODE] 简短原因"}。禁止输出 Markdown、代码块或额外说明。';
const AI_DELIVERY_DIRECT_REQUIRED_MESSAGE =
  'AI投递过滤仅支持直连模式，请先在AI配置中启用并激活直连模型';
const AI_ASK_REQUIRED_MESSAGE =
  'AI代聊需要配置API密钥，请先在AI配置中添加并激活模型配置';
const logger = Logger.rootLogger;

const wrapFilterResponse = (data: unknown): { data: { code: number; data: unknown } } => {
  return {
    data: {
      code: 200,
      data,
    },
  };
};

const buildDirectFilterMessages = (
  prompt: string,
  jobBaseInfo: string,
  jobExtInfo: string
): DirectAiMessage[] => {
  return [
    {
      role: 'system',
      content: `${prompt}\n\n${AI_DELIVERY_DIRECT_RESPONSE_FORMAT}`,
    },
    {
      role: 'user',
      content: `[岗位基础信息]\n${jobBaseInfo}\n\n[岗位扩展信息]\n${jobExtInfo}`,
    },
  ];
};

const buildDirectTimeoutConfig = <T extends { timeout?: number }>(
  config: T,
  timeoutMs: number
): T => {
  return {
    ...config,
    timeout: Math.max(5, Math.ceil(timeoutMs / 1000)),
  };
};

/**
 * Convert AiConfig from SecureLocalDB to DirectAiConfig for direct-ai-client
 */
const toDirectAiConfig = (config: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  apiFormat: string;
  timeout?: number;
}): DirectAiConfig => {
  let apiFormat: DirectAiConfig['apiFormat'] = 'completions';
  if (
    config.apiFormat === 'responses' ||
    config.apiFormat === 'anthropic-messages' ||
    config.apiFormat === 'google-generative-ai'
  ) {
    apiFormat = config.apiFormat;
  }
  return {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    modelName: config.modelName,
    apiFormat,
    timeout: config.timeout,
  };
};

/**
 * Get active AI configuration from SecureLocalDB
 * Returns null if no active configuration is found
 */
const getActiveConfigFromLocalDB = async (): Promise<DirectAiConfig | null> => {
  try {
    // Ensure LocalDB is initialized
    await LocalDB.init();

    const activeConfig = await SecureLocalDB.getActiveAiConfig();
    if (!activeConfig || !activeConfig.baseUrl || !activeConfig.apiKey || !activeConfig.modelName) {
      const directConfig = getActiveDirectConfig();
      if (directConfig) {
        logger.info('Use active AI config from GM/localStorage model config state');
      }
      return directConfig;
    }

    return toDirectAiConfig(activeConfig);
  } catch (error) {
    logger.error('Failed to get active AI config from LocalDB:', error);
    const directConfig = getActiveDirectConfig();
    if (directConfig) {
      logger.info('Fallback to active AI config from GM/localStorage model config state');
    }
    return directConfig;
  }
};

export class AiPower {
  /**
   * Resolve AI delivery filter timeout from active model config.
   * Keeps the caller default as a lower bound, but honors a larger model timeout.
   */
  static async getFilterTimeoutMs(defaultTimeoutMs = 60_000): Promise<number> {
    const config = await getActiveConfigFromLocalDB();
    const configTimeoutMs = Number(config?.timeout || 0) * 1000;
    if (!Number.isFinite(configTimeoutMs) || configTimeoutMs <= 0) {
      return defaultTimeoutMs;
    }
    return Math.max(defaultTimeoutMs, configTimeoutMs);
  }

  /**
   * Check if AI filtering is available (has active config in local storage)
   */
  static async isFilterAvailable(): Promise<boolean> {
    const config = await getActiveConfigFromLocalDB();
    return config !== null;
  }

  /**
   * Check if AI chat is available (has active config in local storage)
   */
  static async isAskAvailable(): Promise<boolean> {
    const config = await getActiveConfigFromLocalDB();
    return config !== null;
  }

  /**
   * Get filter path - always 'direct' if config exists, 'disabled' otherwise
   */
  static async getFilterPath(): Promise<'direct' | 'disabled'> {
    const config = await getActiveConfigFromLocalDB();
    return config ? 'direct' : 'disabled';
  }

  /**
   * Ask AI a question using direct API call (no backend proxy)
   * Uses active configuration from SecureLocalDB
   */
  static async ask(
    question: string,
    jobKey: string,
    bossUserInfo: { jobTitle: string }
  ): Promise<any> {
    const directConfig = await getActiveConfigFromLocalDB();
    if (!directConfig) {
      logger.warn('AI.ask disabled because no active config found in LocalDB');
      return {
        data: {
          code: 400,
          message: AI_ASK_REQUIRED_MESSAGE,
          data: null,
        },
      };
    }

    // Get system prompt from config manager (uses localStorage via Tools)
    const channelKey = Tools.getCurrentAiModelChannelKey();
    const systemPrompt = Tools.getMergedPromptTextByChannel(channelKey);

    // Get message history from local chat session storage
    let messageHistory: DirectAiMessage[] = [];
    try {
      const session = await LocalDB.getChatSession(jobKey);
      if (session?.messages?.length) {
        // Convert ChatMessage[] to DirectAiMessage[]
        messageHistory = session.messages
          .filter((msg) => msg.role !== 'system')
          .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }));
      }
    } catch (error) {
      logger.warn('Failed to get chat history from LocalDB:', error);
    }

    logger.info(
      `AI.ask start jobKey=${jobKey} jobTitle=${bossUserInfo.jobTitle} historyLength=${messageHistory.length}`
    );
    const startedAt = Date.now();
    const result = await directAsk(question, systemPrompt, messageHistory, directConfig);
    logger.info(`AI.ask done elapsedMs=${Date.now() - startedAt}`);
    return result;
  }

  /**
   * Filter job using AI direct API call
   * Uses active configuration from SecureLocalDB
   */
  static async filter(
    prompt: string,
    jobBaseInfo: string,
    jobExtInfo: string,
    timeoutMs = 60_000
  ): Promise<any> {
    const directConfig = await getActiveConfigFromLocalDB();
    const startedAt = Date.now();
    if (!directConfig) {
      logger.warn('AI.filter disabled because no active config found in LocalDB');
      throw new Error(AI_DELIVERY_DIRECT_REQUIRED_MESSAGE);
    }
    const effectiveTimeoutMs = Math.max(
      timeoutMs,
      Number.isFinite(Number(directConfig.timeout)) ? Number(directConfig.timeout || 0) * 1000 : 0
    );

    logger.info(
      `AI.filter start path=direct timeoutMs=${effectiveTimeoutMs} promptChars=${prompt.length} baseInfoChars=${jobBaseInfo.length} extInfoChars=${jobExtInfo.length}`
    );
    const messages = buildDirectFilterMessages(prompt, jobBaseInfo, jobExtInfo);
    const answer = await directAiCall(
      buildDirectTimeoutConfig(directConfig, effectiveTimeoutMs),
      messages
    );
    logger.info(`AI.filter done path=direct elapsedMs=${Date.now() - startedAt}`);
    return wrapFilterResponse(answer);
  }

  /**
   * Update ask status in local chat session storage
   * No longer calls backend API
   */
  static async updateAskStatus(jobKey: string, stop: boolean): Promise<any> {
    try {
      // Ensure LocalDB is initialized
      await LocalDB.init();

      const session = await LocalDB.getChatSession(jobKey);
      if (session) {
        // Update the session with isAiEnabled flag
        const updatedSession: ChatSession = {
          ...session,
          isAiEnabled: !stop,
          lastMessageAt: Date.now(),
        };
        await LocalDB.saveChatSession(updatedSession);
        logger.info(`AI.updateAskStatus jobKey=${jobKey} stop=${stop} - updated local session`);
      } else {
        logger.warn(`AI.updateAskStatus jobKey=${jobKey} - session not found in LocalDB`);
      }

      return {
        data: {
          code: 200,
          message: 'success',
        },
      };
    } catch (error) {
      logger.error('Failed to update ask status in LocalDB:', error);
      return {
        data: {
          code: 500,
          message: `Failed to update session status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }
}
