import { afterEach, describe, expect, it, vi } from 'vitest';
vi.stubGlobal('window', {});
const { BossPlatform } = await import('./boss-platform');
const { PushStatus, runtimeUserStore } = await import('@/core/engine/push-engine');
const { Tools } = await import('@/shared/utils/tools');

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('实际投递收尾与消息诊断的关联', () => {
  it('插件等满15秒后继续记录第16秒的对应回执，全程仅发送一次', async () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    const listeners = new Map<string, (p: unknown) => void>();
    const privateText = '测试用的私人消息';
    const privateUid = '123498765';
    let clientMid = 0;
    const sendTextMessage = vi.fn((recipient: {clientMid: number}) => {
      clientMid = recipient.clientMid;
      return new Promise(() => {});
    });
    const worker = {isReady:true, sendTextMessage,
      addListener: (key: string, f: (p: unknown) => void) => listeners.set(key, f),
      removeListener: (key: string) => listeners.delete(key),
    };
    Tools.window.GeekChatCore = {getInstance: () => ({socketConnect:{useSharedWorker:true, broadcastManager:{sharedWorkerClient:worker}}})} as any;
    runtimeUserStore.user.preference = {customGreetingEnabled:true, customGreeting:privateText};
    const platform = Object.assign(Object.create(BossPlatform.prototype), {
      pushStatus: PushStatus.PUSHING, lastAutoContactTs:0, getManualVerificationReason:()=>null,
      requestBossDataByCache:async()=>({bossId:privateUid}),
      preferenceLogRecorder:{info:(msg:string)=>logs.push(msg), warn:(msg:string)=>logs.push(msg)},
    });
    const done = platform.pushAfterHandler({code:0,message:'Success'},{jobName:'演示岗位',aiDeliveryJudge:{traceId:'demo-ai',strategy:'作品优先'}});
    await vi.advanceTimersByTimeAsync(15000);
    await done;
    expect(logs.some(m=>m.includes('phase=deadline'))).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    listeners.get('message-delivered')?.({messages:[{cmid:clientMid}]});
    const events = logs.filter(m=>m.includes('phase='));
    expect(events.at(-1)).toContain('phase=delivered');
    expect(events.at(-1)).toContain('迟到事件');
    expect(events.every(m=>m.includes('aiTrace=demo-ai 策略=作品优先'))).toBe(true);
    expect(new Set(events.map(m=>m.match(/followup=(\S+)/)?.[1])).size).toBe(1);
    const { exportJournal } = await import('@/features/run-record/journal-view');
    const snapshot = () => logs.map((message, i) => ({ id: String(i), timestamp: '22:25:39.287', level: 'info', message }));
    const report = exportJournal(snapshot, {timeRange:null, level:'', keyword:'demo-ai', actionType:'followup', aiDecision:''}, 'filtered', 'txt');
    expect(report.content).toContain('phase=deadline');
    expect(report.content).toContain('phase=delivered');
    expect(report.content).toContain('迟到事件');
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(logs.join('\n')).not.toContain(privateText);
    expect(logs.join('\n')).not.toContain(privateUid);
  });
});
