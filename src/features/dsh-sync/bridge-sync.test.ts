import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBridgeSync } from './bridge-sync';
import { postLocal } from './local-transport';
import type { LogEntry } from '@/core/engine/log-journal';

const row = (id: string, timeMs: number, message = '开始投递'): LogEntry => ({
  id,
  timeMs,
  message,
  timestamp: '12:00',
  level: 'info',
});
function environment() {
  const store = new Map<string, unknown>();
  const change = new Set<() => void>();
  const listeners = new Set<() => void>();
  const rows: LogEntry[] = [];
  const stored: string[] = [];
  let locked = Promise.resolve();
  const post = vi.fn<typeof postLocal>(async (path, body) => {
    if (path === 'pair') return { token: 'synthetic-secret' };
    const events = (body as { events: { id: string }[] }).events;
    const accepted = events.filter((e) => !stored.includes(e.id)).length;
    stored.push(...events.map((e) => e.id));
    return { accepted, duplicates: events.length - accepted };
  });
  const start = () =>
    createBridgeSync(
      {
        snapshot: () => rows.slice(),
        subscribe(cb) {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
      },
      {
        read: <T>(key: string, fallback: T): T => (store.get(key) as T) ?? fallback,
        write(key, val) {
          store.set(key, val);
          if (key === 'dsh-bridge-pair-v1') for (const cb of change) cb();
        },
        onPairingChange: (cb) => change.add(cb),
        post,
        lock: (fn) => {
          const work = locked.then(fn);
          locked = work.catch(() => {});
          return work;
        },
      }
    );
  return {
    rows,
    post,
    stored,
    start,
    store,
    notify: () => {
      for (const cb of listeners) cb();
    },
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('配对及增量同步', () => {
  it('只发送已配对且合规的结构化事件，每批最多100条，按时间和ID排序', async () => {
    const env = environment();
    const tab = env.start();
    env.rows.push(
      row('private', 1, '简历原文'),
      ...Array.from({ length: 201 }, (_, i) =>
        row(`r${String(i).padStart(3, '0')}`, Math.floor(i / 2) + 1)
      ).reverse()
    );
    await vi.advanceTimersByTimeAsync(60000);
    expect(env.post).not.toHaveBeenCalled();
    await tab.pair('sample');
    await vi.advanceTimersByTimeAsync(255);
    const batches = env.post.mock.calls.filter((c) => c[0] === 'events');
    expect(batches.map((c) => (c[1] as { events: unknown[] }).events.length)).toEqual([
      100, 100, 1,
    ]);
    expect(env.stored).toEqual(
      Array.from({ length: 201 }, (_, i) => `r${String(i).padStart(3, '0')}`)
    );
    expect(JSON.stringify(batches.map((c) => c[1]))).not.toContain('简历原文');
    expect(JSON.stringify(tab.state.value)).not.toContain('synthetic-secret');
    tab.dispose();
  });
  it('离线部分成功后重新打开，补传仍保留的失败和迟到事件，跨页提交去重', async () => {
    const env = environment();
    const tab = env.start();
    env.rows.push(row('b', 222));
    await tab.pair('sample');
    await vi.advanceTimersByTimeAsync(300);
    env.rows.push(row('a', 110));
    env.notify();
    env.post.mockRejectedValueOnce(Error('offline'));
    await vi.advanceTimersByTimeAsync(300);
    expect(env.stored).toEqual(['b']);
    tab.dispose();
    const a = env.start(),
      b = env.start();
    await vi.advanceTimersByTimeAsync(300);
    expect(env.stored).toEqual(['b', 'a']);
    a.disable();
    env.rows.push(row('c', 300));
    env.notify();
    await vi.advanceTimersByTimeAsync(31000);
    expect(b.state.value.enabled).toBe(false);
    expect(env.stored).toEqual(['b', 'a']);
    b.resume();
    await vi.advanceTimersByTimeAsync(300);
    expect(env.stored).toEqual(['b', 'a', 'c']);
    expect(env.post.mock.calls.filter((c) => c[0] === 'pair')).toHaveLength(1);
    a.dispose();
    b.dispose();
  });
  it('关闭会中止未完成的批次，迟到响应不会写入同步确认', async () => {
    const env = environment();
    const tab = env.start();
    env.rows.push(row('a', 100));
    await tab.pair('sample');
    let done!: (v: unknown) => void;
    env.post.mockImplementation(
      async () =>
        new Promise((r) => {
          done = r;
        })
    );
    await vi.advanceTimersByTimeAsync(300);
    const signal = env.post.mock.calls.at(-1)![2] as AbortSignal;
    tab.disable();
    expect(signal.aborted).toBe(true);
    done({ accepted: 1, duplicates: 0 });
    await vi.advanceTimersByTimeAsync(31000);
    expect(tab.state.value.lastSync).toBe(0);
    expect(env.store.has('dsh-bridge-ack-v1')).toBe(false);
    tab.dispose();
  });
  it('部分确认不记已同步，按30秒退避再次提交', async () => {
    const env = environment();
    const tab = env.start();
    env.rows.push(row('a', 100));
    await tab.pair('sample');
    env.post.mockResolvedValueOnce({ accepted: 0, duplicates: 0 });
    await vi.advanceTimersByTimeAsync(300);
    expect(env.store.has('dsh-bridge-ack-v1')).toBe(false);
    env.notify();
    await vi.advanceTimersByTimeAsync(29000);
    expect(env.stored).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.stored).toEqual(['a']);
    tab.dispose();
  });
});

describe('固定本机 GM 传输', () => {
  it('禁用重定向、cookie，拒绝非固定终点以及未知旧版脚本管理器', async () => {
    vi.stubGlobal('GM_info', { scriptHandler: 'Tampermonkey', version: '5.4.1' });
    const gm = vi.fn((opts: any) => {
      opts.onload({ status: 200, finalUrl: 'http://example.invalid', responseText: '{}' });
    });
    vi.stubGlobal('GM_xmlhttpRequest', gm);
    await expect(
      postLocal('events', { events: [] }, new AbortController().signal, 'private')
    ).rejects.toThrow('本机同步请求失败');
    expect(gm.mock.calls[0][0]).toMatchObject({
      url: 'http://127.0.0.1:18761/v1/events',
      redirect: 'error',
      anonymous: true,
    });
    vi.stubGlobal('GM_info', { scriptHandler: 'Tampermonkey', version: '4.20' });
    await expect(postLocal('events', {}, new AbortController().signal, 'private')).rejects.toThrow(
      '安全重定向'
    );
    expect(gm).toHaveBeenCalledTimes(1);
  });
});
