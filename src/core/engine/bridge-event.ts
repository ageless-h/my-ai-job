import type { LogEntry } from './log-journal';
import type { FollowupChannel, FollowupPhase } from '@/core/protocol/followup-trace';

type Phase = FollowupPhase | 'queued' | 'disabled' | 'cancelled' | 'failed' | 'unknown';
export interface BridgeEvent {
  id: string;
  timeMs: number;
  kind: 'run_start' | 'run_end' | 'applied' | 'followup';
  job?: string;
  trace?: string;
  aiTrace?: string;
  strategy?: string;
  phase?: Phase;
  channel?: FollowupChannel;
  elapsedMs?: number;
  late?: boolean;
  submitted?: boolean;
  ready?: boolean;
  probe?:
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'CONNECTING'
    | 'RECONNECTING'
    | 'CLOSED'
    | 'timeout'
    | 'failed'
    | 'other';
}
const phases = new Set<Phase>([
  'submit_call',
  'sync_error',
  'request_rejected',
  'request_timeout',
  'ready_timeout',
  'response_error',
  'response_empty',
  'submitted',
  'send_error',
  'delivery_timeout',
  'delivered',
  'deadline',
  'status_probe',
  'observation_end',
  'page_exit',
  'setup_error',
]);
const channels = new Set<FollowupChannel>([
  'worker',
  'sdk-proxy',
  'sdk-socket',
  'legacy-text',
  'legacy-image',
]);
const strategy = '(作品优先|拓展机会|广泛尝试|原版在线简历匹配|常规)';
const prefix = new RegExp(
  `^工作【(.+?)】自定义招呼语 followup=(F-[a-z0-9_-]{1,80}) aiTrace=([a-z0-9_-]{1,80}|无) 策略=${strategy} (.*)$`,
  'i'
);
const jobName = (value: string) =>
  value
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ')
    .trim()
    .slice(0, 160) || undefined;

/** Extract only structured diagnostic facts. Free-form reasons can quote a résumé. */
export function projectBridgeEvent(row: LogEntry): BridgeEvent | null {
  const { id, timeMs, message } = row;
  if (!Number.isSafeInteger(timeMs) || timeMs <= 0 || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    return null;
  const base = { id, timeMs };
  if (message === '开始投递') return { ...base, kind: 'run_start' };
  if (message === '结束投递' || /^释放投递锁 lock=[\d._]+$/.test(message))
    return { ...base, kind: 'run_end' };
  const applied = /^工作【(.+?)】 投递成功(?: AI理由：|$)/.exec(message);
  if (applied) return { ...base, kind: 'applied', job: jobName(applied[1]) };
  const match = prefix.exec(message);
  if (!match) return null;
  const [, job, trace, aiTrace, mode, text] = match;
  const event: BridgeEvent = {
    ...base,
    kind: 'followup',
    job: jobName(job),
    trace,
    strategy: mode,
  };
  if (aiTrace !== '无') event.aiTrace = aiTrace;
  const protocol =
    /^\+\d+ms [^\r\n]{1,90}? phase=(\w+) channel=([\w-]+) 通道耗时=(\d+)ms 已获提交凭据=(是|否)(.*)$/.exec(
      text
    );
  if (protocol) {
    const [, phase, channel, ms, submitted, suffix] = protocol;
    if (
      !phases.has(phase as Phase) ||
      !channels.has(channel as FollowupChannel) ||
      !Number.isSafeInteger(Number(ms))
    )
      return null;
    Object.assign(event, {
      phase,
      channel,
      elapsedMs: Number(ms),
      submitted: submitted === '是',
      late: suffix.includes('迟到事件'),
    });
    const ready = /Worker就绪=(是|否)/.exec(suffix);
    if (ready) event.ready = ready[1] === '是';
    if (phase === 'status_probe') {
      const status = /\b(CONNECTED|DISCONNECTED|CONNECTING|RECONNECTING|CLOSED)\b/.exec(suffix);
      event.probe = status
        ? (status[0] as BridgeEvent['probe'])
        : suffix.includes('查询超时')
          ? 'timeout'
          : suffix.includes('查询失败')
            ? 'failed'
            : 'other';
    }
    return event;
  }
  if (/^\+\d+ms 开始准备/.test(text)) event.phase = 'queued';
  else if (text === '开关已关闭，跳过发送') event.phase = 'disabled';
  else if (/^因.*已取消$/.test(text)) event.phase = 'cancelled';
  else if (/^(操作结束|提交失败)：/.test(text)) event.phase = 'failed';
  else if (text.startsWith('结果未知，未补发：')) event.phase = 'unknown';
  else return null;
  return event;
}
