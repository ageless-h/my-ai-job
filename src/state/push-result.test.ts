import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePushResultStore } from '@/state/push-result';

describe('push-result store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('应该初始化为0计数', () => {
    const store = usePushResultStore();
    expect(store.successCount).toBeDefined();
    expect(store.failCount).toBeDefined();
    expect(store.collectSuccessCount).toBeDefined();
    expect(store.collectFailCount).toBeDefined();
  });

  it('应该能够增加成功计数', () => {
    const store = usePushResultStore();
    const initialCount = store.successCount;
    store.successIncr();
    expect(store.successCount).toBe(initialCount + 1);
    store.successIncr();
    expect(store.successCount).toBe(initialCount + 2);
  });

  it('应该能够增加失败计数', () => {
    const store = usePushResultStore();
    const initialCount = store.failCount;
    store.failIncr();
    expect(store.failCount).toBe(initialCount + 1);
  });

  it('应该能够增加收藏成功计数', () => {
    const store = usePushResultStore();
    const initialCount = store.collectSuccessCount;
    store.collectSuccessIncr();
    expect(store.collectSuccessCount).toBe(initialCount + 1);
  });

  it('应该能够增加收藏失败计数', () => {
    const store = usePushResultStore();
    const initialCount = store.collectFailCount;
    store.collectFailIncr();
    expect(store.collectFailCount).toBe(initialCount + 1);
  });

  it('应该能够重置所有计数', () => {
    const store = usePushResultStore();
    store.successIncr();
    store.failIncr();
    store.collectSuccessIncr();
    store.collectFailIncr();
    
    store.clearCounts();
    
    expect(store.successCount).toBe(0);
    expect(store.failCount).toBe(0);
    expect(store.collectSuccessCount).toBe(0);
    expect(store.collectFailCount).toBe(0);
    expect(store.notMatchCount).toBe(0);
  });

  it('应该能够获取总计数', () => {
    const store = usePushResultStore();
    store.successIncr();
    store.successIncr();
    store.failIncr();
    
    expect(store.successCount).toBeGreaterThanOrEqual(2);
    expect(store.failCount).toBeGreaterThanOrEqual(1);
  });
});
