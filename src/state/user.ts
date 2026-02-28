// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { Logger } from '@/shared/utils/logger';

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
  let jsonData = localStorage.getItem("ai-job-user");
  if (jsonData === null) {
    jsonData = '{"phone":"","email":"","preference":{},"preferenceMap":{}}';
  }

  const user = JSON.parse(jsonData) as AiUser;
  logger.debug('获取本地用户配置', user);
  return user;
}

export const UserStore = defineStore("ai-user", () => {
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
