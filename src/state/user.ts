// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { Tools } from "@/shared/utils/tools";
import { Logger } from '@/shared/utils/logger';
import { migratePreferenceKeys } from "@/shared/utils/preference";

const logger = Logger.rootLogger;
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

  return {
    user,
    platformType,
    preferenceLoadStatus,
    preferenceLoadError
  };
});

// Backward-compatible alias for legacy naming.
export const UserStore = useUserStore;
