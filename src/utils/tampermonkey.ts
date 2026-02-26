// -*- coding: utf-8 -*-

import { Tools } from './tools';

declare const GM_addValueChangeListener:
  | ((key: string, callback: (...args: unknown[]) => void) => number)
  | undefined;
declare const GM_getValue:
  | (<T = unknown>(key: string, defaultValue?: T) => T)
  | undefined;
declare const GM_notification:
  | ((options: {
      title: string;
      image?: string;
      text: string;
      highlight?: boolean;
      silent?: boolean;
      timeout?: number;
      onclick?: () => void;
      ondone?: () => void;
    }) => void)
  | undefined;
declare const GM_setValue:
  | (<T = unknown>(key: string, value: T) => void)
  | undefined;
declare const GM_xmlhttpRequest:
  | ((options: Record<string, unknown>) => unknown)
  | undefined;

const _GM_addValueChangeListener =
  typeof GM_addValueChangeListener !== "undefined" ? GM_addValueChangeListener : undefined;
const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : undefined;
const _GM_notification = typeof GM_notification !== "undefined" ? GM_notification : undefined;
const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : undefined;
const _GM_xmlhttpRequest =
  typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : undefined;

export class TampermonkeyApi {
  static CUR_CK = "";
  static LOCAL_CONFIG = "config";
  static PUSH_SUCCESS_COUNT = "pushSuccessCount:" + Tools.getCurDay();
  static PUSH_FAIL_COUNT = "pushFailCount:" + Tools.getCurDay();
  static ACTIVE_ENABLE = "activeEnable";
  static PUSH_LIMIT = "push_limit" + Tools.getCurDay();
  static PUSH_LOCK = "push_lock";
  static cnInKey = "companyNameInclude";
  static cnExKey = "companyNameExclude";
  static jnInKey = "jobNameInclude";
  static jcExKey = "jobContentExclude";
  static srInKey = "salaryRange";
  static csrInKey = "companyScaleRange";
  static sgInKey = "sendSelfGreet";
  static SEND_SELF_GREET_MEMORY = "sendSelfGreetMemory";

  constructor() {
    TampermonkeyApi.CUR_CK = _GM_getValue?.("ck_cur", "") ?? "";
  }

  static GmSetValue<T = unknown>(key: string, val: T): void {
    _GM_setValue?.(TampermonkeyApi.CUR_CK + key, val);
  }

  static GmGetValue<T = unknown>(key: string, defVal: T): T {
    return _GM_getValue?.(TampermonkeyApi.CUR_CK + key, defVal) ?? defVal;
  }

  static GMXmlHttpRequest(options: Record<string, unknown>): unknown {
    if (!_GM_xmlhttpRequest) {
      throw new Error("GM_xmlhttpRequest is not available");
    }
    return _GM_xmlhttpRequest(options);
  }

  static GmAddValueChangeListener(key: string, func: (...args: unknown[]) => void): number {
    return _GM_addValueChangeListener?.(TampermonkeyApi.CUR_CK + key, func) ?? -1;
  }

  static GmNotification(content: string): void {
    _GM_notification?.({
      title: "Boss直聘批量投简历",
      image:
        "https://img.bosszhipin.com/beijin/mcs/banner/3e9d37e9effaa2b6daf43f3f03f7cb15cfcd208495d565ef66e7dff9f98764da.jpg",
      text: content,
      highlight: true,
      silent: true,
      timeout: 10000,
      onclick: () => {},
      ondone: () => {}
    });
  }
}
