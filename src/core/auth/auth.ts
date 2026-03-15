// -*- coding: utf-8 -*-
import axios from 'axios';
import { useLoginStore } from '@/state/login';
import { useUserStore } from '@/state/user';
import { LogRecorder } from '@/core/engine/push-engine';
import { showAppMessage, request } from '@/core/http/request';
import { setAuthorizationToken } from '@/core/auth/auth-session';
import { Tools } from '@/shared/utils/tools';
import { Logger } from '@/shared/utils/logger';
import {
  getPreferenceValue,
  migratePreferenceKeys,
  normalizePreferenceBoolean,
} from '@/shared/utils/preference';
import { fetchWithGM_request } from '@/shared/utils/fetch';
export { fetchWithGM_request } from '@/shared/utils/fetch';

const logger = Logger.rootLogger;

const loginLogRecorder = new LogRecorder();
let loginIng = false;

type PageContext = {
  token?: string;
  uid?: string | number;
};

const getPageContext = (): PageContext => {
  return Tools.getSafePageContext();
};

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

export const silentlyLogin = async (bossUserId?: string): Promise<void> => {
  let loginCount = 0;
  while (loginIng && loginCount < 6) {
    logger.info('login... ', loginCount);
    await Tools.sleep(500);
    loginCount++;
  }

  loginIng = true;
  const loginStore = useLoginStore() as any;

  let token = getPageContext().token;
  let count = 0;
  while (!token && count < 3) {
    await Tools.sleep(300);
    token = getPageContext().token;
    count++;
  }

  if (!token) {
    loginLogRecorder.info('未登录Boss，静默登录结束');
    loginIng = false;
    return Promise.reject(new Error('未登录Boss，静默登录失败'));
  }

  if (!bossUserId) {
    const uid = getPageContext().uid;
    bossUserId = uid === undefined ? undefined : String(uid);
  }

  if (loginStore.login) {
    logger.info('已经登录，静默登录结束');
    loginIng = false;
    return Promise.resolve();
  }

  return await request
    .post(
      `/api/user/silently/login?uniqueId=${bossUserId}`,
      {},
      {
        silentErrorToast: true,
        silentTimeoutToast: true,
        silentNetworkToast: true,
      }
    )
    .then(async (resp: any) => {
      if (resp.data.code === 2000) {
        loginLogRecorder.info('开始自动注册');
        await handlerImport({ value: false });
        loginStore.loginSuccess();
        return;
      }

      setAuthorizationToken(resp.data.data);
      loginStore.loginSuccess();
      loginLogRecorder.info('静默登录成功');
    })
    .catch((e: unknown) => {
      loginLogRecorder.error('静默登录失败', e);
      if (!isNetworkLikeError(e)) {
        loginStore.loginFail();
      }
      return Promise.reject(e);
    })
    .finally(() => {
      loginIng = false;
    });
};

export const loginInterceptor = (): boolean => {
  const token = getPageContext().token;
  if (!token) {
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

  const token = getPageContext().token;
  const uid = getPageContext().uid;
  const bossUserId = uid === undefined ? undefined : String(uid);
  if (!token) {
    showAppMessage({
      message: '未获取到Boss token 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }
  if (!bossUserId) {
    showAppMessage({
      message: '未获取到Boss userId 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }

  importResumeLoading.value = true;

  const resumeInfoResp = await axios.get('https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json', {
    headers: { Zp_token: token },
  });
  const zpData = (resumeInfoResp as any).data.zpData;
  if (!zpData.attachmentList || zpData.attachmentList.length === 0) {
    importResumeLoading.value = false;
    showAppMessage({
      message: '请先在BOSS个人中心上传附件简历；作为AI代聊定制化回复的基础',
      type: 'error',
      duration: 3000,
    });
    return;
  }

  const resumeId = zpData.attachmentList[0].resumeId;
  const resumeFileResp = await fetchWithGM_request(
    `https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=${resumeId}`,
    { headers: { Zp_token: token }, responseType: 'arraybuffer' }
  );

  const fileBlob = new Blob([resumeFileResp.response as BlobPart], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', fileBlob);
  formData.append('resumeId', resumeId);
  formData.append('uniqueId', bossUserId);

  const importResp = await request.post('/api/user/import/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if ((importResp as any).data.code !== 200) {
    showAppMessage({
      message: `导入简历失败${(importResp as any).data.data.msg}`,
      type: 'error',
      duration: 3000,
    });
    importResumeLoading.value = false;
    return;
  }

  const loginResp = await request.post(`/api/user/silently/login?uniqueId=${bossUserId}`);
  setAuthorizationToken((loginResp as any).data.data);

  if (!(importResp as any).data.data.email) {
    importResumeLoading.value = false;
    return;
  }

  showAppMessage({
    message: '导入简历成功',
    type: 'success',
    duration: 3000,
  });
  importResumeLoading.value = false;
};

const preferenceLogRecorder = new LogRecorder();

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
    .then(() => {
      logger.debug('调用接口加载用户投递设置');
      return runWithRetry(
        () =>
          request.post(
            '/api/user/userinfo',
            {},
            {
              timeout: 20_000,
              silentErrorToast: true,
              silentTimeoutToast: true,
              silentNetworkToast: true,
            }
          ),
        3
      );
    })
    .then((resp: any) => {
      // 保留本地数据（如 importedResume），避免被服务器数据覆盖
      const localImportedResume = runtimeUserStore2.user?.importedResume;
      const localResumeId = runtimeUserStore2.user?.resumeId;
      const localParsedResume = runtimeUserStore2.user?.parsedResume;
      const localAttachmentResume = runtimeUserStore2.user?.attachmentResume;

      // 合并服务器数据
      runtimeUserStore2.user = resp?.data?.data;

      // 恢复本地数据
      if (localImportedResume) {
        runtimeUserStore2.user.importedResume = localImportedResume;
      }
      if (localResumeId) {
        runtimeUserStore2.user.resumeId = localResumeId;
      }
      if (localParsedResume) {
        runtimeUserStore2.user.parsedResume = localParsedResume;
      }
      if (localAttachmentResume) {
        runtimeUserStore2.user.attachmentResume = localAttachmentResume;
      }

      if (!runtimeUserStore2?.user) {
        runtimeUserStore2.user = {};
        throw new Error('用户投递设置为空');
      }
      if (!runtimeUserStore2.user.preference) {
        runtimeUserStore2.user.preference = {};
      }
      migratePreferenceKeys(runtimeUserStore2.user.preference);

      const upgradePrefNumber = (
        value: unknown,
        oldDefault: number,
        nextDefault: number
      ): number => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0 || n === oldDefault) {
          return nextDefault;
        }
        return n;
      };

      runtimeUserStore2.user.preference.pushIntervalSec =
        Number(getPreferenceValue(runtimeUserStore2.user.preference, 'pushIntervalSec', 'pi')) || 3;
      runtimeUserStore2.user.preference.pi =
        runtimeUserStore2.user.preference.pi || runtimeUserStore2.user.preference.pushIntervalSec;
      runtimeUserStore2.user.preference.npi = runtimeUserStore2.user.preference.npi || 6;
      runtimeUserStore2.user.preference.maxDailyActions = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxDailyActions,
        80,
        120
      );
      runtimeUserStore2.user.preference.maxDailyActions = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxDailyActions,
        120,
        150
      );
      runtimeUserStore2.user.preference.maxActionsPerMinute = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxActionsPerMinute,
        6,
        9
      );
      runtimeUserStore2.user.preference.maxConsecutiveFailures = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxConsecutiveFailures,
        8,
        10
      );
      runtimeUserStore2.user.preference.cooldownMinutesOnLimit = upgradePrefNumber(
        runtimeUserStore2.user.preference.cooldownMinutesOnLimit,
        30,
        25
      );
      if (typeof runtimeUserStore2.user.preference.safetyTimeWindowE !== 'boolean') {
        runtimeUserStore2.user.preference.safetyTimeWindowE = false;
      }
      runtimeUserStore2.user.preference.safetyStartHour =
        runtimeUserStore2.user.preference.safetyStartHour ?? 8;
      runtimeUserStore2.user.preference.safetyEndHour =
        runtimeUserStore2.user.preference.safetyEndHour ?? 22;
      runtimeUserStore2.user.preference.imMaxReloadPerDay = upgradePrefNumber(
        runtimeUserStore2.user.preference.imMaxReloadPerDay,
        10,
        15
      );
      runtimeUserStore2.user.preference.cleanerManualConfirmThreshold = upgradePrefNumber(
        runtimeUserStore2.user.preference.cleanerManualConfirmThreshold,
        8,
        40
      );
      runtimeUserStore2.user.preference.autoContactMinIntervalSec = upgradePrefNumber(
        runtimeUserStore2.user.preference.autoContactMinIntervalSec,
        12,
        10
      );
      runtimeUserStore2.user.preference.maxAutoMessagePerSession = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxAutoMessagePerSession,
        20,
        30
      );
      runtimeUserStore2.user.preference.maxAutoResumePerSession = upgradePrefNumber(
        runtimeUserStore2.user.preference.maxAutoResumePerSession,
        12,
        18
      );
      runtimeUserStore2.user.preference.chatMinReplyIntervalSec = upgradePrefNumber(
        runtimeUserStore2.user.preference.chatMinReplyIntervalSec,
        15,
        12
      );
      runtimeUserStore2.user.preference.chatMaxPerMinute = upgradePrefNumber(
        runtimeUserStore2.user.preference.chatMaxPerMinute,
        4,
        6
      );
      runtimeUserStore2.user.preference.chatMaxSessionReplies = upgradePrefNumber(
        runtimeUserStore2.user.preference.chatMaxSessionReplies,
        50,
        75
      );
      runtimeUserStore2.user.preference.autoResumeMaxPerSession = upgradePrefNumber(
        runtimeUserStore2.user.preference.autoResumeMaxPerSession,
        8,
        12
      );
      runtimeUserStore2.user.preference.acE = normalizePreferenceBoolean(
        runtimeUserStore2.user.preference.acE,
        false
      );
      runtimeUserStore2.user.preference.acW = normalizePreferenceBoolean(
        runtimeUserStore2.user.preference.acW,
        true
      );
      runtimeUserStore2.user.preference.acM = normalizePreferenceBoolean(
        runtimeUserStore2.user.preference.acM,
        true
      );
      runtimeUserStore2.user.preference.acY = normalizePreferenceBoolean(
        runtimeUserStore2.user.preference.acY,
        true
      );
      Tools.migrateAiDeliveryJudgeConfigFromPreference(runtimeUserStore2.user.preference);
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
      if (!runtimeUserStore2.user.preference) {
        runtimeUserStore2.user.preference = {};
      }
    });
}
