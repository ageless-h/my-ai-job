// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { Tools } from "@/shared/utils/tools";
import { Logger } from '@/shared/utils/logger';
import { migratePreferenceKeys } from "@/shared/utils/preference";

const logger = Logger.rootLogger;

// 防抖函数
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
export interface UserPreference {
  [key: string]: unknown;
}

export interface AiUser {
  phone?: string;
  email?: string;
  preference: UserPreference;
  preferenceMap: Record<string, unknown>;
  [key: string]: unknown;
}

export function getLocalUser(): AiUser {
  const fallbackJson = '{"phone":"","email":"","preference":{},"preferenceMap":{}}';
  const raw = Tools.getStoredUserProfileRaw() || fallbackJson;

  try {
    const user = JSON.parse(raw) as AiUser;
    logger.debug('获取本地用户配置', {
      hasPhone: !!user?.phone,
      hasEmail: !!user?.email,
      preferenceKeys: Object.keys(user?.preference || {}).length,
    });
    if (user?.preference && typeof user.preference === "object") {
      migratePreferenceKeys(user.preference as Record<string, unknown>);
    }
    return user;
  } catch (_e) {
    return JSON.parse(fallbackJson) as AiUser;
  }
}

export const useUserStore = defineStore("ai-user", () => {
  const platformType = ref<number | undefined>();
  const user = reactive<AiUser>(getLocalUser());
  const preferenceLoadStatus = ref<"idle" | "loading" | "success" | "failed">("idle");
  const preferenceLoadError = ref<string>("");

  // 防抖保存，避免频繁写入
  const debouncedSave = debounce(() => {
    try {
      Tools.saveStoredUserProfile(user);
      logger.debug('用户配置已自动保存', {
        hasPhone: !!user?.phone,
        hasEmail: !!user?.email,
        preferenceKeys: Object.keys(user?.preference || {}).length,
      });
    } catch (error) {
      logger.error('用户配置保存失败', error);
    }
  }, 1000);

  // 监听 user 变化，自动持久化
  watch(
    () => user,
    () => {
      debouncedSave();
    },
    { deep: true }
  );

  // 跨标签页同步机制
  if (typeof GM_addValueChangeListener !== 'undefined') {
    try {
      GM_addValueChangeListener('ai-job-user', (_name: string, _oldValue: any, newValue: any, remote: boolean) => {
        if (remote && newValue) {
          try {
            const updated = JSON.parse(newValue) as AiUser;
            // 更新本地状态，但不触发保存（避免循环）
            Object.assign(user, updated);
            logger.debug('从其他标签页同步配置', {
              hasPhone: !!updated?.phone,
              hasEmail: !!updated?.email,
              preferenceKeys: Object.keys(updated?.preference || {}).length,
            });
          } catch (error) {
            logger.error('跨标签页配置同步失败', error);
          }
        }
      });
      logger.debug('跨标签页配置同步已启用');
    } catch (error) {
      logger.warn('跨标签页配置同步启用失败', error);
    }
  }

  return {
    user,
    platformType,
    preferenceLoadStatus,
    preferenceLoadError
  };
});

// Backward-compatible alias for legacy naming.
export const UserStore = useUserStore;
