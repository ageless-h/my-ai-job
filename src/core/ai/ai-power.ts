// -*- coding: utf-8 -*-
import { request } from "@/core/http/request";
import { getActiveDirectConfig, directAsk, directAiCall, wrapAsBackendResponse } from "@/core/ai/direct-ai-client";
import type { DirectAiMessage } from "@/core/ai/direct-ai-client";
import { Tools } from "@/shared/utils/tools";

export class AiPower {
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

  static async filter(prompt: string, jobBaseInfo: string, jobExtInfo: string): Promise<any> {
    return request.post(
      "api/job/filter/one",
      {
        prompt,
        jobBaseInfo,
        jobExtInfo
      },
      {
        timeout: 60_000
      }
    );
  }

  static async updateAskStatus(jobKey: string, stop: boolean): Promise<any> {
    return request.post(`/api/job/seeker/cloned/change/session/status?jobKey=${jobKey}&stop=${stop}`);
  }
}
