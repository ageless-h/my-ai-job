import { shallowRef } from 'vue';
import type { LogEntry } from '@/core/engine/log-journal';
import { projectBridgeEvent } from '@/core/engine/bridge-event';
import { BridgeRequestError, postLocal } from './local-transport';

const CONFIG = 'dsh-bridge-pair-v1';
const ACK = 'dsh-bridge-ack-v1';
interface Pairing {
  generation: string;
  revision?: string;
  enabled?: boolean;
  token?: string;
}
interface Receipt {
  generation: string;
  ids: string[];
  at: number;
}
interface Journal {
  snapshot(): LogEntry[];
  subscribe(cb: () => void): () => void;
}
interface Options {
  read<T>(key: string, fallback: T): T;
  write(key: string, value: unknown): void;
  onPairingChange(cb: () => void): void;
  post: typeof postLocal;
  lock(fn: () => Promise<void>): Promise<void>;
}
export const browserOptions: Options = {
  read: (key, fallback) => {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch { return fallback; }
  },
  write: (key, value) => GM_setValue(key, value),
  onPairingChange: (cb) => {
    if (typeof GM_addValueChangeListener === 'function')
      GM_addValueChangeListener(CONFIG, (_k, _o, _v, remote) => {
        if (remote) cb();
      });
  },
  post: postLocal,
  lock: async (fn) => {
    if (navigator.locks) await navigator.locks.request('ai-job-dsh-sync-v1', fn);
    else await fn();
  },
};

export function createBridgeSync(journal: Journal, options: Options = browserOptions) {
  const state = shallowRef({ enabled: false, paired: false, status: '已关闭', lastSync: 0 });
  const pairConfig = (): Pairing => options.read(CONFIG, { generation: '' });
  const receipt = (): Receipt => options.read(ACK, { generation: '', ids: [], at: 0 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;
  let pairing: AbortController | undefined;
  let running = false;
  let generation = '';
  let retryAt = 0;
  let closed = false;
  let scheduledAt = Infinity;
  const cancelTimer = () => {
    clearTimeout(timer);
    timer = undefined;
    scheduledAt = Infinity;
  };

  function publish(status: string, config = pairConfig()) {
    const saved = receipt();
    state.value = {
      enabled: !!config.token && config.enabled === true,
      paired: !!config.token,
      status,
      lastSync: config.token && saved.generation === config.generation ? saved.at : 0,
    };
  }
  function schedule(delay = 250) {
    if (closed || running || !pairConfig().enabled) return;
    const due = Math.max(Date.now() + delay, retryAt);
    if (timer && due >= scheduledAt) return;
    cancelTimer();
    scheduledAt = due;
    timer = setTimeout(() => {
      timer = undefined;
      scheduledAt = Infinity;
      void flush();
    }, due - Date.now());
  }
  function updateConfig() {
    if (closed) return;
    const cfg = pairConfig();
    if ((cfg.revision || cfg.generation) !== generation) {
      active?.abort();
      pairing?.abort();
    }
    generation = cfg.revision || cfg.generation;
    retryAt = 0;
    cancelTimer();
    publish(cfg.enabled && cfg.token ? '已配对' : '已关闭', cfg);
    schedule();
  }
  async function flush() {
    if (closed || running || !pairConfig().enabled) return;
    running = true;
    let nextDelay = 30000;
    const controller = (active = new AbortController());
    try {
      await options.lock(async () => {
        const cfg = pairConfig();
        if (!cfg.enabled || !cfg.token || controller.signal.aborted || closed) return;
        const seen = receipt();
        const ack = new Set(cfg.generation === seen.generation ? seen.ids : []);
        const rows = journal
          .snapshot()
          .sort((a, b) => a.timeMs - b.timeMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const pending = rows
          .filter((row) => !ack.has(row.id))
          .flatMap((row) => {
            const event = projectBridgeEvent(row);
            return event ? [{ id: row.id, event }] : [];
          });
        const live = () =>
          !closed &&
          !controller.signal.aborted &&
          pairConfig().revision === cfg.revision &&
          pairConfig().enabled === true;
        for (let i = 0; i < pending.length; i += 100) {
          if (!live()) return;
          const batch = pending.slice(i, i + 100);
          publish('同步中', cfg);
          const reply = (await options.post(
            'events',
            { events: batch.map((item) => item.event) },
            controller.signal,
            cfg.token
          )) as { accepted?: number; duplicates?: number } | null;
          if (!live()) return;
          if (
            !reply ||
            !Number.isInteger(reply.accepted) ||
            !Number.isInteger(reply.duplicates) ||
            reply.accepted! < 0 ||
            reply.duplicates! < 0 ||
            reply.accepted! + reply.duplicates! !== batch.length
          )
            throw new BridgeRequestError();
          for (const item of batch) ack.add(item.id);
          options.write(ACK, {
            generation: cfg.generation,
            ids: rows.filter((r) => ack.has(r.id)).map((r) => r.id),
            at: Date.now(),
          });
        }
        if (live()) {
          retryAt = 0;
          publish('已配对', cfg);
          if (pending.length) nextDelay = 250;
        }
      });
    } catch (error) {
      if (!controller.signal.aborted && !closed && pairConfig().enabled) {
        const unauthorized =
          error instanceof BridgeRequestError && (error.status === 401 || error.status === 403);
        publish(unauthorized ? '授权已失效，请关闭后重新配对' : '本机同步暂不可用，等待重试');
        retryAt = Date.now() + 30000;
      }
    } finally {
      running = false;
      active = undefined;
      schedule(controller.signal.aborted ? 250 : nextDelay);
    }
  }
  async function pair(code: string) {
    if (closed || pairing || pairConfig().enabled) return;
    const baseline = pairConfig().revision;
    const controller = (pairing = new AbortController());
    publish('正在配对');
    try {
      const result = (await options.post('pair', { code: code.trim() }, controller.signal)) as {
        token?: unknown;
      } | null;
      if (controller.signal.aborted || closed || pairConfig().revision !== baseline) return;
      if (
        !result ||
        typeof result.token !== 'string' ||
        !/^[A-Za-z0-9._~+/=-]{1,1024}$/.test(result.token)
      )
        throw new BridgeRequestError();
      options.write(CONFIG, {
        generation: crypto.randomUUID(),
        revision: crypto.randomUUID(),
        enabled: true,
        token: result.token,
      });
      updateConfig();
    } catch {
      if (!controller.signal.aborted && !closed)
        publish('配对失败，请检查配对码、本机插件和 Tampermonkey 版本');
    } finally {
      pairing = undefined;
    }
  }
  function disable() {
    pairing?.abort();
    active?.abort();
    cancelTimer();
    options.write(CONFIG, { ...pairConfig(), revision: crypto.randomUUID(), enabled: false });
    updateConfig();
  }
  function resume() {
    const cfg = pairConfig();
    if (!closed && cfg.token && !cfg.enabled) {
      options.write(CONFIG, { ...cfg, revision: crypto.randomUUID(), enabled: true });
      updateConfig();
    }
  }
  const unsubscribe = journal.subscribe(() => schedule());
  options.onPairingChange(updateConfig);
  updateConfig();
  function dispose() {
    closed = true;
    unsubscribe();
    pairing?.abort();
    active?.abort();
    cancelTimer();
  }
  return { state, pair, disable, resume, dispose };
}
