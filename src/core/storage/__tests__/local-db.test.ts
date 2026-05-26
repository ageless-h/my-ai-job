import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalDB } from '../local-db';
import type {
  AiConfig,
  ChatSession,
  DeliveryRecord,
  ResumeData,
  UserPreferences,
  UserProfile
} from '../types';

const now = 1_700_000_000_000;

describe('LocalDB', () => {
  beforeEach(async () => {
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  afterEach(async () => {
    await LocalDB.init();
    await LocalDB.clearAll();
  });

  it('throws a helpful error when used before initialization', () => {
    LocalDB.close();
    expect(() => LocalDB.requireInitialized()).toThrow('LocalDB not initialized');
  });

  describe('user profile', () => {
    it('saves, retrieves, and clears the current profile', async () => {
      const profile: UserProfile = {
        id: 'test-user-123',
        token: 'boss-token-xyz',
        email: 'test@example.com',
        authenticatedAt: now
      };

      await LocalDB.setUserProfile(profile);

      expect(await LocalDB.getUserProfile()).toEqual(profile);

      await LocalDB.clearUserProfile();
      expect(await LocalDB.getUserProfile()).toBeUndefined();
    });

    it('replaces the singleton current profile when a new profile is saved', async () => {
      await LocalDB.setUserProfile({ id: 'first', token: 'first-token', authenticatedAt: now });
      await LocalDB.setUserProfile({ id: 'second', token: 'second-token', authenticatedAt: now + 1 });

      expect(await LocalDB.getUserProfile()).toEqual({
        id: 'second',
        token: 'second-token',
        authenticatedAt: now + 1
      });
    });
  });

  describe('preferences', () => {
    it('saves and retrieves preferences', async () => {
      const preferences: UserPreferences = {
        id: 'default',
        pushIntervalSec: 15,
        maxDailyActions: 100,
        maxActionsPerMinute: 5,
        maxConsecutiveFailures: 3,
        cooldownMinutesOnLimit: 30,
        safetyTimeWindowE: true,
        safetyStartHour: 9,
        safetyEndHour: 22,
        imMaxReloadPerDay: 20,
        cleanerManualConfirmThreshold: 10,
        autoContactMinIntervalSec: 60,
        maxAutoMessagePerSession: 5,
        maxAutoResumePerSession: 3,
        chatMinReplyIntervalSec: 30,
        chatMaxPerMinute: 2,
        chatMaxSessionReplies: 8,
        autoResumeMaxPerSession: 3,
        acE: true,
        acW: false,
        acM: true,
        acY: false
      };

      await LocalDB.savePreferences(preferences);

      expect(await LocalDB.getPreferences()).toEqual(preferences);
    });
  });

  describe('AI configs', () => {
    it('saves, lists, finds active, and deletes AI configs', async () => {
      const inactive = createAiConfig('config-1', false);
      const active = createAiConfig('config-2', true);

      await LocalDB.saveAiConfig(inactive);
      await LocalDB.saveAiConfig(active);

      expect(await LocalDB.getAiConfigs()).toEqual([inactive, active]);
      expect(await LocalDB.getActiveAiConfig()).toEqual(active);

      await LocalDB.deleteAiConfig('config-1');
      expect(await LocalDB.getAiConfigs()).toEqual([active]);
    });
  });

  describe('delivery records', () => {
    it('adds records, returns them by ascending timestamp, and respects limits', async () => {
      const oldest = createDeliveryRecord('record-1', now - 1_000);
      const newest = createDeliveryRecord('record-2', now);

      await LocalDB.addDeliveryRecord(newest);
      await LocalDB.addDeliveryRecord(oldest);

      expect(await LocalDB.getDeliveryRecords()).toEqual([oldest, newest]);
      expect(await LocalDB.getDeliveryRecords(1)).toEqual([oldest]);
    });

    it('filters records by inclusive timestamp range', async () => {
      const before = createDeliveryRecord('before', now - 2_000);
      const inside = createDeliveryRecord('inside', now);
      const after = createDeliveryRecord('after', now + 2_000);

      await LocalDB.addDeliveryRecord(before);
      await LocalDB.addDeliveryRecord(inside);
      await LocalDB.addDeliveryRecord(after);

      expect(await LocalDB.getDeliveryRecordsByDateRange(now - 100, now + 100)).toEqual([inside]);
    });
  });

  describe('chat sessions and resumes', () => {
    it('saves, lists, retrieves, and deletes chat sessions', async () => {
      const session: ChatSession = {
        jobKey: 'job-key-1',
        bossId: 'boss-1',
        bossName: '张三',
        jobTitle: '前端开发',
        companyName: '测试公司',
        messages: [{ id: 'msg-1', role: 'user', content: '你好', timestamp: now }],
        isAiEnabled: true,
        lastMessageAt: now,
        createdAt: now
      };

      await LocalDB.saveChatSession(session);

      expect(await LocalDB.getChatSession('job-key-1')).toEqual(session);
      expect(await LocalDB.getAllChatSessions()).toEqual([session]);

      await LocalDB.deleteChatSession('job-key-1');
      expect(await LocalDB.getChatSession('job-key-1')).toBeUndefined();
    });

    it('saves, retrieves, and clears resume data', async () => {
      const resume: ResumeData = {
        userId: 'user-1',
        rawText: 'resume text',
        parsedData: {
          name: '李四',
          phone: '13800138000',
          email: 'li@example.com',
          skills: ['Vue', 'TypeScript'],
          workExperience: '5 years',
          projects: 'AI assistant',
          education: 'Bachelor'
        },
        fileName: 'resume.pdf',
        uploadedAt: now
      };

      await LocalDB.saveResume(resume);

      expect(await LocalDB.getResume('user-1')).toEqual(resume);

      await LocalDB.clearResume('user-1');
      expect(await LocalDB.getResume('user-1')).toBeUndefined();
    });
  });

  describe('data export/import', () => {
    it('exports and imports all stores', async () => {
      const profile: UserProfile = { id: 'user-1', token: 'token-1', authenticatedAt: now };
      const config = createAiConfig('config-1', true);
      const record = createDeliveryRecord('record-1', now);

      await LocalDB.setUserProfile(profile);
      await LocalDB.saveAiConfig(config);
      await LocalDB.addDeliveryRecord(record);

      const exported = await LocalDB.exportAllData();

      await LocalDB.clearAll();
      await LocalDB.importAllData(exported);

      expect(await LocalDB.exportAllData()).toEqual(exported);
    });
  });
});

function createAiConfig(id: string, isActive: boolean): AiConfig {
  return {
    id,
    name: `Config ${id}`,
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: `key-${id}`,
    modelName: 'gpt-4o',
    apiFormat: 'completions',
    timeout: 60,
    isActive,
    createdAt: now
  };
}

function createDeliveryRecord(id: string, timestamp: number): DeliveryRecord {
  return {
    id,
    jobId: `job-${id}`,
    encryptJobId: `enc-${id}`,
    jobTitle: `岗位${id}`,
    companyName: `公司${id}`,
    status: 'success',
    timestamp
  };
}
