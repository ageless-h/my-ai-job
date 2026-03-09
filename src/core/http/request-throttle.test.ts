import { describe, it, expect } from 'vitest';
import { RequestThrottle } from '@/core/http/request-throttle';

describe('request-throttle module', () => {
  it('应该能够导入throttle模块', async () => {
    const throttle = await import('@/core/http/request-throttle');
    expect(throttle).toBeDefined();
    expect(throttle.RequestThrottle).toBeDefined();
  });

  it('应该能够创建throttle实例', () => {
    const throttle = new RequestThrottle({ minDelay: 1000, maxDelay: 2000 });
    expect(throttle).toBeDefined();
    expect(typeof throttle.enqueue).toBe('function');
    expect(typeof throttle.abort).toBe('function');
    expect(typeof throttle.reset).toBe('function');
  });

  it('throttle应该能够入队和执行请求', async () => {
    const throttle = new RequestThrottle({ minDelay: 10, maxDelay: 20 });
    
    let executed = false;
    const result = await throttle.enqueue(async () => {
      executed = true;
      return 'success';
    });
    
    expect(executed).toBe(true);
    expect(result).toBe('success');
  });
});
