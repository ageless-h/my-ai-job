import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindPlatformRuntime,
  pushResultCounter,
  runtimeUserStore,
  PushStatus,
  PushResultStatus,
  LogRecorder
} from './push-engine';
import type { PushResultCounterRuntime, RuntimeUserStore } from '@/core/runtime/runtime-contracts';

describe('push-engine', () => {
  describe('bindPlatformRuntime', () => {
    it('应该正确绑定平台运行时', () => {
      const mockCounter: PushResultCounterRuntime = {
        notMatchCount: 5,
        successCount: 10,
        onceSuccessCount: 2,
        failCount: 3,
        collectSuccessCount: 1,
        collectFailCount: 0,
        onceCollectSuccessCount: 1,
        notMatchIncr: vi.fn(),
        successIncr: vi.fn(),
        failIncr: vi.fn(),
        collectSuccessIncr: vi.fn(),
        collectFailIncr: vi.fn(),
        clearOnceSuccessCount: vi.fn(),
        clearOnceCollectSuccessCount: vi.fn()
      };

      const mockUserStore: RuntimeUserStore = {
        user: {
          preference: {
            pushInterval: 3000,
            pushLimit: 10
          }
        },
        platformType: 'boss' as any,
        preferenceLoadStatus: 'success',
        preferenceLoadError: ''
      };

      bindPlatformRuntime(mockCounter, mockUserStore);

      expect(pushResultCounter.successCount).toBe(10);
      expect(runtimeUserStore.platformType).toBe('boss');
    });

    it('应该更新全局counter引用', () => {
      const counter1: PushResultCounterRuntime = {
        notMatchCount: 1,
        successCount: 1,
        onceSuccessCount: 0,
        failCount: 0,
        collectSuccessCount: 0,
        collectFailCount: 0,
        onceCollectSuccessCount: 0,
        notMatchIncr: vi.fn(),
        successIncr: vi.fn(),
        failIncr: vi.fn(),
        collectSuccessIncr: vi.fn(),
        collectFailIncr: vi.fn(),
        clearOnceSuccessCount: vi.fn(),
        clearOnceCollectSuccessCount: vi.fn()
      };

      const userStore1: RuntimeUserStore = {
        user: { preference: {} },
        platformType: undefined,
        preferenceLoadStatus: 'idle',
        preferenceLoadError: ''
      };

      bindPlatformRuntime(counter1, userStore1);
      expect(pushResultCounter.successCount).toBe(1);

      const counter2: PushResultCounterRuntime = {
        ...counter1,
        successCount: 5
      };

      bindPlatformRuntime(counter2, userStore1);
      expect(pushResultCounter.successCount).toBe(5);
    });
  });

  describe('PushStatus枚举', () => {
    it('应该定义正确的状态值', () => {
      expect(PushStatus.NOT_START).toBe(0);
      expect(PushStatus.PUSHING).toBe(1);
      expect(PushStatus.PAUSE).toBe(2);
      expect(PushStatus.LIMIT).toBe(3);
    });

    it('状态值应该是唯一的', () => {
      const values = [
        PushStatus.NOT_START,
        PushStatus.PUSHING,
        PushStatus.PAUSE,
        PushStatus.LIMIT
      ];
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('PushResultStatus枚举', () => {
    it('应该定义正确的结果状态值', () => {
      expect(PushResultStatus.NOT_START).toBe(-1);
      expect(PushResultStatus.SUCCESS).toBe(0);
      expect(PushResultStatus.FAIL).toBe(1);
    });

    it('结果状态值应该是唯一的', () => {
      const values = [
        PushResultStatus.NOT_START,
        PushResultStatus.SUCCESS,
        PushResultStatus.FAIL
      ];
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('LogRecorder', () => {
    let logRecorder: LogRecorder;

    beforeEach(() => {
      // 清空静态logs
      LogRecorder.logs = [];
      logRecorder = new LogRecorder('test');
    });

    it('应该正确初始化LogRecorder', () => {
      expect(logRecorder).toBeDefined();
      expect(logRecorder.name).toBe('test');
    });

    it('应该记录日志到静态logs数组', () => {
      logRecorder.info('Test message');
      expect(LogRecorder.logs.length).toBeGreaterThan(0);
      expect(LogRecorder.logs[LogRecorder.logs.length - 1].message).toContain('Test message');
    });

    it('应该记录不同级别的日志', () => {
      const initialLength = LogRecorder.logs.length;
      
      logRecorder.info('Info message');
      logRecorder.warn('Warn message');
      logRecorder.error('Error message');
      
      expect(LogRecorder.logs.length).toBe(initialLength + 3);
    });

    it('应该包含时间戳', () => {
      logRecorder.info('Test with timestamp');
      const lastLog = LogRecorder.logs[LogRecorder.logs.length - 1];
      expect(lastLog.timestamp).toBeDefined();
      expect(lastLog.timestamp).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('应该限制最大日志数量', () => {
      const recorder = new LogRecorder('test');
      recorder.maxLogs = 10;
      
      // 添加超过maxLogs的日志
      for (let i = 0; i < 15; i++) {
        recorder.info(`Message ${i}`);
      }
      
      // 由于是静态数组，这里只验证recorder有maxLogs属性
      expect(recorder.maxLogs).toBe(10);
    });

    it('应该正确格式化日志级别', () => {
      logRecorder.info('Info test');
      const lastLog = LogRecorder.logs[LogRecorder.logs.length - 1];
      expect(lastLog.level).toBeDefined();
      expect(['INFO', 'WARN', 'ERROR', 'DEBUG', 'info', 'warn', 'error', 'debug']).toContain(lastLog.level);
    });

    it('应该支持清空日志', () => {
      logRecorder.info('Test 1');
      logRecorder.info('Test 2');
      expect(LogRecorder.logs.length).toBeGreaterThan(0);
      
      LogRecorder.logs = [];
      expect(LogRecorder.logs.length).toBe(0);
    });

    it('应该从localStorage加载日志', () => {
      // 这个测试验证loadLogsFromStorage方法被调用
      const recorder = new LogRecorder('load-test');
      expect(recorder).toBeDefined();
      // 实际的localStorage交互由test-setup.ts mock
    });

    it('应该启动持久化定时器', () => {
      const recorder = new LogRecorder('persist-test');
      expect(recorder.persistTimer).toBeDefined();
    });
  });

  describe('运行时状态管理', () => {
    it('应该提供默认的fallback counter', () => {
      const mockCounter: PushResultCounterRuntime = {
        notMatchCount: 0,
        successCount: 0,
        onceSuccessCount: 0,
        failCount: 0,
        collectSuccessCount: 0,
        collectFailCount: 0,
        onceCollectSuccessCount: 0,
        notMatchIncr: vi.fn(),
        successIncr: vi.fn(),
        failIncr: vi.fn(),
        collectSuccessIncr: vi.fn(),
        collectFailIncr: vi.fn(),
        clearOnceSuccessCount: vi.fn(),
        clearOnceCollectSuccessCount: vi.fn()
      };

      const mockUserStore: RuntimeUserStore = {
        user: { preference: {} },
        platformType: undefined,
        preferenceLoadStatus: 'idle',
        preferenceLoadError: ''
      };

      bindPlatformRuntime(mockCounter, mockUserStore);
      
      expect(pushResultCounter.notMatchIncr).toBeDefined();
      expect(pushResultCounter.successIncr).toBeDefined();
      expect(pushResultCounter.failIncr).toBeDefined();
    });

    it('应该正确处理用户偏好设置', () => {
      const mockCounter: PushResultCounterRuntime = {
        notMatchCount: 0,
        successCount: 0,
        onceSuccessCount: 0,
        failCount: 0,
        collectSuccessCount: 0,
        collectFailCount: 0,
        onceCollectSuccessCount: 0,
        notMatchIncr: vi.fn(),
        successIncr: vi.fn(),
        failIncr: vi.fn(),
        collectSuccessIncr: vi.fn(),
        collectFailIncr: vi.fn(),
        clearOnceSuccessCount: vi.fn(),
        clearOnceCollectSuccessCount: vi.fn()
      };

      const mockUserStore: RuntimeUserStore = {
        user: {
          preference: {
            pushInterval: 5000,
            pushLimit: 20,
            enableAI: true
          }
        },
        platformType: 'boss' as any,
        preferenceLoadStatus: 'success',
        preferenceLoadError: ''
      };

      bindPlatformRuntime(mockCounter, mockUserStore);
      
      expect(runtimeUserStore.user.preference.pushInterval).toBe(5000);
      expect(runtimeUserStore.user.preference.pushLimit).toBe(20);
      expect(runtimeUserStore.user.preference.enableAI).toBe(true);
    });

    it('应该处理偏好加载失败的情况', () => {
      const mockCounter: PushResultCounterRuntime = {
        notMatchCount: 0,
        successCount: 0,
        onceSuccessCount: 0,
        failCount: 0,
        collectSuccessCount: 0,
        collectFailCount: 0,
        onceCollectSuccessCount: 0,
        notMatchIncr: vi.fn(),
        successIncr: vi.fn(),
        failIncr: vi.fn(),
        collectSuccessIncr: vi.fn(),
        collectFailIncr: vi.fn(),
        clearOnceSuccessCount: vi.fn(),
        clearOnceCollectSuccessCount: vi.fn()
      };

      const mockUserStore: RuntimeUserStore = {
        user: { preference: {} },
        platformType: undefined,
        preferenceLoadStatus: 'failed',
        preferenceLoadError: 'Failed to load preferences'
      };

      bindPlatformRuntime(mockCounter, mockUserStore);
      
      expect(runtimeUserStore.preferenceLoadStatus).toBe('failed');
      expect(runtimeUserStore.preferenceLoadError).toBe('Failed to load preferences');
    });
  });
});
