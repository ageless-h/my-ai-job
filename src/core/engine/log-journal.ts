export interface LogEntry {
  id: string;
  /** Legacy rows contain only a local time of day. */
  timeMs: number;
  timestamp: string;
  level: string;
  message: string;
}

export interface JournalStorage {
  memoryOnly?: boolean;
  keys(): string[];
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
  listen(key: string, onRemote: (value: unknown) => void): void;
}

declare const GM_listValues: (() => string[]) | undefined;

export function journalStorage(namespace: string): JournalStorage {
  if (typeof GM_listValues === 'function' && typeof GM_setValue === 'function' &&
      typeof GM_getValue === 'function' && typeof GM_deleteValue === 'function') {
    return {
      keys: () => GM_listValues().filter(k => k.startsWith(namespace)).map(k => k.slice(namespace.length)),
      read: k => GM_getValue(namespace + k),
      write: (k, value) => GM_setValue(namespace + k, value),
      remove: k => GM_deleteValue(namespace + k),
      listen(k, listener) {
        if (typeof GM_addValueChangeListener === 'function') {
          GM_addValueChangeListener(namespace + k, (_name, _old, value, remote) => { if (remote) listener(value); });
        }
      },
    };
  }
  // Keep messages out of site-visible storage when the script manager is unavailable.
  const memory = new Map<string, unknown>();
  return { memoryOnly: true, keys: () => [...memory.keys()], read: k => memory.get(k), write: (k, v) => memory.set(k, v),
    remove: k => memory.delete(k), listen: () => {} };
}

const PREFIX = 'log_journal_v2/';
const EPOCH = PREFIX + 'epoch';
const CHANGE = PREFIX + 'change';
const MIGRATED = PREFIX + 'migrated';
const RECORD = PREFIX + 'row/';
const FIRST = 'initial';
const LEGACY = 'logs_data';

function isRow(value: unknown): value is Pick<LogEntry, 'level' | 'message' | 'timestamp'> {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<LogEntry>;
  return typeof row.level === 'string' && typeof row.message === 'string' && typeof row.timestamp === 'string';
}

function timeText(timeMs: number): string {
  const date = new Date(timeMs);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** Storage keys carry time/order tokens only. The change hint never contains the message body. */
export class LogJournal {
  storageMode: 'persistent' | 'memory' = 'persistent';
  private generation = FIRST;
  private rows = new Map<string, LogEntry>();
  private ordered: LogEntry[] = [];
  private listeners = new Set<() => void>();
  private seq = 0;

  constructor(private db: JournalStorage, private limit = 1000, private writer: string = crypto.randomUUID()) {
    if (db.memoryOnly) { this.storageMode = 'memory'; return; }
    this.withStorage(() => this.migrate());
    try {
      db.listen(CHANGE, hint => this.withStorage(() => this.receive(hint)));
      db.listen(EPOCH, () => this.withStorage(() => { if (this.alignGeneration()) this.notify(); }));
    } catch { /* Explicit snapshots remain available if change notifications are unsupported. */ }
    this.snapshot();
  }

  private withStorage(task: () => void): void {
    if (this.storageMode === 'memory') return;
    try { task(); } catch { this.storageMode = 'memory'; }
  }

  private currentGeneration(): string {
    const generation = this.db.read(EPOCH);
    return typeof generation === 'string' ? generation : FIRST;
  }

  private alignGeneration(): boolean {
    const generation = this.currentGeneration();
    if (generation === this.generation) return false;
    this.generation = generation;
    this.rows.clear();
    this.ordered = [];
    return true;
  }

  private migrate(): void {
    if (this.db.read(MIGRATED)) return;
    const old = this.db.read(LEGACY);
    if (Array.isArray(old) && this.currentGeneration() === FIRST) {
      old.slice(-this.limit).forEach((item, index) => {
        if (!isRow(item)) return;
        // Stable across simultaneous startup and migration retries, including identical rows.
        const id = `0000000000000-legacy-${String(index).padStart(6, '0')}`;
        this.db.write(`${RECORD}${FIRST}/${id}`, { id, timeMs: 0, timestamp: item.timestamp, level: item.level, message: item.message });
      });
    }
    this.db.write(MIGRATED, true);
    this.db.remove(LEGACY);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch { /* A view cannot interrupt a delivery operation. */ }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private get prefix(): string { return `${RECORD}${this.generation}/`; }

  private readRow(id: string): LogEntry | undefined {
    const row = this.db.read(this.prefix + id) as LogEntry | undefined;
    return isRow(row) && row.id === id && Number.isFinite(row.timeMs) ? row : undefined;
  }

  private insert(row: LogEntry): void {
    if (this.rows.has(row.id)) return;
    this.rows.set(row.id, row);
    let i = this.ordered.length;
    while (i && this.ordered[i - 1].id > row.id) i--;
    this.ordered.splice(i, 0, row);
    if (this.ordered.length > this.limit) {
      const first = this.ordered.shift()!;
      this.rows.delete(first.id);
      this.withStorage(() => this.db.remove(this.prefix + first.id));
    }
  }

  private receive(hint: unknown): void {
    const changed = this.alignGeneration();
    if (typeof hint === 'string' && hint.startsWith(this.prefix)) {
      const id = hint.slice(this.prefix.length);
      if (!this.rows.has(id)) {
        const row = this.readRow(id);
        if (row) { this.insert(row); this.notify(); return; }
      }
    }
    if (changed) this.notify();
  }

  append(level: string, message: string): void {
    this.withStorage(() => { this.alignGeneration(); });
    const timeMs = Date.now();
    const id = `${String(timeMs).padStart(13, '0')}-${this.writer}-${String(++this.seq).padStart(10, '0')}`;
    const row: LogEntry = { id, timeMs, timestamp: timeText(timeMs), level, message };
    const key = this.prefix + id;
    let cleared = false;
    this.withStorage(() => {
      this.db.write(key, row);
      cleared = this.alignGeneration();
      if (cleared) this.db.remove(key);
      else this.db.write(CHANGE, key);
    });
    if (!cleared) this.insert(row);
    this.notify();
  }

  clear(): void {
    // Publish the barrier first. Delayed commits and signals for old epochs cannot revive a row.
    this.withStorage(() => {
      this.db.write(EPOCH, crypto.randomUUID());
      this.db.remove(LEGACY);
      this.refresh();
    });
    if (this.storageMode === 'memory') {
      this.rows.clear();
      this.ordered = [];
      this.notify();
      throw new Error('当前页内存中的日志已清空，无法确认持久存储已清空');
    }
    this.notify();
  }

  snapshot(): LogEntry[] {
    const before = this.ordered;
    this.withStorage(() => this.refresh());
    if (before.length !== this.ordered.length || before.some((row, index) => row.id !== this.ordered[index].id)) {
      this.notify();
    }
    return this.page(1, this.limit);
  }

  private refresh(): void {
    // Enumerate once per explicit snapshot. Appends and notifications only access their own key.
    // Capture keys before epoch so concurrent clear cannot classify a newer epoch as obsolete.
    const keys = this.db.keys().filter(key => key.startsWith(RECORD));
    this.alignGeneration();
    const prefix = this.prefix;
    const active: string[] = [];
    for (const key of keys) {
      if (key.startsWith(prefix)) active.push(key.slice(prefix.length));
      else this.db.remove(key);
    }
    active.sort();
    const keep = active.slice(-this.limit);
    for (let i = 0; i < active.length - keep.length; i++) this.db.remove(prefix + active[i]);
    const next = new Map<string, LogEntry>();
    for (const id of keep) {
      const row = this.rows.get(id) ?? this.readRow(id);
      if (row) next.set(id, row);
    }
    this.rows = next;
    this.ordered = [...next.values()];
  }

  page(page: number, size: number): LogEntry[] {
    const start = (page - 1) * size;
    return this.ordered.slice(start, start + size);
  }

  count(): number { return this.ordered.length; }
}
