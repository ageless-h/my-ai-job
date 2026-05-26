const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12;
const STORAGE_KEY = '__encryption_key__';

export class Encryption {
  static readonly storageKey = STORAGE_KEY;

  private static keyPromise: Promise<CryptoKey> | null = null;

  static async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return '';
    }

    try {
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
      const encoded = new TextEncoder().encode(plaintext);
      const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return bufferToBase64(combined);
    } catch (error) {
      throw new Error(`Failed to encrypt data: ${errorMessage(error)}`);
    }
  }

  static async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) {
      return '';
    }

    try {
      const key = await this.getKey();
      const combined = base64ToBytes(ciphertext);

      if (combined.length <= IV_LENGTH_BYTES) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = combined.slice(0, IV_LENGTH_BYTES);
      const encryptedData = combined.slice(IV_LENGTH_BYTES);
      const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encryptedData);

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${errorMessage(error)}`);
    }
  }

  static clearKey(): void {
    this.keyPromise = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  static isAvailable(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.getRandomValues === 'function' &&
      typeof TextEncoder !== 'undefined' &&
      typeof TextDecoder !== 'undefined' &&
      typeof localStorage !== 'undefined'
    );
  }

  private static async getKey(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = this.loadOrCreateKey().catch((error: unknown) => {
        this.keyPromise = null;
        throw error;
      });
    }

    return this.keyPromise;
  }

  private static async loadOrCreateKey(): Promise<CryptoKey> {
    if (!this.isAvailable()) {
      throw new Error('Web Crypto encryption is unavailable in this environment');
    }

    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      try {
        const rawKey = toArrayBuffer(base64ToBytes(storedKey));
        return await crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM }, false, [
          'encrypt',
          'decrypt'
        ]);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const key = await crypto.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(STORAGE_KEY, bufferToBase64(exported));

    return key;
  }
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
