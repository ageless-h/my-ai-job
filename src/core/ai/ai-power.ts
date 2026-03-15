// -*- coding: utf-8 -*-
import { request } from '@/core/http/request';
import { getActiveDirectConfig, directAsk, directAiCall } from '@/core/ai/direct-ai-client';
import type { DirectAiMessage } from '@/core/ai/direct-ai-client';
import { Tools } from '@/shared/utils/tools';
import { Logger } from '@/shared/utils/logger';

const AI_DELIVERY_DIRECT_RESPONSE_FORMAT =
  '请严格只输出一行 JSON，且只能包含键 match 与 reason：{"match":true|false,"reason":"[CODE] 简短原因"}。禁止输出 Markdown、代码块或额外说明。';
const AI_DELIVERY_DIRECT_REQUIRED_MESSAGE =
  'AI投递过滤仅支持直连模式，请先在AI配置中启用并激活直连模型';
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

export class AiPower {
  static getFilterPath(): 'direct' | 'disabled' {
    return getActiveDirectConfig() ? 'direct' : 'disabled';
  }

  static async ask(
    question: string,
    jobKey: string,
    bossUserInfo: { jobTitle: string }
  ): Promise<any> {
    const directConfig = getActiveDirectConfig();
    if (directConfig) {
      // 自有 API 激活，直接调用用户的 AI API
      const channelKey = Tools.getCurrentAiModelChannelKey();
      const systemPrompt = Tools.getMergedPromptTextByChannel(channelKey);
      return directAsk(question, systemPrompt, [], directConfig);
    }
    return request.post(
      '/api/job/seeker/cloned/ask',
      {
        question,
        jobKey,
        jobInfo: {
          jobTitle: bossUserInfo.jobTitle,
        },
      },
      {
        timeout: 90_000,
      }
    );
  }

  static async filter(
    prompt: string,
    jobBaseInfo: string,
    jobExtInfo: string,
    timeoutMs = 60_000
  ): Promise<any> {
    const directConfig = getActiveDirectConfig();
    const startedAt = Date.now();
    if (!directConfig) {
      logger.warn('AI.filter disabled because direct config is missing');
      throw new Error(AI_DELIVERY_DIRECT_REQUIRED_MESSAGE);
    }

    logger.info(
      `AI.filter start path=direct timeoutMs=${timeoutMs} promptChars=${prompt.length} baseInfoChars=${jobBaseInfo.length} extInfoChars=${jobExtInfo.length}`
    );
    const messages = buildDirectFilterMessages(prompt, jobBaseInfo, jobExtInfo);
    const answer = await directAiCall(buildDirectTimeoutConfig(directConfig, timeoutMs), messages);
    logger.info(`AI.filter done path=direct elapsedMs=${Date.now() - startedAt}`);
    return wrapFilterResponse(answer);
  }

  static async updateAskStatus(jobKey: string, stop: boolean): Promise<any> {
    return request.post(
      `/api/job/seeker/cloned/change/session/status?jobKey=${jobKey}&stop=${stop}`
    );
  }
}
