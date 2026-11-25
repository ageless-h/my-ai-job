import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// message.ts reads window at module initialization in userscript mode.
vi.stubGlobal('window', {});
const { getFollowupSender, prepareFollowupImage, resolveFollowupRecipient } = await import('./followup-channel');

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('resolveFollowupRecipient', () => {
  it('accepts direct zpData.bossId and preserves encrypted id', () => {
    expect(resolveFollowupRecipient({ bossId: 123, encryptBossId: 'enc-123' })).toEqual({
      uid: '123', encryptUid: 'enc-123',
    });
  });

  it('accepts nested zpData.data.bossId', () => {
    expect(resolveFollowupRecipient({ data: { bossId: '456' } })).toEqual({ uid: '456' });
  });

  it('rejects missing, invalid, or conflicting identities', () => {
    expect(() => resolveFollowupRecipient({})).toThrow('无法确认');
    expect(() => resolveFollowupRecipient({ bossId: 'abc' })).toThrow('无法确认');
    expect(() => resolveFollowupRecipient({ bossId: 1, data: { bossId: 2 } })).toThrow('无法确认');
    expect(() => resolveFollowupRecipient({ bossId: 1, encryptBossId: 'other' }, 'expected')).toThrow('不一致');
  });
});

describe('getFollowupSender', () => {
  const recipient = { uid: '123', encryptUid: 'enc-123' };
  const text = { kind: 'text' as const, text: '你好' };
  const image = {
    kind: 'image' as const,
    originImage: { url: 'https://cdn.test/origin.jpg', width: 1200, height: 1800 },
    tinyImage: { url: 'https://cdn.test/tiny.jpg', width: 120, height: 180 },
  };

  it('uses a send method exposed directly by the SDK proxy', async () => {
    const sendTextMessage = vi.fn().mockResolvedValue({ messages: [{ mid: 'm1' }] });
    const runtime = { GeekChatCore: { getInstance: () => ({ sendTextMessage }) } };
    const sender = getFollowupSender(runtime, 'text');
    expect(sender).not.toBeNull();
    await expect(sender!(recipient, text)).resolves.toEqual({ status: 'submitted', reason: '页面 SDK 已提交' });
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(sendTextMessage).toHaveBeenCalledWith(recipient, '你好');
  });

  it('uses socketConnect method and sends full image dimensions', async () => {
    const sendImageMessage = vi.fn().mockResolvedValue({ messages: [{ mid: 'm2' }] });
    const socketConnect = { sendImageMessage };
    const runtime = { GeekChatCore: { getInstance: () => ({ socketConnect }) } };
    const sender = getFollowupSender(runtime, 'image');
    expect(sender).not.toBeNull();
    expect((await sender!(recipient, image)).status).toBe('submitted');
    expect(sendImageMessage).toHaveBeenCalledTimes(1);
    expect(sendImageMessage).toHaveBeenCalledWith(recipient, {
      originImage: image.originImage, tinyImage: image.tinyImage,
    });
  });

  it('reports explicit SDK errors as failed and never resends', async () => {
    const sendTextMessage = vi.fn().mockResolvedValue({ error: 'uid missing' });
    const sender = getFollowupSender({ GeekChatCore: { getInstance: () => ({ sendTextMessage }) } }, 'text');
    expect((await sender!(recipient, text)).status).toBe('failed');
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('reports timeout as unknown and never resends', async () => {
    vi.useFakeTimers();
    const sendTextMessage = vi.fn(() => new Promise(() => undefined));
    const sender = getFollowupSender({ GeekChatCore: { getInstance: () => ({ sendTextMessage }) } }, 'text');
    const result = sender!(recipient, text);
    vi.advanceTimersByTime(15000);
    expect((await result).status).toBe('unknown');
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('returns no sender when no compatible channel exists', () => {
    expect(getFollowupSender({}, 'text')).toBeNull();
  });
});

describe('prepareFollowupImage', () => {
  class FakeImage {
    naturalWidth = 0;
    naturalHeight = 0;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    private currentSrc = '';
    set src(url: string) {
      this.currentSrc = url;
      queueMicrotask(() => {
        this.naturalWidth = url.includes('tiny') ? 120 : 1200;
        this.naturalHeight = url.includes('tiny') ? 180 : 1800;
        this.onload?.();
      });
    }
    removeAttribute(name: string) { if (name === 'src') this.currentSrc = ''; }
  }

  beforeEach(() => vi.stubGlobal('Image', FakeImage));

  it('loads intrinsic dimensions for both URLs', async () => {
    await expect(prepareFollowupImage('https://cdn.test/origin.jpg', 'https://cdn.test/tiny.jpg')).resolves.toEqual({
      kind: 'image',
      originImage: { url: 'https://cdn.test/origin.jpg', width: 1200, height: 1800 },
      tinyImage: { url: 'https://cdn.test/tiny.jpg', width: 120, height: 180 },
    });
  });

  it('rejects invalid URLs before image loading', async () => {
    await expect(prepareFollowupImage('javascript:alert(1)', 'https://cdn.test/tiny.jpg')).rejects.toThrow('地址无效');
  });
});
