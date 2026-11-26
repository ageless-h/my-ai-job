import { isAbsolute, join } from 'node:path';
import bridgeModule from './bridge.cjs';

export const name = 'job-journal';
export const inject = ['tools', 'profileContext'];
const actions = ['summary', 'timeouts', 'trace'];

function queryArgs(input) {
  const { action, limit } = input ?? {};
  const trace = input?.trace === '' ? undefined : input?.trace;
  if (!actions.includes(action)) throw new Error('请选择 summary、timeouts 或 trace。');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    throw new Error('limit 必须为 1 至 100 的整数。');
  }
  if (action === 'trace' && (typeof trace !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(trace))) {
    throw new Error('trace 查询需要有效的发送追踪号。');
  }
  if (trace !== undefined && action !== 'trace') throw new Error('trace 仅适用于 trace 查询。');
  return { action, ...(trace === undefined ? {} : { trace }), ...(limit === undefined ? {} : { limit }) };
}

// One Host entry per profile. Its scope owns both the receiver and the shared tool.
export async function apply(ctx) {
  const profileDir = ctx.profileContext.dir;
  if (typeof profileDir !== 'string' || !isAbsolute(profileDir)) throw new Error('DSH profile directory is unavailable.');
  const bridge = bridgeModule.createBridge({ dataDir: join(profileDir, 'data', 'dsh-job-journal'), port: 18761 });
  let stopping = false;
  const started = Promise.resolve().then(() => bridge.start());
  ctx.effect(() => async () => {
    stopping = true;
    try { await started; } catch { /* Release any resources acquired before a failed start. */ }
    await bridge.stop();
  });
  await started;
  if (stopping) return;
  ctx.tools.register({
    name: 'job_journal',
    description: '查询本机已同步的求职助手记录。summary 查看投递与送达摘要，timeouts 查看超时，trace 查看指定招呼语的完整时间线。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['action'],
      properties: {
        action: { type: 'string', enum: actions },
        trace: { type: 'string', description: 'trace 查询的发送追踪号，取自摘要或超时记录。' },
        limit: { type: 'integer', description: '结果数量，范围 1 至 100。' },
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(input, exec) {
      exec.signal?.throwIfAborted();
      if (stopping) throw new Error('求职日志接收服务正在停止。');
      return bridge.query(queryArgs(input));
    },
  });
}
