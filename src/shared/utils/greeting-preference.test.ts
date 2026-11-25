import { describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalDB } from '@/core/storage/local-db';
import { migratePreferenceKeys, parseAccountPreferenceBackup } from './preference';
import { buildDeliveryFilterExportData, importDeliveryFilterConfig } from './config-manager';

describe('greeting preference persistence', () => {
  it('normalizes a pasted account backup before the form and sender read it', () => {
    expect(parseAccountPreferenceBackup(JSON.stringify({ id: 'old-account', cg: '', cgE: 'off', customGreeting: 'stale', customGreetingEnabled: true, acE: true }))).toEqual({
      customGreeting: '', customGreetingEnabled: false, acE: true,
    });
    expect(parseAccountPreferenceBackup('{"cg":"hello","cgE":true}')).toEqual({
      customGreeting: 'hello', customGreetingEnabled: true,
    });
    expect(() => parseAccountPreferenceBackup('[]')).toThrow();
  });

  it('preserves the last form edit through migration, save, reload and v1 backup', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    await LocalDB.init();
    try {
      const pref = { id: 'default', customGreeting: 'A', cg: 'B', cgE: true, other: 17 };
      migratePreferenceKeys(pref);
      expect(pref.customGreeting).toBe('B');
      await LocalDB.savePreferences('42', pref);
      LocalDB.close();
      await LocalDB.init();
      const loaded = { ...await LocalDB.getPreferences('42') };
      migratePreferenceKeys(loaded);
      const backup = buildDeliveryFilterExportData(loaded);
      expect(backup.communication).toMatchObject({ cg: 'B', cgE: true });
      backup.communication = { cg: '', cgE: false };
      const imported = importDeliveryFilterConfig(backup, loaded).preference;
      expect(imported).toMatchObject({ customGreeting: '', customGreetingEnabled: false, other: 17 });
      expect(imported).not.toHaveProperty('cg');
    } finally {
      await LocalDB.clearAll();
      LocalDB.close();
      vi.unstubAllGlobals();
    }
  });
});
