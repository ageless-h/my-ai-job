import type { FollowupResult } from './followup-channel';

export type FollowupChannel =
  | 'worker'
  | 'sdk-proxy'
  | 'sdk-socket'
  | 'legacy-text'
  | 'legacy-image';
export type FollowupPhase =
  | 'submit_call'
  | 'sync_error'
  | 'request_rejected'
  | 'request_timeout'
  | 'ready_timeout'
  | 'response_error'
  | 'response_empty'
  | 'submitted'
  | 'send_error'
  | 'delivery_timeout'
  | 'delivered'
  | 'deadline'
  | 'status_probe'
  | 'observation_end'
  | 'page_exit'
  | 'setup_error';
export interface FollowupTraceEvent {
  phase: FollowupPhase;
  channel: FollowupChannel;
  elapsedMs: number;
  late: boolean;
  submitted: boolean;
  detail?: string;
  ready?: boolean;
}
export type FollowupTraceSink = (event: FollowupTraceEvent) => void;

/** SDK errors can embed message bodies and UIDs. Only allowlisted categories leave this module. */
export function errorCategory(error: unknown): string {
  let text = '';
  try {
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && Reflect.get(error, 'message');
    if (typeof message === 'string') text = message;
  } catch {
    /* Foreign objects can have throwing getters. */
  }
  if (/timeout|timed?\s*out|超时/i.test(text)) {
    if (/ready|就绪|初始化/i.test(text)) return '就绪等待超时';
    if (/delivery|delivered|送达|送信回执/i.test(text)) return '送达超时';
    return '超时';
  }
  if (/not initialized|not ready|未初始化|未就绪/i.test(text)) return '连接未就绪';
  if (/network|disconnect|offline|port not available|网络|离线|断开/i.test(text)) return '连接异常';
  if (/forbidden|permission|denied|权限/i.test(text)) return '权限受限';
  if (/limit|too frequent|频繁|限流/i.test(text)) return '请求受限';
  if (/invalid|missing|无效|缺少/i.test(text)) return '参数无效';
  return '发送失败';
}

export const FOREGROUND_WAIT_MS = 15_000;
export const PASSIVE_WAIT_MS = 60_000;

/** Resolve once at the foreground boundary. Late evidence is emitted on the same trace sink. */
export function observeFollowup(
  channel: FollowupChannel,
  sink?: FollowupTraceSink,
  onDeadline?: () => void
) {
  const start = performance.now();
  let closed = false;
  let late = false;
  let submitted = false;
  let lastPhase: FollowupPhase | undefined;
  let resolve!: (value: FollowupResult) => void;
  const result = new Promise<FollowupResult>((done) => {
    resolve = done;
  });
  const cleanup: Array<() => void> = [];
  let timer: ReturnType<typeof setTimeout>;
  let pendingResult: FollowupResult = {
    status: 'unknown',
    reason: '插件等待满15秒，未取得提交或送达凭据',
  };

  function emit(phase: FollowupPhase, detail?: string, ready?: boolean) {
    if (closed) return;
    lastPhase = phase;
    if (phase === 'submitted') submitted = true;
    try {
      if (sink)
        void Promise.resolve(
          sink({
            channel,
            phase,
            elapsedMs: Math.max(0, Math.round(performance.now() - start)),
            submitted,
            late,
            ...(detail === undefined ? {} : { detail }),
            ...(ready === undefined ? {} : { ready }),
          })
        ).catch(() => {});
    } catch {
      /* Diagnostics never control dispatch. */
    }
  }
  function close(value: FollowupResult) {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    for (const fn of cleanup.splice(0)) {
      try {
        fn();
      } catch {
        /* The page or Worker can have gone away. */
      }
    }
    if (!late) resolve(value);
  }
  function onPageExit() {
    emit('page_exit', lastPhase);
    close({ status: 'unknown', reason: '页面已退出，未能继续确认发送结果' });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', onPageExit);
    cleanup.push(() => window.removeEventListener('pagehide', onPageExit));
  }
  timer = setTimeout(() => {
    emit('deadline', lastPhase);
    if (!sink) return close(pendingResult);
    late = true;
    resolve(pendingResult);
    timer = setTimeout(() => {
      emit('observation_end', lastPhase);
      close(pendingResult);
    }, PASSIVE_WAIT_MS);
    try {
      onDeadline?.();
    } catch {
      /* Read-only diagnostics can be unavailable. */
    }
  }, FOREGROUND_WAIT_MS);
  return {
    result,
    emit,
    close,
    cleanup,
    get closed() {
      return closed;
    },
    setPending(value: FollowupResult) {
      pendingResult = value;
    },
  };
}
