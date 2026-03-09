import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, LogLevel } from '@/shared/utils/logger';

describe('logger utility', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'trace').mockImplementation(() => {});
  });

  it('应该能够创建logger实例', () => {
    const logger = new Logger('test');
    expect(logger).toBeDefined();
    expect(logger.name).toBe('test');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('logger方法应该不抛出错误', () => {
    const logger = new Logger('test');
    
    expect(() => logger.info('test message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
    expect(() => logger.warn('warning message')).not.toThrow();
    expect(() => logger.debug('debug message')).not.toThrow();
  });

  it('应该能够设置和获取日志级别', () => {
    const logger = new Logger('test', LogLevel.Debug);
    expect(logger.getLogLevel()).toBe(LogLevel.Debug);
    
    logger.setLogLevel(LogLevel.Error);
    expect(logger.getLogLevel()).toBe(LogLevel.Error);
  });

  it('应该能够设置全局日志级别', () => {
    const logger1 = new Logger('test1');
    const logger2 = new Logger('test2');
    
    Logger.setGlobalLogLevel(LogLevel.Warn);
    
    expect(logger1.getLogLevel()).toBe(LogLevel.Warn);
    expect(logger2.getLogLevel()).toBe(LogLevel.Warn);
  });
});
