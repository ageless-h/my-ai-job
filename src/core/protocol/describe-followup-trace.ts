import type { FollowupTraceEvent } from './followup-channel';

const labels = {
  submit_call: '调用发送方法', sync_error: '调用同步抛错', request_rejected: '提交请求被拒绝',
  request_timeout: '提交请求返回超时', ready_timeout: '通道就绪等待超时', response_error: '提交响应含错误',
  response_empty: '响应缺少提交凭据', submitted: '通道返回提交凭据', send_error: '收到匹配的发送错误',
  delivery_timeout: '收到匹配的发送超时事件', delivered: '收到匹配送达回执',
  status_probe: '超时后查询同一 Worker 状态',
  deadline: '插件前台等待到期', observation_end: '被动观察结束', page_exit: '页面退出，观察结束', setup_error: '通道准备失败',
};

export function describeFollowupTrace(event: FollowupTraceEvent): string {
  const fields = [labels[event.phase], `phase=${event.phase}`, `channel=${event.channel}`,
    `通道耗时=${event.elapsedMs}ms`, `已获提交凭据=${event.submitted ? '是' : '否'}`];
  if (event.late) fields.push('迟到事件');
  if (typeof event.ready === 'boolean') fields.push(`Worker就绪=${event.ready ? '是' : '否'}`);
  if (event.detail) fields.push(event.detail);
  return fields.join(' ');
}
