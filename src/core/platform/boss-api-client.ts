// -*- coding: utf-8 -*-

import axios, { AxiosResponse } from 'axios';
import { Logger } from '@/shared/utils/logger';
import { Tools } from '@/shared/utils/tools';
import { PushRequestError, FavoriteRequestError, FetchJobDetailError } from '@/shared/errors';
import { PushResultStatus } from '@/core/engine/push-engine';
import { extractResumeTextFromHtml } from '@/shared/utils/resume';

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
 *
 * 负责所有与 BOSS 平台的 HTTP 交互，包括投递、收藏、获取职位详情、简历等操作。
 * 提供缓存机制以优化性能，支持重试机制处理网络错误。
 *
 * @class BossApiClient
 */
export class BossApiClient {
  /** 运行时简历文本缓存 */
  private runtimeResumeTextCache: string | null = null;

  /** 简历缓存的时间戳 */
  private runtimeResumeTextCacheTime = 0;

  /** BOSS 数据缓存映射表 */
  private bossDataCache = new Map<string, BossDataResponse>();

  /** BOSS 数据缓存的最大容量 */
  private readonly BOSS_DATA_CACHE_SIZE = 100;

  /**
   * 投递职位（发送打招呼）
   *
   * 向 BOSS 直聘平台发送投递请求，支持自动重试机制。
   * 当遇到网络错误时会自动重试，重试间隔为 (4 - retries) * 1000ms。
   *
   * @param {any} jobDetail - 职位详情对象，包含以下必要字段：
   *   - jobName: 职位名称
   *   - brandName: 公司名称
   *   - securityId: 安全 ID
   *   - encryptJobId: 加密的职位 ID
   *   - lid: 列表 ID
   * @param {number} [retries=3] - 重试次数，默认为 3 次
   * @returns {Promise<PushResponse>} 投递响应对象，包含：
   *   - code: 响应码（0 表示成功）
   *   - message: 响应消息
   *   - zpData: 响应数据，可能包含对话提示信息
   * @throws {PushRequestError} 当投递失败且重试次数耗尽时抛出
   * @throws {Error} 当未找到认证令牌时抛出
   */
  async doPush(jobDetail: any, retries = 3): Promise<PushResponse> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new PushRequestError(jobTitle, '投递重试多次失败');
    }

    logger.debug('正在投递：' + jobTitle);

    const publishUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${jobDetail.securityId}&jobId=${jobDetail.encryptJobId}&lid=${jobDetail.lid}`;

    try {
      const token = Tools.getCookieValue('bst');
      if (!token) {
        throw new Error('未找到认证令牌');
      }

      const response: AxiosResponse<PushResponse> = await axios.post(publishUrl, null, {
        headers: { Zp_token: token },
      });

      return response.data;
    } catch (error: any) {
      const latestError = `${error?.message || '投递请求失败'}`;

      // 检测是否为网络错误，如果是则进行重试
      if (this.isNetworkError(error) && retries > 1) {
        const retryDelay = (4 - retries) * 1000; // 第一次重试延迟 1s，第二次延迟 2s
        logger.debug(
          `工作【${jobTitle}】投递失败 (尝试${4 - retries}/3); 正在等待重试; 原因：${latestError}`
        );
        await Tools.sleep(retryDelay);
        return await this.doPush(jobDetail, retries - 1);
      }

      logger.debug(`工作【${jobTitle}】投递失败; 原因：${latestError}`);
      throw error;
    }
  }

  /**
   * 收藏职位
   *
   * 向 BOSS 直聘平台发送收藏请求，支持双端点备用机制和自动重试。
   * 首先尝试第一个收藏端点（标记感兴趣），如果失败则尝试第二个端点（收藏职位）。
   * 当遇到网络错误时会自动重试，重试间隔为 (3 - retries) * 1000ms。
   *
   * @param {any} jobDetail - 职位详情对象，包含以下必要字段：
   *   - jobName: 职位名称
   *   - brandName: 公司名称
   *   - securityId: 安全 ID
   *   - encryptJobId: 加密的职位 ID
   *   - lid: 列表 ID
   * @param {number} [retries=2] - 重试次数，默认为 2 次
   * @returns {Promise<FavoriteResponse>} 收藏响应对象，包含：
   *   - code: 响应码（0 表示成功）
   *   - message: 响应消息
   *   - zpData: 响应数据
   * @throws {FavoriteRequestError} 当收藏失败且重试次数耗尽时抛出
   * @throws {Error} 当未找到认证令牌或两个端点都失败时抛出
   */
  async doCollect(jobDetail: any, retries = 2): Promise<FavoriteResponse> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FavoriteRequestError(jobTitle, '收藏重试多次失败');
    }

    logger.debug('正在收藏：' + jobTitle);

    const requests = this.buildFavoriteApiRequests(jobDetail);

    try {
      const token = Tools.getCookieValue('bst');
      if (!token) {
        throw new Error('未找到认证令牌');
      }

      // 尝试第一个收藏端点（标记感兴趣）
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

      // 尝试第二个收藏端点（收藏职位）
      const response: AxiosResponse<FavoriteResponse> = await axios.post(
        requests[1].url,
        requests[1].data,
        { headers: { Zp_token: token } }
      );

      if (this.isFavoriteSuccess(response.data)) {
        return response.data;
      }

      throw new Error('收藏响应无效');
    } catch (error: any) {
      const latestError = `${error?.message || '收藏请求失败'}`;

      // 检测是否为网络错误，如果是则进行重试
      if (this.isNetworkError(error) && retries > 1) {
        const retryDelay = (3 - retries) * 1000;
        logger.debug(
          `工作【${jobTitle}】收藏失败 (尝试${3 - retries}/2); 正在等待重试; 原因：${latestError}`
        );
        await Tools.sleep(retryDelay);
        return await this.doCollect(jobDetail, retries - 1);
      }

      logger.debug(`工作【${jobTitle}】收藏失败; 原因：${latestError}`);
      throw error;
    }
  }

  /**
   * 获取 BOSS 数据（对话详情）
   *
   * 从 BOSS 直聘平台获取与 BOSS 的对话详情信息，包括 BOSS 的基本信息等。
   *
   * @param {any} jobDetail - 职位详情对象，包含以下必要字段：
   *   - encryptBossId: 加密的 BOSS ID
   *   - securityId: 安全 ID
   * @returns {Promise<any>} BOSS 数据对象，包含 BOSS 的详细信息
   * @throws {Error} 当未获取到认证令牌或 API 返回错误时抛出
   */
  async requestBossData(jobDetail: any): Promise<any> {
    const url = 'https://www.zhipin.com/wapi/zpchat/geek/getBossData';
    const token = Tools.getCookieValue('bst');

    if (!token) {
      throw new Error('未获取到zp-token');
    }

    const data = new FormData();
    data.append('bossId', jobDetail.encryptBossId);
    data.append('securityId', jobDetail.securityId);
    data.append('bossSrc', '0');

    const resp = await axios({ url, data, method: 'POST', headers: { Zp_token: token } });

    if (resp.data.code !== 0) {
      throw new Error(resp.data.message);
    }

    return resp.data.zpData;
  }

  /**
   * 获取职位详情扩展信息
   *
   * 从 BOSS 直聘平台获取职位的详细卡片信息，包括职位描述、要求等详细内容。
   *
   * @param {string} securityId - 安全 ID，用于请求验证
   * @param {string} jobId - 职位 ID，标识具体的职位
   * @param {string} lid - 列表 ID，标识职位所在的列表
   * @returns {Promise<Record<string, unknown>>} 职位详情卡片对象，包含 postDescription、address、activeTimeDesc 等字段
   * @throws {FetchJobDetailError} 当获取失败时抛出
   * @throws {Error} 当未找到认证令牌时抛出
   */
  async obtainBossJobDetailExt(
    securityId: string,
    jobId: string,
    lid: string
  ): Promise<Record<string, unknown>> {
    const url = `https://www.zhipin.com/wapi/zpgeek/job/card.json?securityId=${securityId}&jobId=${jobId}&lid=${lid}`;
    const token = Tools.getCookieValue('bst');

    if (!token) {
      throw new Error('未找到认证令牌');
    }

    try {
      const response: AxiosResponse<JobDetailExtResponse> = await axios.get(url, {
        headers: { Zp_token: token },
      });

      // 提取 zpData.jobCard，如果不存在则返回空对象
      return response.data.zpData?.jobCard || {};
    } catch (error: any) {
      logger.error('获取职位详情扩展失败', error);
      throw new FetchJobDetailError(`获取职位详情失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取并缓存运行时简历文本
   *
   * 从 BOSS 直聘平台获取用户的简历内容，并使用 5 分钟的缓存机制。
   * 如果缓存未过期，直接返回缓存的简历文本；否则重新获取并更新缓存。
   *
   * @returns {Promise<string>} 简历文本内容
   * @throws {Error} 当获取简历失败时抛出
   */
  async fetchAndCacheRuntimeResumeText(): Promise<string> {
    const now = Date.now();

    // 检查缓存是否有效（5 分钟内）
    if (
      this.runtimeResumeTextCache &&
      now - this.runtimeResumeTextCacheTime < RUNTIME_RESUME_REFRESH_INTERVAL_MS
    ) {
      return this.runtimeResumeTextCache;
    }

    const url = 'https://www.zhipin.com/web/geek/resume';

    try {
      const response: AxiosResponse<string> = await axios.get(url);
      const html = response.data;
      const resumeText = extractResumeTextFromHtml(html);

      // 更新缓存和时间戳
      this.runtimeResumeTextCache = resumeText;
      this.runtimeResumeTextCacheTime = now;

      return resumeText;
    } catch (error: any) {
      logger.error('获取简历失败', error);
      throw error;
    }
  }

  /**
   * 从预览 API 获取简历数据
   *
   * 通过 BOSS 直聘的简历预览 API 获取用户的简历结构化数据。
   * 此方法不使用缓存，每次调用都会从服务器获取最新数据。
   *
   * @returns {Promise<Record<string, unknown>>} 简历数据对象，包含 baseInfo, expectList, workExpList 等字段
   * @throws {Error} 当未找到认证令牌或网络请求失败时抛出
   */
  async fetchRuntimeResumeTextFromPreviewApi(): Promise<Record<string, unknown>> {
    const url = 'https://www.zhipin.com/wapi/zpgeek/resume/geek/preview/data.json';
    const token = Tools.getCookieValue('bst');

    if (!token) {
      throw new Error('未找到认证令牌');
    }

    try {
      const response: AxiosResponse<ResumePreviewResponse> = await axios.get(url, {
        headers: { Zp_token: token },
      });

      return response.data?.zpData || {};
    } catch (error: any) {
      logger.error('从预览 API 获取简历失败', error);
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

  /**
   * 获取职位的显示键值（用于日志和错误消息）
   *
   * @private
   * @param {any} jobDetail - 职位详情对象
   * @returns {string} 格式为 "职位名称 - 公司名称" 的字符串
   */
  private getJobKey(jobDetail: any): string {
    return `${jobDetail?.jobName || '未知职位'} - ${jobDetail?.brandName || '未知公司'}`;
  }

  /**
   * 判断错误是否为网络错误
   *
   * 检查错误是否为网络相关的错误（连接中止、超时等）。
   *
   * @private
   * @param {any} error - 错误对象
   * @returns {boolean} 如果是网络错误则返回 true，否则返回 false
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('Network Error')
    );
  }

  /**
   * 构建收藏 API 请求配置
   *
   * 生成两个备用的收藏 API 端点请求配置。
   * 第一个端点用于标记感兴趣，第二个端点用于收藏职位。
   *
   * @private
   * @param {any} jobDetail - 职位详情对象
   * @returns {Array<{url: string; data: any}>} 包含两个请求配置的数组
   */
  private buildFavoriteApiRequests(jobDetail: any): Array<{ url: string; data: any }> {
    const { securityId, encryptJobId, lid } = jobDetail;

    return [
      {
        url: `https://www.zhipin.com/wapi/zprelation/geekTag/job/interest?securityId=${securityId}&jobId=${encryptJobId}&lid=${lid}`,
        data: { interest: 1 },
      },
      {
        url: `https://www.zhipin.com/wapi/zprelation/job/collect.json?securityId=${securityId}&jobId=${encryptJobId}&lid=${lid}`,
        data: null,
      },
    ];
  }

  /**
   * 判断收藏响应是否成功
   *
   * 通过检查响应码、结果字段和消息内容来判断收藏操作是否成功。
   *
   * @param {any} response - 收藏 API 的响应对象
   * @returns {boolean} 如果收藏成功则返回 true，否则返回 false
   */
  isFavoriteSuccess(response: any): boolean {
    if (!response) {
      return false;
    }

    const message = `${response?.message || ''}`;
    const result = response?.result ?? response?.zpData?.result;

    // 检查响应码和结果字段
    if (response?.code === 0 && result !== false) {
      return true;
    }

    // 检查消息内容中的成功关键词
    return message.includes('已收藏') || message.includes('取消收藏') || message.includes('感兴趣');
  }
}
