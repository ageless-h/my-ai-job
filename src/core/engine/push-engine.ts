// -*- coding: utf-8 -*-
import { usePushResultStore } from "@/state/push-result";
import { useUserStore } from "@/state/user";
import { getPreferenceValue } from "@/shared/utils/preference";
import { Logger, LogLevel } from "@/shared/utils/logger";
import { TampermonkeyApi } from "@/shared/utils/tampermonkey";
import { Tools } from "@/shared/utils/tools";
import {
  NotMatchError,
  PushRequestError,
  FavoriteRequestError,
  FetchJobDetailError,
  PushStopError,
  PushLimitError
} from "@/shared/errors";

const logger = Logger.rootLogger;

export type PushResultCounterStore = ReturnType<typeof usePushResultStore>;
export type UserStoreType = ReturnType<typeof useUserStore>;

export let pushResultCounter: any = {};
export let runtimeUserStore: any = {};

export function bindPlatformRuntime(counter: PushResultCounterStore, userStore: UserStoreType): void {
  pushResultCounter = counter;
  runtimeUserStore = userStore;
}

function runtimeCounter(): any {
  return pushResultCounter as any;
}

function runtimeUserStoreRef(): any {
  return runtimeUserStore as any;
}

function formatLogTimestamp(date: Date): string {
  const pad = (value: number, size = 2): string => `${value}`.padStart(size, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export enum PushStatus {
  NOT_START = 0,
  PUSHING = 1,
  PAUSE = 2,
  LIMIT = 3
}

export enum PushResultStatus {
  NOT_START = -1,
  SUCCESS = 0,
  FAIL = 1
}

type LogEntry = {
  level: string;
  message: string;
  timestamp: string;
};

export class LogRecorder extends Logger {
  static LOGS_STORAGE_KEY = "logs_data";
  static logs: LogEntry[] = [];

  persistTimer: number | null = null;
  maxLogs = 1000;

  constructor(name = "") {
    super(name);
    this.loadLogsFromStorage();
    this.startPersistTimer();
  }

  loadLogsFromStorage(): void {
    const storedLogs = TampermonkeyApi.GmGetValue<LogEntry[]>(LogRecorder.LOGS_STORAGE_KEY, []);
    const existingTimestamps = new Set(LogRecorder.logs.map((log) => log.timestamp));
    const uniqueStoredLogs = storedLogs.filter((log) => !existingTimestamps.has(log.timestamp));
    LogRecorder.logs = [...LogRecorder.logs, ...uniqueStoredLogs];
  }

  startPersistTimer(): void {
    this.persistTimer = window.setInterval(() => {
      this.persistLogs();
    }, 10000);
  }

  persistLogs(): void {
    TampermonkeyApi.GmSetValue(LogRecorder.LOGS_STORAGE_KEY, LogRecorder.logs);
  }

  clearLogs(): void {
    LogRecorder.logs = [];
    this.persistLogs();
  }

  addLog(level: string, message: string): void {
    const timestamp = formatLogTimestamp(new Date());
    LogRecorder.logs.push({ level, message, timestamp });
    if (LogRecorder.logs.length > this.maxLogs) {
      LogRecorder.logs.shift();
    }
  }

  error(...messages: unknown[]): void {
    const msg = messages.join(" ");
    this.addLog("error", msg);
    super.error(msg);
  }

  warn(...messages: unknown[]): void {
    const msg = messages.join(" ");
    this.addLog("warn", msg);
    super.warn(msg);
  }

  info(...messages: unknown[]): void {
    const msg = messages.join(" ");
    this.addLog("info", msg);
    super.info(msg);
  }

  debug(...messages: unknown[]): void {
    const msg = messages.join(" ");
    this.addLog("debug", msg);
    super.debug(msg);
  }

  trace(...messages: unknown[]): void {
    const msg = messages.join(" ");
    this.addLog("trace", msg);
    super.trace(msg);
  }

  getLogs(page: number, pageSize: number): LogEntry[] {
    const start = (page - 1) * pageSize;
    return LogRecorder.logs.slice(start, start + pageSize);
  }

  getLogCount(): number {
    return LogRecorder.logs.length;
  }
}

export abstract class AbsPlatform {
  preferenceLogRecorder = new LogRecorder("recorder");
  pushStatus = PushStatus.NOT_START;
  protected _pushMock = false;
  protected _selfDefPushCountLimit = -1;
  protected _collectMode = false;
  protected _lastStopReason = "";

  get lastStopReason(): string {
    return this._lastStopReason;
  }

  protected setLastStopReason(reason: string): void {
    this._lastStopReason = `${reason || ""}`.trim();
  }

  protected clearLastStopReason(): void {
    this._lastStopReason = "";
  }

  private getSafetyConfig(): {
    minActionIntervalSec: number;
    maxSessionActions: number;
    maxDailyActions: number;
    maxActionsPerMinute: number;
    maxConsecutiveFailures: number;
    cooldownMinutesOnLimit: number;
    timeWindowEnabled: boolean;
    allowedStartHour: number;
    allowedEndHour: number;
  } {
    const preference = runtimeUserStoreRef()?.user?.preference || {};
    const toNumberOr = (value: unknown, fallback: number): number => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    const minActionIntervalSec = Math.max(8, toNumberOr(getPreferenceValue(preference, "pushIntervalSec", "pi"), 8));
    const maxSessionActions = Math.max(1, toNumberOr(preference.maxSessionActions, 60));
    const maxDailyActions = Math.max(1, toNumberOr(preference.maxDailyActions, 150));
    const maxActionsPerMinute = Math.max(1, toNumberOr(preference.maxActionsPerMinute, 9));
    const maxConsecutiveFailures = Math.max(1, toNumberOr(preference.maxConsecutiveFailures, 10));
    const cooldownMinutesOnLimit = Math.max(1, toNumberOr(preference.cooldownMinutesOnLimit, 25));
    const timeWindowEnabled = Boolean(preference.safetyTimeWindowE);
    const allowedStartHour = Math.min(23, Math.max(0, toNumberOr(preference.safetyStartHour, 8)));
    const allowedEndHour = Math.min(23, Math.max(0, toNumberOr(preference.safetyEndHour, 22)));

    return {
      minActionIntervalSec,
      maxSessionActions,
      maxDailyActions,
      maxActionsPerMinute,
      maxConsecutiveFailures,
      cooldownMinutesOnLimit,
      timeWindowEnabled,
      allowedStartHour,
      allowedEndHour
    };
  }

  private isInSafetyTimeWindow(startHour: number, endHour: number): boolean {
    const hour = new Date().getHours();
    if (startHour === endHour) {
      return true;
    }

    if (startHour < endHour) {
      return hour >= startHour && hour < endHour;
    }

    return hour >= startHour || hour < endHour;
  }

  private enforceSafetyWindowOrStop(actionName: string, safety = this.getSafetyConfig()): boolean {
    if (!safety.timeWindowEnabled) {
      return true;
    }

    if (this.isInSafetyTimeWindow(safety.allowedStartHour, safety.allowedEndHour)) {
      return true;
    }

    this.pushStatus = PushStatus.LIMIT;
    const reason = `当前不在安全时段(${safety.allowedStartHour}:00-${safety.allowedEndHour}:00)，暂停${actionName}`;
    this.setLastStopReason(reason);
    this.preferenceLogRecorder.warn(reason);
    return false;
  }

  private async ensureNoManualVerification(actionName: string): Promise<boolean> {
    let hasWaited = false;
    let lastWarnAt = 0;
    while (true) {
      if (this.pushStatus === PushStatus.PAUSE) {
        this.setLastStopReason(`手动暂停${actionName}`);
        return false;
      }

      const reason = this.getManualVerificationReason();
      if (!reason) {
        if (hasWaited) {
          this.preferenceLogRecorder.info(`人工验证已解除，继续${actionName}`);
          this.clearLastStopReason();
        }
        return true;
      }

      hasWaited = true;
      const waitReason = `检测到人工验证，等待处理后继续${actionName}：${reason}`;
      this.setLastStopReason(waitReason);
      const now = Date.now();
      if (now - lastWarnAt >= 15_000) {
        this.preferenceLogRecorder.warn(waitReason);
        lastWarnAt = now;
      }
      await Tools.sleep(5000);
    }
  }

  private getSafetyCooldownUntil(): number {
    return Number(TampermonkeyApi.GmGetValue(TampermonkeyApi.SAFETY_COOLDOWN_UNTIL, 0)) || 0;
  }

  private setSafetyCooldown(minutes: number): void {
    const untilTs = Date.now() + minutes * 60 * 1000;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.SAFETY_COOLDOWN_UNTIL, untilTs);
  }

  private async waitForNextProgress(timeoutMs: number, pollIntervalMs = 450): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (this.hasNext()) {
        return true;
      }
      await Tools.sleep(pollIntervalMs);
    }
    return this.hasNext();
  }

  next = async (): Promise<boolean> => {
    const actionName = this._collectMode ? "收藏" : "投递";
    const waitSecRaw = Number(runtimeUserStoreRef()?.user?.preference?.npi);
    const waitSec = Number.isFinite(waitSecRaw) ? Math.max(0, waitSecRaw) : 0;

    const hasProgress = this.hasNext();
    if (!hasProgress) {
      this.preferenceLogRecorder.info("未检测到下一页进展，执行兜底滚动重试");
      if (!(await this.ensureNoManualVerification(actionName))) {
        return false;
      }
      if (!this.enforceSafetyWindowOrStop(actionName)) {
        return false;
      }

      if (waitSec > 0) {
        await Tools.sleep(waitSec * 1000);
      }
      await this.acquireDataPre();
      const recovered = await this.waitForNextProgress(9000);
      if (!recovered) {
        this.preferenceLogRecorder.info("无下一页数据");
        return false;
      }

      this.preferenceLogRecorder.info("兜底滚动后检测到新岗位，继续执行");
      return true;
    }

    if (!(await this.ensureNoManualVerification(actionName))) {
      return false;
    }
    if (!this.enforceSafetyWindowOrStop(actionName)) {
      return false;
    }

    if (waitSec > 0) {
      await Tools.sleep(waitSec * 1000);
    }
    await this.acquireDataPre();
    await Tools.sleep(3000);
    return true;
  };

  set pushMock(value: boolean) {
    this._pushMock = value;
  }

  set selfDefPushCountLimit(value: number) {
    this._selfDefPushCountLimit = value;
  }

  set collectMode(value: boolean) {
    this._collectMode = value;
  }

  get selfDefPushCountLimit(): number {
    return this._selfDefPushCountLimit;
  }

  get collectMode(): boolean {
    return this._collectMode;
  }

  async startPush(): Promise<void> {
    this.clearLastStopReason();
    const actionName = this._collectMode ? "收藏" : "投递";
    const safety = this.getSafetyConfig();
    const currentHost = Tools.getCurrentHostname();
    if (!Tools.isBossDomainHost(currentHost)) {
      this.pushStatus = PushStatus.LIMIT;
      const reason = `当前域名(${currentHost || "unknown"})不受信任，已阻止自动${actionName}`;
      this.setLastStopReason(reason);
      this.preferenceLogRecorder.warn(reason);
      return;
    }

    const cooldownUntil = this.getSafetyCooldownUntil();
    if (cooldownUntil > Date.now()) {
      const waitMinutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
      this.pushStatus = PushStatus.LIMIT;
      const reason = `处于安全冷却期，${waitMinutes} 分钟后可继续${actionName}`;
      this.setLastStopReason(reason);
      this.preferenceLogRecorder.warn(reason);
      return;
    }

    if (!this.enforceSafetyWindowOrStop(actionName, safety)) {
      return;
    }
    if (!(await this.ensureNoManualVerification(actionName))) {
      return;
    }

    this.preferenceLogRecorder.info(`开始${actionName}`);
    if (this._collectMode) {
      runtimeCounter().clearOnceCollectSuccessCount();
    } else {
      runtimeCounter().clearOnceSuccessCount();
    }
    this.pushStatus = PushStatus.PUSHING;
    this.startPreHandler();
    let sessionSuccessCount = 0;
    const recentActionTs: number[] = [];
    let consecutiveFailures = 0;

    do {
      const jobList = this.getJobList();
      for (const jobDetail of jobList) {
        if (!this.enforceSafetyWindowOrStop(actionName, safety)) {
          return;
        }
        if (!(await this.ensureNoManualVerification(actionName))) {
          return;
        }

         const dailySuccess = this._collectMode 
           ? Number(runtimeCounter().collectSuccessCount || 0)
           : Number(runtimeCounter().successCount || 0);
         if (dailySuccess >= safety.maxDailyActions) {
           throw new PushLimitError(`触发安全阈值：今日最多${safety.maxDailyActions}次成功${actionName}`);
         }

        const now = Date.now();
        while (recentActionTs.length > 0 && now - recentActionTs[0] > 60_000) {
          recentActionTs.shift();
        }
        if (recentActionTs.length >= safety.maxActionsPerMinute) {
          throw new PushLimitError(`触发安全阈值：每分钟最多${safety.maxActionsPerMinute}次${actionName}`);
        }

        try {
          this.preMatchJob();
          await this.matchJob(jobDetail);

          if (this._collectMode) {
            this.collectPreHandler(jobDetail);
            const collectResult = await this.collect(jobDetail);
            await this.collectAfterHandler(collectResult, jobDetail);
            recentActionTs.push(Date.now());
            sessionSuccessCount++;
            consecutiveFailures = 0;
            continue;
          }

          this.pushPreHandler(jobDetail);
          const pushResult = await this.push(jobDetail);
          await this.pushAfterHandler(pushResult, jobDetail);
          recentActionTs.push(Date.now());
          sessionSuccessCount++;
          consecutiveFailures = 0;
        } catch (error: any) {
          switch (true) {
            case error instanceof NotMatchError:
              if (this.preferenceLogRecorder.getLogLevel() === LogLevel.Debug) {
                this.preferenceLogRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message} 当前值:${error.data}`);
              } else {
                this.preferenceLogRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message}`);
              }
              runtimeCounter().notMatchIncr();
              consecutiveFailures = 0;
              break;
             case error instanceof PushRequestError:
             case error instanceof FavoriteRequestError:
               this.preferenceLogRecorder.warn(`工作【${error.jobTitle}】${actionName}失败 原因：${error.message}`);
               if (this._collectMode) {
                 runtimeCounter().collectFailIncr();
               } else {
                 runtimeCounter().failIncr();
               }
               consecutiveFailures++;
               if (consecutiveFailures >= safety.maxConsecutiveFailures) {
                 this.pushStatus = PushStatus.LIMIT;
                 this.setSafetyCooldown(safety.cooldownMinutesOnLimit);
                 const reason = `连续失败达到${safety.maxConsecutiveFailures}次，触发安全熔断`;
                 this.setLastStopReason(reason);
                 this.preferenceLogRecorder.error(reason);
                 return;
               }
               break;
            case error instanceof FetchJobDetailError:
              this.preferenceLogRecorder.warn(`工作【${error.jobTitle}】发送自定义招呼语失败 原因：${error.message}`);
              break;
            case error instanceof PushStopError:
              if (`${error?.message || ""}`.includes("手动暂停")) {
                this.setLastStopReason(`手动暂停${actionName} ${error.message}`);
                this.preferenceLogRecorder.info(`手动暂停${actionName} ${error.message}`);
                return;
              }

              if (Tools.isManualVerificationText(error?.message) || this.getManualVerificationReason()) {
                const reason = `${error?.message || this.getManualVerificationReason() || "检测到人工验证"}`;
                this.preferenceLogRecorder.warn(`检测到人工验证，进入安全等待：${reason}`);
                if (!(await this.ensureNoManualVerification(actionName))) {
                  return;
                }
                break;
              }

              this.setLastStopReason(`手动暂停${actionName} ${error.message}`);
              this.preferenceLogRecorder.info(`手动暂停${actionName} ${error.message}`);
              return;
            case error instanceof PushLimitError:
              this.pushStatus = PushStatus.LIMIT;
              this.setSafetyCooldown(safety.cooldownMinutesOnLimit);
              this.setLastStopReason(`停止${actionName} ${error.message}`);
              this.preferenceLogRecorder.info(`停止${actionName} ${error.message}`);
              return;
            default: {
              const isNetwork = this.isNetworkError(error);
              if (isNetwork) {
                const maxRetries = 3;
                let retried = false;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                  const delayMs = Math.pow(2, attempt) * 1000;
                  this.preferenceLogRecorder.warn(`网络异常，${delayMs / 1000}s 后第 ${attempt}/${maxRetries} 次重试... 原因：${error?.message || error}`);
                  await Tools.sleep(delayMs);
                  if (Number(this.pushStatus) === PushStatus.PAUSE) {
                    this.preferenceLogRecorder.info(`重试期间手动暂停`);
                    return;
                  }
                   if (!(await this.ensureNoManualVerification(actionName))) {
                     return;
                   }
                  try {
                    this.preMatchJob();
                    await this.matchJob(jobDetail);
                    if (this._collectMode) {
                      this.collectPreHandler(jobDetail);
                      const collectResult = await this.collect(jobDetail);
                      await this.collectAfterHandler(collectResult, jobDetail);
                    } else {
                      this.pushPreHandler(jobDetail);
                      const pushResult = await this.push(jobDetail);
                      await this.pushAfterHandler(pushResult, jobDetail);
                    }
                    retried = true;
                    consecutiveFailures = 0;
                    break;
                  } catch (retryError: any) {
                    if (!this.isNetworkError(retryError)) {
                      logger.error("重试后非网络异常--->", retryError);
                      break;
                    }
                    if (attempt === maxRetries) {
                      const reason = `网络异常重试 ${maxRetries} 次后仍失败，进入安全等待后继续${actionName}`;
                      this.setLastStopReason(reason);
                      this.preferenceLogRecorder.warn(reason);
                      await Tools.sleep(Math.max(8000, safety.minActionIntervalSec * 2000));
                      break;
                    }
                  }
                }
                if (!retried) {
                  consecutiveFailures++;
                  if (consecutiveFailures >= safety.maxConsecutiveFailures) {
                    this.pushStatus = PushStatus.LIMIT;
                    this.setSafetyCooldown(safety.cooldownMinutesOnLimit);
                    const reason = `连续网络失败达到${safety.maxConsecutiveFailures}次，触发安全熔断`;
                    this.setLastStopReason(reason);
                    this.preferenceLogRecorder.error(reason);
                    return;
                  }
                }
              } else {
                logger.error("未捕获异常--->", error);
                consecutiveFailures++;
                if (consecutiveFailures >= safety.maxConsecutiveFailures) {
                  this.pushStatus = PushStatus.LIMIT;
                  this.setSafetyCooldown(safety.cooldownMinutesOnLimit);
                  const reason = `连续异常达到${safety.maxConsecutiveFailures}次，触发安全熔断`;
                  this.setLastStopReason(reason);
                  this.preferenceLogRecorder.error(reason);
                  return;
                }
              }
            }
          }
        }

        await Tools.sleep(safety.minActionIntervalSec * 1000 + Tools.getRandomNumber(400, 1600));
      }
    } while (await this.next());

    this.preferenceLogRecorder.info(`结束${actionName}`);
  }

  pausePush(): void {
  }

  /** 检测是否为网络异常 */
  protected isNetworkError(error: any): boolean {
    if (!error) return false;
    const code = error?.code || '';
    if (['ECONNABORTED', 'ERR_NETWORK', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)) return true;
    const msg = `${error?.message || ''}`.toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('econnaborted') || msg.includes('fetch');
  }

  preMatchJob(): void {
    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
      throw new PushLimitError("自定义投递次数限制");
    }

    if (this.pushStatus === PushStatus.PAUSE) {
      throw new PushStopError("手动暂停投递");
    }
  }

  async push(jobDetail: any): Promise<any> {
    if (this.pushStatus === PushStatus.PAUSE) {
      throw new PushStopError("手动暂停投递");
    }

    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
      throw new PushLimitError("自定义投递次数限制");
    }

    const limitResult = this.isLimit(jobDetail);
    if (limitResult.limit) {
      throw new PushLimitError(limitResult.msg);
    }

    if (this._pushMock) {
      const jobTitle = this.getJobKey(jobDetail);
      logger.debug("mock投递 ", jobTitle);
      return {
        message: "Success",
        code: 0
      };
    }

    return await this.doPush(jobDetail);
  }

  collectPreHandler(jobDetail: any): any {
    return jobDetail;
  }

  async collect(jobDetail: any): Promise<any> {
    if (this.pushStatus === PushStatus.PAUSE) {
      throw new PushStopError("手动暂停收藏");
    }

    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceCollectSuccessCount >= this._selfDefPushCountLimit) {
      throw new PushLimitError("自定义收藏次数限制");
    }

    if (this._pushMock) {
      const jobTitle = this.getJobKey(jobDetail);
      logger.debug("mock收藏 ", jobTitle);
      return {
        message: "Success",
        code: 0
      };
    }

    return await this.doCollect(jobDetail);
  }

  async collectAfterHandler(collectResult: any, jobDetail: any): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (collectResult.message === "Success" && collectResult.code === 0 && collectResult.verified !== false) {
      runtimeCounter().collectSuccessIncr();
      this.preferenceLogRecorder.info(`工作【${jobTitle}】 收藏成功`);
      return jobDetail;
    }

    throw new FavoriteRequestError(jobTitle, collectResult.message || "收藏未确认成功");
  }

  async doCollect(_jobDetail: any): Promise<{ message: string; code: number }> {
    return {
      message: "当前平台暂不支持收藏",
      code: 1
    };
  }

  isLimit(jobDetail: any): { limit: boolean; msg: string } {
    return {
      limit: false,
      msg: this.getJobKey(jobDetail)
    };
  }

  protected getManualVerificationReason(): string | null {
    return null;
  }

  getFistJobDetail(): any {
    return this.getJobList()[0];
  }

  abstract getJobList(): any[];
  abstract hasNext(): boolean;
  abstract acquireDataPre(): Promise<void> | void;
  abstract startPreHandler(): void;
  abstract matchJob(jobDetail: any): Promise<any>;
  abstract pushAfterHandler(pushResult: any, jobDetail: any): Promise<any>;
  abstract pushPreHandler(jobDetail: any): any;
  abstract getJobKey(jobDetail: any): string;
  abstract doPush(jobDetail: any): Promise<any>;
}
