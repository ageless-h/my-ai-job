// -*- coding: utf-8 -*-
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { ElMessage as ElMessage$1 } from "element-plus";
import { Logger } from "@/shared/utils/logger";
import { clearAuthorizationToken, getAuthorizationToken } from "@/core/auth/auth-session";
declare const __API_BASE_URL__: string;

const logger$1 = Logger.rootLogger;

type MessageOptions = {
  type?: "success" | "warning" | "info" | "error";
  message?: string;
  grouping?: boolean;
  duration?: number;
  [key: string]: unknown;
};

type BizResp<T = unknown> = {
  code: number;
  message?: string;
  data?: T;
};

type RequestToastConfig = {
  silentErrorToast: boolean;
  silentTimeoutToast: boolean;
  silentNetworkToast: boolean;
};

const normalizeText = (value: unknown): string => {
  return `${value ?? ""}`.replace(/\s+/g, "").trim().toLowerCase();
};

const readRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
};

const readRequestToastConfig = (config: unknown): RequestToastConfig => {
  const record = readRecord(config);
  return {
    silentErrorToast: record.silentErrorToast === true,
    silentTimeoutToast: record.silentTimeoutToast === true,
    silentNetworkToast: record.silentNetworkToast === true,
  };
};

const isAiConfigRequest = (config: unknown): boolean => {
  const record = readRecord(config);
  const urlText = normalizeText(record.url);
  return urlText.includes(normalizeText("/api/user/ai/config"));
};

export enum BizCodeEnum {
  NOT_LOGIN = 401,
  PARAM_ERROR = 410,
  INTERNAL_SERVER_ERROR = 500,
  USER_NOT_EXIST = 2000
}

export const request: AxiosInstance = axios.create({
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json; charset=utf-8"
  }
});

request.defaults.baseURL = __API_BASE_URL__;

request.interceptors.request.use((req) => {
  const authorization = getAuthorizationToken();
  if (authorization) {
    req.headers["Authorization"] = authorization;
  }

  return req;
});

function handlerErrorCode(result?: BizResp): void {
  if (!result || result.code < 5000) {
    return;
  }
}

request.interceptors.response.use(
  (resp: AxiosResponse<BizResp>) => {
    const result = resp.data;
    const toastConfig = readRequestToastConfig(resp.config);
    const aiConfigRequest = isAiConfigRequest(resp.config);

    if (result.code === 200) {
      return resp;
    }

    if (result.code >= 2000 && result.code < 5000) {
      return resp;
    }

    if (result.code === 401) {
      const authorization = getAuthorizationToken();
      if (authorization) {
        clearAuthorizationToken();
        ElMessage({
          type: "error",
          message: "登录过期，请刷新页面重试"
        });
        return Promise.reject(new Error("登录过期，请刷新页面重试"));
      }

      return Promise.reject(result.message);
    }

    if (!toastConfig.silentErrorToast && !aiConfigRequest && (!result.code || result.code === 500 || result.code >= 5000)) {
      ElMessage({
        type: "error",
        message: result.message ? result.message : "系统异常"
      });
      handlerErrorCode(result);
    }

    return Promise.reject(result.message);
  },
  (error: any) => {
    const toastConfig = readRequestToastConfig(error?.config);
    const aiConfigRequest = isAiConfigRequest(error?.config);
    const requestUrl = `${error?.config?.url || ""}`;
    const requestMethod = `${error?.config?.method || ""}`.toUpperCase();

    if (error?.code === "ECONNABORTED") {
      if (toastConfig.silentTimeoutToast || toastConfig.silentErrorToast || aiConfigRequest) {
        logger$1.warn("请求超时（已静默）", { method: requestMethod, url: requestUrl });
        return Promise.reject(error);
      }
      ElMessage({
        message: "网络超时",
        type: "error",
        grouping: true,
        duration: 2000
      });
      return Promise.reject(error);
    }

    if (error?.code === "ERR_NETWORK") {
      if (toastConfig.silentNetworkToast || toastConfig.silentErrorToast || aiConfigRequest) {
        logger$1.warn("网络错误（已静默）", { method: requestMethod, url: requestUrl });
        return Promise.reject(error);
      }
      ElMessage({
        message: "系统异常,请稍后重试",
        type: "error",
        grouping: true,
        duration: 2000
      });
      return Promise.reject(error);
    }

    if (error?.response?.data) {
      error.message = error.response.data.message;
    }

    if (error?.response?.status === 404) {
      error.message = "资源未找到";
    }

    if (!toastConfig.silentErrorToast && !aiConfigRequest) {
      ElMessage({
        message: error?.message,
        type: "error",
        grouping: true,
        duration: 3000
      });
    }

    return Promise.reject(error);
  }
);

export const isProdEnv = (): boolean => {
  return true;
};

export const ElMessage = (options: MessageOptions): void => {
  if (options && options.message) {
    options.message = `[AI助理] ${options.message}`;
  }

  ElMessage$1(options as any);
};
