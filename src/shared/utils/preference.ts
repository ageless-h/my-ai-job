// -*- coding: utf-8 -*-
export const normalizePreferenceBoolean = (value: unknown, defaultValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
};

type PreferenceMigrationEntry = {
  nextKey: string;
  legacyKeys: string[];
};

const PREFERENCE_KEY_MIGRATIONS: PreferenceMigrationEntry[] = [
  { nextKey: 'pushIntervalSec', legacyKeys: ['pi'] },
  { nextKey: 'customGreeting', legacyKeys: ['cg'] },
  { nextKey: 'customGreetingEnabled', legacyKeys: ['cgE'] },
  { nextKey: 'customImageSet', legacyKeys: ['cI'] },
  { nextKey: 'customImageEnabled', legacyKeys: ['cIE'] },
  { nextKey: 'dialogReplyDelaySec', legacyKeys: ['dr'] },
  { nextKey: 'dialogReplyDelayEnabled', legacyKeys: ['drE'] },
  { nextKey: 'aiDeliveryJudgeEnabled', legacyKeys: ['aiDeliverJudgeE', 'aiDeliverJudgeEnabled'] },
  { nextKey: 'aiDeliveryJudgePrompt', legacyKeys: ['aiDeliverJudgePrompt'] },
  { nextKey: 'aiDeliveryJudgeExtraPrompt', legacyKeys: ['aiDeliverJudgeExtraPrompt'] },
  { nextKey: 'aiDeliveryJudgeFocusSkills', legacyKeys: ['aiDeliverJudgeFocusSkills'] },
  { nextKey: 'aiDeliveryJudgeExcludeKeywords', legacyKeys: ['aiDeliverJudgeExcludeKeywords'] },
  {
    nextKey: 'aiDeliveryJudgeIncludeUserProfile',
    legacyKeys: ['aiDeliverJudgeIncludeUserProfile'],
  },
  {
    nextKey: 'aiDeliveryJudgeIncludeTraditionalSnapshot',
    legacyKeys: ['aiDeliverJudgeIncludeTraditionalSnapshot'],
  },
  { nextKey: 'aiDeliveryJudgeOnAiError', legacyKeys: ['aiDeliverJudgeOnAiError'] },
  { nextKey: 'aiDeliveryJudgeOnInvalidResult', legacyKeys: ['aiDeliverJudgeOnInvalidResult'] },
];

export const migratePreferenceKeys = (preference: Record<string, unknown>): void => {
  for (const entry of PREFERENCE_KEY_MIGRATIONS) {
    const nextValue = preference[entry.nextKey];
    if (nextValue === undefined) {
      const firstLegacyValue = entry.legacyKeys
        .map((legacyKey) => preference[legacyKey])
        .find((legacyValue) => legacyValue !== undefined);
      if (firstLegacyValue !== undefined) {
        preference[entry.nextKey] = firstLegacyValue;
        // 迁移后删除旧key，避免数据膨胀
        for (const legacyKey of entry.legacyKeys) {
          delete preference[legacyKey];
        }
      }
    } else {
      // 如果新key已存在，删除所有旧key
      for (const legacyKey of entry.legacyKeys) {
        delete preference[legacyKey];
      }
    }
  }
};

export const getPreferenceValue = (
  preference: Record<string, unknown>,
  canonicalKey: string,
  legacyKey?: string
): unknown => {
  const canonicalValue = preference[canonicalKey];
  if (canonicalValue !== undefined) {
    return canonicalValue;
  }

  if (!legacyKey) {
    return undefined;
  }

  return preference[legacyKey];
};
