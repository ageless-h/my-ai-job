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

  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      const sanitized = JSON.parse(JSON.stringify(preferences)) as UserPreferences;
      await this.ensureDB().put('preferences', sanitized);
    } catch (error) {
      console.error('Failed to sanitize preferences for IndexedDB:', error);
      throw error;
    }
  }

  static async getPreferences(): Promise<UserPreferences | undefined> {
    const preferences = await this.ensureDB().getAll('preferences');
    return preferences[0];
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

    return {
      userProfile: await this.getUserProfile(),
      preferences: await this.getPreferences(),
      aiConfigs: await db.getAll('aiConfigs'),
      deliveryRecords: await db.getAllFromIndex('deliveryRecords', 'byTimestamp'),
      chatSessions: await db.getAll('chatSessions'),
      resumeData: (await db.getAll('resumeData'))[0]
    };
  }

  static async importAllData(data: StorageImportData): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(
      ['userProfile', 'preferences', 'aiConfigs', 'deliveryRecords', 'chatSessions', 'resumeData'],
      'readwrite'
    );

    if (data.userProfile) {
      await tx.objectStore('userProfile').put(data.userProfile);
    }

    if (data.preferences) {
      await tx.objectStore('preferences').put(data.preferences);
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
