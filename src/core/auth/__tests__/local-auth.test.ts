import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalDB } from '@/core/storage/local-db';
import { SecureLocalDB } from '@/core/storage/secure-local-db';
import { Encryption } from '@/core/storage/encryption';
import { LocalAuthService } from '../local-auth.js';

installLocalStorage();

describe('LocalAuthService', () => {
  beforeEach(async () => {
    localStorage.clear();
    setPageContext({ token: 'boss-token-123', uid: 42 });
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  afterEach(async () => {
    await LocalDB.clearAll();
    Encryption.clearKey();
    delete (globalThis as { unsafeWindow?: unknown }).unsafeWindow;
  });

  it('extracts BOSS token and user id from page context', () => {
    expect(LocalAuthService.extractBossToken()).toBe('boss-token-123');
    expect(LocalAuthService.extractBossUserId()).toBe('42');
  });

  it('authenticates by storing the BOSS profile in SecureLocalDB', async () => {
    const startedAt = Date.now();
    const result = await LocalAuthService.authenticate();

    expect(result).toEqual({ success: true, userId: '42', token: 'boss-token-123' });
    const profile = await SecureLocalDB.getUserProfile();
    expect(profile).toBeDefined();
    if (!profile) {
      throw new Error('Expected stored profile');
    }

    expect(profile.id).toBe('42');
    expect(profile.token).toBe('boss-token-123');
    expect(profile.authenticatedAt >= startedAt).toBe(true);
    expect(profile.authenticatedAt <= Date.now()).toBe(true);
  });

  it('rejects authentication when page token is missing', async () => {
    setPageContext({ uid: '42' });

    const result = await LocalAuthService.authenticate();

    expect(result.success).toBe(false);
    expect(result.error).toContain('未检测到 BOSS 登录状态');
    expect(await SecureLocalDB.getUserProfile()).toBeUndefined();
  });

  it('expires local authentication after seven days and clears the profile', async () => {
    await SecureLocalDB.setUserProfile({
      id: '42',
      token: 'boss-token-123',
      authenticatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000
    });

    expect(await LocalAuthService.isAuthenticated()).toBe(false);
    expect(await SecureLocalDB.getUserProfile()).toBeUndefined();
  });

  it('returns current user for valid non-expired authentication and logs out locally', async () => {
    await LocalAuthService.authenticate();

    expect(await LocalAuthService.isAuthenticated()).toBe(true);
    expect(await LocalAuthService.getCurrentUser()).toEqual({ userId: '42', token: 'boss-token-123' });

    await LocalAuthService.logout();

    expect(await LocalAuthService.isAuthenticated()).toBe(false);
    expect(await LocalAuthService.getCurrentUser()).toBeNull();
  });
});

function setPageContext(page: Record<string, unknown>): void {
  (globalThis as { unsafeWindow?: unknown }).unsafeWindow = { _PAGE: page };
}

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
