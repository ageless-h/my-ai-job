// -*- coding: utf-8 -*-
import axios from 'axios';
import { getActiveDirectConfig } from '@/core/ai/direct-ai-client';
import { LocalAuthService } from '@/core/auth/local-auth';
import { LogRecorder } from '@/core/engine/push-engine';
import { showAppMessage } from '@/core/http/request';
import { LocalDB, SecureLocalDB } from '@/core/storage';
import { useLoginStore } from '@/state/login';
import { useUserStore } from '@/state/user';
import { fetchWithGM_request } from '@/shared/utils/fetch';
import {
  getPreferenceValue,
  migratePreferenceKeys,
  normalizePreferenceBoolean,
} from '@/shared/utils/preference';
import { Logger } from '@/shared/utils/logger';
import { Tools } from '@/shared/utils/tools';

export { fetchWithGM_request } from '@/shared/utils/fetch';

const logger = Logger.rootLogger;
const loginLogRecorder = new LogRecorder();
const preferenceLogRecorder = new LogRecorder();
let loginIng = false;

const isNetworkLikeError = (error: any): boolean => {
  const code = error?.code || '';
  if (['ECONNABORTED', 'ERR_NETWORK', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)) {
    return true;
  }
  const msg =
    `${typeof error === 'string' ? error : error?.message || error?.response?.data?.message || ''}`.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('time out') ||
    msg.includes('network') ||
    msg.includes('econnaborted')
  );
};

const runWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (!isNetworkLikeError(error) || attempt === maxRetries) {
        throw error;
      }
      await Tools.sleep(800 * attempt);
    }
  }
  throw lastError;
};

const waitForBossLoginContext = async (maxWaitMs = 5000, intervalMs = 250): Promise<boolean> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= maxWaitMs) {
    if (LocalAuthService.isBossLoggedIn()) {
      return true;
    }
    await Tools.sleep(intervalMs);
  }
  return false;
};

export const silentlyLogin = async (_bossUserId?: string): Promise<void> => {
  let loginCount = 0;
  while (loginIng && loginCount < 6) {
    logger.info('login... ', loginCount);
    await Tools.sleep(500);
    loginCount++;
  }

  loginIng = true;
  const loginStore = useLoginStore() as any;

  try {
    if (!(await waitForBossLoginContext())) {
      loginLogRecorder.info('未登录Boss，静默登录结束');
      throw new Error('未登录Boss，静默登录失败');
    }

    if (loginStore.login && (await LocalAuthService.isAuthenticated())) {
      logger.info('已经登录，静默登录结束');
      return;
    }

    const result = await LocalAuthService.authenticate();
    if (!result.success) {
      throw new Error(result.error || '本地认证失败');
    }

    loginStore.loginSuccess();
    loginLogRecorder.info('静默登录成功');
  } catch (error: unknown) {
    loginLogRecorder.error('静默登录失败', error);
    if (!isNetworkLikeError(error)) {
      loginStore.loginFail();
    }
    return Promise.reject(error);
  } finally {
    loginIng = false;
  }
};

export const loginInterceptor = (): boolean => {
  if (!LocalAuthService.extractBossToken()) {
    showAppMessage({
      message: '请先登录Boss',
      type: 'error',
      duration: 3000,
    });
    return false;
  }

  return true;
};

export const handlerImport = async (importResumeLoading: { value: boolean }): Promise<void> => {
  if (!loginInterceptor()) {
    return;
  }

  const token = LocalAuthService.extractBossToken();
  const userId = LocalAuthService.extractBossUserId();
  if (!token) {
    showAppMessage({
      message: '未获取到Boss token 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }
  if (!userId) {
    showAppMessage({
      message: '未获取到Boss userId 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }

  importResumeLoading.value = true;

  try {
    const resumeInfoResp = await axios.get('https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json', {
      headers: { Zp_token: token },
    });
    const zpData = (resumeInfoResp as any).data.zpData;
    if (!zpData.attachmentList || zpData.attachmentList.length === 0) {
      showAppMessage({
        message: '请先在BOSS个人中心上传附件简历；作为AI代聊定制化回复的基础',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    const resumeId = zpData.attachmentList[0].resumeId;
    const attachmentName = zpData.attachmentList[0].fileName || `${resumeId}.pdf`;
    const downloadResp = await fetchWithGM_request<ArrayBuffer>(
      `https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=${resumeId}`,
      { headers: { Zp_token: token }, responseType: 'arraybuffer' }
    );
    const buffer = downloadResp.response;
    if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
      throw new Error('简历文件下载为空');
    }

    await LocalDB.init();
    const currentProfile = await SecureLocalDB.getUserProfile();
    await SecureLocalDB.setUserProfile({
      id: userId,
      token,
      email: currentProfile?.email,
      phone: currentProfile?.phone,
      authenticatedAt: currentProfile?.authenticatedAt ?? Date.now(),
      lastSyncAt: Date.now(),
    });

    // 本地零成本解析（pdf.js 提取文本；若已配置 AI 则结构化抽取，否则用正则兜底）
    const { parseResumeFromBuffer } = await import('@/core/ai/resume-parser');
    const aiConfig = await SecureLocalDB.getActiveAiConfig();
    const directConfig = aiConfig
      ? {
          baseUrl: aiConfig.baseUrl,
          apiKey: aiConfig.apiKey,
          modelName: aiConfig.modelName,
          apiFormat: aiConfig.apiFormat,
          timeout: aiConfig.timeout,
        }
      : getActiveDirectConfig();

    const resumeData = await parseResumeFromBuffer(buffer, {
      userId,
      fileName: attachmentName,
      aiConfig: directConfig,
    });
    await LocalDB.saveResume(resumeData);

    // 同步到 user store，供 AI 代聊使用
    try {
      const runtimeUserStore = useUserStore() as any;
      runtimeUserStore.user = {
        ...(runtimeUserStore.user || {}),
        importedResume: true,
        resumeId,
        attachmentResume: attachmentName,
        parsedResume: resumeData.parsedData,
      };
    } catch (storeErr) {
      logger.warn('更新用户简历状态失败', storeErr);
    }

    showAppMessage({
      message: directConfig
        ? '简历解析完成（AI 结构化）'
        : '简历解析完成（本地正则提取，配置 AI 后可自动结构化）',
      type: 'success',
      duration: 3000,
    });
  } catch (error: any) {
    logger.error('Import resume failed:', error);
    showAppMessage({
      message: `导入简历失败: ${error?.message || '未知错误'}`,
      type: 'error',
      duration: 3000,
    });
  } finally {
    importResumeLoading.value = false;
  }
};

export function userRemoteLoad(): void {
  preferenceLogRecorder.info('加载用户投递设置');
  const runtimeUserStore2 = useUserStore() as any;
  const loginStore = useLoginStore() as any;
  runtimeUserStore2.preferenceLoadStatus = 'loading';
  runtimeUserStore2.preferenceLoadError = '';

  if (loginStore.loginFailStatus) {
    runtimeUserStore2.preferenceLoadStatus = 'failed';
    runtimeUserStore2.preferenceLoadError = '登录状态异常，请刷新页面后重试';
    preferenceLogRecorder.warn('加载用户投递设置终止：登录状态异常');
    return;
  }

  runWithRetry(() => silentlyLogin(''), 3)
    .then(async () => {
      logger.debug('从本地存储加载用户投递设置');
      await LocalDB.init();

      const profile = await SecureLocalDB.getUserProfile();
      if (!profile) {
        throw new Error('用户未登录');
      }
      const preferences = await LocalDB.getPreferences();

      const localImportedResume = runtimeUserStore2.user?.importedResume;
      const localResumeId = runtimeUserStore2.user?.resumeId;
      const localParsedResume = runtimeUserStore2.user?.parsedResume;
      const localAttachmentResume = runtimeUserStore2.user?.attachmentResume;

      runtimeUserStore2.user = {
        ...(runtimeUserStore2.user || {}),
        id: profile.id,
        email: profile.email,
        phone: profile.phone,
        preference: preferences || getDefaultPreferences(),
      };

      if (localImportedResume) runtimeUserStore2.user.importedResume = localImportedResume;
      if (localResumeId) runtimeUserStore2.user.resumeId = localResumeId;
      if (localParsedResume) runtimeUserStore2.user.parsedResume = localParsedResume;
      if (localAttachmentResume) runtimeUserStore2.user.attachmentResume = localAttachmentResume;

      migratePreferenceKeys(runtimeUserStore2.user.preference);
      applyPreferences(runtimeUserStore2.user.preference);

      runtimeUserStore2.preferenceLoadStatus = 'success';
      runtimeUserStore2.preferenceLoadError = '';
      Tools.saveStoredUserProfile(runtimeUserStore2.user);
      preferenceLogRecorder.info('加载用户投递设置成功');
    })
    .catch((error: any) => {
      if (!isNetworkLikeError(error)) {
        loginStore.loginFail();
      }
      const errorMsg =
        typeof error === 'string'
          ? error
          : error?.message || error?.response?.data?.message || '未知错误';
      runtimeUserStore2.preferenceLoadStatus = 'failed';
      runtimeUserStore2.preferenceLoadError = errorMsg;
      preferenceLogRecorder.error('加载用户投递设置失败', errorMsg);
    })
    .finally(() => {
      runtimeUserStore2.user = runtimeUserStore2.user || {};
      if (!runtimeUserStore2.user.preference) {
        runtimeUserStore2.user.preference = getDefaultPreferences();
      }
    });
}

function getDefaultPreferences() {
  return {
    pushIntervalSec: 3,
    pi: 3,
    npi: 6,
    maxDailyActions: 150,
    maxActionsPerMinute: 9,
    maxConsecutiveFailures: 10,
    cooldownMinutesOnLimit: 25,
    safetyTimeWindowE: false,
    safetyStartHour: 8,
    safetyEndHour: 22,
    imMaxReloadPerDay: 15,
    cleanerManualConfirmThreshold: 40,
    autoContactMinIntervalSec: 10,
    maxAutoMessagePerSession: 30,
    maxAutoResumePerSession: 18,
    chatMinReplyIntervalSec: 12,
    chatMaxPerMinute: 6,
    chatMaxSessionReplies: 75,
    autoResumeMaxPerSession: 12,
    acE: false,
    acW: true,
    acM: true,
    acY: true,
  };
}

function applyPreferences(pref: any): void {
  const upgradePrefNumber = (value: unknown, oldDefault: number, nextDefault: number): number => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n === oldDefault) {
      return nextDefault;
    }
    return n;
  };

  pref.pushIntervalSec = Number(getPreferenceValue(pref, 'pushIntervalSec', 'pi')) || 3;
  pref.pi = pref.pi || pref.pushIntervalSec;
  pref.npi = pref.npi || 6;
  pref.maxDailyActions = upgradePrefNumber(pref.maxDailyActions, 80, 120);
  pref.maxDailyActions = upgradePrefNumber(pref.maxDailyActions, 120, 150);
  pref.maxActionsPerMinute = upgradePrefNumber(pref.maxActionsPerMinute, 6, 9);
  pref.maxConsecutiveFailures = upgradePrefNumber(pref.maxConsecutiveFailures, 8, 10);
  pref.cooldownMinutesOnLimit = upgradePrefNumber(pref.cooldownMinutesOnLimit, 30, 25);
  pref.safetyTimeWindowE = normalizePreferenceBoolean(pref.safetyTimeWindowE, false);
  pref.safetyStartHour = pref.safetyStartHour ?? 8;
  pref.safetyEndHour = pref.safetyEndHour ?? 22;
  pref.imMaxReloadPerDay = upgradePrefNumber(pref.imMaxReloadPerDay, 10, 15);
  pref.cleanerManualConfirmThreshold = upgradePrefNumber(pref.cleanerManualConfirmThreshold, 8, 40);
  pref.autoContactMinIntervalSec = upgradePrefNumber(pref.autoContactMinIntervalSec, 12, 10);
  pref.maxAutoMessagePerSession = upgradePrefNumber(pref.maxAutoMessagePerSession, 20, 30);
  pref.maxAutoResumePerSession = upgradePrefNumber(pref.maxAutoResumePerSession, 12, 18);
  pref.chatMinReplyIntervalSec = upgradePrefNumber(pref.chatMinReplyIntervalSec, 15, 12);
  pref.chatMaxPerMinute = upgradePrefNumber(pref.chatMaxPerMinute, 4, 6);
  pref.chatMaxSessionReplies = upgradePrefNumber(pref.chatMaxSessionReplies, 50, 75);
  pref.autoResumeMaxPerSession = upgradePrefNumber(pref.autoResumeMaxPerSession, 8, 12);
  pref.acE = normalizePreferenceBoolean(pref.acE, false);
  pref.acW = normalizePreferenceBoolean(pref.acW, true);
  pref.acM = normalizePreferenceBoolean(pref.acM, true);
  pref.acY = normalizePreferenceBoolean(pref.acY, true);
  Tools.migrateAiDeliveryJudgeConfigFromPreference(pref);
}
