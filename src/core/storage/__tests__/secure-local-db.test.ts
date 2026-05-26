import 'fake-indexeddb/auto';

import assert from 'node:assert/strict';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Encryption } from '../encryption';
import { LocalDB } from '../local-db';
import { SecureLocalDB } from '../secure-local-db';
import type { AiConfig, UserProfile } from '../types';

const now = 1_700_000_000_000;

installLocalStorage();

describe('SecureLocalDB', () => {
  beforeEach(async () => {
    localStorage.clear();
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  afterEach(async () => {
    await LocalDB.clearAll();
    Encryption.clearKey();
  });

  describe('user profile', () => {
    it('encrypts tokens at rest and decrypts them when retrieved', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'sensitive-boss-token',
        email: 'test@example.com',
        authenticatedAt: now
      };

      await SecureLocalDB.setUserProfile(profile);

      const stored = await LocalDB.getUserProfile();
      expect(stored?.token).not.toBe(profile.token);
      assert.ok(stored);
      assert.ok(stored.token.length > 20);

      expect(await SecureLocalDB.getUserProfile()).toEqual(profile);
    });
  });

  describe('AI configs', () => {
    it('encrypts API keys at rest and decrypts them when listed', async () => {
      const config = createAiConfig('config-1', true, 'sk-secret-key-123');

      await SecureLocalDB.saveAiConfig(config);

      const stored = await LocalDB.getAiConfigs();
      expect(stored[0].apiKey).not.toBe(config.apiKey);

      expect(await SecureLocalDB.getAiConfigs()).toEqual([config]);
    });

    it('returns and changes the active AI config without corrupting encrypted keys', async () => {
      const config1 = createAiConfig('config-1', false, 'key1');
      const config2 = createAiConfig('config-2', true, 'key2');

      await SecureLocalDB.saveAiConfig(config1);
      await SecureLocalDB.saveAiConfig(config2);

      const initiallyActive = await SecureLocalDB.getActiveAiConfig();
      assert.ok(initiallyActive);
      expect({ id: initiallyActive.id, apiKey: initiallyActive.apiKey }).toEqual({ id: 'config-2', apiKey: 'key2' });

      await SecureLocalDB.setActiveAiConfig('config-1');

      const updatedActive = await SecureLocalDB.getActiveAiConfig();
      assert.ok(updatedActive);
      expect({ id: updatedActive.id, apiKey: updatedActive.apiKey }).toEqual({ id: 'config-1', apiKey: 'key1' });
    });

    it('deletes an AI config', async () => {
      const config = createAiConfig('config-1', true, 'key1');

      await SecureLocalDB.saveAiConfig(config);
      await SecureLocalDB.deleteAiConfig('config-1');

      expect(await SecureLocalDB.getAiConfigs()).toEqual([]);
    });
  });

  describe('data export/import', () => {
    it('exports encrypted JSON and imports it without losing decryptability', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'token-xyz',
        authenticatedAt: now
      };

      await SecureLocalDB.setUserProfile(profile);

      const exported = await SecureLocalDB.exportEncryptedData();
      const parsed = JSON.parse(exported) as { userProfile?: UserProfile };
      expect(parsed.userProfile?.token).not.toBe(profile.token);

      await LocalDB.clearAll();
      await SecureLocalDB.importEncryptedData(exported);

      expect(await SecureLocalDB.getUserProfile()).toEqual(profile);
    });

    it('rejects malformed encrypted JSON imports', async () => {
      try {
        await SecureLocalDB.importEncryptedData('{bad json');
        throw new Error('Expected import to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to import encrypted data');
      }
    });
  });

  describe('logout', () => {
    it('clears profile and encryption key', async () => {
      await SecureLocalDB.setUserProfile({ id: 'user-123', token: 'token-xyz', authenticatedAt: now });
      expect(localStorage.getItem(Encryption.storageKey)).toBeTruthy();

      await SecureLocalDB.logout();

      expect(await LocalDB.getUserProfile()).toBeUndefined();
      expect(localStorage.getItem(Encryption.storageKey)).toBeNull();
    });
  });
});

function installLocalStorage(): void {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value)
    }
  });
}

function createAiConfig(id: string, isActive: boolean, apiKey: string): AiConfig {
  return {
    id,
    name: `Config ${id}`,
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey,
    modelName: 'gpt-4o',
    apiFormat: 'completions',
    timeout: 60,
    isActive,
    createdAt: now
  };
}
