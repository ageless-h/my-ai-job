import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AbsPlatform,
  LogRecorder,
  PushResultStatus,
  PushStatus,
  bindPlatformRuntime,
  pushResultCounter,
  runtimeUserStore,
} from '@/core/engine/push-engine';
import type { PushResultCounterRuntime, RuntimeUserStore } from '@/core/runtime/runtime-contracts';
import {
  FavoriteRequestError,
  FetchJobDetailError,
  NotMatchError,
  PushLimitError,
  PushRequestError,
  PushStopError,
} from '@/shared/errors';
import { LogLevel } from '@/shared/utils/logger';
import { TampermonkeyApi } from '@/shared/utils/tampermonkey';
import { Tools } from '@/shared/utils/tools';

type Job = {
  id: string;
  title: string;
};

const createCounterRuntime = (): PushResultCounterRuntime => {
  const counter: PushResultCounterRuntime = {
    notMatchCount: 0,
    successCount: 0,
    onceSuccessCount: 0,
    failCount: 0,
    collectSuccessCount: 0,
    collectFailCount: 0,
    onceCollectSuccessCount: 0,
    notMatchIncr: vi.fn(() => {
      counter.notMatchCount += 1;
    }),
    successIncr: vi.fn(() => {
      counter.successCount += 1;
      counter.onceSuccessCount += 1;
    }),
    failIncr: vi.fn(() => {
      counter.failCount += 1;
    }),
    collectSuccessIncr: vi.fn(() => {
      counter.collectSuccessCount += 1;
      counter.onceCollectSuccessCount += 1;
    }),
    collectFailIncr: vi.fn(() => {
      counter.collectFailCount += 1;
    }),
    clearOnceSuccessCount: vi.fn(() => {
      counter.onceSuccessCount = 0;
    }),
    clearOnceCollectSuccessCount: vi.fn(() => {
      counter.onceCollectSuccessCount = 0;
    }),
  };

  return counter;
};

const createUserStore = (preference: Record<string, unknown> = {}): RuntimeUserStore => ({
  user: {
    preference,
  },
  platformType: undefined,
  preferenceLoadStatus: 'idle',
  preferenceLoadError: '',
});

class TestPlatform extends AbsPlatform {
  jobs: Job[] = [];
  hasNextQueue: boolean[] = [];
  manualVerificationQueue: Array<string | null> = [];
  limitResponse: { limit: boolean; msg: string } = {
    limit: false,
    msg: '',
  };

  override getJobList = vi.fn(() => this.jobs);

  override hasNext = vi.fn(() => {
    if (this.hasNextQueue.length === 0) {
      return false;
    }
    return this.hasNextQueue.shift() as boolean;
  });

  override acquireDataPre = vi.fn(async () => undefined);

  override startPreHandler = vi.fn(() => undefined);

  override matchJob = vi.fn(async (_jobDetail: Job) => undefined);

  override pushAfterHandler = vi.fn(async (_pushResult: any, _jobDetail: Job) => undefined);

  override pushPreHandler = vi.fn((jobDetail: Job) => jobDetail);

  override getJobKey = vi.fn(
    (jobDetail: Job) => `${jobDetail?.title || jobDetail?.id || 'unknown'}`
  );

  override doPush = vi.fn(async (_jobDetail: Job) => ({
    message: 'Success',
    code: 0,
    verified: true,
  }));

  override doCollect = vi.fn(async (_jobDetail: Job) => ({
    message: 'Success',
    code: 0,
    verified: true,
  }));

  override isLimit(jobDetail: Job): { limit: boolean; msg: string } {
    if (this.limitResponse.limit) {
      return this.limitResponse;
    }

    return {
      limit: false,
      msg: this.getJobKey(jobDetail),
    };
  }

  protected override getManualVerificationReason(): string | null {
    if (this.manualVerificationQueue.length === 0) {
      return null;
    }
    return this.manualVerificationQueue.shift() ?? null;
  }
}

class DefaultBehaviorPlatform extends AbsPlatform {
  jobs: Job[] = [];

  override getJobList(): Job[] {
    return this.jobs;
  }

  override hasNext(): boolean {
    return false;
  }

  override async acquireDataPre(): Promise<void> {
    return undefined;
  }

  override startPreHandler(): void {}

  override async matchJob(_jobDetail: Job): Promise<any> {
    return undefined;
  }

  override async pushAfterHandler(_pushResult: any, _jobDetail: Job): Promise<any> {
    return undefined;
  }

  override pushPreHandler(jobDetail: Job): any {
    return jobDetail;
  }

  override getJobKey(jobDetail: Job): string {
    return jobDetail.title;
  }

  override async doPush(_jobDetail: Job): Promise<any> {
    return {
      message: 'Success',
      code: 0,
    };
  }
}

const createJobs = (...ids: string[]): Job[] => ids.map((id) => ({ id, title: `job-${id}` }));

let gmStore: Record<string, unknown> = {};
let gmGetValueSpy: any;
let gmSetValueSpy: any;
let sleepSpy: any;
let managedRecorders: LogRecorder[] = [];

const setupRuntime = (preference: Record<string, unknown> = {}) => {
  const counter = createCounterRuntime();
  const userStore = createUserStore(preference);
  bindPlatformRuntime(counter, userStore);
  return {
    counter,
    userStore,
  };
};

const createPlatform = (): TestPlatform => {
  const platform = new TestPlatform();
  managedRecorders.push(platform.preferenceLogRecorder);
  return platform;
};

describe('push-engine module', () => {
  beforeEach(() => {
    gmStore = {};
    managedRecorders = [];
    LogRecorder.logs = [];

    gmGetValueSpy = vi
      .spyOn(TampermonkeyApi, 'GmGetValue')
      .mockImplementation((key: string, defaultValue: unknown) => {
        if (Object.prototype.hasOwnProperty.call(gmStore, key)) {
          return gmStore[key];
        }
        return defaultValue;
      });
    gmSetValueSpy = vi
      .spyOn(TampermonkeyApi, 'GmSetValue')
      .mockImplementation((key: string, value: unknown) => {
        gmStore[key] = value;
      });

    sleepSpy = vi.spyOn(Tools, 'sleep').mockResolvedValue(undefined);
    vi.spyOn(Tools, 'getCurrentHostname').mockReturnValue('www.zhipin.com');
    vi.spyOn(Tools, 'isBossDomainHost').mockReturnValue(true);
    vi.spyOn(Tools, 'isManualVerificationText').mockImplementation(
      (text: string | null | undefined) => `${text || ''}`.includes('验证')
    );
    vi.spyOn(Tools, 'getRandomNumber').mockReturnValue(0);

    const gmXmlHttpRequestMock = (globalThis as any).GM_xmlhttpRequest;
    if (typeof gmXmlHttpRequestMock?.mockReset === 'function') {
      gmXmlHttpRequestMock.mockReset();
    }

    setupRuntime();
  });

  afterEach(() => {
    for (const recorder of managedRecorders) {
      try {
        recorder.destroy();
      } catch (_error) {}
    }
    managedRecorders = [];
    LogRecorder.logs = [];

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('runtime binding and enums', () => {
    it('bindPlatformRuntime 应更新全局运行时引用', () => {
      const counter = createCounterRuntime();
      const userStore = createUserStore({ pushIntervalSec: 12 });

      bindPlatformRuntime(counter, userStore);

      expect(pushResultCounter).toBe(counter);
      expect(runtimeUserStore).toBe(userStore);
    });

    it('PushStatus 与 PushResultStatus 枚举值应稳定', () => {
      expect(PushStatus.NOT_START).toBe(0);
      expect(PushStatus.PUSHING).toBe(1);
      expect(PushStatus.PAUSE).toBe(2);
      expect(PushStatus.LIMIT).toBe(3);

      expect(PushResultStatus.NOT_START).toBe(-1);
      expect(PushResultStatus.SUCCESS).toBe(0);
      expect(PushResultStatus.FAIL).toBe(1);
    });

    it('pausePush 当前应为 no-op', () => {
      const platform = createPlatform();
      platform.pushStatus = PushStatus.PUSHING;

      platform.pausePush();

      expect(platform.pushStatus).toBe(PushStatus.PUSHING);
    });

    it('setter/getter 应正确维护 collectMode 与 selfDefPushCountLimit', () => {
      const platform = createPlatform();

      platform.collectMode = true;
      platform.selfDefPushCountLimit = 5;

      expect(platform.collectMode).toBe(true);
      expect(platform.selfDefPushCountLimit).toBe(5);
    });
  });

  describe('LogRecorder', () => {
    it('构造时应加载并去重持久化日志', () => {
      LogRecorder.logs = [{ level: 'info', message: 'in-memory', timestamp: '10:00:00.001' }];
      gmStore[LogRecorder.LOGS_STORAGE_KEY] = [
        { level: 'info', message: 'duplicate', timestamp: '10:00:00.001' },
        { level: 'warn', message: 'from-storage', timestamp: '10:00:00.002' },
      ];

      const recorder = new LogRecorder('dedupe');
      managedRecorders.push(recorder);

      expect(LogRecorder.logs).toHaveLength(2);
      expect(LogRecorder.logs.map((item) => item.message)).toEqual(['in-memory', 'from-storage']);
    });

    it('应按定时器周期触发持久化', () => {
      vi.useFakeTimers();
      const recorder = new LogRecorder('timer');
      managedRecorders.push(recorder);
      const persistSpy = vi.spyOn(recorder, 'persistLogs');

      vi.advanceTimersByTime(10_000);

      expect(persistSpy).toHaveBeenCalledTimes(1);
    });

    it('destroy 应停止定时器并执行最后一次持久化', () => {
      vi.useFakeTimers();
      const recorder = new LogRecorder('destroy');
      managedRecorders.push(recorder);
      const persistSpy = vi.spyOn(recorder, 'persistLogs');

      recorder.destroy();
      vi.advanceTimersByTime(20_000);

      expect(recorder.persistTimer).toBeNull();
      expect(persistSpy).toHaveBeenCalledTimes(1);
    });

    it('addLog 应在超过 maxLogs 时淘汰最旧记录', () => {
      const recorder = new LogRecorder('max');
      managedRecorders.push(recorder);
      recorder.maxLogs = 2;

      recorder.addLog('info', 'a');
      recorder.addLog('info', 'b');
      recorder.addLog('info', 'c');

      expect(LogRecorder.logs).toHaveLength(2);
      expect(LogRecorder.logs.map((item) => item.message)).toEqual(['b', 'c']);
    });

    it('clearLogs 应清空并写回存储', () => {
      const recorder = new LogRecorder('clear');
      managedRecorders.push(recorder);
      const persistSpy = vi.spyOn(recorder, 'persistLogs');
      LogRecorder.logs = [{ level: 'warn', message: 'x', timestamp: '10:00:00.010' }];

      recorder.clearLogs();

      expect(LogRecorder.logs).toHaveLength(0);
      expect(persistSpy).toHaveBeenCalledTimes(1);
    });

    it('getLogs/getLogCount 应支持分页读取', () => {
      const recorder = new LogRecorder('page');
      managedRecorders.push(recorder);
      LogRecorder.logs = [
        { level: 'info', message: '1', timestamp: '10:00:00.001' },
        { level: 'info', message: '2', timestamp: '10:00:00.002' },
        { level: 'info', message: '3', timestamp: '10:00:00.003' },
      ];

      expect(recorder.getLogCount()).toBe(3);
      expect(recorder.getLogs(2, 2).map((item) => item.message)).toEqual(['3']);
    });

    it('error/warn/info/debug/trace 应记录不同级别日志', () => {
      const recorder = new LogRecorder('levels');
      managedRecorders.push(recorder);

      recorder.error('err');
      recorder.warn('warn');
      recorder.info('info');
      recorder.debug('debug');
      recorder.trace('trace');

      expect(LogRecorder.logs.slice(-5).map((item) => item.level)).toEqual([
        'error',
        'warn',
        'info',
        'debug',
        'trace',
      ]);
    });
  });

  describe('AbsPlatform 基础行为', () => {
    it('preMatchJob 在自定义投递上限触达时应抛出 PushLimitError', () => {
      const { counter } = setupRuntime();
      counter.onceSuccessCount = 2;
      const platform = createPlatform();
      platform.selfDefPushCountLimit = 2;

      expect(() => platform.preMatchJob()).toThrow(PushLimitError);
    });

    it('preMatchJob 在暂停状态应抛出 PushStopError', () => {
      const platform = createPlatform();
      platform.pushStatus = PushStatus.PAUSE;

      expect(() => platform.preMatchJob()).toThrow(PushStopError);
    });

    it('push 在命中限制条件时应抛出 PushLimitError', async () => {
      const platform = createPlatform();
      platform.limitResponse = {
        limit: true,
        msg: '限制命中',
      };

      await expect(platform.push({ id: '1', title: 'job-1' })).rejects.toBeInstanceOf(
        PushLimitError
      );
    });

    it('push 在 pushMock=true 时应返回 mock 成功结果', async () => {
      const platform = createPlatform();
      platform.pushMock = true;

      const result = await platform.push({ id: '1', title: 'job-1' });

      expect(result).toEqual({
        message: 'Success',
        code: 0,
      });
      expect(platform.doPush).not.toHaveBeenCalled();
    });

    it('push 在正常路径应委托 doPush', async () => {
      const platform = createPlatform();
      platform.doPush.mockResolvedValueOnce({ message: 'ok', code: 0, verified: true });

      const result = await platform.push({ id: '1', title: 'job-1' });

      expect(platform.doPush).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'ok', code: 0, verified: true });
    });

    it('collect 在暂停状态应抛出 PushStopError', async () => {
      const platform = createPlatform();
      platform.pushStatus = PushStatus.PAUSE;

      await expect(platform.collect({ id: '1', title: 'job-1' })).rejects.toBeInstanceOf(
        PushStopError
      );
    });

    it('collect 在自定义收藏上限触达时应抛出 PushLimitError', async () => {
      const { counter } = setupRuntime();
      counter.onceCollectSuccessCount = 1;
      const platform = createPlatform();
      platform.selfDefPushCountLimit = 1;

      await expect(platform.collect({ id: '1', title: 'job-1' })).rejects.toBeInstanceOf(
        PushLimitError
      );
    });

    it('collect 在 pushMock=true 时应返回 mock 成功结果', async () => {
      const platform = createPlatform();
      platform.pushMock = true;

      const result = await platform.collect({ id: '1', title: 'job-1' });

      expect(result).toEqual({
        message: 'Success',
        code: 0,
      });
      expect(platform.doCollect).not.toHaveBeenCalled();
    });

    it('collect 在正常路径应委托 doCollect', async () => {
      const platform = createPlatform();
      platform.doCollect.mockResolvedValueOnce({ message: 'ok', code: 0, verified: true });

      const result = await platform.collect({ id: '1', title: 'job-1' });

      expect(platform.doCollect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'ok', code: 0, verified: true });
    });

    it('collectAfterHandler 成功时应累计并返回岗位详情', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      const job = { id: '1', title: 'job-1' };

      const result = await platform.collectAfterHandler(
        { message: 'Success', code: 0, verified: true },
        job
      );

      expect(counter.collectSuccessCount).toBe(1);
      expect(result).toBe(job);
    });

    it('collectAfterHandler 失败时应抛出 FavoriteRequestError', async () => {
      const platform = createPlatform();

      await expect(
        platform.collectAfterHandler({ message: '失败', code: 1 }, { id: '1', title: 'job-1' })
      ).rejects.toBeInstanceOf(FavoriteRequestError);
    });

    it('collectPreHandler 应原样返回岗位详情', () => {
      const platform = createPlatform();
      const job = { id: '1', title: 'job-1' };

      expect(platform.collectPreHandler(job)).toBe(job);
    });

    it('默认 doCollect 应返回平台不支持提示', async () => {
      const platform = new DefaultBehaviorPlatform();
      managedRecorders.push(platform.preferenceLogRecorder);

      const result = await platform.doCollect({ id: '1', title: 'job-1' });

      expect(result).toEqual({
        message: '当前平台暂不支持收藏',
        code: 1,
      });
    });

    it('默认 isLimit 应返回不限制并携带岗位key', () => {
      const platform = new DefaultBehaviorPlatform();
      managedRecorders.push(platform.preferenceLogRecorder);

      expect(platform.isLimit({ id: '1', title: 'job-1' })).toEqual({
        limit: false,
        msg: 'job-1',
      });
    });

    it('getFistJobDetail 应返回首个岗位', () => {
      const platform = new DefaultBehaviorPlatform();
      managedRecorders.push(platform.preferenceLogRecorder);
      platform.jobs = createJobs('1', '2');

      expect(platform.getFistJobDetail()).toEqual({ id: '1', title: 'job-1' });
    });
  });

  describe('next', () => {
    it('有下一页进展时应正常等待并继续', async () => {
      setupRuntime({ npi: 2 });
      const platform = createPlatform();
      platform.hasNextQueue = [true];

      const result = await platform.next();

      expect(result).toBe(true);
      expect(platform.acquireDataPre).toHaveBeenCalledTimes(1);
      expect(sleepSpy).toHaveBeenCalledWith(2000);
      expect(sleepSpy).toHaveBeenCalledWith(3000);
    });

    it('无下一页时兜底滚动后恢复进展应返回 true', async () => {
      setupRuntime({ npi: 1 });
      const platform = createPlatform();
      platform.hasNextQueue = [false, true];

      const result = await platform.next();

      expect(result).toBe(true);
      expect(platform.acquireDataPre).toHaveBeenCalledTimes(1);
      expect(sleepSpy).toHaveBeenCalledWith(1000);
    });

    it('无下一页且超时仍无进展应返回 false', async () => {
      const dateNowSpy = vi.spyOn(Date, 'now');
      let now = 0;
      dateNowSpy.mockImplementation(() => {
        now += 10_000;
        return now;
      });

      const platform = createPlatform();
      platform.hasNextQueue = [false, false];

      const result = await platform.next();

      expect(result).toBe(false);
      expect(platform.acquireDataPre).toHaveBeenCalledTimes(1);
    });

    it('暂停状态调用 next 应停止并记录原因', async () => {
      const platform = createPlatform();
      platform.pushStatus = PushStatus.PAUSE;
      platform.hasNextQueue = [true];

      const result = await platform.next();

      expect(result).toBe(false);
      expect(platform.lastStopReason).toContain('手动暂停投递');
    });

    it('人工验证解除后 next 应清理停止原因并继续', async () => {
      const platform = createPlatform();
      platform.hasNextQueue = [true];
      platform.manualVerificationQueue = ['检测到验证弹窗', null];

      const result = await platform.next();

      expect(result).toBe(true);
      expect(platform.lastStopReason).toBe('');
      expect(sleepSpy).toHaveBeenCalledWith(5000);
    });
  });

  describe('startPush', () => {
    it('当前域名不可信时应进入 LIMIT 状态', async () => {
      const platform = createPlatform();
      vi.spyOn(Tools, 'getCurrentHostname').mockReturnValue('evil.example.com');
      vi.spyOn(Tools, 'isBossDomainHost').mockReturnValue(false);

      await platform.startPush();

      expect(platform.pushStatus).toBe(PushStatus.LIMIT);
      expect(platform.lastStopReason).toContain('不受信任');
      expect(platform.startPreHandler).not.toHaveBeenCalled();
    });

    it('存在未过期锁时应拒绝启动', async () => {
      const platform = createPlatform();
      gmStore[TampermonkeyApi.PUSH_LOCK] = `${Date.now()}_other-tab`;

      await platform.startPush();

      expect(platform.pushStatus).toBe(PushStatus.LIMIT);
      expect(platform.lastStopReason).toContain('其他标签页');
    });

    it('锁过期时应清理旧锁并继续执行', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      gmStore[TampermonkeyApi.PUSH_LOCK] = `${Date.now() - 6 * 60 * 1000}_expired`;

      await platform.startPush();

      expect(platform.pushStatus).toBe(PushStatus.PUSHING);
      expect(platform.startPreHandler).toHaveBeenCalledTimes(1);
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('锁回读不一致时应进入 LIMIT 状态', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');

      gmGetValueSpy.mockReset();
      gmSetValueSpy.mockReset();
      gmGetValueSpy
        .mockImplementationOnce((_key: string, defaultValue: unknown) => defaultValue)
        .mockImplementationOnce(() => 'another-lock-value');
      gmSetValueSpy.mockImplementation(() => undefined);

      await platform.startPush();

      expect(platform.pushStatus).toBe(PushStatus.LIMIT);
      expect(platform.lastStopReason).toContain('获取投递锁失败');
    });

    it('启动前已手动暂停时应提前退出并释放锁', async () => {
      const platform = createPlatform();
      platform.pushStatus = PushStatus.PAUSE;

      await platform.startPush();

      expect(platform.lastStopReason).toContain('手动暂停投递');
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
      expect(platform.startPreHandler).not.toHaveBeenCalled();
    });

    it('正常路径应按队列顺序处理岗位并释放锁', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.jobs = createJobs('1', '2');
      platform.next = vi.fn(async () => false);

      await platform.startPush();

      expect(counter.clearOnceSuccessCount).toHaveBeenCalledTimes(1);
      expect(platform.pushPreHandler.mock.calls.map((args: any[]) => args[0].id)).toEqual([
        '1',
        '2',
      ]);
      expect(platform.doPush).toHaveBeenCalledTimes(2);
      expect(platform.pushAfterHandler).toHaveBeenCalledTimes(2);
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('NotMatchError 应计入 notMatchCount', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.preferenceLogRecorder.setLogLevel(LogLevel.Debug);
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.matchJob.mockRejectedValueOnce(new NotMatchError('job-1', 'salary', '薪资不匹配'));

      await platform.startPush();

      expect(counter.notMatchCount).toBe(1);
      expect(platform.doPush).not.toHaveBeenCalled();
    });

    it('PushRequestError 应计入 failCount', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.doPush.mockRejectedValueOnce(new PushRequestError('job-1', '请求失败'));

      await platform.startPush();

      expect(counter.failCount).toBe(1);
    });

    it('collectMode 下 FavoriteRequestError 应计入 collectFailCount', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.collectMode = true;
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.doCollect.mockResolvedValueOnce({ message: '收藏失败', code: 1, verified: false });

      await platform.startPush();

      expect(counter.collectFailCount).toBe(1);
    });

    it('FetchJobDetailError 应记录告警但不计入 failCount', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.doPush.mockRejectedValueOnce(new FetchJobDetailError('job-1', '招呼语失败'));

      await platform.startPush();

      expect(counter.failCount).toBe(0);
      expect(platform.lastStopReason).toBe('');
    });

    it('PushStopError(手动暂停) 应立即停止并记录原因', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.doPush.mockRejectedValueOnce(new PushStopError('手动暂停投递'));

      await platform.startPush();

      expect(platform.lastStopReason).toContain('手动暂停投递');
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('PushStopError(人工验证) 在验证解除后应继续执行', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.manualVerificationQueue = ['检测到验证弹窗', null];
      platform.doPush.mockRejectedValueOnce(new PushStopError('请先完成验证'));

      await platform.startPush();

      expect(platform.lastStopReason).toBe('');
      expect(sleepSpy).toHaveBeenCalledWith(5000);
    });

    it('PushLimitError 应进入 LIMIT 状态并停止', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      platform.doPush.mockRejectedValueOnce(new PushLimitError('命中限制'));

      await platform.startPush();

      expect(platform.pushStatus).toBe(PushStatus.LIMIT);
      expect(platform.lastStopReason).toContain('停止投递');
    });

    it('应命中每日成功次数上限保护', async () => {
      const { counter } = setupRuntime({ maxDailyActions: 2 });
      counter.successCount = 2;
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);

      await expect(platform.startPush()).rejects.toThrow('今日最多2次成功投递');
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('应命中会话成功次数上限保护', async () => {
      setupRuntime({ maxSessionActions: 1 });
      const platform = createPlatform();
      platform.jobs = createJobs('1', '2');
      platform.next = vi.fn(async () => false);

      await expect(platform.startPush()).rejects.toThrow('单次会话最多1次成功投递');
      expect(platform.doPush).toHaveBeenCalledTimes(1);
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('应命中每分钟动作次数上限保护', async () => {
      setupRuntime({ maxActionsPerMinute: 1 });
      const platform = createPlatform();
      platform.jobs = createJobs('1', '2');
      platform.next = vi.fn(async () => false);

      await expect(platform.startPush()).rejects.toThrow('每分钟最多1次投递');
      expect(platform.doPush).toHaveBeenCalledTimes(1);
      expect(gmStore[TampermonkeyApi.PUSH_LOCK]).toBe('');
    });

    it('网络异常后重试成功应继续流程', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      const networkError = { code: 'ERR_NETWORK', message: 'network down' };
      platform.matchJob.mockRejectedValueOnce(networkError).mockResolvedValueOnce(undefined);

      await platform.startPush();

      expect(platform.matchJob).toHaveBeenCalledTimes(2);
      expect(platform.doPush).toHaveBeenCalledTimes(1);
      expect(sleepSpy.mock.calls.some((args: any[]) => args[0] === 2000)).toBe(true);
    });

    it('网络异常重试耗尽后应记录安全等待原因', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      const networkError = { code: 'ERR_NETWORK', message: 'network down' };
      platform.matchJob.mockRejectedValue(networkError);

      await platform.startPush();

      expect(platform.matchJob).toHaveBeenCalledTimes(4);
      expect(platform.lastStopReason).toContain('网络异常重试 3 次后仍失败');
    });

    it('未知异常应记录错误并继续处理', async () => {
      const platform = createPlatform();
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      const errorSpy = vi.spyOn(platform.preferenceLogRecorder, 'error');
      platform.matchJob.mockRejectedValueOnce(new Error('boom'));

      await platform.startPush();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('未知异常导致投递失败'));
    });

    it('collectMode 正常路径应走收藏链路并清理 onceCollect 计数', async () => {
      const { counter } = setupRuntime();
      const platform = createPlatform();
      platform.collectMode = true;
      platform.jobs = createJobs('1');
      platform.next = vi.fn(async () => false);
      const collectPreSpy = vi.spyOn(platform, 'collectPreHandler');
      const collectAfterSpy = vi.spyOn(platform, 'collectAfterHandler');

      await platform.startPush();

      expect(counter.clearOnceCollectSuccessCount).toHaveBeenCalledTimes(1);
      expect(collectPreSpy).toHaveBeenCalledTimes(1);
      expect(collectAfterSpy).toHaveBeenCalledTimes(1);
      expect(platform.pushPreHandler).not.toHaveBeenCalled();
    });
  });
});
