import { stripResumeFields } from './resume-fields';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type {
  AiConfig,
  ChatSession,
  DeliveryRecord,
  ResumeData,
  StorageExportData,
  StorageImportData,
  UserPreferences,
  UserProfile
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
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((error: unknown) => {
        this.initPromise = null;
        throw new Error(`Failed to initialize LocalDB: ${errorMessage(error)}`);
      });
    }

    await this.initPromise;
  }

  static requireInitialized(): IDBPDatabase<JobHuntingDB> {
    return this.ensureDB();
  }

  static close(): void {
    this.db?.close();
    this.db = null;
    this.initPromise = null;
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

  static async setUserProfile(profile: UserProfile): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction('userProfile', 'readwrite');
    await tx.store.clear();
    await tx.store.put(profile);
    await tx.done;
  }

  static async getUserProfile(): Promise<UserProfile | undefined> {
    const profiles = await this.ensureDB().getAll('userProfile');
    return profiles[0];
  }

  static async clearUserProfile(): Promise<void> {
    await this.ensureDB().clear('userProfile');
  }

  static async savePreferences(accountId: unknown, preferences: Partial<UserPreferences>): Promise<void> {
    const id = preferenceAccountKey(accountId);
    const sanitized = JSON.parse(JSON.stringify(preferences));
    await this.ensureDB().put('preferences', { ...sanitized, id, accountScoped: true });
  }

  static async getPreferences(accountId: unknown, legacyProfile?: unknown): Promise<UserPreferences | undefined> {
    const id = preferenceAccountKey(accountId);
    const tx = this.ensureDB().transaction('preferences', 'readwrite');
    let current = await tx.store.get(id);
    // Old delivery-filter saves wrote default plus a GM profile mirror carrying the owner's id.
    // A missing owner or a differing snapshot cannot identify which account saved default.
    if (!current?.accountScoped && legacyProfile && typeof legacyProfile === 'object' &&
        'id' in legacyProfile && String(legacyProfile.id) === id && 'preference' in legacyProfile) {
      const legacy = await tx.store.get('default');
      if (legacy && samePreferenceSnapshot(legacy, legacyProfile.preference)) {
        current = { ...current, ...legacy, id, accountScoped: true };
        await tx.store.put(current);
        await tx.store.delete('default');
      }
    }
    await tx.done;
    return current;
  }

  static async saveAiConfig(config: AiConfig): Promise<void> {
    await this.ensureDB().put('aiConfigs', config);
  }

  static async getAiConfigs(): Promise<AiConfig[]> {
    return this.ensureDB().getAll('aiConfigs');
  }

  static async getActiveAiConfig(): Promise<AiConfig | undefined> {
    const configs = await this.getAiConfigs();
    return configs.find((config) => config.isActive);
  }

  static async deleteAiConfig(id: string): Promise<void> {
    await this.ensureDB().delete('aiConfigs', id);
  }

  static async addDeliveryRecord(record: DeliveryRecord): Promise<void> {
    await this.ensureDB().add('deliveryRecords', record);
  }

  static async getDeliveryRecords(limit = 100): Promise<DeliveryRecord[]> {
    const index = this.ensureDB().transaction('deliveryRecords').store.index('byTimestamp');
    return index.getAll(null, limit);
  }

  static async getDeliveryRecordsByDateRange(
    startTime: number,
    endTime: number
  ): Promise<DeliveryRecord[]> {
    const index = this.ensureDB().transaction('deliveryRecords').store.index('byTimestamp');
    return index.getAll(IDBKeyRange.bound(startTime, endTime));
  }

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

  static async saveResume(data: ResumeData): Promise<void> {
    await this.ensureDB().put('resumeData', data);
  }

  static async getResume(userId: string): Promise<ResumeData | undefined> {
    return this.ensureDB().get('resumeData', userId);
  }

  static async clearResume(userId: string): Promise<void> {
    await this.ensureDB().delete('resumeData', userId);
  }

  static async exportAllData(): Promise<StorageExportData> {
    const db = this.ensureDB();

    const userProfile = await this.getUserProfile();
    return {
      userProfile,
      preferences: userProfile ? await this.getPreferences(userProfile.id) : undefined,
      aiConfigs: await db.getAll('aiConfigs'),
      deliveryRecords: await db.getAllFromIndex('deliveryRecords', 'byTimestamp'),
      chatSessions: await db.getAll('chatSessions'),
      resumeData: userProfile ? await this.getResume(userProfile.id) : undefined
    };
  }

  static async importAllData(data: StorageImportData): Promise<void> {
    const owner = data.preferences && preferenceAccountKey(data.preferences.id === 'default'
      ? data.userProfile?.id : data.preferences.id);
    if (owner && data.userProfile && owner !== data.userProfile.id) throw new Error('备份偏好账号不一致');
    const db = this.ensureDB();
    const tx = db.transaction(
      ['userProfile', 'preferences', 'aiConfigs', 'deliveryRecords', 'chatSessions', 'resumeData'],
      'readwrite'
    );

    const existing = await tx.objectStore('userProfile').getAllKeys();
    const active = existing[0];
    const expected = data.userProfile?.id ?? active;
    if ((active && expected !== active) || (owner && expected !== owner) ||
        (data.resumeData && (!expected || data.resumeData.userId !== expected))) {
      throw new Error('备份账号与当前账号、偏好或附件简历不一致');
    }
    if (data.userProfile) {
      await tx.objectStore('userProfile').clear();
      await tx.objectStore('userProfile').put(data.userProfile);
    }

    if (data.preferences && owner) {
      await tx.objectStore('preferences').put({ ...data.preferences, id: owner, accountScoped: true });
    }

    for (const config of data.aiConfigs ?? []) {
      await tx.objectStore('aiConfigs').put(config);
    }

    for (const record of data.deliveryRecords ?? []) {
      await tx.objectStore('deliveryRecords').put(record);
    }

    for (const session of data.chatSessions ?? []) {
      await tx.objectStore('chatSessions').put(session);
    }

    if (data.resumeData) {
      await tx.objectStore('resumeData').put(data.resumeData);
    }

    await tx.done;
  }

  static async clearAccountSensitiveData(accountId: string): Promise<void> {
    const id = preferenceAccountKey(accountId);
    const tx = this.ensureDB().transaction(['userProfile', 'preferences', 'resumeData', 'aiConfigs'], 'readwrite');
    if (!(await tx.objectStore('userProfile').get(id))) throw new Error('当前登录账号已变化');
    const preferences = tx.objectStore('preferences');
    const saved = await preferences.get(id);
    if (saved) {
      stripResumeFields(saved);
      await preferences.put(saved);
    }
    await tx.objectStore('resumeData').delete(id);
    const models = tx.objectStore('aiConfigs');
    for (const model of await models.getAll()) {
      if (model.apiKey) await models.put({ ...model, apiKey: '' });
    }
    await tx.done;
  }

  static async clearAll(): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(
      ['userProfile', 'preferences', 'aiConfigs', 'deliveryRecords', 'chatSessions', 'resumeData'],
      'readwrite'
    );

    await Promise.all([
      tx.objectStore('userProfile').clear(),
      tx.objectStore('preferences').clear(),
      tx.objectStore('aiConfigs').clear(),
      tx.objectStore('deliveryRecords').clear(),
      tx.objectStore('chatSessions').clear(),
      tx.objectStore('resumeData').clear()
    ]);
    await tx.done;
  }
}

function preferenceAccountKey(value: unknown): string {
  const key = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  if (!key || key === 'default') throw new Error('无法确定偏好所属账号');
  return key;
}

function samePreferenceSnapshot(stored: UserPreferences, snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
  const comparable = (value: object) => JSON.stringify(Object.entries(value)
    .filter(([key]) => key !== 'id').sort(([a], [b]) => a.localeCompare(b)));
  return comparable(stored) === comparable(snapshot);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
