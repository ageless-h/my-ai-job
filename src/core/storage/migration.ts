import { Logger } from '@/shared/utils/logger';

import { LocalDB } from './local-db';
import { SecureLocalDB } from './secure-local-db';
import type { AiConfig, UserPreferences, UserProfile } from './types';

const logger = Logger.rootLogger;

type LegacyStorageRuntime = typeof globalThis & {
  GM_getValue?: <T = unknown>(key: string, defaultValue?: T) => T;
  GM_deleteValue?: (key: string) => void;
};

type LegacyAiConfigRecord = Record<string, unknown> & {
  id?: unknown;
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
  baseUrl?: unknown;
  timeout?: unknown;
  completionsPath?: unknown;
  apiFormat?: unknown;
  status?: unknown;
  testPassed?: unknown;
  isActive?: unknown;
  createdAt?: unknown;
};

const USER_KEYS = ['user', 'ai-job-user-profile', 'ai-job-user'] as const;
const PREFERENCE_KEYS = ['preference', 'preferences', 'ai-job-user-preference'] as const;
const AI_CONFIG_KEYS = ['aiConfigs', 'apiConfigs', 'ai-job-ai-config-ext'] as const;

export async function migrateFromLegacy(): Promise<boolean> {
  try {
    await LocalDB.init();

    const legacy = collectLegacyData();
    if (!legacy.hasData) {
      logger.info('No legacy Tampermonkey storage found');
      return false;
    }

    let migrated = false;

    if (legacy.userProfile) {
      await SecureLocalDB.setUserProfile(legacy.userProfile);
      migrated = true;
    }

    if (legacy.preferences) {
      await LocalDB.savePreferences(legacy.preferences);
      migrated = true;
    }

    for (const config of legacy.aiConfigs) {
      await SecureLocalDB.saveAiConfig(config);
      migrated = true;
    }

    clearLegacyKeys(legacy.deletedKeys);
    logger.info('Legacy storage migration finished', {
      migrated,
      userProfile: Boolean(legacy.userProfile),
      preferences: Boolean(legacy.preferences),
      aiConfigs: legacy.aiConfigs.length
    });
    return migrated;
  } catch (error) {
    logger.error('Legacy storage migration failed', error);
    return false;
  }
}

export async function exportDataToFile(): Promise<void> {
  try {
    const json = await SecureLocalDB.exportEncryptedData();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const filename = `ai-job-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';

    document.body?.appendChild(link);
    link.click();
    document.body?.removeChild(link);
    URL.revokeObjectURL(url);

    logger.info('Exported encrypted storage backup', { filename, size: blob.size });
  } catch (error) {
    logger.error('Failed to export encrypted storage backup', error);
    throw error;
  }
}

export async function importDataFromFile(file: File): Promise<boolean> {
  try {
    const json = await file.text();
    await SecureLocalDB.importEncryptedData(json);
    logger.info('Imported encrypted storage backup', { name: file.name, size: file.size });
    return true;
  } catch (error) {
    logger.error('Failed to import encrypted storage backup', error);
    return false;
  }
}

function collectLegacyData(): {
  hasData: boolean;
  userProfile?: UserProfile;
  preferences?: UserPreferences;
  aiConfigs: AiConfig[];
  deletedKeys: string[];
} {
  const runtime = globalThis as LegacyStorageRuntime;
  const deletedKeys = new Set<string>();

  const legacyUserRaw = readLegacyJson(runtime, USER_KEYS);
  if (legacyUserRaw) {
    USER_KEYS.forEach((key) => deletedKeys.add(key));
  }

  const preferenceSource =
    readLegacyJson(runtime, PREFERENCE_KEYS) ??
    (isPlainObject(legacyUserRaw) ? legacyUserRaw.preference : undefined);
  if (preferenceSource) {
    PREFERENCE_KEYS.forEach((key) => deletedKeys.add(key));
  }

  const configRaw = readLegacyJson(runtime, AI_CONFIG_KEYS);
  if (configRaw) {
    AI_CONFIG_KEYS.forEach((key) => deletedKeys.add(key));
  }

  const userProfile = normalizeLegacyUserProfile(legacyUserRaw);
  const preferences = normalizeLegacyPreferences(preferenceSource);
  const aiConfigs = normalizeLegacyAiConfigs(runtime, configRaw);

  return {
    hasData: Boolean(userProfile || preferences || aiConfigs.length),
    userProfile,
    preferences,
    aiConfigs,
    deletedKeys: [...deletedKeys]
  };
}

function clearLegacyKeys(keys: string[]): void {
  const runtime = globalThis as LegacyStorageRuntime;
  for (const key of keys) {
    runtime.GM_deleteValue?.(key);
  }
}

function normalizeLegacyUserProfile(value: unknown): UserProfile | undefined {
  const record = isPlainObject(value) ? value : undefined;
  if (!record) {
    return undefined;
  }

  const id = stringValue(record.id) ?? stringValue(record.userId) ?? stringValue(record.uid);
  const token =
    stringValue(record.token) ?? stringValue(record.accessToken) ?? stringValue(record.bossToken);
  if (!id || !token) {
    return undefined;
  }

  const profile: UserProfile = {
    id,
    token,
    authenticatedAt: numberValue(record.authenticatedAt) ?? Date.now()
  };

  const email = stringValue(record.email);
  if (email) {
    profile.email = email;
  }

  return profile;
}

function normalizeLegacyPreferences(value: unknown): UserPreferences | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  return {
    id: stringValue(value.id) ?? 'default',
    ...value
  } as UserPreferences;
}

function normalizeLegacyAiConfigs(runtime: LegacyStorageRuntime, value: unknown): AiConfig[] {
  const configSource = extractConfigArray(value);
  const activeId =
    stringValue(isPlainObject(value) ? value.activeApiConfigId : undefined) ??
    stringValue(isPlainObject(value) ? value.activeConfigId : undefined) ??
    stringValue(isPlainObject(value) ? value.currentConfigId : undefined);

  return configSource
    .map((item, index) => {
      const id = stringValue(item.id) ?? `legacy-config-${index + 1}`;
      const apiKey =
        stringValue(item.apiKey) ??
        stringValue(runtime.GM_getValue?.(`ai-job-ai-config-key:${id}`, '')) ??
        '';
      if (!apiKey) {
        return undefined;
      }

      const createdAt = numberValue(item.createdAt) ?? Date.now();
      const isActive = activeId ? activeId === id : Boolean(item.isActive ?? item.status === 1);

      return {
        id,
        name: stringValue(item.name) ?? `Config ${id}`,
        provider: normalizeProvider(item.provider),
        baseUrl: stringValue(item.baseUrl) ?? '',
        apiKey,
        modelName: stringValue(item.modelName) ?? '',
        apiFormat: normalizeApiFormat(item.apiFormat),
        timeout: numberValue(item.timeout) ?? 60,
        isActive,
        createdAt
      } satisfies AiConfig;
    })
    .filter((item): item is AiConfig => Boolean(item));
}

function extractConfigArray(value: unknown): LegacyAiConfigRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isPlainObject) as LegacyAiConfigRecord[];
  }

  if (isPlainObject(value)) {
    if (Array.isArray(value.apiConfigs)) {
      return value.apiConfigs.filter(isPlainObject) as LegacyAiConfigRecord[];
    }
    if (Array.isArray(value.configs)) {
      return value.configs.filter(isPlainObject) as LegacyAiConfigRecord[];
    }
  }

  return [];
}

function normalizeApiFormat(value: unknown): AiConfig['apiFormat'] {
  if (
    value === 'responses' ||
    value === 'anthropic-messages' ||
    value === 'google-generative-ai'
  ) {
    return value;
  }
  return 'completions';
}

function normalizeProvider(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number') {
    return value === 0 ? 'openai' : `provider-${value}`;
  }

  return 'openai';
}

function readLegacyJson(runtime: LegacyStorageRuntime, keys: readonly string[]): unknown {
  for (const key of keys) {
    const raw = runtime.GM_getValue?.(key, '');
    if (!hasMeaningfulValue(raw)) {
      continue;
    }

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    }

    return raw;
  }

  return undefined;
}

function hasMeaningfulValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
