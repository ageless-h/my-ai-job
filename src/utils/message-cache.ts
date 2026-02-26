// -*- coding: utf-8 -*-

declare const GM_getValue:
  | (<T = unknown>(key: string, defaultValue?: T) => T)
  | undefined;
declare const GM_setValue:
  | (<T = unknown>(key: string, value: T) => void)
  | undefined;

const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : undefined;

export interface MessageCacheEntry {
  expiration: number;
}

export type MessageCacheStore = Record<string, MessageCacheEntry>;

export class MessageCache {
  static DEFAULT_EXPIRATION = 60 * 1000;
  static CACHE_KEY = "messageCache";

  getCache(): MessageCacheStore {
    const rawCache = _GM_getValue?.(MessageCache.CACHE_KEY, "{}") ?? "{}";
    return JSON.parse(rawCache as string) as MessageCacheStore;
  }

  saveCache(cache: MessageCacheStore): void {
    _GM_setValue?.(MessageCache.CACHE_KEY, JSON.stringify(cache));
  }

  cleanExpiredCache(cache: MessageCacheStore): MessageCacheStore {
    const now = Date.now();
    const validCache: MessageCacheStore = {};
    Object.entries(cache).forEach(([key, entry]) => {
      if (entry.expiration > now) {
        validCache[key] = entry;
      }
    });
    return validCache;
  }

  isMessageProcessed(bossId: string, text: string): boolean {
    const key = this.generateKey(bossId, text);
    const cache = this.getCache();
    const validCache = this.cleanExpiredCache(cache);
    this.saveCache(validCache);
    return key in validCache;
  }

  markMessageAsProcessed(bossId: string, text: string, expiration?: number): void {
    const key = this.generateKey(bossId, text);
    const cache = this.getCache();
    cache[key] = {
      expiration: Date.now() + (expiration || MessageCache.DEFAULT_EXPIRATION)
    };
    this.saveCache(cache);
  }

  generateKey(bossId: string, text: string): string {
    const trimmedText = text.slice(0, 10);
    return `${bossId}:${trimmedText}`;
  }
}
