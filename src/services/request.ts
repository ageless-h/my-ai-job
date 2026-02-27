// -*- coding: utf-8 -*-
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { ElMessage as ElMessage$1 } from "element-plus";
import { Logger } from "@/utils/logger";
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

export enum BizCodeEnum {
  NOT_LOGIN = 401,
  PARAM_ERROR = 410,
  INTERNAL_SERVER_ERROR = 500,
  USER_NOT_EXIST = 2000,
  PROMOTION_CODE_EXPIRED = 2001,
  PRODUCT_NOT_AUTHORIZED = 5001
}

export const request: AxiosInstance = axios.create({
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json; charset=utf-8"
  }
});

request.defaults.baseURL = __API_BASE_URL__;

request.interceptors.request.use((req) => {
  const authorization = localStorage.getItem("Authorization");
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

    if (result.code === 200) {
      return resp;
    }

    if (result.code >= 2000 && result.code < 5000) {
      return resp;
    }

    if (result.code === 401) {
      const authorization = localStorage.getItem("Authorization");
      if (authorization) {
        ElMessage({
          type: "error",
          message: "登录过期，请刷新页面重试"
        });
        return;
      }

      return Promise.reject(result.message);
    }

    if (result.code === BizCodeEnum.PRODUCT_NOT_AUTHORIZED || `${result.message || ""}`.includes("不存在AI坐席且试用结束")) {
      logger$1.info("AI代聊付费拦截已忽略", result.message);
      return Promise.reject({
        code: result.code,
        message: result.message,
        silent: true
      });
    }

    if (!result.code || result.code === 500 || result.code >= 5000) {
      ElMessage({
        type: "error",
        message: result.message ? result.message : "系统异常"
      });
      handlerErrorCode(result);
    }

    return Promise.reject(result.message);
  },
  (error: any) => {
    if (error?.code === "ECONNABORTED") {
      ElMessage({
        message: "网络超时",
        type: "error",
        grouping: true,
        duration: 2000
      });
      return Promise.reject("time out");
    }

    if (error?.code === "ERR_NETWORK") {
      ElMessage({
        message: "系统异常,请稍后重试",
        type: "error",
        grouping: true,
        duration: 2000
      });
      return Promise.reject(() => {
      });
    }

    if (error?.response?.data) {
      error.message = error.response.data.message;
    }

    if (error?.response?.status === 404) {
      error.message = "资源未找到";
    }

    ElMessage({
      message: error?.message,
      type: "error",
      grouping: true,
      duration: 3000
    });

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
