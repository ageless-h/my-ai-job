import { describe, expect, it, vi } from 'vitest';
import protobuf from 'protobufjs';
import { getWorkerFollowupSender } from './worker-followup';

vi.stubGlobal('window', {});
const { getFollowupSender } = await import('./followup-channel');

describe('jobs page SharedWorker contract', () => {
  const userType = protobuf.parse('message TechwolfUser { required int64 uid = 1; }').root.lookupType('TechwolfUser');
  for (const uid of ['123', '9007199254740991', '9007199254740993', '9223372036854775807', '9223372036854775808']) {
    it(`preserves a valid int64 or rejects overflow before sending (${uid})`, async () => {
      const listeners = new Map<string, (payload: unknown) => void>();
      let decodedUid: string | undefined;
      let verification: string | null | undefined;
      const send = vi.fn((recipient: { uid: unknown; clientMid: number }) => {
        const user = { uid: structuredClone(recipient.uid) };
        verification = userType.verify(user);
        if (verification) throw new Error(verification);
        const decoded = userType.decode(userType.encode(user).finish());
        decodedUid = userType.toObject(decoded, { longs: String }).uid;
        listeners.get('message-delivered')?.({ messages: [{ cmid: recipient.clientMid }] });
      });
      const sender = getWorkerFollowupSender({
        sendTextMessage: send,
        addListener: (event: string, listener: (payload: unknown) => void) => listeners.set(event, listener),
        removeListener: (event: string) => listeners.delete(event),
      }, 'text')!;
      const result = await sender({ uid }, { kind: 'text', text: 'test' });
      if (uid === '9223372036854775808') {
        expect(result.status).toBe('failed');
        expect(send).not.toHaveBeenCalled();
      } else {
        expect(verification).toBeNull();
        expect(decodedUid).toBe(uid);
        expect(result.status).toBe('delivered');
      }
    });
  }

  for (const error of [false, true]) {
    it(`correlates ${error ? 'worker failure' : 'server receipt'} using clientMid`, async () => {
      const listeners = new Map<string, (payload: unknown) => void>();
      const outer = vi.fn(() => null);
      const sendTextMessage = vi.fn(async (user: { clientMid: number }) => {
        expect(Number(user.clientMid) > 0).toBe(true);
        const message = { cmid: String(user.clientMid), mid: 'server-id' };
        listeners.get('message-delivered')?.({messages: [{ cmid: 'unrelated' }]});
        if (error) listeners.get('send-error')?.({message, error: 'permission denied'});
        else listeners.get('message-delivered')?.({messages: [message]});
        return {messages: [message]};
      });
      const worker = {isReady: true, sendTextMessage, addListener: (name: string, fn: (p: unknown) => void) => listeners.set(name, fn), removeListener: (name: string) => listeners.delete(name)};
      const sdk = { sendTextMessage: outer, socketConnect: {useSharedWorker:true, broadcastManager:{sharedWorkerClient:worker}} };
      const sender = getFollowupSender({GeekChatCore:{getInstance:()=>sdk}},'text');
      const result = await sender!({uid:'123'}, {kind:'text',text:'hello'});
      expect(result.status).toBe(error ? 'failed' : 'delivered');
      expect(sendTextMessage).toHaveBeenCalledTimes(1);
      expect(outer).not.toHaveBeenCalled();
      expect(listeners.size).toBe(0);
    });
  }
});
