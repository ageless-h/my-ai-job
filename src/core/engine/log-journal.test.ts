import { afterEach, describe, expect, it, vi } from 'vitest';
import { LogJournal, type JournalStorage } from './log-journal';

// A shared persistent store with separately scheduled, reorderable cross-tab change events.
function fixture() {
  const data = new Map<string, unknown>();
  const listeners: Array<{ owner: string; key: string; listener: (value: unknown) => void }> = [];
  const queue: Array<() => void> = [];
  const listKeys = vi.fn(() => [...data.keys()].reverse());
  const adapter = (owner: string): JournalStorage => ({
    keys: listKeys,
    read: key => data.get(key),
    write(key, value) {
      data.set(key, structuredClone(value));
      for (const reg of listeners) {
        if (reg.owner !== owner && reg.key === key) queue.push(() => reg.listener(value));
      }
    },
    remove: key => { data.delete(key); },
    listen: (key, listener) => { listeners.push({ owner, key, listener }); },
  });
  const tab = (name: string, limit = 1000) => new LogJournal(adapter(name), limit, name);
  return { data, listKeys, tab, adapter, flush: () => { while (queue.length) queue.pop()!(); } };
}

afterEach(() => vi.restoreAllMocks());

describe('LogRecorder 跨标签页存储', () => {
  it('通知尚未送达时，同步导出包含两页同毫秒及同内容事件，所有标签页排序一致', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1795620000000);
    const { tab, flush, listKeys } = fixture();
    const a = tab('A');
    const b = tab('B');
    listKeys.mockClear();
    b.append('info', 'before');
    a.append('info', 'same');
    a.append('info', 'same');
    b.append('warn', 'after');
    expect(listKeys).not.toHaveBeenCalled();
    const exported = a.snapshot();
    expect(listKeys).toHaveBeenCalledTimes(1);
    expect(exported.map(x => x.message)).toEqual(['same', 'same', 'before', 'after']);
    expect(new Set(exported.map(x => x.id)).size).toBe(4);
    flush();
    expect(b.page(1, 10)).toEqual(exported);
    expect(tab('new').snapshot()).toEqual(exported);
  });

  it('清空后乱序的旧变更通知、恢复的旧标签页都无法复活旧行', () => {
    const { tab, flush, data } = fixture();
    const a = tab('A'); const b = tab('B');
    a.append('info', 'before-clear-a'); b.append('info', 'before-clear-b');
    a.clear();
    b.append('info', 'after-clear');
    flush();
    expect(a.page(1, 10).map(r => r.message)).toEqual(['after-clear']);
    expect([...data.values()].map(v => JSON.stringify(v)).join(' ')).not.toContain('before-clear');
    expect(tab('new').snapshot()).toEqual(a.snapshot());
  });

  it('在单行提交与通知之间清空时，该行不会混入新日志', () => {
    const { adapter, tab } = fixture();
    const db = adapter('slow'); const fast = tab('fast');
    const slow = new LogJournal(db, 1000, 'slow');
    const put = db.write;
    db.write = (k, v) => {
      if (k.includes('/row/')) fast.clear();
      put(k, v);
    };
    slow.append('info', 'before-clear');
    expect(slow.count()).toBe(0);
    expect(fast.snapshot()).toEqual([]);
  });

  it('迁移旧数组保留原文、同一毫秒复数记录和顺序，后续重载不重复导入', () => {
    const { tab, data } = fixture();
    const legacy = ['first', 'second', 'second'].map(message => ({ level: 'info', timestamp: '15:01:01.909', message }));
    data.set('logs_data', legacy);
    const rows = tab('first').snapshot();
    expect(rows.map(r => r.message)).toEqual(legacy.map(r => r.message));
    expect(rows[0]).toMatchObject({ timeMs: 0, timestamp: legacy[0].timestamp });
    expect(new Set(rows.map(r => r.id)).size).toBe(3);
    expect(data.has('logs_data')).toBe(false);
    const b = tab('second'); expect(b.snapshot()).toEqual(rows);
    b.clear(); data.set('logs_data', legacy); // An old pre-upgrade tab finally exits.
    expect(tab('third').snapshot()).toEqual([]);
  });

  it('持久化中途失效仍记录当前行，明确报告当前内存模式和清空范围', () => {
    const { adapter } = fixture(); const db = adapter('A');
    const log = new LogJournal(db); log.append('info', '已落盘');
    db.write = () => { throw new Error('storage offline'); };
    expect(() => log.append('info', '本页缓存')).not.toThrow();
    expect(log.storageMode).toBe('memory');
    expect(log.snapshot().map(r => r.message)).toEqual(['已落盘', '本页缓存']);
    expect(() => log.clear()).toThrow('无法确认');
    expect(log.count()).toBe(0);
  });

  it('脚本加载时存储不可用，以及监听器抛错，均不影响继续写日志', () => {
    const { adapter } = fixture(); const db = adapter('A');
    db.listen = () => { throw new Error('no notifications'); };
    const log = new LogJournal(db); log.subscribe(() => { throw new Error('UI'); });
    expect(() => log.append('info', '正常')).not.toThrow();
    expect(log.storageMode).toBe('persistent');
    db.keys = () => { throw new Error('storage offline'); };
    const memory = new LogJournal(db); memory.append('info', '内存记录');
    expect(memory.storageMode).toBe('memory');
    expect(memory.count()).toBe(1);
  });

  it('限制新旧标签可见及存储数量，订阅可解除，平时新事件只读取独立键', () => {
    const { tab, flush, listKeys, data } = fixture();
    const a = tab('A', 3); const b = tab('B', 3);
    const change = vi.fn(); const cancel = b.subscribe(change);
    const localChange = vi.fn(); a.subscribe(localChange);
    listKeys.mockClear();
    for (let i = 0; i < 7; i++) { a.append('info', '测试-' + i); flush(); }
    expect(change).toHaveBeenCalledTimes(7);
    expect(localChange).toHaveBeenCalledTimes(7);
    expect(listKeys).not.toHaveBeenCalled();
    expect(b.page(1, 3).map(r => r.message)).toEqual(['测试-4', '测试-5', '测试-6']);
    cancel(); a.clear(); flush(); expect(change).toHaveBeenCalledTimes(7);
    for (let i = 0; i < 3; i++) { a.append('info', 'secret-log-a'); b.append('info', 'secret-log-b'); }
    expect(a.snapshot()).toHaveLength(3);
    expect([...data.keys()].filter(x => x.includes('/row/'))).toHaveLength(3);
    expect([...data.keys()].join(' ')).not.toContain('secret-log-');
    expect(data.get('log_journal_v2/change')).not.toContain('secret-log-');
  });
});
