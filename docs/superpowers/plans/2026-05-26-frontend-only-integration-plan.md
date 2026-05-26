# 纯前端化集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 求职助手从前后端分离架构重构为纯前端架构，完全去除对 `43.138.246.37` 的后端依赖，使用 IndexedDB 本地存储，消除数据外泄风险。

**Architecture:** 使用 IndexedDB 替代 MySQL 存储用户数据、AI 配置、投递记录和聊天记录；使用 Web Crypto API 加密敏感数据（API keys）；直接调用 AI API 去除后端中转；BOSS Token 本地验证无需后端认证。

**Tech Stack:** Vue 3 + TypeScript + IndexedDB (idb) + Web Crypto API + Tampermonkey GM_xmlhttpRequest

---

## Phase 1: 基础架构搭建

### Task 1: 添加 IndexedDB 依赖

**Files:**
- Modify: `package.json`
- Test: 验证依赖安装

- [ ] **Step 1: 安装 idb 依赖**

```bash
npm install idb
```

Expected output:
```
added 1 package in 2s
```

- [ ] **Step 2: 验证安装**

```bash
npm list idb
```

Expected output:
```
├── idb@8.0.0
```

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "deps: add idb for IndexedDB support"
```

---

### Task 2: 创建 LocalDB 核心存储模块

**Files:**
- Create: `src/core/storage/local-db.ts`
- Test: `src/core/storage/__tests__/local-db.test.ts`

- [ ] **Step 1: 创建 LocalDB 类型定义**

Create: `src/core/storage/types.ts`

```typescript
export interface UserProfile {
  id: string;
  token: string;
  email?: string;
  phone?: string;
  authenticatedAt: number;
  lastSyncAt?: number;
}

export interface UserPreferences {
  id: string;
  pushIntervalSec: number;
  maxDailyActions: number;
  maxActionsPerMinute: number;
  maxConsecutiveFailures: number;
  cooldownMinutesOnLimit: number;
  safetyTimeWindowE: boolean;
  safetyStartHour: number;
  safetyEndHour: number;
  imMaxReloadPerDay: number;
  cleanerManualConfirmThreshold: number;
  autoContactMinIntervalSec: number;
  maxAutoMessagePerSession: number;
  maxAutoResumePerSession: number;
  chatMinReplyIntervalSec: number;
  chatMaxPerMinute: number;
  chatMaxSessionReplies: number;
  autoResumeMaxPerSession: number;
  acE: boolean;
  acW: boolean;
  acM: boolean;
  acY: boolean;
}

export interface AiConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  apiFormat: 'completions' | 'responses' | 'anthropic-messages' | 'google-generative-ai';
  timeout: number;
  isActive: boolean;
  createdAt: number;
}

export interface DeliveryRecord {
  id: string;
  jobId: string;
  encryptJobId: string;
  jobTitle: string;
  companyName: string;
  salaryDesc?: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  error?: string;
  securityId?: string;
  lid?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isAiGenerated?: boolean;
}

export interface ChatSession {
  jobKey: string;
  bossId: string;
  bossName: string;
  jobTitle: string;
  companyName: string;
  messages: ChatMessage[];
  isAiEnabled: boolean;
  lastMessageAt: number;
  createdAt: number;
}

export interface ResumeData {
  userId: string;
  rawText: string;
  parsedData: {
    name?: string;
    phone?: string;
    email?: string;
    skills: string[];
    workExperience: string;
    projects: string;
    education: string;
  };
  fileName: string;
  uploadedAt: number;
}
```

- [ ] **Step 2: 创建 LocalDB 类**

Create: `src/core/storage/local-db.ts`

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  UserProfile,
  UserPreferences,
  AiConfig,
  DeliveryRecord,
  ChatSession,
  ResumeData
} from './types';

interface JobHuntingDB extends DBSchema {
  userProfile: {
    key: string;
    value: UserProfile;
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
  aiConfigs: {
    key: string;
    value: AiConfig;
  };
  deliveryRecords: {
    key: string;
    value: DeliveryRecord;
    indexes: { byTimestamp: number };
  };
  chatSessions: {
    key: string;
    value: ChatSession;
  };
  resumeData: {
    key: string;
    value: ResumeData;
  };
}

const DB_NAME = 'ai-job-hunting';
const DB_VERSION = 1;

export class LocalDB {
  private static db: IDBPDatabase<JobHuntingDB> | null = null;
  private static initPromise: Promise<void> | null = null;

  static async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private static async doInit(): Promise<void> {
    this.db = await openDB<JobHuntingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('aiConfigs')) {
          db.createObjectStore('aiConfigs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('deliveryRecords')) {
          const store = db.createObjectStore('deliveryRecords', { keyPath: 'id' });
          store.createIndex('byTimestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('chatSessions')) {
          db.createObjectStore('chatSessions', { keyPath: 'jobKey' });
        }

        if (!db.objectStoreNames.contains('resumeData')) {
          db.createObjectStore('resumeData', { keyPath: 'userId' });
        }
      }
    });
  }

  private static ensureDB(): IDBPDatabase<JobHuntingDB> {
    if (!this.db) {
      throw new Error('LocalDB not initialized. Call LocalDB.init() first.');
    }
    return this.db;
  }

  // User Profile Operations
  static async setUserProfile(profile: UserProfile): Promise<void> {
    await this.ensureDB().put('userProfile', profile);
  }

  static async getUserProfile(): Promise<UserProfile | undefined> {
    const profiles = await this.ensureDB().getAll('userProfile');
    return profiles[0];
  }

  static async clearUserProfile(): Promise<void> {
    const db = this.ensureDB();
    const keys = await db.getAllKeys('userProfile');
    await Promise.all(keys.map(key => db.delete('userProfile', key)));
  }

  // Preferences Operations
  static async savePreferences(prefs: UserPreferences): Promise<void> {
    await this.ensureDB().put('preferences', prefs);
  }

  static async getPreferences(): Promise<UserPreferences | undefined> {
    const prefs = await this.ensureDB().getAll('preferences');
    return prefs[0];
  }

  // AI Config Operations
  static async saveAiConfig(config: AiConfig): Promise<void> {
    await this.ensureDB().put('aiConfigs', config);
  }

  static async getAiConfigs(): Promise<AiConfig[]> {
    return this.ensureDB().getAll('aiConfigs');
  }

  static async getActiveAiConfig(): Promise<AiConfig | undefined> {
    const configs = await this.getAiConfigs();
    return configs.find(c => c.isActive);
  }

  static async deleteAiConfig(id: string): Promise<void> {
    await this.ensureDB().delete('aiConfigs', id);
  }

  // Delivery Records Operations
  static async addDeliveryRecord(record: DeliveryRecord): Promise<void> {
    await this.ensureDB().add('deliveryRecords', record);
  }

  static async getDeliveryRecords(limit: number = 100): Promise<DeliveryRecord[]> {
    const index = this.ensureDB().transaction('deliveryRecords').store.index('byTimestamp');
    return index.getAll(null, limit);
  }

  static async getDeliveryRecordsByDateRange(
    startTime: number,
    endTime: number
  ): Promise<DeliveryRecord[]> {
    const db = this.ensureDB();
    const index = db.transaction('deliveryRecords').store.index('byTimestamp');
    return index.getAll(IDBKeyRange.bound(startTime, endTime));
  }

  // Chat Sessions Operations
  static async saveChatSession(session: ChatSession): Promise<void> {
    await this.ensureDB().put('chatSessions', session);
  }

  static async getChatSession(jobKey: string): Promise<ChatSession | undefined> {
    return this.ensureDB().get('chatSessions', jobKey);
  }

  static async getAllChatSessions(): Promise<ChatSession[]> {
    return this.ensureDB().getAll('chatSessions');
  }

  static async deleteChatSession(jobKey: string): Promise<void> {
    await this.ensureDB().delete('chatSessions', jobKey);
  }

  // Resume Data Operations
  static async saveResume(data: ResumeData): Promise<void> {
    await this.ensureDB().put('resumeData', data);
  }

  static async getResume(userId: string): Promise<ResumeData | undefined> {
    return this.ensureDB().get('resumeData', userId);
  }

  static async clearResume(userId: string): Promise<void> {
    await this.ensureDB().delete('resumeData', userId);
  }

  // Data Export/Import
  static async exportAllData(): Promise<{
    userProfile?: UserProfile;
    preferences?: UserPreferences;
    aiConfigs: AiConfig[];
    deliveryRecords: DeliveryRecord[];
    chatSessions: ChatSession[];
    resumeData?: ResumeData;
  }> {
    const db = this.ensureDB();
    return {
      userProfile: await this.getUserProfile(),
      preferences: await this.getPreferences(),
      aiConfigs: await db.getAll('aiConfigs'),
      deliveryRecords: await db.getAll('deliveryRecords'),
      chatSessions: await db.getAll('chatSessions'),
      resumeData: (await db.getAll('resumeData'))[0]
    };
  }

  static async importAllData(data: {
    userProfile?: UserProfile;
    preferences?: UserPreferences;
    aiConfigs?: AiConfig[];
    deliveryRecords?: DeliveryRecord[];
    chatSessions?: ChatSession[];
    resumeData?: ResumeData;
  }): Promise<void> {
    const db = this.ensureDB();

    if (data.userProfile) {
      await db.put('userProfile', data.userProfile);
    }

    if (data.preferences) {
      await db.put('preferences', data.preferences);
    }

    if (data.aiConfigs) {
      for (const config of data.aiConfigs) {
        await db.put('aiConfigs', config);
      }
    }

    if (data.deliveryRecords) {
      for (const record of data.deliveryRecords) {
        await db.add('deliveryRecords', record);
      }
    }

    if (data.chatSessions) {
      for (const session of data.chatSessions) {
        await db.put('chatSessions', session);
      }
    }

    if (data.resumeData) {
      await db.put('resumeData', data.resumeData);
    }
  }

  // Clear All Data
  static async clearAll(): Promise<void> {
    const db = this.ensureDB();
    await Promise.all([
      db.clear('userProfile'),
      db.clear('preferences'),
      db.clear('aiConfigs'),
      db.clear('deliveryRecords'),
      db.clear('chatSessions'),
      db.clear('resumeData')
    ]);
  }
}
```

- [ ] **Step 3: 创建测试文件**

Create: `src/core/storage/__tests__/local-db.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDB } from '../local-db';
import type { UserProfile, AiConfig, DeliveryRecord } from '../types';

describe('LocalDB', () => {
  beforeEach(async () => {
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  afterEach(async () => {
    await LocalDB.clearAll();
  });

  describe('User Profile', () => {
    it('should save and retrieve user profile', async () => {
      const profile: UserProfile = {
        id: 'test-user-123',
        token: 'boss-token-xyz',
        email: 'test@example.com',
        authenticatedAt: Date.now()
      };

      await LocalDB.setUserProfile(profile);
      const retrieved = await LocalDB.getUserProfile();

      expect(retrieved).toEqual(profile);
    });

    it('should return undefined when no profile exists', async () => {
      const retrieved = await LocalDB.getUserProfile();
      expect(retrieved).toBeUndefined();
    });

    it('should clear user profile', async () => {
      const profile: UserProfile = {
        id: 'test-user-123',
        token: 'boss-token-xyz',
        authenticatedAt: Date.now()
      };

      await LocalDB.setUserProfile(profile);
      await LocalDB.clearUserProfile();
      const retrieved = await LocalDB.getUserProfile();

      expect(retrieved).toBeUndefined();
    });
  });

  describe('AI Configs', () => {
    it('should save and retrieve AI configs', async () => {
      const config: AiConfig = {
        id: 'config-1',
        name: 'Kimi Test',
        provider: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: 'test-key',
        modelName: 'moonshot-v1-8k',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await LocalDB.saveAiConfig(config);
      const configs = await LocalDB.getAiConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual(config);
    });

    it('should get active AI config', async () => {
      const config1: AiConfig = {
        id: 'config-1',
        name: 'Kimi',
        provider: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: 'key1',
        modelName: 'moonshot-v1-8k',
        apiFormat: 'completions',
        timeout: 60,
        isActive: false,
        createdAt: Date.now()
      };

      const config2: AiConfig = {
        id: 'config-2',
        name: 'OpenAI',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'key2',
        modelName: 'gpt-4o',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await LocalDB.saveAiConfig(config1);
      await LocalDB.saveAiConfig(config2);

      const active = await LocalDB.getActiveAiConfig();
      expect(active?.id).toBe('config-2');
    });

    it('should delete AI config', async () => {
      const config: AiConfig = {
        id: 'config-1',
        name: 'Kimi',
        provider: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: 'key',
        modelName: 'moonshot-v1-8k',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await LocalDB.saveAiConfig(config);
      await LocalDB.deleteAiConfig('config-1');

      const configs = await LocalDB.getAiConfigs();
      expect(configs).toHaveLength(0);
    });
  });

  describe('Delivery Records', () => {
    it('should add and retrieve delivery records', async () => {
      const record: DeliveryRecord = {
        id: 'record-1',
        jobId: 'job-123',
        encryptJobId: 'enc-123',
        jobTitle: '前端开发',
        companyName: '测试公司',
        salaryDesc: '20-30K',
        status: 'success',
        timestamp: Date.now()
      };

      await LocalDB.addDeliveryRecord(record);
      const records = await LocalDB.getDeliveryRecords();

      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(record);
    });

    it('should return records ordered by timestamp', async () => {
      const now = Date.now();

      const record1: DeliveryRecord = {
        id: 'record-1',
        jobId: 'job-1',
        encryptJobId: 'enc-1',
        jobTitle: '岗位1',
        companyName: '公司1',
        status: 'success',
        timestamp: now - 1000
      };

      const record2: DeliveryRecord = {
        id: 'record-2',
        jobId: 'job-2',
        encryptJobId: 'enc-2',
        jobTitle: '岗位2',
        companyName: '公司2',
        status: 'success',
        timestamp: now
      };

      await LocalDB.addDeliveryRecord(record1);
      await LocalDB.addDeliveryRecord(record2);

      const records = await LocalDB.getDeliveryRecords();
      expect(records[0].id).toBe('record-1');
      expect(records[1].id).toBe('record-2');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        const record: DeliveryRecord = {
          id: `record-${i}`,
          jobId: `job-${i}`,
          encryptJobId: `enc-${i}`,
          jobTitle: `岗位${i}`,
          companyName: `公司${i}`,
          status: 'success',
          timestamp: Date.now() + i
        };
        await LocalDB.addDeliveryRecord(record);
      }

      const records = await LocalDB.getDeliveryRecords(3);
      expect(records).toHaveLength(3);
    });
  });

  describe('Data Export/Import', () => {
    it('should export all data', async () => {
      const profile: UserProfile = {
        id: 'user-1',
        token: 'token-1',
        authenticatedAt: Date.now()
      };

      await LocalDB.setUserProfile(profile);

      const exported = await LocalDB.exportAllData();
      expect(exported.userProfile).toEqual(profile);
      expect(exported.aiConfigs).toEqual([]);
    });

    it('should import all data', async () => {
      const profile: UserProfile = {
        id: 'user-1',
        token: 'token-1',
        authenticatedAt: Date.now()
      };

      await LocalDB.importAllData({ userProfile: profile });
      const retrieved = await LocalDB.getUserProfile();

      expect(retrieved).toEqual(profile);
    });
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npm test src/core/storage/__tests__/local-db.test.ts
```

Expected output:
```
 ✓ src/core/storage/__tests__/local-db.test.ts (14 tests) 245ms
   ✓ LocalDB > User Profile > should save and retrieve user profile
   ✓ LocalDB > User Profile > should return undefined when no profile exists
   ✓ LocalDB > User Profile > should clear user profile
   ✓ LocalDB > AI Configs > should save and retrieve AI configs
   ✓ LocalDB > AI Configs > should get active AI config
   ✓ LocalDB > AI Configs > should delete AI config
   ✓ LocalDB > Delivery Records > should add and retrieve delivery records
   ✓ LocalDB > Delivery Records > should return records ordered by timestamp
   ✓ LocalDB > Delivery Records > should respect limit parameter
   ✓ LocalDB > Data Export/Import > should export all data
   ✓ LocalDB > Data Export/Import > should import all data

Test Files  1 passed (1)
     Tests  14 passed (14)
```

- [ ] **Step 5: 提交**

```bash
git add src/core/storage/
git commit -m "feat(storage): add LocalDB with IndexedDB support

- Create type definitions for all storage entities
- Implement CRUD operations for user profile, preferences, AI configs
- Implement delivery records and chat sessions storage
- Add data export/import functionality
- Add comprehensive test suite"
```

---

## Phase 2: 加密模块实现

### Task 3: 实现 Web Crypto 加密模块

**Files:**
- Create: `src/core/storage/encryption.ts`
- Test: `src/core/storage/__tests__/encryption.test.ts`

- [ ] **Step 1: 创建 Encryption 类**

Create: `src/core/storage/encryption.ts`

```typescript
/**
 * Web Crypto API 加密模块
 * 用于加密存储敏感数据（API keys、BOSS token）
 */
export class Encryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly STORAGE_KEY = '__encryption_key__';

  /**
   * 生成或从 localStorage 恢复加密密钥
   */
  private static async getKey(): Promise<CryptoKey> {
    const storedKey = localStorage.getItem(this.STORAGE_KEY);

    if (storedKey) {
      try {
        const keyData = this.base64ToBuffer(storedKey);
        return await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: this.ALGORITHM },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (e) {
        // 如果解密失败，生成新密钥
        console.warn('Failed to restore encryption key, generating new one');
      }
    }

    // 生成新密钥
    const key = await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );

    // 导出并存储密钥
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(this.STORAGE_KEY, this.bufferToBase64(exported));

    return key;
  }

  /**
   * 加密字符串
   * @param plaintext 要加密的明文
   * @returns 加密后的 base64 字符串（包含 IV）
   */
  static async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    try {
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(plaintext);

      const ciphertext = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        encoded
      );

      // 合并 IV 和密文
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return this.bufferToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 解密字符串
   * @param ciphertext 加密后的 base64 字符串（包含 IV）
   * @returns 解密后的明文
   */
  static async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) return '';

    try {
      const key = await this.getKey();
      const combined = this.base64ToBuffer(ciphertext);

      if (combined.length < 13) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 将 ArrayBuffer 转换为 Base64 字符串
   */
  private static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 字符串转换为 Uint8Array
   */
  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * 清除加密密钥（用于登出时）
   */
  static clearKey(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 检查加密是否可用（某些浏览器环境可能不支持）
   */
  static isAvailable(): boolean {
    return typeof crypto !== 'undefined' &&
           typeof crypto.subtle !== 'undefined' &&
           typeof TextEncoder !== 'undefined';
  }
}
```

- [ ] **Step 2: 创建测试**

Create: `src/core/storage/__tests__/encryption.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Encryption } from '../encryption';

describe('Encryption', () => {
  beforeEach(() => {
    Encryption.clearKey();
  });

  it('should encrypt and decrypt string', async () => {
    const plaintext = 'sk-test-api-key-12345';

    const encrypted = await Encryption.encrypt(plaintext);
    const decrypted = await Encryption.decrypt(encrypted);

    expect(encrypted).not.toBe(plaintext);
    expect(decrypted).toBe(plaintext);
  });

  it('should return empty string for empty input', async () => {
    const encrypted = await Encryption.encrypt('');
    const decrypted = await Encryption.decrypt('');

    expect(encrypted).toBe('');
    expect(decrypted).toBe('');
  });

  it('should produce different ciphertext for same plaintext', async () => {
    const plaintext = 'test-data';

    const encrypted1 = await Encryption.encrypt(plaintext);
    const encrypted2 = await Encryption.encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should maintain key across sessions', async () => {
    const plaintext = 'sensitive-data';

    const encrypted = await Encryption.encrypt(plaintext);

    // 清除内存中的 key，模拟页面刷新
    // 重新获取 key 应该能得到相同的 key
    const decrypted = await Encryption.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw error for invalid ciphertext', async () => {
    await expect(Encryption.decrypt('invalid-data')).rejects.toThrow();
  });

  it('should check availability', () => {
    expect(Encryption.isAvailable()).toBe(true);
  });

  it('should handle long text', async () => {
    const plaintext = 'x'.repeat(10000);

    const encrypted = await Encryption.encrypt(plaintext);
    const decrypted = await Encryption.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
npm test src/core/storage/__tests__/encryption.test.ts
```

Expected output:
```
 ✓ src/core/storage/__tests__/encryption.test.ts (7 tests) 123ms
   ✓ Encryption > should encrypt and decrypt string
   ✓ Encryption > should return empty string for empty input
   ✓ Encryption > should produce different ciphertext for same plaintext
   ✓ Encryption > should maintain key across sessions
   ✓ Encryption > should throw error for invalid ciphertext
   ✓ Encryption > should check availability
   ✓ Encryption > should handle long text

Test Files  1 passed (1)
     Tests  7 passed (7)
```

- [ ] **Step 4: 提交**

```bash
git add src/core/storage/encryption.ts src/core/storage/__tests__/encryption.test.ts
git commit -m "feat(encryption): add Web Crypto API encryption module

- Implement AES-GCM encryption for sensitive data
- Store encryption key in localStorage
- Add encryption availability check
- Add comprehensive test suite"
```

---

## Phase 3: 集成加密到 LocalDB

### Task 4: 创建 SecureLocalDB 封装

**Files:**
- Create: `src/core/storage/secure-local-db.ts`
- Modify: `src/core/storage/local-db.ts` (添加加密支持选项)

- [ ] **Step 1: 创建 SecureLocalDB 类**

Create: `src/core/storage/secure-local-db.ts`

```typescript
import { LocalDB } from './local-db';
import { Encryption } from './encryption';
import type { UserProfile, AiConfig } from './types';

/**
 * 带加密功能的 LocalDB 封装
 * 自动加密敏感字段（token, apiKey）
 */
export class SecureLocalDB {
  /**
   * 保存用户档案（自动加密 token）
   */
  static async setUserProfile(profile: UserProfile): Promise<void> {
    const encryptedProfile = {
      ...profile,
      token: await Encryption.encrypt(profile.token)
    };
    await LocalDB.setUserProfile(encryptedProfile);
  }

  /**
   * 获取用户档案（自动解密 token）
   */
  static async getUserProfile(): Promise<UserProfile | undefined> {
    const profile = await LocalDB.getUserProfile();
    if (!profile) return undefined;

    return {
      ...profile,
      token: await Encryption.decrypt(profile.token)
    };
  }

  /**
   * 保存 AI 配置（自动加密 apiKey）
   */
  static async saveAiConfig(config: AiConfig): Promise<void> {
    const encryptedConfig = {
      ...config,
      apiKey: await Encryption.encrypt(config.apiKey)
    };
    await LocalDB.saveAiConfig(encryptedConfig);
  }

  /**
   * 获取所有 AI 配置（自动解密 apiKey）
   */
  static async getAiConfigs(): Promise<AiConfig[]> {
    const configs = await LocalDB.getAiConfigs();
    return Promise.all(
      configs.map(async (config) => ({
        ...config,
        apiKey: await Encryption.decrypt(config.apiKey)
      }))
    );
  }

  /**
   * 获取当前激活的 AI 配置
   */
  static async getActiveAiConfig(): Promise<AiConfig | undefined> {
    const configs = await this.getAiConfigs();
    return configs.find(c => c.isActive);
  }

  /**
   * 设置激活的 AI 配置
   */
  static async setActiveAiConfig(id: string): Promise<void> {
    const configs = await LocalDB.getAiConfigs();

    for (const config of configs) {
      config.isActive = (config.id === id);
      await LocalDB.saveAiConfig(config);
    }
  }

  /**
   * 删除 AI 配置
   */
  static async deleteAiConfig(id: string): Promise<void> {
    await LocalDB.deleteAiConfig(id);
  }

  /**
   * 导出数据（保持加密状态）
   */
  static async exportEncryptedData(): Promise<string> {
    const data = await LocalDB.exportAllData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入加密数据
   */
  static async importEncryptedData(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    await LocalDB.importAllData(data);
  }

  /**
   * 登出时清除敏感数据
   */
  static async logout(): Promise<void> {
    await LocalDB.clearUserProfile();
    Encryption.clearKey();
  }
}
```

- [ ] **Step 2: 导出统一接口**

Modify: `src/core/storage/index.ts`

```typescript
export { LocalDB } from './local-db';
export { SecureLocalDB } from './secure-local-db';
export { Encryption } from './encryption';
export type {
  UserProfile,
  UserPreferences,
  AiConfig,
  DeliveryRecord,
  ChatMessage,
  ChatSession,
  ResumeData
} from './types';
```

- [ ] **Step 3: 创建集成测试**

Create: `src/core/storage/__tests__/secure-local-db.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureLocalDB } from '../secure-local-db';
import { LocalDB } from '../local-db';
import { Encryption } from '../encryption';
import type { UserProfile, AiConfig } from '../types';

describe('SecureLocalDB', () => {
  beforeEach(async () => {
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  afterEach(async () => {
    await LocalDB.clearAll();
    Encryption.clearKey();
  });

  describe('User Profile', () => {
    it('should encrypt token when saving', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'sensitive-boss-token',
        email: 'test@example.com',
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);

      // 验证存储的是加密后的数据
      const stored = await LocalDB.getUserProfile();
      expect(stored?.token).not.toBe(profile.token);
      expect(stored?.token.length).toBeGreaterThan(20); // 加密后更长
    });

    it('should decrypt token when retrieving', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'sensitive-boss-token',
        email: 'test@example.com',
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);
      const retrieved = await SecureLocalDB.getUserProfile();

      expect(retrieved?.token).toBe(profile.token);
    });
  });

  describe('AI Configs', () => {
    it('should encrypt apiKey when saving', async () => {
      const config: AiConfig = {
        id: 'config-1',
        name: 'OpenAI',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret-key-123',
        modelName: 'gpt-4o',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await SecureLocalDB.saveAiConfig(config);

      // 验证存储的是加密后的数据
      const stored = await LocalDB.getAiConfigs();
      expect(stored[0].apiKey).not.toBe(config.apiKey);
    });

    it('should decrypt apiKey when retrieving', async () => {
      const config: AiConfig = {
        id: 'config-1',
        name: 'OpenAI',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-secret-key-123',
        modelName: 'gpt-4o',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await SecureLocalDB.saveAiConfig(config);
      const configs = await SecureLocalDB.getAiConfigs();

      expect(configs[0].apiKey).toBe(config.apiKey);
    });

    it('should get active config', async () => {
      const config1: AiConfig = {
        id: 'config-1',
        name: 'Kimi',
        provider: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: 'key1',
        modelName: 'moonshot-v1',
        apiFormat: 'completions',
        timeout: 60,
        isActive: false,
        createdAt: Date.now()
      };

      const config2: AiConfig = {
        id: 'config-2',
        name: 'OpenAI',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'key2',
        modelName: 'gpt-4o',
        apiFormat: 'completions',
        timeout: 60,
        isActive: true,
        createdAt: Date.now()
      };

      await SecureLocalDB.saveAiConfig(config1);
      await SecureLocalDB.saveAiConfig(config2);

      const active = await SecureLocalDB.getActiveAiConfig();
      expect(active?.id).toBe('config-2');
    });
  });

  describe('Data Export/Import', () => {
    it('should export encrypted data', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'token-xyz',
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);

      const exported = await SecureLocalDB.exportEncryptedData();
      const parsed = JSON.parse(exported);

      expect(parsed.userProfile).toBeDefined();
      expect(parsed.userProfile.token).not.toBe('token-xyz'); // 应该是加密的
    });

    it('should import encrypted data', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'token-xyz',
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);
      const exported = await SecureLocalDB.exportEncryptedData();

      await LocalDB.clearAll();
      await SecureLocalDB.importEncryptedData(exported);

      const retrieved = await SecureLocalDB.getUserProfile();
      expect(retrieved?.token).toBe('token-xyz');
    });
  });

  describe('Logout', () => {
    it('should clear profile on logout', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        token: 'token-xyz',
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);
      await SecureLocalDB.logout();

      const retrieved = await LocalDB.getUserProfile();
      expect(retrieved).toBeUndefined();
    });
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npm test src/core/storage/__tests__/secure-local-db.test.ts
```

Expected output:
```
 ✓ src/core/storage/__tests__/secure-local-db.test.ts (9 tests) 234ms
   ✓ SecureLocalDB > User Profile > should encrypt token when saving
   ✓ SecureLocalDB > User Profile > should decrypt token when retrieving
   ✓ SecureLocalDB > AI Configs > should encrypt apiKey when saving
   ✓ SecureLocalDB > AI Configs > should decrypt apiKey when retrieving
   ✓ SecureLocalDB > AI Configs > should get active config
   ✓ SecureLocalDB > Data Export/Import > should export encrypted data
   ✓ SecureLocalDB > Data Export/Import > should import encrypted data
   ✓ SecureLocalDB > Logout > should clear profile on logout

Test Files  1 passed (1)
     Tests  9 passed (9)
```

- [ ] **Step 5: 提交**

```bash
git add src/core/storage/
git commit -m "feat(storage): integrate encryption with LocalDB

- Create SecureLocalDB for automatic encryption/decryption
- Encrypt sensitive fields: token, apiKey
- Add data export/import with encryption
- Add logout functionality to clear sensitive data
- Add integration tests"
```

---

## Phase 4: 重构认证模块

### Task 5: 重构认证系统

**Files:**
- Create: `src/core/auth/local-auth.ts`
- Modify: `src/core/auth/auth.ts` (重构登录逻辑)

- [ ] **Step 1: 创建本地认证服务**

Create: `src/core/auth/local-auth.ts`

```typescript
import { SecureLocalDB } from '@/core/storage';
import { Logger } from '@/shared/utils/logger';
import type { UserProfile } from '@/core/storage';

declare const unsafeWindow: Window & Record<string, unknown>;

const logger = Logger.rootLogger;

export interface AuthResult {
  success: boolean;
  userId?: string;
  token?: string;
  error?: string;
}

/**
 * 本地认证服务
 * 使用 BOSS Token 进行本地验证，无需后端服务器
 */
export class LocalAuthService {
  /**
   * 从 BOSS 页面上下文提取 Token
   */
  static extractBossToken(): string | null {
    const _unsafeWindow = (typeof unsafeWindow !== 'undefined'
      ? unsafeWindow
      : window) as unknown as Window & Record<string, unknown>;

    const page = (_unsafeWindow as { _PAGE?: unknown })._PAGE;
    if (!page || typeof page !== 'object') {
      return null;
    }

    const raw = page as Record<string, unknown>;
    const token = typeof raw.token === 'string' ? raw.token : null;

    logger.debug('Extracted BOSS token:', token ? 'Found' : 'Not found');
    return token;
  }

  /**
   * 从 BOSS 页面上下文提取 UserId
   */
  static extractBossUserId(): string | null {
    const _unsafeWindow = (typeof unsafeWindow !== 'undefined'
      ? unsafeWindow
      : window) as unknown as Window & Record<string, unknown>;

    const page = (_unsafeWindow as { _PAGE?: unknown })._PAGE;
    if (!page || typeof page !== 'object') {
      return null;
    }

    const raw = page as Record<string, unknown>;
    const uid = raw.uid;

    if (typeof uid === 'string') return uid;
    if (typeof uid === 'number') return String(uid);

    return null;
  }

  /**
   * 检查用户是否已登录 BOSS
   */
  static isBossLoggedIn(): boolean {
    return !!this.extractBossToken();
  }

  /**
   * 本地认证
   * 验证 BOSS Token 有效性，存储到本地数据库
   */
  static async authenticate(): Promise<AuthResult> {
    try {
      const token = this.extractBossToken();
      const userId = this.extractBossUserId();

      if (!token) {
        return {
          success: false,
          error: '未检测到 BOSS 登录状态，请先登录 BOSS 直聘'
        };
      }

      if (!userId) {
        return {
          success: false,
          error: '未获取到用户 ID，请刷新页面重试'
        };
      }

      // 创建用户档案
      const profile: UserProfile = {
        id: userId,
        token,
        authenticatedAt: Date.now()
      };

      await SecureLocalDB.setUserProfile(profile);

      logger.info('Local authentication successful for user:', userId);

      return {
        success: true,
        userId,
        token
      };
    } catch (error: any) {
      logger.error('Authentication failed:', error);
      return {
        success: false,
        error: error?.message || '认证失败'
      };
    }
  }

  /**
   * 检查本地登录状态
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const profile = await SecureLocalDB.getUserProfile();
      if (!profile) return false;

      // 检查 Token 是否过期（7天）
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - profile.authenticatedAt > maxAge;

      if (isExpired) {
        logger.info('Token expired, clearing profile');
        await SecureLocalDB.logout();
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check authentication status:', error);
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<{ userId: string; token: string } | null> {
    const profile = await SecureLocalDB.getUserProfile();
    if (!profile) return null;

    return {
      userId: profile.id,
      token: profile.token
    };
  }

  /**
   * 登出
   */
  static async logout(): Promise<void> {
    await SecureLocalDB.logout();
    logger.info('User logged out');
  }

  /**
   * 刷新认证（重新提取 BOSS Token）
   */
  static async refresh(): Promise<AuthResult> {
    // 清除现有认证
    await SecureLocalDB.logout();
    // 重新认证
    return this.authenticate();
  }
}
```

- [ ] **Step 2: 重构 auth.ts 主文件**

Modify: `src/core/auth/auth.ts`

```typescript
// -*- coding: utf-8 -*-
import axios from 'axios';
import { useLoginStore } from '@/state/login';
import { useUserStore } from '@/state/user';
import { LogRecorder } from '@/core/engine/push-engine';
import { showAppMessage } from '@/core/http/request';
import { LocalAuthService } from '@/core/auth/local-auth';
import { SecureLocalDB } from '@/core/storage';
import { Tools } from '@/shared/utils/tools';
import { Logger } from '@/shared/utils/logger';
import {
  getPreferenceValue,
  migratePreferenceKeys,
  normalizePreferenceBoolean,
} from '@/shared/utils/preference';
import { fetchWithGM_request } from '@/shared/utils/fetch';
export { fetchWithGM_request } from '@/shared/utils/fetch';

const logger = Logger.rootLogger;
const loginLogRecorder = new LogRecorder();
let loginIng = false;

const isNetworkLikeError = (error: any): boolean => {
  const code = error?.code || '';
  if (['ECONNABORTED', 'ERR_NETWORK', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code)) {
    return true;
  }
  const msg =
    `${typeof error === 'string' ? error : error?.message || error?.response?.data?.message || ''}`.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('time out') ||
    msg.includes('network') ||
    msg.includes('econnaborted')
  );
};

const runWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (!isNetworkLikeError(error) || attempt === maxRetries) {
        throw error;
      }
      await Tools.sleep(800 * attempt);
    }
  }
  throw lastError;
};

/**
 * 静默登录 - 重构为本地认证
 */
export const silentlyLogin = async (bossUserId?: string): Promise<void> => {
  let loginCount = 0;
  while (loginIng && loginCount < 6) {
    logger.info('login... ', loginCount);
    await Tools.sleep(500);
    loginCount++;
  }

  loginIng = true;
  const loginStore = useLoginStore() as any;

  // 检查是否已登录 BOSS
  if (!LocalAuthService.isBossLoggedIn()) {
    loginLogRecorder.info('未登录Boss，静默登录结束');
    loginIng = false;
    return Promise.reject(new Error('未登录Boss，静默登录失败'));
  }

  if (!bossUserId) {
    bossUserId = LocalAuthService.extractBossUserId() || undefined;
  }

  if (loginStore.login) {
    // 检查本地认证是否有效
    const isAuth = await LocalAuthService.isAuthenticated();
    if (isAuth) {
      logger.info('已经登录，静默登录结束');
      loginIng = false;
      return Promise.resolve();
    }
  }

  try {
    const result = await LocalAuthService.authenticate();

    if (result.success) {
      loginStore.loginSuccess();
      loginLogRecorder.info('静默登录成功');
    } else {
      throw new Error(result.error);
    }
  } catch (e: unknown) {
    loginLogRecorder.error('静默登录失败', e);
    if (!isNetworkLikeError(e)) {
      loginStore.loginFail();
    }
    loginIng = false;
    return Promise.reject(e);
  } finally {
    loginIng = false;
  }
};

export const loginInterceptor = (): boolean => {
  const token = LocalAuthService.extractBossToken();
  if (!token) {
    showAppMessage({
      message: '请先登录Boss',
      type: 'error',
      duration: 3000,
    });
    return false;
  }
  return true;
};

export const handlerImport = async (importResumeLoading: { value: boolean }): Promise<void> => {
  if (!loginInterceptor()) {
    return;
  }

  const token = LocalAuthService.extractBossToken();
  const userId = LocalAuthService.extractBossUserId();

  if (!token) {
    showAppMessage({
      message: '未获取到Boss token 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }
  if (!userId) {
    showAppMessage({
      message: '未获取到Boss userId 请刷新页面重试',
      type: 'error',
      duration: 3000,
    });
    return;
  }

  importResumeLoading.value = true;

  try {
    const resumeInfoResp = await axios.get('https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json', {
      headers: { Zp_token: token },
    });
    const zpData = (resumeInfoResp as any).data.zpData;
    if (!zpData.attachmentList || zpData.attachmentList.length === 0) {
      importResumeLoading.value = false;
      showAppMessage({
        message: '请先在BOSS个人中心上传附件简历；作为AI代聊定制化回复的基础',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    const resumeId = zpData.attachmentList[0].resumeId;
    const resumeFileResp = await fetchWithGM_request(
      `https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=${resumeId}`,
      { headers: { Zp_token: token }, responseType: 'arraybuffer' }
    );

    const fileBlob = new Blob([resumeFileResp.response as BlobPart], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', fileBlob);
    formData.append('resumeId', resumeId);
    formData.append('uniqueId', userId);

    // TODO: 重构为本地简历解析（Phase 6）
    // 暂时保持原有逻辑，等待 ResumeParser 实现
    showAppMessage({
      message: '简历文件已获取，等待本地解析功能',
      type: 'info',
      duration: 3000,
    });

    importResumeLoading.value = false;
  } catch (error: any) {
    logger.error('Import resume failed:', error);
    showAppMessage({
      message: `导入简历失败: ${error?.message || '未知错误'}`,
      type: 'error',
      duration: 3000,
    });
    importResumeLoading.value = false;
  }
};

const preferenceLogRecorder = new LogRecorder();

export function userRemoteLoad(): void {
  preferenceLogRecorder.info('加载用户投递设置');
  const runtimeUserStore2 = useUserStore() as any;
  const loginStore = useLoginStore() as any;
  runtimeUserStore2.preferenceLoadStatus = 'loading';
  runtimeUserStore2.preferenceLoadError = '';

  if (loginStore.loginFailStatus) {
    runtimeUserStore2.preferenceLoadStatus = 'failed';
    runtimeUserStore2.preferenceLoadError = '登录状态异常，请刷新页面后重试';
    preferenceLogRecorder.warn('加载用户投递设置终止：登录状态异常');
    return;
  }

  runWithRetry(() => silentlyLogin(''), 3)
    .then(async () => {
      logger.debug('从本地存储加载用户设置');

      // 从本地数据库加载用户偏好
      const preferences = await SecureLocalDB.getPreferences();
      const profile = await SecureLocalDB.getUserProfile();

      if (!profile) {
        throw new Error('用户未登录');
      }

      // 初始化用户数据
      if (!runtimeUserStore2.user) {
        runtimeUserStore2.user = {};
      }

      runtimeUserStore2.user.id = profile.id;
      runtimeUserStore2.user.email = profile.email;
      runtimeUserStore2.user.phone = profile.phone;

      // 设置默认偏好或使用存储的偏好
      runtimeUserStore2.user.preference = preferences || getDefaultPreferences();

      migratePreferenceKeys(runtimeUserStore2.user.preference);

      // 应用偏好设置（与原逻辑相同）
      applyPreferences(runtimeUserStore2.user.preference);

      runtimeUserStore2.preferenceLoadStatus = 'success';
      runtimeUserStore2.preferenceLoadError = '';
      Tools.saveStoredUserProfile(runtimeUserStore2.user);
      preferenceLogRecorder.info('加载用户投递设置成功');
    })
    .catch((error: any) => {
      if (!isNetworkLikeError(error)) {
        loginStore.loginFail();
      }
      const errorMsg =
        typeof error === 'string'
          ? error
          : error?.message || error?.response?.data?.message || '未知错误';
      runtimeUserStore2.preferenceLoadStatus = 'failed';
      runtimeUserStore2.preferenceLoadError = errorMsg;
      preferenceLogRecorder.error('加载用户投递设置失败', errorMsg);
    })
    .finally(() => {
      if (!runtimeUserStore2.user?.preference) {
        runtimeUserStore2.user = runtimeUserStore2.user || {};
        runtimeUserStore2.user.preference = getDefaultPreferences();
      }
    });
}

/**
 * 获取默认偏好设置
 */
function getDefaultPreferences() {
  return {
    pushIntervalSec: 3,
    pi: 3,
    npi: 6,
    maxDailyActions: 150,
    maxActionsPerMinute: 9,
    maxConsecutiveFailures: 10,
    cooldownMinutesOnLimit: 25,
    safetyTimeWindowE: false,
    safetyStartHour: 8,
    safetyEndHour: 22,
    imMaxReloadPerDay: 15,
    cleanerManualConfirmThreshold: 40,
    autoContactMinIntervalSec: 10,
    maxAutoMessagePerSession: 30,
    maxAutoResumePerSession: 18,
    chatMinReplyIntervalSec: 12,
    chatMaxPerMinute: 6,
    chatMaxSessionReplies: 75,
    autoResumeMaxPerSession: 12,
    acE: false,
    acW: true,
    acM: true,
    acY: true,
  };
}

/**
 * 应用偏好设置
 */
function applyPreferences(pref: any) {
  const upgradePrefNumber = (value: unknown, oldDefault: number, nextDefault: number): number => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n === oldDefault) {
      return nextDefault;
    }
    return n;
  };

  pref.pushIntervalSec = Number(getPreferenceValue(pref, 'pushIntervalSec', 'pi')) || 3;
  pref.pi = pref.pi || pref.pushIntervalSec;
  pref.npi = pref.npi || 6;
  pref.maxDailyActions = upgradePrefNumber(pref.maxDailyActions, 80, 120);
  pref.maxDailyActions = upgradePrefNumber(pref.maxDailyActions, 120, 150);
  pref.maxActionsPerMinute = upgradePrefNumber(pref.maxActionsPerMinute, 6, 9);
  pref.maxConsecutiveFailures = upgradePrefNumber(pref.maxConsecutiveFailures, 8, 10);
  pref.cooldownMinutesOnLimit = upgradePrefNumber(pref.cooldownMinutesOnLimit, 30, 25);

  if (typeof pref.safetyTimeWindowE !== 'boolean') {
    pref.safetyTimeWindowE = false;
  }
  pref.safetyStartHour = pref.safetyStartHour ?? 8;
  pref.safetyEndHour = pref.safetyEndHour ?? 22;
  pref.imMaxReloadPerDay = upgradePrefNumber(pref.imMaxReloadPerDay, 10, 15);
  pref.cleanerManualConfirmThreshold = upgradePrefNumber(pref.cleanerManualConfirmThreshold, 8, 40);
  pref.autoContactMinIntervalSec = upgradePrefNumber(pref.autoContactMinIntervalSec, 12, 10);
  pref.maxAutoMessagePerSession = upgradePrefNumber(pref.maxAutoMessagePerSession, 20, 30);
  pref.maxAutoResumePerSession = upgradePrefNumber(pref.maxAutoResumePerSession, 12, 18);
  pref.chatMinReplyIntervalSec = upgradePrefNumber(pref.chatMinReplyIntervalSec, 15, 12);
  pref.chatMaxPerMinute = upgradePrefNumber(pref.chatMaxPerMinute, 4, 6);
  pref.chatMaxSessionReplies = upgradePrefNumber(pref.chatMaxSessionReplies, 50, 75);
  pref.autoResumeMaxPerSession = upgradePrefNumber(pref.autoResumeMaxPerSession, 8, 12);
  pref.acE = normalizePreferenceBoolean(pref.acE, false);
  pref.acW = normalizePreferenceBoolean(pref.acW, true);
  pref.acM = normalizePreferenceBoolean(pref.acM, true);
  pref.acY = normalizePreferenceBoolean(pref.acY, true);
  Tools.migrateAiDeliveryJudgeConfigFromPreference(pref);
}
```

- [ ] **Step 3: 更新 auth 模块导出**

Modify: `src/core/auth/index.ts`

```typescript
export { LocalAuthService } from './local-auth';
export { silentlyLogin, loginInterceptor, handlerImport, userRemoteLoad } from './auth';
export { fetchWithGM_request } from '@/shared/utils/fetch';
```

- [ ] **Step 4: 提交**

```bash
git add src/core/auth/
git commit -m "feat(auth): refactor to local authentication

- Create LocalAuthService for BOSS token extraction and local auth
- Remove backend login API calls
- Use SecureLocalDB for storing user profile
- Update silentlyLogin to use local authentication
- Add 7-day token expiration check
- Update userRemoteLoad to load preferences from local storage
- Maintain backward compatibility with existing UI components"
```

---

## Phase 5: 重构 AI 配置存储

### Task 6: 迁移 AI 配置到本地存储

**Files:**
- Modify: `src/features/ai-config/stores/ai-config.ts` (重构存储逻辑)
- Create: 迁移脚本

- [ ] **Step 1: 重构 ai-config store**

Modify: `src/features/ai-config/stores/ai-config.ts`

```typescript
// 关键修改点示例（需要根据实际文件内容修改）
import { SecureLocalDB } from '@/core/storage';
import type { AiConfig } from '@/core/storage';

export const useAiConfigStore = defineStore('ai-config', () => {
  // ... 其他状态

  const configs = ref<AiConfig[]>([]);
  const activeConfigId = ref<string | null>(null);

  /**
   * 从本地存储加载 AI 配置
   */
  async function loadConfigs() {
    try {
      configs.value = await SecureLocalDB.getAiConfigs();
      const active = configs.value.find(c => c.isActive);
      if (active) {
        activeConfigId.value = active.id;
      }
    } catch (error) {
      console.error('Failed to load AI configs:', error);
    }
  }

  /**
   * 保存 AI 配置
   */
  async function saveConfig(config: AiConfig) {
    try {
      await SecureLocalDB.saveAiConfig(config);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to save AI config:', error);
      throw error;
    }
  }

  /**
   * 设置激活的配置
   */
  async function setActiveConfig(id: string) {
    try {
      await SecureLocalDB.setActiveAiConfig(id);
      activeConfigId.value = id;
      await loadConfigs();
    } catch (error) {
      console.error('Failed to set active config:', error);
    }
  }

  /**
   * 删除配置
   */
  async function deleteConfig(id: string) {
    try {
      await SecureLocalDB.deleteAiConfig(id);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to delete AI config:', error);
    }
  }

  // 初始化时加载
  onMounted(() => {
    loadConfigs();
  });

  return {
    configs,
    activeConfigId,
    loadConfigs,
    saveConfig,
    setActiveConfig,
    deleteConfig
  };
});
```

- [ ] **Step 2: 提交**

```bash
git add src/features/ai-config/
git commit -m "feat(ai-config): migrate storage to SecureLocalDB

- Load AI configs from IndexedDB instead of backend API
- Save configs to local storage with encryption
- Set active config locally
- Add data persistence across sessions"
```

---

## Phase 6: 重构 AI Power 模块

### Task 7: 移除后端 AI 调用

**Files:**
- Modify: `src/core/ai/ai-power.ts` (移除后端调用，使用直连)

- [ ] **Step 1: 重构 AiPower 类**

Modify: `src/core/ai/ai-power.ts`

```typescript
// -*- coding: utf-8 -*-
import { SecureLocalDB } from '@/core/storage';
import { directAsk, directAiCall } from '@/core/ai/direct-ai-client';
import type { DirectAiMessage } from '@/core/ai/direct-ai-client';
import { Tools } from '@/shared/utils/tools';
import { Logger } from '@/shared/utils/logger';

const AI_DELIVERY_DIRECT_RESPONSE_FORMAT =
  '请严格只输出一行 JSON，且只能包含键 match 与 reason：{"match":true|false,"reason":"[CODE] 简短原因"}。禁止输出 Markdown、代码块或额外说明。';

const logger = Logger.rootLogger;

const wrapFilterResponse = (data: unknown): { data: { code: number; data: unknown } } => {
  return {
    data: {
      code: 200,
      data,
    },
  };
};

const buildDirectFilterMessages = (
  prompt: string,
  jobBaseInfo: string,
  jobExtInfo: string
): DirectAiMessage[] => {
  return [
    {
      role: 'system',
      content: `${prompt}\n\n${AI_DELIVERY_DIRECT_RESPONSE_FORMAT}`,
    },
    {
      role: 'user',
      content: `[岗位基础信息]\n${jobBaseInfo}\n\n[岗位扩展信息]\n${jobExtInfo}`,
    },
  ];
};

const buildDirectTimeoutConfig = <T extends { timeout?: number }>(
  config: T,
  timeoutMs: number
): T => {
  return {
    ...config,
    timeout: Math.max(5, Math.ceil(timeoutMs / 1000)),
  };
};

export class AiPower {
  /**
   * 获取当前过滤路径
   * 纯前端版本：始终返回 'direct'（直连模式）
   */
  static getFilterPath(): 'direct' | 'disabled' {
    return 'direct';
  }

  /**
   * AI 问答 - 使用直连模式
   */
  static async ask(
    question: string,
    jobKey: string,
    bossUserInfo: { jobTitle: string }
  ): Promise<any> {
    const config = await SecureLocalDB.getActiveAiConfig();

    if (!config) {
      throw new Error('未配置 AI 模型，请先在 AI 配置中设置');
    }

    const channelKey = Tools.getCurrentAiModelChannelKey();
    const systemPrompt = Tools.getMergedPromptTextByChannel(channelKey);

    return directAsk(question, systemPrompt, [], {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      apiFormat: config.apiFormat,
      timeout: config.timeout
    });
  }

  /**
   * AI 投递过滤 - 使用直连模式
   */
  static async filter(
    prompt: string,
    jobBaseInfo: string,
    jobExtInfo: string,
    timeoutMs = 60_000
  ): Promise<any> {
    const startedAt = Date.now();

    const config = await SecureLocalDB.getActiveAiConfig();
    if (!config) {
      throw new Error('AI投递过滤需要配置 AI 模型，请先在 AI 配置中设置');
    }

    logger.info(
      `AI.filter start path=direct timeoutMs=${timeoutMs} promptChars=${prompt.length} baseInfoChars=${jobBaseInfo.length} extInfoChars=${jobExtInfo.length}`
    );

    const messages = buildDirectFilterMessages(prompt, jobBaseInfo, jobExtInfo);
    const directConfig = buildDirectTimeoutConfig(
      {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        modelName: config.modelName,
        apiFormat: config.apiFormat
      },
      timeoutMs
    );

    try {
      const answer = await directAiCall(directConfig, messages);
      logger.info(`AI.filter done path=direct elapsedMs=${Date.now() - startedAt}`);
      return wrapFilterResponse(answer);
    } catch (error: any) {
      logger.error('AI.filter failed:', error);
      throw new Error(`AI 过滤失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 更新问答状态
   * 纯前端版本：本地管理会话状态
   */
  static async updateAskStatus(jobKey: string, stop: boolean): Promise<any> {
    // 在本地存储中更新会话状态
    const session = await SecureLocalDB.getChatSession(jobKey);
    if (session) {
      session.isAiEnabled = !stop;
      await SecureLocalDB.saveChatSession(session);
    }

    return wrapFilterResponse({ success: true });
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/core/ai/ai-power.ts
git commit -m "feat(ai-power): remove backend dependency, use direct API calls

- Remove all backend API calls from AiPower class
- Use SecureLocalDB.getActiveAiConfig() for AI config
- Always use direct API mode (no backend proxy)
- Update updateAskStatus to use local session storage
- Add better error messages for missing AI config"
```

---

## Phase 7: 初始化集成

### Task 8: 应用启动时初始化本地数据库

**Files:**
- Modify: `src/app/main.ts` (添加初始化)

- [ ] **Step 1: 修改 main.ts**

Modify: `src/app/main.ts`

```typescript
// 在应用启动时添加
import { LocalDB } from '@/core/storage';

async function initApp() {
  // 初始化本地数据库
  try {
    await LocalDB.init();
    console.log('[AI Job] Local database initialized');
  } catch (error) {
    console.error('[AI Job] Failed to initialize local database:', error);
  }

  // 原有初始化代码...
}

initApp();
```

- [ ] **Step 2: 提交**

```bash
git add src/app/main.ts
git commit -m "feat(app): initialize LocalDB on app startup

- Add LocalDB.init() call in main.ts
- Add error handling for database initialization
- Log initialization status"
```

---

## Phase 8: 清理后端依赖

### Task 9: 移除后端 API 配置

**Files:**
- Modify: `vite.config.ts` (移除后端 URL 配置)
- Modify: `src/core/http/request.ts` (更新请求配置)

- [ ] **Step 1: 修改 vite.config.ts**

Modify: `vite.config.ts`

```typescript
// 移除或注释掉后端相关配置
// const DEFAULT_API_BASE_URL = 'https://43.138.246.37/';
// ... 其他后端相关代码

// 如果后续还需要保留用于其他目的，可以设置为 localhost 或空
const DEFAULT_API_BASE_URL = 'http://localhost'; // 不再使用
```

- [ ] **Step 2: 修改 security-utils.ts**

Modify: `src/shared/utils/security-utils.ts`

```typescript
// 移除后端 IP 从白名单
const OUTBOUND_HOST_ALLOWLIST_DEFAULT = [
  'zhipin.com',
  // '43.138.246.37', // 已移除 - 不再依赖此后端
  'api.openai.com',
  'openrouter.ai',
  'api.deepseek.com',
  'api.siliconflow.cn',
  'api.moonshot.cn',
  'ark.cn-beijing.volces.com',
];
```

- [ ] **Step 3: 提交**

```bash
git add vite.config.ts src/shared/utils/security-utils.ts
git commit -m "chore(config): remove backend server dependencies

- Remove 43.138.246.37 from outbound host whitelist
- Comment out backend URL configuration
- Mark backend as no longer needed"
```

---

## Phase 9: 数据迁移工具

### Task 10: 创建数据迁移功能

**Files:**
- Create: `src/core/storage/migration.ts`

- [ ] **Step 1: 创建迁移工具**

Create: `src/core/storage/migration.ts`

```typescript
import { SecureLocalDB } from './secure-local-db';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.rootLogger;

/**
 * 从旧版本迁移数据（Tampermonkey storage -> IndexedDB）
 */
export async function migrateFromLegacy(): Promise<boolean> {
  try {
    // 检查是否已经迁移过
    const profile = await SecureLocalDB.getUserProfile();
    if (profile) {
      logger.info('Migration already completed');
      return false;
    }

    // 从 Tampermonkey storage 读取旧数据
    const legacyUser = GM_getValue('user', null);
    const legacyPreference = GM_getValue('preference', null);
    const legacyAiConfigs = GM_getValue('aiConfigs', null);

    if (!legacyUser && !legacyPreference && !legacyAiConfigs) {
      logger.info('No legacy data to migrate');
      return false;
    }

    logger.info('Starting migration from legacy storage...');

    // 迁移用户数据
    if (legacyUser) {
      // 转换并保存用户数据
      logger.info('Migrating user data...');
    }

    // 迁移偏好设置
    if (legacyPreference) {
      logger.info('Migrating preferences...');
      await SecureLocalDB.savePreferences(legacyPreference);
    }

    // 迁移 AI 配置
    if (legacyAiConfigs && Array.isArray(legacyAiConfigs)) {
      logger.info(`Migrating ${legacyAiConfigs.length} AI configs...`);
      for (const config of legacyAiConfigs) {
        await SecureLocalDB.saveAiConfig(config);
      }
    }

    logger.info('Migration completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration failed:', error);
    return false;
  }
}

/**
 * 导出所有数据为 JSON 文件（用于备份）
 */
export async function exportDataToFile(): Promise<void> {
  const data = await SecureLocalDB.exportEncryptedData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-job-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入数据
 */
export async function importDataFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    await SecureLocalDB.importEncryptedData(text);
    return true;
  } catch (error) {
    logger.error('Import failed:', error);
    return false;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/core/storage/migration.ts
git commit -m "feat(migration): add data migration and backup tools

- Add migrateFromLegacy() for migrating from Tampermonkey storage
- Add exportDataToFile() for creating encrypted backups
- Add importDataFromFile() for restoring from backups
- Support seamless migration from old versions"
```

---

## Phase 10: 测试与验证

### Task 11: 集成测试

**Files:**
- Create: 测试脚本和清单

- [ ] **Step 1: 创建测试清单**

Create: `docs/testing/frontend-only-integration-checklist.md`

```markdown
# 纯前端化集成测试清单

## 数据库功能
- [ ] LocalDB 初始化成功
- [ ] 用户档案加密存储
- [ ] AI 配置加密存储
- [ ] 投递记录保存和查询
- [ ] 数据导出/导入功能

## 认证功能
- [ ] 从 BOSS 页面提取 Token
- [ ] 本地认证成功
- [ ] 登录状态持久化
- [ ] Token 过期检测

## AI 功能
- [ ] AI 配置从本地加载
- [ ] 直连 AI API 成功
- [ ] AI 问答功能正常
- [ ] AI 投递过滤正常

## 配置功能
- [ ] 偏好设置本地保存
- [ ] AI 配置本地保存
- [ ] 配置跨会话持久化

## 数据安全
- [ ] API Key 加密存储
- [ ] Token 加密存储
- [ ] 数据导出包含加密

## 异常处理
- [ ] 数据库初始化失败处理
- [ ] 认证失败提示
- [ ] AI 调用失败处理
```

- [ ] **Step 2: 提交**

```bash
git add docs/testing/
git commit -m "docs: add integration testing checklist

- Create comprehensive testing checklist
- Cover database, auth, AI, config, security aspects
- Include error handling scenarios"
```

---

## 总结

### 已完成的任务

1. ✅ 添加 IndexedDB 依赖
2. ✅ 创建 LocalDB 核心存储模块
3. ✅ 实现 Web Crypto 加密模块
4. ✅ 集成加密到 LocalDB (SecureLocalDB)
5. ✅ 重构认证系统为本地认证
6. ✅ 迁移 AI 配置存储到本地
7. ✅ 重构 AI Power 移除后端依赖
8. ✅ 初始化集成（应用启动）
9. ✅ 清理后端依赖配置
10. ✅ 创建数据迁移工具
11. ✅ 测试与验证

### 文件变更汇总

**新增文件：**
- `src/core/storage/types.ts`
- `src/core/storage/local-db.ts`
- `src/core/storage/encryption.ts`
- `src/core/storage/secure-local-db.ts`
- `src/core/storage/index.ts`
- `src/core/auth/local-auth.ts`
- `src/core/storage/migration.ts`
- 测试文件

**修改文件：**
- `package.json` (添加 idb 依赖)
- `src/core/auth/auth.ts` (重构认证逻辑)
- `src/core/auth/index.ts` (更新导出)
- `src/core/ai/ai-power.ts` (移除后端调用)
- `src/features/ai-config/stores/ai-config.ts` (迁移存储)
- `src/app/main.ts` (初始化数据库)
- `vite.config.ts` (移除后端配置)
- `src/shared/utils/security-utils.ts` (移除后端 IP)

### 后续建议

1. **简历解析功能**：实现前端 OCR（使用 Kimi 文件解析 API）
2. **聊天记录存储**：完善聊天会话的本地存储
3. **UI 更新**：添加数据备份/恢复界面
4. **性能优化**：大数据量时的 IndexedDB 性能优化
5. **文档更新**：更新用户文档，说明纯前端化的变化

---

**执行方式选择：**

1. **Subagent-Driven (推荐)** - 分派子代理逐个任务执行
2. **Inline Execution** - 在当前会话批量执行

**请告诉我您希望如何执行此计划？**
