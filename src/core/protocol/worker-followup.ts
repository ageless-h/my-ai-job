import type { FollowupContent, FollowupSender } from './followup-channel';

import { errorCategory, observeFollowup } from './followup-trace';
let lastClientMid = 0;

function nextClientMid(): number {
  if (!lastClientMid) {
    // Randomize the sequence per tab. Stay below 2^53, including increments.
    const words = crypto.getRandomValues(new Uint32Array(2));
    lastClientMid = (words[0] & 0xfffff) * 0x100000000 + words[1];
  }
  return ++lastClientMid;
}

// Worker messages are structured-cloned. protobufjs accepts either a safe integer
// or the two signed 32-bit words of a Long for the TechwolfUser.uid int64 field.
function workerUid(
  raw: string
): number | { low: number; high: number; unsigned: false } | undefined {
  if (!/^[1-9]\d{0,18}$/.test(raw)) return undefined;
  const number = Number(raw);
  if (Number.isSafeInteger(number)) return number;
  const value = BigInt(raw);
  if (value > BigInt('9223372036854775807')) return undefined;
  return {
    low: Number(BigInt.asIntN(32, value)),
    high: Number(value >> BigInt(32)),
    unsigned: false,
  };
}

function field(value: unknown, key: string): unknown {
  return value !== null && typeof value === 'object' ? Reflect.get(value, key) : undefined;
}

function hasCmid(message: unknown, id: number): boolean {
  const cmid = field(message, 'cmid');
  if (cmid === id || cmid === String(id)) return true;
  const low = field(cmid, 'low');
  const high = field(cmid, 'high');
  return (
    typeof low === 'number' && typeof high === 'number' && high * 0x100000000 + (low >>> 0) === id
  );
}

function readyState(worker: unknown): boolean | undefined {
  try {
    const ready = field(worker, 'isReady');
    return typeof ready === 'boolean' ? ready : undefined;
  } catch {
    return undefined;
  }
}

/** On deadline, test this same client port once without delaying the foreground result. */
function probeStatus(worker: unknown, obs: ReturnType<typeof observeFollowup>) {
  const getStatus = field(worker, 'getStatus');
  if (typeof getStatus !== 'function') return;
  const start = performance.now();
  let finished = false;
  function record(status: string) {
    if (finished || obs.closed) return;
    finished = true;
    clearTimeout(timer);
    obs.emit('status_probe', `${status} (${Math.round(performance.now() - start)}ms)`);
  }
  const timer = setTimeout(() => record('状态查询超时'), 2000);
  obs.cleanup.push(() => {
    finished = true;
    clearTimeout(timer);
  });
  try {
    void Promise.resolve(getStatus.call(worker))
      .then((value) => {
        const known = ['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'RECONNECTING', 'CLOSED'];
        record(
          typeof value === 'string' && known.includes(value) ? value : '状态查询已回应（未知状态）'
        );
      })
      .catch(() => record('状态查询失败'));
  } catch {
    record('状态查询失败');
  }
}
export function getWorkerFollowupSender(
  worker: unknown,
  kind: FollowupContent['kind']
): FollowupSender | null {
  const send = field(worker, kind === 'text' ? 'sendTextMessage' : 'sendImageMessage');
  const add = field(worker, 'addListener');
  const remove = field(worker, 'removeListener');
  if (typeof send !== 'function' || typeof add !== 'function' || typeof remove !== 'function')
    return null;

  return async (recipient, content, onTrace) => {
    const obs = observeFollowup('worker', onTrace, () => probeStatus(worker, obs));
    const uid = workerUid(recipient.uid);
    if (kind !== content.kind || uid === undefined) {
      obs.emit('setup_error', '参数无效');
      obs.close({ status: 'failed', reason: '消息 Worker 发送参数无效' });
      return obs.result;
    }
    const clientMid = nextClientMid();
    const body =
      content.kind === 'text'
        ? content.text
        : { originImage: content.originImage, tinyImage: content.tinyImage };
    const onDelivered = (payload: unknown) => {
      if (obs.closed) return;
      const messages = field(payload, 'messages');
      if (Array.isArray(messages) && messages.some((message) => hasCmid(message, clientMid))) {
        obs.emit('delivered');
        obs.close({ status: 'delivered', reason: '已收到匹配的消息送达回执' });
      }
    };
    let seenDeliveryTimeout = false;
    const onError = (payload: unknown) => {
      if (obs.closed || !hasCmid(field(payload, 'message'), clientMid)) return;
      const category = errorCategory(field(payload, 'error'));
      if (category.includes('超时')) {
        if (seenDeliveryTimeout) return;
        seenDeliveryTimeout = true;
        obs.emit(
          category === '送达超时' ? 'delivery_timeout' : 'send_error',
          category === '送达超时' ? '后台报告送达超时' : '后台发送报告超时（阶段未注明）'
        );
        obs.setPending({ status: 'unknown', reason: '后台发送事件报告超时，送达待确认' });
      } else {
        obs.emit('send_error', category);
        obs.close({ status: 'failed', reason: `消息 Worker 后台发送失败（${category}）` });
      }
    };
    const requestError = (
      error: unknown,
      origin: 'sync_error' | 'response_error' | 'request_rejected'
    ) => {
      if (obs.closed) return;
      const category = errorCategory(error);
      if (category.includes('超时')) {
        obs.emit(
          category === '就绪等待超时' ? 'ready_timeout' : 'request_timeout',
          origin,
          readyState(worker)
        );
        if (!seenDeliveryTimeout)
          obs.setPending({ status: 'unknown', reason: `消息 Worker 请求端${category}` });
      } else {
        obs.emit(origin, category);
        obs.close({ status: 'failed', reason: `消息 Worker ${category}` });
      }
    };
    try {
      add.call(worker, 'message-delivered', onDelivered);
      obs.cleanup.push(() => remove.call(worker, 'message-delivered', onDelivered));
      add.call(worker, 'send-error', onError);
      obs.cleanup.push(() => remove.call(worker, 'send-error', onError));
    } catch {
      obs.emit('setup_error', '回执监听注册失败');
      obs.close({ status: 'failed', reason: '消息 Worker 回执监听注册失败' });
      return obs.result;
    }
    try {
      obs.emit('submit_call', undefined, readyState(worker));
      const pending = send.call(worker, { ...recipient, uid, clientMid }, body);
      void Promise.resolve(pending)
        .then((reply) => {
          if (obs.closed) return;
          const error = field(reply, 'error');
          if (error != null) return requestError(error, 'response_error');
          const messages = field(reply, 'messages');
          if (Array.isArray(messages) && messages.length) {
            obs.emit('submitted');
            if (!seenDeliveryTimeout)
              obs.setPending({ status: 'submitted', reason: 'Worker 已提交，未收到匹配送达回执' });
          } else obs.emit('response_empty');
        })
        .catch((error) => requestError(error, 'request_rejected'));
    } catch (error) {
      requestError(error, 'sync_error');
    }
    return obs.result;
  };
}
