import { describe, it, expect } from 'vitest';
import { normalizePreferenceBoolean, migratePreferenceKeys, getPreferenceValue } from '@/shared/utils/preference';

describe('preference utility', () => {
  it('normalizePreferenceBoolean应该正确转换布尔值', () => {
    expect(normalizePreferenceBoolean(true, false)).toBe(true);
    expect(normalizePreferenceBoolean(false, true)).toBe(false);
    expect(normalizePreferenceBoolean(1, false)).toBe(true);
    expect(normalizePreferenceBoolean(0, true)).toBe(false);
    expect(normalizePreferenceBoolean('true', false)).toBe(true);
    expect(normalizePreferenceBoolean('false', true)).toBe(false);
    expect(normalizePreferenceBoolean('yes', false)).toBe(true);
    expect(normalizePreferenceBoolean('no', true)).toBe(false);
    expect(normalizePreferenceBoolean(undefined, true)).toBe(true);
  });

  it('migratePreferenceKeys应该迁移旧键到新键', () => {
    const preference: Record<string, unknown> = {
      pi: 5,
      cg: 'Hello',
      cgE: true
    };
    
    migratePreferenceKeys(preference);
    
    expect(preference.pushIntervalSec).toBe(5);
    expect(preference.customGreeting).toBe('Hello');
    expect(preference.customGreetingEnabled).toBe(true);
    expect(preference.pi).toBeUndefined();
    expect(preference.cg).toBeUndefined();
    expect(preference.cgE).toBeUndefined();
  });

  it('getPreferenceValue应该返回规范键或遗留键的值', () => {
    const preference = {
      newKey: 'new value',
      oldKey: 'old value'
    };
    
    expect(getPreferenceValue(preference, 'newKey')).toBe('new value');
    expect(getPreferenceValue(preference, 'missingKey', 'oldKey')).toBe('old value');
    expect(getPreferenceValue(preference, 'missingKey')).toBeUndefined();
  });

  it('migratePreferenceKeys应该保留新键并删除旧键', () => {
    const preference: Record<string, unknown> = {
      pushIntervalSec: 10,
      pi: 5
    };
    
    migratePreferenceKeys(preference);
    
    expect(preference.pushIntervalSec).toBe(10);
    expect(preference.pi).toBeUndefined();
  });
});
