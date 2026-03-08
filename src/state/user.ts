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
  } catch (error) {
    // 记录错误详情
    logger.error('用户配置解析失败', error, {
      rawLength: raw.length,
      rawPreview: raw.substring(0, 100)
    });

    // 备份损坏的配置以便调试
    if (typeof GM_setValue !== 'undefined' && raw !== fallbackJson) {
      try {
        GM_setValue('ai-job-user-corrupted-backup', raw);
        logger.info('已备份损坏的用户配置到 ai-job-user-corrupted-backup');
      } catch (backupError) {
        logger.warn('备份损坏配置失败', backupError);
      }
    }

    // 尝试从备份恢复
    if (typeof GM_getValue !== 'undefined') {
      try {
        const backup = GM_getValue('ai-job-user_backup', '');
        if (backup && backup !== raw) {
          const userFromBackup = JSON.parse(backup) as AiUser;
          if (userFromBackup?.preference && typeof userFromBackup.preference === 'object') {
            logger.info('已从备份恢复用户配置');
            // 通知用户配置已从备份恢复
            if (typeof GM_notification !== 'undefined') {
              GM_notification({
                title: 'AI Job Hunting',
                text: '用户配置损坏，已从备份恢复。',
                timeout: 8000
              });
            }
            migratePreferenceKeys(userFromBackup.preference as Record<string, unknown>);
            return userFromBackup;
          }
        }
      } catch (backupError) {
        logger.warn('从备份恢复配置失败', backupError);
      }
    }

    // 通知用户配置损坏
    if (typeof GM_notification !== 'undefined') {
      GM_notification({
        title: 'AI Job Hunting',
        text: '用户配置损坏且无法恢复，已重置为默认配置。请重新设置。',
        timeout: 10000
      });
    }

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
      // 先备份当前配置
      if (typeof GM_getValue !== 'undefined' && typeof GM_setValue !== 'undefined') {
        try {
          const current = GM_getValue('ai-job-user', '');
          if (current) {
            GM_setValue('ai-job-user_backup', current);
          }
        } catch (backupError) {
          logger.warn('备份当前配置失败', backupError);
        }
      }

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
