// -*- coding: utf-8 -*-
// RequestThrottle: 请求限流队列，防止高频 API 调用触发风控
// 所有 BOSS 直聘 API 调用应通过此服务排队执行

import { Tools } from '@/utils/tools';

export interface ThrottleOptions {
  /** 最小间隔（毫秒），默认 2000 */
  minDelay?: number;
  /** 最大间隔（毫秒），默认 5000 */
  maxDelay?: number;
  /** 同一批次内首次请求是否也延迟，默认 false */
  delayFirst?: boolean;
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
  private delayFirst: boolean;
  private _aborted = false;

  constructor(opts?: ThrottleOptions) {
    this.minDelay = opts?.minDelay ?? DEFAULT_MIN;
    this.maxDelay = opts?.maxDelay ?? DEFAULT_MAX;
    this.delayFirst = opts?.delayFirst ?? false;
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
    let isFirst = true;

    while (this.queue.length > 0 && !this._aborted) {
      const item = this.queue.shift()!;

      // 非首次请求（或 delayFirst=true 时首次也延迟）前等待随机间隔
      if (!isFirst || this.delayFirst) {
        const delay = this.minDelay + Tools.getRandomNumber(0, this.maxDelay - this.minDelay);
        await Tools.sleep(delay);
      }
      isFirst = false;

      if (this._aborted) {
        item.reject(new Error('Throttle aborted'));
        break;
      }

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (e) {
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
