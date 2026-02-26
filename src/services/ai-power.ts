// -*- coding: utf-8 -*-
import { request } from "@/services/request";

export class AiPower {
  static async ask(question: string, jobKey: string, bossUserInfo: { jobTitle: string }): Promise<any> {
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
