import { Message } from './message';

export interface FollowupRecipient { uid: string; encryptUid?: string }
export interface ImageInfo { url: string; width: number; height: number }
export type FollowupContent = { kind: 'text'; text: string } | { kind: 'image'; originImage: ImageInfo; tinyImage: ImageInfo };
export interface FollowupResult { status: 'submitted' | 'unknown' | 'failed'; reason: string }
export type FollowupSender = (recipient: FollowupRecipient, content: FollowupContent) => Promise<FollowupResult>;

function field(obj: unknown, key: string): unknown {
  return obj != null && (typeof obj === 'object' || typeof obj === 'function') ? Reflect.get(obj, key) : undefined;
}
function numericUid(id: unknown): string | undefined {
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
  if (typeof id === 'string' && /^[1-9]\d*$/.test(id)) return id;
  return undefined;
}

/** The API client has already unwrapped zpData. Some replies nest bossId under data. */
export function resolveFollowupRecipient(zpData: unknown, encryptUid?: string): FollowupRecipient {
  const nested = field(zpData, 'data');
  const ids = [field(zpData, 'bossId'), field(nested, 'bossId')].filter(id => id != null).map(numericUid);
  const uid = ids[0];
  if (!uid || ids.some(id => id !== uid)) throw new Error('无法确认当前岗位的收件人');
  const encrypted = [encryptUid, field(zpData, 'encryptBossId'), field(nested, 'encryptBossId')]
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (new Set(encrypted).size > 1) throw new Error('收件人与当前岗位不一致');
  return encrypted.length ? { uid, encryptUid: encrypted[0] } : { uid };
}

function readImageInfo(url: string): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };
    const timer = setTimeout(() => {
      clear();
      image.removeAttribute('src');
      reject(new Error('读取图片简历尺寸超时'));
    }, 5000);
    image.onload = () => {
      clear();
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
      } else reject(new Error('图片简历尺寸无效'));
    };
    image.onerror = () => { clear(); reject(new Error('图片简历无法加载')); };
    image.src = url;
  });
}

export async function prepareFollowupImage(originUrl: string, tinyUrl: string): Promise<Extract<FollowupContent, { kind: 'image' }>> {
  if (![originUrl, tinyUrl].every(url => /^https?:\/\//i.test(url))) throw new Error('图片简历地址无效');
  const original = readImageInfo(originUrl);
  const [originImage, tinyImage] = await Promise.all([original, originUrl === tinyUrl ? original : readImageInfo(tinyUrl)]);
  return { kind: 'image', originImage, tinyImage };
}

function sdkError(error: unknown): FollowupResult {
  const message = typeof error === 'string' ? error : field(error, 'message');
  if (typeof message === 'string' && /timeout|timed?\s*out|超时/i.test(message)) {
    return { status: 'unknown', reason: 'SDK 请求超时，提交结果未知' };
  }
  return { status: 'failed', reason: '页面 SDK 报告发送失败' };
}

function sdkResult(reply: unknown): FollowupResult {
  const error = field(reply, 'error');
  if (error != null) return sdkError(error);
  const messages = field(reply, 'messages');
  if (Array.isArray(messages) && messages.length) return { status: 'submitted', reason: '页面 SDK 已提交' };
  return { status: 'unknown', reason: '页面 SDK 未返回提交凭据' };
}

async function submitOnce(invoke: () => unknown): Promise<FollowupResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(invoke()).then(sdkResult),
      new Promise<FollowupResult>(resolve => {
        timer = setTimeout(() => resolve({ status: 'unknown', reason: '等待 SDK 结果超时' }), 15000);
      }),
    ]);
  } catch (error) {
    return sdkError(error);
  } finally {
    clearTimeout(timer);
  }
}

export function getFollowupSender(runtime: unknown, kind: FollowupContent['kind']): FollowupSender | null {
  const core = field(runtime, 'GeekChatCore');
  const getInstance = field(core, 'getInstance');
  if (typeof getInstance === 'function') {
    try {
      const sdk: unknown = getInstance.call(core);
      const method = kind === 'text' ? 'sendTextMessage' : 'sendImageMessage';
      for (const target of [sdk, field(sdk, 'socketConnect')]) {
        const send = field(target, method);
        if (typeof send !== 'function') continue;
        return async (recipient, content) => {
          if (content.kind !== kind || !numericUid(recipient.uid)) return { status: 'failed', reason: '发送参数无效' };
          const body = content.kind === 'text' ? content.text : { originImage: content.originImage, tinyImage: content.tinyImage };
          return submitOnce(() => send.call(target, recipient, body));
        };
      }
    } catch { /* SDK initialization can still be pending. */ }
  }
  // Older pages expose an encoded Message wrapper; select a single channel before dispatch.
  const fromUid = numericUid(field(field(runtime, '_PAGE'), 'uid'));
  if (!fromUid) return null;
  const channels = kind === 'image' ? ['ChatWebsocketImage', 'ChatWebsocket'] : ['ChatWebsocket'];
  for (const name of channels) {
    const channel = field(runtime, name);
    const send = field(channel, 'send');
    if (typeof send !== 'function') continue;
    try {
      const client = field(channel, 'client');
      const isConnected = field(client, 'isConnected');
      if (typeof isConnected === 'function' && !isConnected.call(client)) continue;
    } catch { continue; }
    return async (recipient, content) => {
      if (content.kind !== kind || !numericUid(recipient.uid)) return { status: 'failed', reason: '发送参数无效' };
      const message = new Message({
        form_uid: fromUid, to_uid: recipient.uid, to_name: recipient.encryptUid || '',
        content: content.kind === 'text' ? content.text : '',
        image: content.kind === 'image' ? { originImage: content.originImage.url, tinyImage: content.tinyImage.url } : undefined,
      });
      return submitOnce(() => send.call(channel, message));
    };
  }
  return null;
}
