import { afterEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

vi.stubGlobal('window', {});
const { BossPlatform } = await import('./boss-platform');
const { runtimeUserStore, PushStatus } = await import('@/core/engine/push-engine');
const { Tools } = await import('@/shared/utils/tools');
const { TampermonkeyApi } = await import('@/shared/utils/tampermonkey');
const { BossApiClient } = await import('./boss-api-client');
const { default: axios } = await import('axios');

afterEach(() => { vi.restoreAllMocks(); });

// Keep startPush, real dispatch waits, retries and after-handlers. Only model,
// transport, lock storage and input timing are controlled by the fixture.
function fixture() {
  const id = '101';
  runtimeUserStore.user = reactive({ ...runtimeUserStore.user, id });
  runtimeUserStore.user.preference = { pushIntervalSec: 3, customGreetingEnabled: true, customGreeting: 'test' };
  let lock = '';
  vi.spyOn(Tools, 'getPageUidString').mockImplementation(() => String(runtimeUserStore.user.id));
  vi.spyOn(Tools, 'getCurrentHostname').mockReturnValue('www.zhipin.com');
  vi.spyOn(TampermonkeyApi, 'GmGetValue').mockImplementation(((key: string, fallback: unknown) => key === TampermonkeyApi.PUSH_LOCK ? lock : fallback) as any);
  vi.spyOn(TampermonkeyApi, 'GmSetValue').mockImplementation(((key: string, value: unknown) => { if (key === TampermonkeyApi.PUSH_LOCK) lock = String(value); }) as any);
  const sleep = vi.spyOn(Tools, 'sleep').mockResolvedValue(undefined);
  const post = vi.fn().mockResolvedValue({ code: 0, message: 'Success' });
  const sdk = vi.fn().mockResolvedValue({messages:[{}]});
  const match = vi.fn().mockResolvedValue(true);
  Tools.window.GeekChatCore = {getInstance: () => ({sendTextMessage: sdk})} as any;
  const platform = Object.assign(Object.create(BossPlatform.prototype), {
    _selfDefPushCountLimit: -1, _collectMode: false, pushStatus: PushStatus.NOT_START,
    _pushMock: false, startPreHandler() {}, getManualVerificationReason: () => null,
    getJobList: () => [{jobName:'fixture', encryptBossId:'enc'}], next: async () => false,
    preferenceLogRecorder:{ warn:vi.fn(), info:vi.fn() }, matchJob:match,
    apiClient: { doPush:post }, requestBossDataByCache:async () => ({bossId:123}), lastAutoContactTs:0,
  });
  return {platform, post, sdk, match, sleep};
}

describe('批量运行跨异步边界校验', () => {
  it('在实际投递间隔内暂停，取消这次提交', async () => {
    const {platform, post, sleep} = fixture();
    sleep.mockImplementation((async (ms: number) => { if (ms === 3000) platform.pausePush(); }) as any);
    await platform.startPush();
    expect(post).not.toHaveBeenCalled();
    expect(platform.lastStopReason).toContain('暂停');
  });
  for (const collect of [false,true]) {
    it(`模型返回前切号后停止${collect ? '收藏' : '投递'}`, async () => {
      const {platform, post, match} = fixture();
      platform.collectMode = collect;
      platform.doCollect = post;
      match.mockImplementation(async () => { runtimeUserStore.user.id = '202'; return true; });
      await platform.startPush();
      expect(post).not.toHaveBeenCalled();
      expect(platform.lastStopReason).toContain('账号');
    });
  }
  it('等待中切号后再切回，旧任务保持取消', async () => {
    const {platform, post, match} = fixture();
    match.mockImplementation(async () => {
      runtimeUserStore.user.id = '202';
      runtimeUserStore.user.id = '101';
      return true;
    });
    await platform.startPush();
    expect(post).not.toHaveBeenCalled();
    expect(platform.lastStopReason).toContain('账号');
  });
  it('请求期间切号后不计入新账号、不发招呼语', async () => {
    const {platform, post, sdk} = fixture();
    post.mockImplementation(async () => {runtimeUserStore.user.id = '202'; return {code:0,message:'Success'};});
    const after = vi.spyOn(platform, 'pushAfterHandler');
    await platform.startPush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled();
    expect(sdk).not.toHaveBeenCalled();
    expect(platform.lastStopReason).toContain('账号');
  });
  it('网络重试等待中切号后只保留第一次请求', async () => {
    const {platform, post, sleep} = fixture();
    post.mockRejectedValue(new Error('network error'));
    sleep.mockImplementation((async (ms: number) => {if (ms === 1000) runtimeUserStore.user.id = '202';}) as any);
    await platform.startPush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(platform.lastStopReason).toContain('账号');
  });
  it('读取收件人时切号后取消附加消息', async () => {
    const {platform, sdk} = fixture();
    platform.requestBossDataByCache = async () => {runtimeUserStore.user.id = '202'; return {bossId:123};};
    await platform.startPush();
    expect(sdk).not.toHaveBeenCalled();
  });
  it('DOM 收藏定位期间暂停后不点击收藏按钮', async () => {
    const {platform} = fixture();
    platform.collectMode = true;
    const click = vi.fn();
    vi.stubGlobal('MouseEvent', class {});
    Object.assign(platform, {
      findJobCardByJobDetail: () => ({dispatchEvent() {}, querySelector: () => null}),
      waitFavoriteConfirmed: async () => ({confirmed:false}),
      waitRelatedDetailScopes: async () => {platform.pausePush(); return [];},
      findFavoriteButtonInScope: () => ({done:false, button:{click}}),
    });
    try { await platform.startPush(); } finally { vi.unstubAllGlobals(); }
    expect(click).not.toHaveBeenCalled();
    expect(platform.lastStopReason).toContain('暂停');
  });
  it('收藏主端点失败后，切号阻止备用端点请求', async () => {
    const {platform} = fixture();
    platform.apiClient = new BossApiClient();
    platform.waitFavoriteConfirmed = async () => ({confirmed:false});
    platform.triggerFavoriteByDom = async () => ({success:false});
    vi.spyOn(Tools, 'getCookieValue').mockReturnValue('test');
    const post = vi.spyOn(axios, 'post').mockImplementation(async () => {runtimeUserStore.user.id = '202'; throw new Error('network');});
    await expect(platform.doCollect({encryptJobId:'fake',securityId:'fake'})).rejects.toThrow('账号');
    expect(post).toHaveBeenCalledTimes(1);
  });
});
