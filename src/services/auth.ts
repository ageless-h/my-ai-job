// -*- coding: utf-8 -*-
import axios from "axios";
import { LoginStore } from "@/stores/login";
import { UserStore } from "@/stores/user";
import { LogRecorder } from "@/services/push-engine";
import { ElMessage, request } from "@/services/request";
import { Tools } from "@/utils/tools";
import { Logger } from "@/utils/logger";
import { fetchWithGM_request } from "@/utils/fetch";
export { fetchWithGM_request } from "@/utils/fetch";

const logger$1 = Logger.rootLogger;

const logRecorder$2 = new LogRecorder();
let loginIng = false;

export const silentlyLogin = async (bossUserId?: string): Promise<void> => {
  let loginCount = 0;
  while (loginIng && loginCount < 6) {
    logger$1.info("login... ", loginCount);
    await Tools.sleep(500);
    loginCount++;
  }

  loginIng = true;
  const loginStore = LoginStore() as any;

  let token = Tools.window?._PAGE?.token;
  let count = 0;
  while (!token && count < 3) {
    await Tools.sleep(300);
    token = Tools.window?._PAGE?.token;
    count++;
  }

  if (!token) {
    logRecorder$2.info("未登录Boss，静默登录结束");
    return Promise.reject(new Error("未登录Boss，静默登录失败"));
  }

  if (!bossUserId) {
    bossUserId = Tools.window?._PAGE?.uid;
  }

  if (loginStore.login) {
    logger$1.info("已经登录，静默登录结束");
    loginIng = false;
    return Promise.resolve();
  }

  return await request
    .post(`/api/user/silently/login?uniqueId=${bossUserId}`)
    .then(async (resp: any) => {
      if (resp.data.code === 2000) {
        logRecorder$2.info("开始自动注册");
        await handlerImport({ value: false });
        loginStore.loginSuccess();
        return;
      }

      localStorage.setItem("Authorization", resp.data.data);
      loginStore.loginSuccess();
      logRecorder$2.info("静默登录成功");
    })
    .catch((e: unknown) => {
      logRecorder$2.error("静默登录失败", e);
      loginStore.loginFail();
      return Promise.reject(e);
    })
    .finally(() => {
      loginIng = false;
    });
};

export const loginInterceptor = (): boolean => {
  const token = Tools.window?._PAGE?.token;
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

  const token = Tools.window?._PAGE?.token;
  const bossUserId = Tools.window?._PAGE?.uid;
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
  localStorage.setItem("Authorization", (loginResp as any).data.data);

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

  if (loginStore.loginFailStatus) {
    return;
  }

  silentlyLogin("")
    .then(() => {
      logger$1.debug("调用接口加载用户偏好配置");
      return request.post("/api/user/userinfo", {});
    })
    .then((resp: any) => {
      userStore2.user = resp?.data?.data;
      if (!userStore2?.user) {
        userStore2.user = {};
        throw new Error("用户偏好配置为空");
      }

      userStore2.user.preference.pi = userStore2.user.preference.pi || 3;
      userStore2.user.preference.npi = userStore2.user.preference.npi || 6;
      logRecorder$1.info("加载用户偏好配置成功");
    })
    .catch((error: any) => {
      loginStore.loginFail();
      logRecorder$1.error("加载用户偏好配置失败", error.message);
    })
    .finally(() => {
      if (!userStore2.user.preference) {
        userStore2.user.preference = {};
      }
    });
}
