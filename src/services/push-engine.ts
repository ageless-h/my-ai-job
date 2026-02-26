// -*- coding: utf-8 -*-
import { pushResultCount } from "@/stores/push-result";
import { UserStore } from "@/stores/user";
import { Logger, LogLevel } from "@/utils/logger";
import { TampermonkeyApi } from "@/utils/tampermonkey";
import { Tools } from "@/utils/tools";
import {
  NotMatchException,
  PushReqException,
  CollectReqException,
  FetchJobBossFailExp,
  PublishStopExp,
  PublishLimitExp
} from "@/errors";

const logger$1 = Logger.rootLogger;

export type PushResultCounterStore = ReturnType<typeof pushResultCount>;
export type UserStoreType = ReturnType<typeof UserStore>;

export let pushResultCounter: any = {};
export let userStore$2: any = {};

export function bindPlatformRuntime(counter: PushResultCounterStore, userStore: UserStoreType): void {
  pushResultCounter = counter;
  userStore$2 = userStore;
}

function runtimeCounter(): any {
  return pushResultCounter as any;
}

function runtimeUserStore(): any {
  return userStore$2 as any;
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
    const timestamp = new Date().toLocaleTimeString();
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
  logRecorder = new LogRecorder("recorder");
  pushStatus = PushStatus.NOT_START;
  protected _pushMock = false;
  protected _selfDefPushCountLimit = -1;
  protected _collectMode = false;

  next = async (): Promise<boolean> => {
    const next = this.hasNext();
    if (!next) {
      this.logRecorder.info("无下一页数据");
      return false;
    }

    await Tools.sleep(runtimeUserStore().user.preference.npi * 1000);
    this.acquireDataPre();
    await Tools.sleep(3000);
    return next;
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
    const actionName = this._collectMode ? "收藏" : "投递";
    this.logRecorder.info(`开始${actionName}`);
    runtimeCounter().clearOnceSuccessCount();
    this.pushStatus = PushStatus.PUSHING;
    this.startPreHandler();

    do {
      const jobList = this.getJobList();
      for (const jobDetail of jobList) {
        try {
          this.preMatchJob();
          await this.matchJob(jobDetail);

          if (this._collectMode) {
            this.collectPreHandler(jobDetail);
            const collectResult = await this.collect(jobDetail);
            await this.collectAfterHandler(collectResult, jobDetail);
            continue;
          }

          this.pushPreHandler(jobDetail);
          const pushResult = await this.push(jobDetail);
          await this.pushAfterHandler(pushResult, jobDetail);
        } catch (error: any) {
          switch (true) {
            case error instanceof NotMatchException:
              if (this.logRecorder.getLogLevel() === LogLevel.Debug) {
                this.logRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message} 当前值:${error.data}`);
              } else {
                this.logRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message}`);
              }
              runtimeCounter().notMatchIncr();
              break;
            case error instanceof PushReqException:
            case error instanceof CollectReqException:
              this.logRecorder.warn(`工作【${error.jobTitle}】${actionName}失败 原因：${error.message}`);
              runtimeCounter().failIncr();
              break;
            case error instanceof FetchJobBossFailExp:
              this.logRecorder.warn(`工作【${error.jobTitle}】发送自定义招呼语失败 原因：${error.message}`);
              break;
            case error instanceof PublishStopExp:
              this.logRecorder.info(`手动暂停${actionName} ${error.message}`);
              return;
            case error instanceof PublishLimitExp:
              this.logRecorder.info(`停止${actionName} ${error.message}`);
              return;
            default:
              logger$1.error("未捕获异常--->", error);
          }
        }
      }
    } while (await this.next());

    this.logRecorder.info(`结束${actionName}`);
  }

  pausePush(): void {
  }

  preMatchJob(): void {
    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
      throw new PublishLimitExp("自定义投递次数限制");
    }

    if (this.pushStatus === PushStatus.PAUSE) {
      throw new PublishStopExp("手动暂停投递");
    }
  }

  async push(jobDetail: any): Promise<any> {
    if (this.pushStatus === PushStatus.PAUSE) {
      throw new PublishStopExp("手动暂停投递");
    }

    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
      throw new PublishLimitExp("自定义投递次数限制");
    }

    const limitResult = this.isLimit(jobDetail);
    if (limitResult.limit) {
      throw new PublishLimitExp(limitResult.msg);
    }

    if (this._pushMock) {
      const jobTitle = this.getJobKey(jobDetail);
      logger$1.debug("mock投递 ", jobTitle);
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
      throw new PublishStopExp("手动暂停收藏");
    }

    if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
      throw new PublishLimitExp("自定义收藏次数限制");
    }

    if (this._pushMock) {
      const jobTitle = this.getJobKey(jobDetail);
      logger$1.debug("mock收藏 ", jobTitle);
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
      runtimeCounter().successIncr();
      this.logRecorder.info(`工作【${jobTitle}】 收藏成功`);
      return jobDetail;
    }

    throw new CollectReqException(jobTitle, collectResult.message || "收藏未确认成功");
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

  getFistJobDetail(): any {
    return this.getJobList()[0];
  }

  abstract getJobList(): any[];
  abstract hasNext(): boolean;
  abstract acquireDataPre(): void;
  abstract startPreHandler(): void;
  abstract matchJob(jobDetail: any): Promise<any>;
  abstract pushAfterHandler(pushResult: any, jobDetail: any): Promise<any>;
  abstract pushPreHandler(jobDetail: any): any;
  abstract getJobKey(jobDetail: any): string;
  abstract doPush(jobDetail: any): Promise<any>;
}
