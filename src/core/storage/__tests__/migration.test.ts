import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalDB } from '../local-db';
import { SecureLocalDB } from '../secure-local-db';
import { exportDataToFile, importDataFromFile, migrateFromLegacy } from '../migration';

const now = 1_700_000_000_000;

installLocalStorage();

describe('storage migration tools', () => {
  beforeEach(async () => {
    localStorage.clear();
    await LocalDB.init();
    await LocalDB.clearAll();
    legacyDeleteMock.mockReset();
    installLegacyStorage({});
    installDomStubs();
  });

  afterEach(async () => {
    await LocalDB.clearAll();
    vi.restoreAllMocks();
  });

  it('migrates legacy Tampermonkey data into IndexedDB', async () => {
    installLegacyStorage({
      user: JSON.stringify({ id: 'user-123', token: 'legacy-token', authenticatedAt: now }),
      preference: JSON.stringify({ pushIntervalSec: 60, chatMaxPerMinute: 3 }),
      aiConfigs: JSON.stringify([
        {
          id: 'config-1',
          provider: 0,
          modelName: 'gpt-4o',
          apiKey: 'legacy-key-1',
          baseUrl: 'https://api.openai.com/v1',
          timeout: 60,
          completionsPath: '/chat/completions',
          apiFormat: 'completions',
          status: 1,
          testPassed: 1,
          createdAt: now
        }
      ])
    });

    expect(await migrateFromLegacy()).toBe(true);
    expect(await SecureLocalDB.getUserProfile()).toEqual({
      id: 'user-123',
      token: 'legacy-token',
      authenticatedAt: now
    });
    expect(await LocalDB.getPreferences()).toEqual({ id: 'default', pushIntervalSec: 60, chatMaxPerMinute: 3 });
    expect(await SecureLocalDB.getAiConfigs()).toEqual([
      {
        id: 'config-1',
        name: 'Config config-1',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'legacy-key-1',
        modelName: 'gpt-4o',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: now
      }
    ]);
    expect(legacyDeleteMock).toHaveBeenCalledWith('user');
    expect(legacyDeleteMock).toHaveBeenCalledWith('preference');
    expect(legacyDeleteMock).toHaveBeenCalledWith('aiConfigs');
  });

  it('exports encrypted data into a downloadable JSON blob', async () => {
    await SecureLocalDB.setUserProfile({ id: 'user-123', token: 'token-xyz', authenticatedAt: now });

    await exportDataToFile();

    expect(downloadLink.click).toHaveBeenCalledTimes(1);
    expect(objectUrlMock).toHaveBeenCalledTimes(1);

    const [blobTuple] = objectUrlMock.mock.calls as unknown as [Blob][];
    const blob = blobTuple[0];
    expect(await blob.text()).toContain('user-123');
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1);
  });

  it('imports encrypted data from a File-like object', async () => {
    await SecureLocalDB.setUserProfile({ id: 'user-123', token: 'token-xyz', authenticatedAt: now });
    const exported = await SecureLocalDB.exportEncryptedData();
    const file = { text: async () => exported } as File;

    await LocalDB.clearAll();
    await expect(importDataFromFile(file)).resolves.toBe(true);
    expect(await SecureLocalDB.getUserProfile()).toEqual({
      id: 'user-123',
      token: 'token-xyz',
      authenticatedAt: now
    });
  });
});

const legacyDeleteMock = vi.fn();
const objectUrlMock = vi.fn(() => 'blob:download-url');
const revokeObjectUrlMock = vi.fn();
const downloadLink = {
  click: vi.fn(),
  download: '',
  href: ''
};

function installLegacyStorage(values: Record<string, string>): void {
  const store = new Map<string, string>(Object.entries(values));
  const getValue = vi.fn((key: string, fallback: string) => store.get(key) ?? fallback);
  legacyDeleteMock.mockImplementation((key: string) => store.delete(key));

  Object.defineProperty(globalThis, 'GM_getValue', {
    configurable: true,
    value: getValue
  });
  Object.defineProperty(globalThis, 'GM_deleteValue', {
    configurable: true,
    value: legacyDeleteMock
  });
  Object.defineProperty(globalThis, 'GM_setValue', {
    configurable: true,
    value: vi.fn((key: string, value: string) => store.set(key, value))
  });
}

function installDomStubs(): void {
  Object.defineProperty(globalThis, 'URL', {
    configurable: true,
    value: {
      createObjectURL: objectUrlMock,
      revokeObjectURL: revokeObjectUrlMock
    }
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      createElement: vi.fn(() => downloadLink)
    }
  });
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
