// Private transport for the paired local DSH receiver. Both paths are fixed and redirects fail closed.
const ORIGIN = 'http://127.0.0.1:18761';
declare const GM_info: { scriptHandler?: string; version?: string } | undefined;

export class BridgeRequestError extends Error {
  constructor(readonly status = 0) {
    super('本机同步请求失败');
  }
}

// Chromium Tampermonkey 5.3.2+ supports redirect:error. Older managers can ignore this option.
export function supportsPrivateTransport(
  info: { scriptHandler?: string; version?: string } | undefined
): boolean {
  if (info?.scriptHandler !== 'Tampermonkey') return false;
  const [major, minor, patch] = (info.version || '').split('.').map(Number);
  return (
    major > 5 ||
    (major === 5 && (minor >= 4 || (minor === 3 && patch >= 2 && (patch < 100 || patch >= 6216))))
  );
}

export function postLocal(
  path: 'pair' | 'events',
  body: unknown,
  signal: AbortSignal,
  token?: string
): Promise<unknown> {
  if (
    !supportsPrivateTransport(typeof GM_info === 'undefined' ? undefined : GM_info) ||
    typeof GM_xmlhttpRequest !== 'function'
  ) {
    return Promise.reject(new Error('请使用支持安全重定向控制的新版 Tampermonkey'));
  }
  if (path !== 'pair' && path !== 'events') return Promise.reject(new BridgeRequestError());
  const url = `${ORIGIN}/v1/${path}`;
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new BridgeRequestError());
    let handle: { abort?: () => void } | undefined;
    let finished = false;
    const settle = (ok: boolean, value: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (ok) resolve(value);
      else reject(value);
    };
    const abort = () => {
      settle(false, new BridgeRequestError());
      handle?.abort?.();
    };
    const timer = setTimeout(abort, 8000);
    signal.addEventListener('abort', abort, { once: true });
    try {
      handle = GM_xmlhttpRequest({
        method: 'POST',
        url,
        redirect: 'error',
        anonymous: true,
        fetch: true,
        headers: {
          'Content-Type': 'application/json',
          ...(path === 'events' && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        data: JSON.stringify(body),
        onload: (reply: { status: number; responseText?: string; finalUrl?: string }) => {
          if (
            (reply.finalUrl && reply.finalUrl !== url) ||
            reply.status < 200 ||
            reply.status >= 300
          ) {
            settle(false, new BridgeRequestError(reply.status));
            return;
          }
          try {
            settle(true, JSON.parse(reply.responseText ?? ''));
          } catch {
            settle(false, new BridgeRequestError());
          }
        },
        onabort: () => settle(false, new BridgeRequestError()),
        onerror: () => settle(false, new BridgeRequestError()),
        ontimeout: () => settle(false, new BridgeRequestError()),
      }) as typeof handle;
    } catch {
      settle(false, new BridgeRequestError());
    }
  });
}
