import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  enqueue: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
  ensureBossDomainOrThrow: vi.fn(),
  ensureNoManualVerificationOrThrow: vi.fn(),
  sleep: vi.fn(async () => undefined),
  getRandomNumber: vi.fn(() => 0),
  getLocalUser: vi.fn(() => ({ preference: {} })),
  directAiCall: vi.fn(async () => '{"shouldClean": false, "reason": "noop"}'),
  getActiveDirectConfig: vi.fn(() => ({ provider: 1, modelName: 'test-model' })),
  pageWindow: { _PAGE: { uid: 1001 } },
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet,
    post: vi.fn(),
  },
}));

vi.mock('@/core/http/request-throttle', () => ({
  bossThrottle: {
    enqueue: mocks.enqueue,
  },
}));

vi.mock('@/shared/utils/tools', () => ({
  Tools: {
    ensureBossDomainOrThrow: mocks.ensureBossDomainOrThrow,
    ensureNoManualVerificationOrThrow: mocks.ensureNoManualVerificationOrThrow,
    sleep: mocks.sleep,
    getRandomNumber: mocks.getRandomNumber,
    window: mocks.pageWindow,
  },
}));

vi.mock('@/state/user', () => ({
  getLocalUser: mocks.getLocalUser,
}));

vi.mock('@/core/ai/direct-ai-client', () => ({
  directAiCall: mocks.directAiCall,
  getActiveDirectConfig: mocks.getActiveDirectConfig,
}));

import { scanConversations } from '@/features/conversation-cleaner/services/conversation-cleaner';

describe('conversation-cleaner scanConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocalUser.mockReturnValue({ preference: {} });
    mocks.directAiCall.mockResolvedValue('{"shouldClean": false, "reason": "noop"}');
    mocks.getActiveDirectConfig.mockReturnValue({ provider: 1, modelName: 'test-model' });
    mocks.pageWindow._PAGE.uid = 1001;
  });

  it('全量扫描会话，不受 cleanerMaxScanCount 截断', async () => {
    const now = Date.now();
    const friendList = Array.from({ length: 25 }).map((_, index) => ({
      friendId: index + 1,
      encryptFriendId: `f-${index + 1}`,
      name: `候选人${index + 1}`,
      updateTime: now,
      brandName: `公司${index + 1}`,
    }));

    mocks.getLocalUser.mockReturnValue({
      preference: {
        cleanerMaxScanCount: 20,
      },
    });

    mocks.axiosGet.mockImplementation(async (url: string) => {
      if (url.includes('friend/geekFilterByLabel')) {
        return { data: { zpData: { friendList } } };
      }
      if (url.includes('friend/getGeekFriendList.json')) {
        const parsed = new URL(url);
        const friendIds = (parsed.searchParams.get('friendIds') || '')
          .split(',')
          .map((item) => Number(item))
          .filter((id) => Number.isFinite(id) && id > 0);

        return {
          data: {
            zpData: {
              result: friendIds.map((id) => ({
                uid: id,
                encryptBossId: `boss-${id}`,
                securityId: `sec-${id}`,
                encryptJobId: `job-${id}`,
                brandName: `公司${id}`,
                title: '前端工程师',
                name: `候选人${id}`,
              })),
            },
          },
        };
      }
      if (url.includes('zpchat/geek/historyMsg')) {
        return {
          data: {
            zpData: {
              messages: [
                {
                  mid: 1,
                  time: now,
                  from: { uid: 2001 },
                  to: { uid: 1001 },
                  body: { type: 1, text: '继续沟通' },
                },
              ],
            },
          },
        };
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const progress: Array<{ phase: string; current: number; total: number; message: string }> = [];
    const result = await scanConversations((item) => {
      progress.push({ phase: item.phase, current: item.current, total: item.total, message: item.message });
    });

    const detailCalls = mocks.axiosGet.mock.calls
      .map((call) => call[0] as string)
      .filter((url) => url.includes('friend/getGeekFriendList.json'));

    const doneProgress = progress.findLast((item) => item.phase === 'done');

    expect(result).toHaveLength(0);
    expect(doneProgress?.total).toBe(25);
    expect(detailCalls).toHaveLength(2);
    expect(mocks.directAiCall).toHaveBeenCalledTimes(25);
  });

  it('超过两周未活跃会话标记为 stale_no_reply 且不触发 AI', async () => {
    const now = Date.now();
    const staleMs = 14 * 24 * 60 * 60 * 1000;
    const friendList = [
      {
        friendId: 1,
        encryptFriendId: 'f-1',
        name: '候选人1',
        updateTime: now - staleMs - 1,
        brandName: '公司1',
      },
    ];

    mocks.axiosGet.mockImplementation(async (url: string) => {
      if (url.includes('friend/geekFilterByLabel')) {
        return { data: { zpData: { friendList } } };
      }
      if (url.includes('friend/getGeekFriendList.json')) {
        return {
          data: {
            zpData: {
              result: [
                {
                  uid: 1,
                  encryptBossId: 'boss-1',
                  securityId: 'sec-1',
                  encryptJobId: 'job-1',
                  brandName: '公司1',
                  title: '前端工程师',
                  name: '候选人1',
                },
              ],
            },
          },
        };
      }
      if (url.includes('zpchat/geek/historyMsg')) {
        return {
          data: {
            zpData: {
              messages: [
                {
                  mid: 1,
                  time: now - staleMs,
                  from: { uid: 2001 },
                  to: { uid: 1001 },
                  body: { type: 1, text: '你好' },
                },
              ],
            },
          },
        };
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const result = await scanConversations(() => undefined);

    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('stale_no_reply');
    expect(result[0].reasonDetail).toContain('超过 14 天未活跃');
    expect(mocks.directAiCall).not.toHaveBeenCalled();
  });

  it('单个会话分析失败时在完成提示中包含失败计数', async () => {
    const now = Date.now();
    const friendList = [
      {
        friendId: 1,
        encryptFriendId: 'f-1',
        name: '候选人1',
        updateTime: now,
        brandName: '公司1',
      },
    ];

    mocks.axiosGet.mockImplementation(async (url: string) => {
      if (url.includes('friend/geekFilterByLabel')) {
        return { data: { zpData: { friendList } } };
      }
      if (url.includes('friend/getGeekFriendList.json')) {
        return {
          data: {
            zpData: {
              result: [
                {
                  uid: 1,
                  encryptBossId: 'boss-1',
                  securityId: 'sec-1',
                  encryptJobId: 'job-1',
                  brandName: '公司1',
                  title: '前端工程师',
                  name: '候选人1',
                },
              ],
            },
          },
        };
      }
      if (url.includes('zpchat/geek/historyMsg')) {
        throw new Error('history failed');
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const progress: Array<{ phase: string; message: string }> = [];
    await scanConversations((item) => {
      progress.push({ phase: item.phase, message: item.message });
    });

    const doneProgress = progress.findLast((item) => item.phase === 'done');
    expect(doneProgress?.message).toContain('1 个会话分析失败');
  });
});
