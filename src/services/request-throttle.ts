// -*- coding: utf-8 -*-
// RequestThrottle: 请求限流队列，防止高频 API 调用触发风控
// 所有 BOSS 直聘 API 调用应通过此服务排队执行

import { Tools } from '@/utils/tools';

export interface ThrottleOptions {
  /** 最小间隔（毫秒），默认 2000 */
  minDelay?: number;
  /** 最大间隔（毫秒），默认 5000 */
  maxDelay?: number;
}

const DEFAULT_MIN = 2000;
const DEFAULT_MAX = 5000;

/**
 * 请求限流器 — 串行队列 + 随机间隔
 * 用法:
 *   const throttle = new RequestThrottle({ minDelay: 2000, maxDelay: 5000 });
 *   const result = await throttle.enqueue(() => axios.get(url));
 */
export class RequestThrottle {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (v: any) => void;
    reject: (e: any) => void;
  }> = [];
  private running = false;
  private minDelay: number;
  private maxDelay: number;
  private _aborted = false;
  private lastExecTime = 0;

  constructor(opts?: ThrottleOptions) {
    this.minDelay = opts?.minDelay ?? DEFAULT_MIN;
    this.maxDelay = opts?.maxDelay ?? DEFAULT_MAX;
  }

  /** 入队一个异步请求，返回 Promise */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this._aborted) return Promise.reject(new Error('Throttle aborted'));
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.drain();
    });
  }

  /** 中止所有排队请求 */
  abort() {
    this._aborted = true;
    const pending = this.queue.splice(0);
    pending.forEach((item) => item.reject(new Error('Throttle aborted')));
  }

  /** 重置中止状态，允许重新使用 */
  reset() {
    this._aborted = false;
  }

  /** 当前队列长度 */
  get pending(): number {
    return this.queue.length;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0 && !this._aborted) {
      const item = this.queue.shift()!;

      // 基于上次执行时间计算需要等待的间隔
      const elapsed = Date.now() - this.lastExecTime;
      const targetDelay = this.minDelay + Tools.getRandomNumber(0, this.maxDelay - this.minDelay);
      const waitTime = Math.max(0, targetDelay - elapsed);
      if (waitTime > 0 && this.lastExecTime > 0) {
        await Tools.sleep(waitTime);
      }

      if (this._aborted) {
        item.reject(new Error('Throttle aborted'));
        break;
      }

      try {
        this.lastExecTime = Date.now();
        const result = await item.fn();
        item.resolve(result);
      } catch (e) {
        this.lastExecTime = Date.now();
        item.reject(e);
      }
    }

    this.running = false;
  }
}

/** 全局共享的 BOSS API 限流实例 */
export const bossThrottle = new RequestThrottle({
  minDelay: DEFAULT_MIN,
  maxDelay: DEFAULT_MAX,
});
