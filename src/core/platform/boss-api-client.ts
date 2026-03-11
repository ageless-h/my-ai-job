// -*- coding: utf-8 -*-

import axios, { AxiosResponse } from "axios";
import { Logger } from "@/shared/utils/logger";
import { Tools } from "@/shared/utils/tools";
import { PushRequestError, FavoriteRequestError, FetchJobDetailError } from "@/shared/errors";
import { PushResultStatus } from "@/core/engine/push-engine";
import { extractResumeTextFromHtml } from "@/shared/utils/resume";

const logger = Logger.rootLogger;
const RUNTIME_RESUME_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface BossDataResponse {
  code: number;
  message: string;
  zpData?: {
    bossId?: string;
    encryptBossId?: string;
    [key: string]: unknown;
  };
}

interface PushResponse {
  code: number;
  message: string;
  zpData?: {
    bizData?: {
      chatRemindDialog?: {
        content?: string;
      };
    };
  };
}

interface FavoriteResponse {
  code: number;
  message: string;
  zpData?: unknown;
}

interface JobDetailExtResponse {
  code: number;
  message: string;
  zpData?: {
    jobCard?: Record<string, unknown>;
  };
}

interface ResumePreviewResponse {
  code: number;
  message: string;
  zpData?: {
    resumeInfo?: {
      resume?: string;
    };
  };
}

/**
 * BOSS 直聘 API 客户端
 * 负责所有与 BOSS 平台的 HTTP 交互
 */
export class BossApiClient {
  private runtimeResumeTextCache: string | null = null;
  private runtimeResumeTextCacheTime = 0;
  private bossDataCache = new Map<string, BossDataResponse>();
  private readonly BOSS_DATA_CACHE_SIZE = 100;

  /**
   * 投递职位（发送打招呼）
   * @param jobDetail 职位详情
   * @param retries 重试次数
   * @returns 投递响应
   */
  async doPush(jobDetail: any, retries = 3): Promise<PushResponse> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new PushRequestError(jobTitle, "投递重试多次失败");
    }

    logger.debug("正在投递：" + jobTitle);

    const publishUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${jobDetail.securityId}&jobId=${jobDetail.encryptJobId}&lid=${jobDetail.lid}`;
    
    try {
      const token = Tools.getCookieValue("bst");
      if (!token) {
        throw new Error("未找到认证令牌");
      }

      const response: AxiosResponse<PushResponse> = await axios.post(
        publishUrl,
        null,
        { headers: { Zp_token: token } }
      );

      return response.data;
    } catch (error: any) {
      const latestError = `${error?.message || "投递请求失败"}`;
      
      // 检测是否为网络错误
      if (this.isNetworkError(error) && retries > 1) {
        const retryDelay = (4 - retries) * 1000; // 1s, 2s
        logger.debug(`工作【${jobTitle}】投递失败 (尝试${4 - retries}/3); 正在等待重试; 原因：${latestError}`);
        await Tools.sleep(retryDelay);
        return await this.doPush(jobDetail, retries - 1);
      }
      
      logger.debug(`工作【${jobTitle}】投递失败; 原因：${latestError}`);
      throw error;
    }
  }

  /**
   * 收藏职位
   * @param jobDetail 职位详情
   * @param retries 重试次数
   * @returns 收藏响应
   */
  async doCollect(jobDetail: any, retries = 2): Promise<FavoriteResponse> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FavoriteRequestError(jobTitle, "收藏重试多次失败");
    }

    logger.debug("正在收藏：" + jobTitle);

    const requests = this.buildFavoriteApiRequests(jobDetail);
    
    try {
      const token = Tools.getCookieValue("bst");
      if (!token) {
        throw new Error("未找到认证令牌");
      }

      // 尝试第一个端点
      try {
        const response: AxiosResponse<FavoriteResponse> = await axios.post(
          requests[0].url,
          requests[0].data,
          { headers: { Zp_token: token } }
        );

        if (this.isFavoriteSuccess(response.data)) {
          return response.data;
        }
      } catch (firstError) {
        logger.debug(`第一个收藏端点失败，尝试备用端点`);
      }

      // 尝试第二个端点
      const response: AxiosResponse<FavoriteResponse> = await axios.post(
        requests[1].url,
        requests[1].data,
        { headers: { Zp_token: token } }
      );

      if (this.isFavoriteSuccess(response.data)) {
        return response.data;
      }

      throw new Error("收藏响应无效");
    } catch (error: any) {
      const latestError = `${error?.message || "收藏请求失败"}`;
      
      if (this.isNetworkError(error) && retries > 1) {
        const retryDelay = (3 - retries) * 1000;
        logger.debug(`工作【${jobTitle}】收藏失败 (尝试${3 - retries}/2); 正在等待重试; 原因：${latestError}`);
        await Tools.sleep(retryDelay);
        return await this.doCollect(jobDetail, retries - 1);
      }
      
      logger.debug(`工作【${jobTitle}】收藏失败; 原因：${latestError}`);
      throw error;
    }
  }

  /**
   * 获取 BOSS 数据（对话详情）
   * @param jobDetail 职位详情对象
   * @returns BOSS 数据响应
   */
  async requestBossData(jobDetail: any): Promise<any> {
    const url = "https://www.zhipin.com/wapi/zpchat/geek/getBossData";
    const token = Tools.getCookieValue("bst");
    
    if (!token) {
      throw new Error("未获取到zp-token");
    }

    const data = new FormData();
    data.append("bossId", jobDetail.encryptBossId);
    data.append("securityId", jobDetail.securityId);
    data.append("bossSrc", "0");

    const resp = await axios({ url, data, method: "POST", headers: { Zp_token: token } });

    if (resp.data.code !== 0) {
      throw new Error(resp.data.message);
    }

    return resp.data.zpData;
  }

  /**
   * 获取职位详情扩展信息
   * @param securityId 安全 ID
   * @param jobId 职位 ID
   * @param lid 列表 ID
   * @returns 职位详情扩展响应
   */
  async obtainBossJobDetailExt(
    securityId: string,
    jobId: string,
    lid: string
  ): Promise<JobDetailExtResponse> {
    const url = `https://www.zhipin.com/wapi/zpgeek/job/card.json?securityId=${securityId}&jobId=${jobId}&lid=${lid}`;
    const token = Tools.getCookieValue("bst");
    
    if (!token) {
      throw new Error("未找到认证令牌");
    }

    try {
      const response: AxiosResponse<JobDetailExtResponse> = await axios.get(url, {
        headers: { Zp_token: token }
      });

      return response.data;
    } catch (error: any) {
      logger.error("获取职位详情扩展失败", error);
      throw new FetchJobDetailError(`获取职位详情失败: ${error?.message || "未知错误"}`);
    }
  }

  /**
   * 获取并缓存运行时简历文本
   * @returns 简历文本
   */
  async fetchAndCacheRuntimeResumeText(): Promise<string> {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (
      this.runtimeResumeTextCache &&
      now - this.runtimeResumeTextCacheTime < RUNTIME_RESUME_REFRESH_INTERVAL_MS
    ) {
      return this.runtimeResumeTextCache;
    }

    const url = "https://www.zhipin.com/web/geek/resume";
    
    try {
      const response: AxiosResponse<string> = await axios.get(url);
      const html = response.data;
      const resumeText = extractResumeTextFromHtml(html);

      // 更新缓存
      this.runtimeResumeTextCache = resumeText;
      this.runtimeResumeTextCacheTime = now;

      return resumeText;
    } catch (error: any) {
      logger.error("获取简历失败", error);
      throw error;
    }
  }

  /**
   * 从预览 API 获取简历文本
   * @returns 简历文本
   */
  async fetchRuntimeResumeTextFromPreviewApi(): Promise<string> {
    const url = "https://www.zhipin.com/wapi/zpgeek/resume/geek/preview/data.json";
    const token = Tools.getCookieValue("bst");
    
    if (!token) {
      throw new Error("未找到认证令牌");
    }

    try {
      const response: AxiosResponse<ResumePreviewResponse> = await axios.get(url, {
        headers: { Zp_token: token }
      });

      const resumeText = response.data?.zpData?.resumeInfo?.resume || "";
      return resumeText;
    } catch (error: any) {
      logger.error("从预览 API 获取简历失败", error);
      throw error;
    }
  }

  /**
   * 清除简历缓存
   */
  clearResumeCache(): void {
    this.runtimeResumeTextCache = null;
    this.runtimeResumeTextCacheTime = 0;
  }

  /**
   * 清除 BOSS 数据缓存
   */
  clearBossDataCache(): void {
    this.bossDataCache.clear();
  }

  // ========== 辅助方法 ==========

  private getJobKey(jobDetail: any): string {
    return `${jobDetail?.jobName || "未知职位"} - ${jobDetail?.brandName || "未知公司"}`;
  }

  private isNetworkError(error: any): boolean {
    return (
      error?.code === "ECONNABORTED" ||
      error?.code === "ETIMEDOUT" ||
      error?.message?.includes("timeout") ||
      error?.message?.includes("Network Error")
    );
  }

  private buildFavoriteApiRequests(jobDetail: any): Array<{ url: string; data: any }> {
    const { securityId, encryptJobId, lid } = jobDetail;
    
    return [
      {
        url: `https://www.zhipin.com/wapi/zprelation/geekTag/job/interest?securityId=${securityId}&jobId=${encryptJobId}&lid=${lid}`,
        data: { interest: 1 }
      },
      {
        url: `https://www.zhipin.com/wapi/zprelation/job/collect.json?securityId=${securityId}&jobId=${encryptJobId}&lid=${lid}`,
        data: null
      }
    ];
  }

  isFavoriteSuccess(response: any): boolean {
    if (!response) {
      return false;
    }

    const message = `${response?.message || ""}`;
    const result = response?.result ?? response?.zpData?.result;
    
    // 检查响应码和结果
    if (response?.code === 0 && result !== false) {
      return true;
    }

    // 检查消息内容
    return message.includes("已收藏") || message.includes("取消收藏") || message.includes("感兴趣");
  }
}
