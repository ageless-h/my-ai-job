// -*- coding: utf-8 -*-
import { request } from "@/core/http/request";
import { getActiveDirectConfig, directAsk, directAiCall, wrapAsBackendResponse } from "@/core/ai/direct-ai-client";
import type { DirectAiMessage } from "@/core/ai/direct-ai-client";
import { Tools } from "@/shared/utils/tools";
import { Logger } from "@/shared/utils/logger";

const AI_DELIVERY_DIRECT_RESPONSE_FORMAT = '请严格只输出一行 JSON，且只能包含键 match 与 reason：{"match":true|false,"reason":"[CODE] 简短原因"}。禁止输出 Markdown、代码块或额外说明。';
const logger = Logger.rootLogger;

const wrapFilterResponse = (data: unknown): { data: { code: number; data: unknown } } => {
  return {
    data: {
      code: 200,
      data
    }
  };
};

const buildDirectFilterMessages = (prompt: string, jobBaseInfo: string, jobExtInfo: string): DirectAiMessage[] => {
  return [
    {
      role: "system",
      content: `${prompt}\n\n${AI_DELIVERY_DIRECT_RESPONSE_FORMAT}`
    },
    {
      role: "user",
      content: `[岗位基础信息]\n${jobBaseInfo}\n\n[岗位扩展信息]\n${jobExtInfo}`
    }
  ];
};

const buildDirectTimeoutConfig = <T extends { timeout?: number }>(config: T, timeoutMs: number): T => {
  return {
    ...config,
    timeout: Math.max(5, Math.ceil(timeoutMs / 1000))
  };
};

export class AiPower {
  static getFilterPath(): "direct" | "backend" {
    return getActiveDirectConfig() ? "direct" : "backend";
  }

  static async ask(question: string, jobKey: string, bossUserInfo: { jobTitle: string }): Promise<any> {
    const directConfig = getActiveDirectConfig();
    if (directConfig) {
      // 自有 API 激活，直接调用用户的 AI API
      const ext = Tools.getAiConfigExt() as any;
      const channelKey = Tools.getCurrentAiModelChannelKey();
      const presetStore = ext.promptPresetStore || { global: [], personal: {} };
      const globalPresets = Array.isArray(presetStore.global) ? presetStore.global : [];
      const personalPresets = Array.isArray(presetStore.personal?.[channelKey]) ? presetStore.personal[channelKey] : [];
      const allPresets = [...globalPresets, ...personalPresets].filter((p: any) => p.enabled !== false);
      const systemPrompt = allPresets.map((p: any) => p.content || '').filter(Boolean).join('\n\n');
      return directAsk(question, systemPrompt, [], directConfig);
    }
    return request.post(
      "/api/job/seeker/cloned/ask",
      {
        question,
        jobKey,
        jobInfo: {
          jobTitle: bossUserInfo.jobTitle
        }
      },
      {
        timeout: 90_000
      }
    );
  }

  static async filter(prompt: string, jobBaseInfo: string, jobExtInfo: string, timeoutMs = 60_000): Promise<any> {
    const directConfig = getActiveDirectConfig();
    const startedAt = Date.now();
    if (directConfig) {
      logger.info(`AI.filter start path=direct timeoutMs=${timeoutMs} promptChars=${prompt.length} baseInfoChars=${jobBaseInfo.length} extInfoChars=${jobExtInfo.length}`);
      const messages = buildDirectFilterMessages(prompt, jobBaseInfo, jobExtInfo);
      const answer = await directAiCall(buildDirectTimeoutConfig(directConfig, timeoutMs), messages);
      logger.info(`AI.filter done path=direct elapsedMs=${Date.now() - startedAt}`);
      return wrapFilterResponse(answer);
    }

    logger.info(`AI.filter start path=backend timeoutMs=${timeoutMs} promptChars=${prompt.length} baseInfoChars=${jobBaseInfo.length} extInfoChars=${jobExtInfo.length}`);

    const resp = await request.post(
      "api/job/filter/one",
      {
        prompt,
        jobBaseInfo,
        jobExtInfo
      },
      {
        timeout: timeoutMs
      }
    );
    logger.info(`AI.filter done path=backend elapsedMs=${Date.now() - startedAt}`);
    return resp;
  }

  static async updateAskStatus(jobKey: string, stop: boolean): Promise<any> {
    return request.post(`/api/job/seeker/cloned/change/session/status?jobKey=${jobKey}&stop=${stop}`);
  }
}
