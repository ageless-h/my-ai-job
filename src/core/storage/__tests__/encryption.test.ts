import assert from 'node:assert/strict';

import { beforeEach, describe, expect, it } from 'vitest';

import { Encryption } from '../encryption';

installLocalStorage();

describe('Encryption', () => {
  beforeEach(() => {
    localStorage.clear();
    Encryption.clearKey();
  });

  it('encrypts and decrypts a string without storing plaintext', async () => {
    const plaintext = 'sk-test-api-key-12345';

    const encrypted = await Encryption.encrypt(plaintext);
    const decrypted = await Encryption.decrypt(encrypted);

    expect(encrypted).not.toBe(plaintext);
    assert.ok(encrypted.length > 20);
    expect(decrypted).toBe(plaintext);
  });

  it('returns an empty string for empty input', async () => {
    expect(await Encryption.encrypt('')).toBe('');
    expect(await Encryption.decrypt('')).toBe('');
  });

  it('uses a fresh IV so identical plaintext creates different ciphertext', async () => {
    const plaintext = 'test-data';

    const firstCiphertext = await Encryption.encrypt(plaintext);
    const secondCiphertext = await Encryption.encrypt(plaintext);

    expect(firstCiphertext).not.toBe(secondCiphertext);
  });

  it('persists the generated key for later decrypt calls', async () => {
    const encrypted = await Encryption.encrypt('sensitive-data');

    expect(localStorage.getItem(Encryption.storageKey)).toBeTruthy();
    expect(await Encryption.decrypt(encrypted)).toBe('sensitive-data');
  });

  it('throws a sanitized error for invalid ciphertext', async () => {
    try {
      await Encryption.decrypt('invalid-data');
      throw new Error('Expected decrypt to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed to decrypt data');
    }
  });

  it('reports browser crypto availability', () => {
    expect(Encryption.isAvailable()).toBe(true);
  });

  it('handles long unicode text', async () => {
    const plaintext = `你好-${'x'.repeat(10_000)}-🚀`;

    const encrypted = await Encryption.encrypt(plaintext);

    expect(await Encryption.decrypt(encrypted)).toBe(plaintext);
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
