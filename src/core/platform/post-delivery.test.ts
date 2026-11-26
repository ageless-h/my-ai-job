import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {});
const { BossPlatform } = await import('./boss-platform');
const { PushStatus, runtimeUserStore } = await import('@/core/engine/push-engine');
const { Tools } = await import('@/shared/utils/tools');

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(imageEnabled: boolean) {
  vi.useFakeTimers();
  const image = vi.fn().mockResolvedValue({messages: [{}]});
  const text = vi.fn().mockResolvedValue({messages: [{}]});
  Tools.window.GeekChatCore = { getInstance: () => ({sendTextMessage: text, sendImageMessage: image}) } as any;
  vi.stubGlobal('Image', class {
    naturalWidth = 20; naturalHeight = 30; onload?: () => void;
    set src(_url: string) { Promise.resolve().then(() => this.onload?.()); }
  });
  runtimeUserStore.user.preference = {customGreetingEnabled: true, customGreeting: 'B', customImageEnabled: imageEnabled, customImageSet: 'https://img.test/a===https://img.test/a', autoContactMinIntervalSec: 10};
  const platform: BossPlatformType = Object.create(BossPlatform.prototype);
  Object.assign(platform, {pushStatus: PushStatus.PUSHING, lastAutoContactTs: 0, preferenceLogRecorder: {info: vi.fn(), warn: vi.fn()}, getManualVerificationReason: () => null, requestBossDataByCache: async () => ({bossId: 123})});
  const done = platform.pushAfterHandler({code: 0, message: 'Success'}, {jobName: 'job', encryptBossId: 'enc'});
  return {platform, image, text, done};
}
type BossPlatformType = InstanceType<typeof BossPlatform>;

describe('follow-ups after a successful delivery', () => {
  it('waits the shared interval before submitting the greeting', async () => {
    const { image, text, done } = setup(true);
    await vi.advanceTimersByTimeAsync(9999);
    expect(image).toHaveBeenCalledTimes(1);
    expect(text).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(text).toHaveBeenCalledTimes(1);
  });
  it('cancels the waiting greeting when paused', async () => {
    const { platform, text, done } = setup(true);
    await vi.advanceTimersByTimeAsync(1);
    platform.pausePush();
    await vi.advanceTimersByTimeAsync(10000);
    await done;
    expect(text).not.toHaveBeenCalled();
  });
  for (const [name, patch, kind] of [
    ['关闭文字', {customGreetingEnabled: false}, 'text'],
    ['修改文字', {customGreeting: 'C'}, 'text'],
    ['关闭图片', {customImageEnabled: false}, 'image'],
    ['更换图片', {customImageSet: 'https://img.test/b===https://img.test/b'}, 'image'],
  ] as const) {
    it(`cancels a queued submission on ${name}`, async () => {
      const { platform, image, text, done } = setup(true);
      if (kind === 'image') platform.lastAutoContactTs = Date.now();
      await vi.advanceTimersByTimeAsync(1);
      runtimeUserStore.user.preference = { ...runtimeUserStore.user.preference, ...patch };
      await vi.advanceTimersByTimeAsync(10000);
      const result = await done;
      expect(result.contact).toBe(true);
      expect(kind === 'image' ? image : text).not.toHaveBeenCalled();
      expect(kind === 'image' ? text : image).toHaveBeenCalledTimes(1);
    });
  }
  it('sends just the greeting with images disabled', async () => {
    const { image, text, done } = setup(false);
    await done;
    expect(image).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledWith({uid: '123', encryptUid: 'enc'}, 'B');
  });
});
