import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FollowupTraceEvent } from './followup-channel';
import { getWorkerFollowupSender } from './worker-followup';
vi.stubGlobal('window', {});
const { getFollowupSender } = await import('./followup-channel');
const content = { kind: 'text' as const, text: 'DO_NOT_LOG' };
const recipient = { uid: '21987654321' };

type Listener = (payload: unknown) => void;
function fixture(send: (mid: number) => unknown) {
  const listeners = new Map<string, Set<Listener>>();
  const worker = {
    isReady: true,
    addListener(type: string, fn: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn);
    },
    sendTextMessage: vi.fn((user: { clientMid: number }) => send(user.clientMid)),
  };
  return {
    worker,
    sender: getWorkerFollowupSender(worker, 'text')!,
    fire(type: string, payload: unknown) {
      listeners.get(type)?.forEach((fn) => fn(payload));
    },
    listeners: () => Array.from(listeners.values()).reduce((sum, set) => sum + set.size, 0),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('消息诊断时间线', () => {
  it('15秒返回并于16秒收到同一条消息的送达；无重发、重复事件或监听器残留', async () => {
    const f = fixture(() => ({ messages: [{}] }));
    const events: FollowupTraceEvent[] = [];
    const result = f.sender(recipient, content, (e) => {
      events.push(e);
    });
    const cmid = (f.worker.sendTextMessage.mock.calls[0][0] as { clientMid: number }).clientMid;
    f.fire('message-delivered', { messages: [{ cmid: cmid + 1 }] });
    await vi.advanceTimersByTimeAsync(15000);
    expect((await result).status).toBe('submitted');
    await vi.advanceTimersByTimeAsync(1000);
    for (let i = 0; i < 2; i++) f.fire('message-delivered', { messages: [{ cmid: String(cmid) }] });
    expect(events.map((e) => e.phase)).toEqual([
      'submit_call',
      'submitted',
      'deadline',
      'delivered',
    ]);
    expect(events[0]).toMatchObject({ ready: true, channel: 'worker' });
    expect(events[3]).toMatchObject({ elapsedMs: 16000, submitted: true, late: true });
    expect(f.worker.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(f.listeners()).toBe(0);
    expect((vi as typeof vi & { getTimerCount(): number }).getTimerCount()).toBe(0);
  });
  it('并发跟踪、后台送达超时、迟到的请求响应和60秒停止观察', async () => {
    let reply!: (v: unknown) => void;
    const f = fixture(
      () =>
        new Promise((resolve) => {
          reply = resolve;
        })
    );
    const a: FollowupTraceEvent[] = [],
      b: FollowupTraceEvent[] = [];
    const first = f.sender(recipient, content, (e) => {
      a.push(e);
    });
    const second = f.sender(recipient, content, (e) => {
      b.push(e);
    });
    const [m, n] = f.worker.sendTextMessage.mock.calls.map(
      (args) => (args[0] as { clientMid: number }).clientMid
    );
    f.fire('send-error', { message: { cmid: n }, error: 'Delivery timeout DO_NOT_LOG' });
    f.fire('send-error', { message: { cmid: n }, error: 'Delivery timeout DO_NOT_LOG' });
    f.fire('message-delivered', { messages: [{ cmid: m }] });
    expect((await first).status).toBe('delivered');
    await vi.advanceTimersByTimeAsync(15000);
    expect((await second).reason).toContain('后台');
    reply({ messages: [{}] });
    await vi.advanceTimersByTimeAsync(60000);
    expect(a.map((e) => e.phase)).toEqual(['submit_call', 'delivered']);
    expect(b.map((e) => e.phase)).toEqual([
      'submit_call',
      'delivery_timeout',
      'deadline',
      'submitted',
      'observation_end',
    ]);
    expect(b[3].late).toBe(true);
    expect(f.listeners()).toBe(0);
    expect(/DO_NOT_LOG|21987654321/.test(JSON.stringify([...a, ...b]))).toBe(false);
  });
  for (const [error, phase] of [
    ['Request timeout DO_NOT_LOG', 'request_timeout'],
    ['waitForReady timeout DO_NOT_LOG', 'ready_timeout'],
  ]) {
    it(`区分 ${phase} 和插件 deadline`, async () => {
      const events: FollowupTraceEvent[] = [];
      const f = fixture(() => Promise.reject(new Error(error)));
      const result = f.sender(recipient, content, (e) => {
        events.push(e);
      });
      await vi.advanceTimersByTimeAsync(15000);
      expect((await result).status).toBe('unknown');
      expect(events.map((e) => e.phase)).toEqual(['submit_call', phase, 'deadline']);
      window.dispatchEvent(new Event('pagehide'));
      expect(events.at(-1)).toMatchObject({ phase: 'page_exit', late: true });
      expect(f.listeners()).toBe(0);
      expect((vi as typeof vi & { getTimerCount(): number }).getTimerCount()).toBe(0);
    });
  }
  it('后台笼统的 timeout 标为发送错误，保留阶段未注明的信息', async () => {
    const f = fixture(() => undefined);
    const events: FollowupTraceEvent[] = [];
    const pending = f.sender(recipient, content, (e) => {
      events.push(e);
    });
    const { clientMid: cmid } = f.worker.sendTextMessage.mock.calls[0][0] as { clientMid: number };
    f.fire('send-error', { message: { cmid }, error: 'operation timeout' });
    await vi.advanceTimersByTimeAsync(15000);
    expect((await pending).status).toBe('unknown');
    expect(events.find((e) => e.phase === 'send_error')?.detail).toContain('阶段未注明');
    expect(events.some((e) => e.phase === 'delivery_timeout')).toBe(false);
    window.dispatchEvent(new Event('pagehide'));
  });
  for (const responsive of [true, false]) {
    it(`只用同一客户端查询一次状态，2秒内返回或超时 (${responsive})`, async () => {
      const f = fixture(() => new Promise(() => {}));
      const getStatus = vi.fn(() =>
        responsive ? Promise.resolve('CONNECTED') : new Promise(() => {})
      );
      Object.assign(f.worker, { getStatus });
      const events: FollowupTraceEvent[] = [];
      const result = f.sender(recipient, content, (e) => {
        events.push(e);
      });
      await vi.advanceTimersByTimeAsync(15000);
      expect((await result).status).toBe('unknown');
      await vi.advanceTimersByTimeAsync(2000);
      const probe = events.filter((e) => e.phase === 'status_probe');
      expect(probe).toHaveLength(1);
      expect(probe[0].detail).toBe(responsive ? 'CONNECTED (0ms)' : '状态查询超时 (2000ms)');
      expect(getStatus).toHaveBeenCalledTimes(1);
      expect(f.worker.sendTextMessage).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60000);
      expect(f.listeners()).toBe(0);
    });
  }
  it('日志接收器在提交、后台回执及迟到阶段抛错或返回拒绝，均能正常收尾', async () => {
    const f = fixture(() => ({ messages: [{}] }));
    const seen: string[] = [];
    const result = f.sender(recipient, content, (e) => {
      seen.push(e.phase);
      if (e.phase === 'submit_call' || e.phase === 'delivered') throw new Error('sink failure');
      return Promise.reject(new Error('async sink failure'));
    });
    await vi.advanceTimersByTimeAsync(15000);
    expect((await result).status).toBe('submitted');
    const { clientMid: cmid } = f.worker.sendTextMessage.mock.calls[0][0] as { clientMid: number };
    f.fire('message-delivered', { messages: [{ cmid }] });
    expect(seen).toEqual(['submit_call', 'submitted', 'deadline', 'delivered']);
    expect(f.listeners()).toBe(0);
    expect(f.worker.sendTextMessage).toHaveBeenCalledTimes(1);
  });
  for (const [phase, invoke] of [
    [
      'sync_error',
      () => {
        throw new Error('network DO_NOT_LOG');
      },
    ],
    ['request_rejected', () => Promise.reject('network DO_NOT_LOG')],
    ['response_error', () => ({ error: 'network DO_NOT_LOG' })],
    ['response_empty', () => undefined],
  ] as const) {
    it(`SDK ${phase} 来源脱敏且日志抛异常不打断发送`, async () => {
      const sendTextMessage = vi.fn(invoke);
      const sender = getFollowupSender(
        { GeekChatCore: { getInstance: () => ({ sendTextMessage }) } },
        'text'
      )!;
      const events: FollowupTraceEvent[] = [];
      const result = await sender(recipient, content, (e) => {
        events.push(e);
        throw new Error('sink failure');
      });
      expect(events.map((e) => e.phase)).toEqual(['submit_call', phase]);
      expect(events[0].channel).toBe('sdk-proxy');
      expect(/DO_NOT_LOG|21987654321/.test(JSON.stringify({ result, events }))).toBe(false);
      expect(sendTextMessage).toHaveBeenCalledTimes(1);
      expect((vi as typeof vi & { getTimerCount(): number }).getTimerCount()).toBe(0);
    });
  }
});
