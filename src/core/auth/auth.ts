// -*- coding: utf-8 -*-
import axios from "axios";
import { LoginStore } from "@/state/login";
import { UserStore } from "@/state/user";
import { LogRecorder } from "@/core/engine/push-engine";
import { ElMessage, request } from "@/core/http/request";
import { setAuthorizationToken } from "@/core/auth/auth-session";
import { Tools } from "@/shared/utils/tools";
import { Logger } from "@/shared/utils/logger";
import { normalizePreferenceBoolean } from "@/shared/utils/preference";
import { fetchWithGM_request } from "@/shared/utils/fetch";
export { fetchWithGM_request } from "@/shared/utils/fetch";

const logger$1 = Logger.rootLogger;

const logRecorder$2 = new LogRecorder();
let loginIng = false;

type PageContext = {
  token?: string;
  uid?: string | number;
};

const getPageContext = (): PageContext => {
  return Tools.getSafePageContext();
};

const isNetworkLikeError = (error: any): boolean => {
  const code = error?.code || "";
  if (["ECONNABORTED", "ERR_NETWORK", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(code)) {
    return true;
  }
  const msg = `${typeof error === "string" ? error : error?.message || error?.response?.data?.message || ""}`.toLowerCase();
  return msg.includes("timeout") || msg.includes("time out") || msg.includes("network") || msg.includes("econnaborted");
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
    logger$1.info("login... ", loginCount);
    await Tools.sleep(500);
    loginCount++;
  }

  loginIng = true;
  const loginStore = LoginStore() as any;

  let token = getPageContext().token;
  let count = 0;
  while (!token && count < 3) {
    await Tools.sleep(300);
    token = getPageContext().token;
    count++;
  }

  if (!token) {
    logRecorder$2.info("未登录Boss，静默登录结束");
    loginIng = false;
    return Promise.reject(new Error("未登录Boss，静默登录失败"));
  }

  if (!bossUserId) {
    const uid = getPageContext().uid;
    bossUserId = uid === undefined ? undefined : String(uid);
  }

  if (loginStore.login) {
    logger$1.info("已经登录，静默登录结束");
    loginIng = false;
    return Promise.resolve();
  }

  return await request
    .post(`/api/user/silently/login?uniqueId=${bossUserId}`, {}, {
      silentErrorToast: true,
      silentTimeoutToast: true,
      silentNetworkToast: true,
    })
    .then(async (resp: any) => {
      if (resp.data.code === 2000) {
        logRecorder$2.info("开始自动注册");
        await handlerImport({ value: false });
        loginStore.loginSuccess();
        return;
      }

      setAuthorizationToken(resp.data.data);
      loginStore.loginSuccess();
      logRecorder$2.info("静默登录成功");
    })
    .catch((e: unknown) => {
      logRecorder$2.error("静默登录失败", e);
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
    ElMessage({
      message: "请先登录Boss",
      type: "error",
      duration: 3000
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
    ElMessage({
      message: "未获取到Boss token 请刷新页面重试",
      type: "error",
      duration: 3000
    });
    return;
  }
  if (!bossUserId) {
    ElMessage({
      message: "未获取到Boss userId 请刷新页面重试",
      type: "error",
      duration: 3000
    });
    return;
  }

  importResumeLoading.value = true;

  const resumeInfoResp = await axios.get("https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json", {
    headers: { Zp_token: token }
  });
  const zpData = (resumeInfoResp as any).data.zpData;
  if (!zpData.attachmentList || zpData.attachmentList.length === 0) {
    importResumeLoading.value = false;
    ElMessage({
      message: "请先在BOSS个人中心上传附件简历；作为AI代聊定制化回复的基础",
      type: "error",
      duration: 3000
    });
    return;
  }

  const resumeId = zpData.attachmentList[0].resumeId;
  const resumeFileResp = await fetchWithGM_request(
    `https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=${resumeId}`,
    { headers: { Zp_token: token }, responseType: "arraybuffer" }
  );

  const fileBlob = new Blob([resumeFileResp.response as BlobPart], { type: "application/pdf" });
  const formData = new FormData();
  formData.append("file", fileBlob);
  formData.append("resumeId", resumeId);
  formData.append("uniqueId", bossUserId);

  const importResp = await request.post("/api/user/import/resume", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  if ((importResp as any).data.code !== 200) {
    ElMessage({
      message: `导入简历失败${(importResp as any).data.data.msg}`,
      type: "error",
      duration: 3000
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

  ElMessage({
    message: "导入简历成功",
    type: "success",
    duration: 3000
  });
  importResumeLoading.value = false;
};

const logRecorder$1 = new LogRecorder();

export function userRemoteLoad(): void {
  logRecorder$1.info("加载用户偏好配置");
  const userStore2 = UserStore() as any;
  const loginStore = LoginStore() as any;
  userStore2.preferenceLoadStatus = "loading";
  userStore2.preferenceLoadError = "";

  if (loginStore.loginFailStatus) {
    return;
  }

  runWithRetry(() => silentlyLogin(""), 3)
    .then(() => {
      logger$1.debug("调用接口加载用户偏好配置");
      return runWithRetry(() => request.post("/api/user/userinfo", {}, {
        timeout: 20_000,
        silentErrorToast: true,
        silentTimeoutToast: true,
        silentNetworkToast: true,
      }), 3);
    })
    .then((resp: any) => {
      userStore2.user = resp?.data?.data;
      if (!userStore2?.user) {
        userStore2.user = {};
        throw new Error("用户偏好配置为空");
      }
      if (!userStore2.user.preference) {
        userStore2.user.preference = {};
      }

      const upgradePrefNumber = (value: unknown, oldDefault: number, nextDefault: number): number => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0 || n === oldDefault) {
          return nextDefault;
        }
        return n;
      };

      userStore2.user.preference.pi = userStore2.user.preference.pi || 3;
      userStore2.user.preference.npi = userStore2.user.preference.npi || 6;
      userStore2.user.preference.maxSessionActions = upgradePrefNumber(userStore2.user.preference.maxSessionActions, 35, 60);
      userStore2.user.preference.maxDailyActions = upgradePrefNumber(userStore2.user.preference.maxDailyActions, 80, 120);
      userStore2.user.preference.maxActionsPerMinute = upgradePrefNumber(userStore2.user.preference.maxActionsPerMinute, 6, 9);
      userStore2.user.preference.maxConsecutiveFailures = upgradePrefNumber(userStore2.user.preference.maxConsecutiveFailures, 8, 10);
      userStore2.user.preference.cooldownMinutesOnLimit = upgradePrefNumber(userStore2.user.preference.cooldownMinutesOnLimit, 30, 25);
      if (typeof userStore2.user.preference.safetyTimeWindowE !== "boolean") {
        userStore2.user.preference.safetyTimeWindowE = false;
      }
      userStore2.user.preference.safetyStartHour = userStore2.user.preference.safetyStartHour ?? 8;
      userStore2.user.preference.safetyEndHour = userStore2.user.preference.safetyEndHour ?? 22;
      userStore2.user.preference.imMaxReloadPerDay = upgradePrefNumber(userStore2.user.preference.imMaxReloadPerDay, 10, 15);
      userStore2.user.preference.cleanerMaxScanCount = userStore2.user.preference.cleanerMaxScanCount || 120;
      userStore2.user.preference.cleanerMaxDeleteCount = userStore2.user.preference.cleanerMaxDeleteCount || 40;
      userStore2.user.preference.cleanerManualConfirmThreshold = userStore2.user.preference.cleanerManualConfirmThreshold || 20;
      userStore2.user.preference.autoContactMinIntervalSec = upgradePrefNumber(userStore2.user.preference.autoContactMinIntervalSec, 12, 10);
      userStore2.user.preference.maxAutoMessagePerSession = upgradePrefNumber(userStore2.user.preference.maxAutoMessagePerSession, 20, 30);
      userStore2.user.preference.maxAutoResumePerSession = upgradePrefNumber(userStore2.user.preference.maxAutoResumePerSession, 12, 18);
      userStore2.user.preference.chatMinReplyIntervalSec = upgradePrefNumber(userStore2.user.preference.chatMinReplyIntervalSec, 15, 12);
      userStore2.user.preference.chatMaxPerMinute = upgradePrefNumber(userStore2.user.preference.chatMaxPerMinute, 4, 6);
      userStore2.user.preference.chatMaxSessionReplies = upgradePrefNumber(userStore2.user.preference.chatMaxSessionReplies, 50, 75);
      userStore2.user.preference.autoResumeMaxPerSession = upgradePrefNumber(userStore2.user.preference.autoResumeMaxPerSession, 8, 12);
      userStore2.user.preference.acE = normalizePreferenceBoolean(userStore2.user.preference.acE, false);
      userStore2.user.preference.acW = normalizePreferenceBoolean(userStore2.user.preference.acW, true);
      userStore2.user.preference.acM = normalizePreferenceBoolean(userStore2.user.preference.acM, true);
      userStore2.user.preference.acY = normalizePreferenceBoolean(userStore2.user.preference.acY, true);
      Tools.migrateAiDeliveryJudgeConfigFromPreference(userStore2.user.preference);
      userStore2.preferenceLoadStatus = "success";
      userStore2.preferenceLoadError = "";
      Tools.saveStoredUserProfile(userStore2.user);
      logRecorder$1.info("加载用户偏好配置成功");
    })
    .catch((error: any) => {
      if (!isNetworkLikeError(error)) {
        loginStore.loginFail();
      }
      const errorMsg = typeof error === "string" ? error : error?.message || error?.response?.data?.message || "未知错误";
      userStore2.preferenceLoadStatus = "failed";
      userStore2.preferenceLoadError = errorMsg;
      logRecorder$1.error("加载用户偏好配置失败", errorMsg);
    })
    .finally(() => {
      if (!userStore2.user.preference) {
        userStore2.user.preference = {};
      }
    });
}
