import { describe, it, expect } from 'vitest';
import { projectBridgeEvent } from './bridge-event';
const common = {
  id: '1795620350000-test-0000000001',
  timeMs: 1795620350000,
  level: 'info',
  timestamp: '23:31:00.000',
};
const title = '创意策划【游戏广告】';
const prefix = `工作【${title}】自定义招呼语 followup=F-fixture-send-001 aiTrace=fixture-ai-001 策略=作品优先 `;
const project = (message: string) => projectBridgeEvent({ ...common, message });

describe('本机日志同步白名单', () => {
  it('投递成功只提取岗位及时间，不输出含简历摘录的原因', () => {
    expect(project(`工作【${title}】 投递成功 AI理由：简历正文 secret`)).toEqual({
      id: common.id,
      timeMs: common.timeMs,
      kind: 'applied',
      job: title,
    });
    expect(project(`工作【${title}】AI投递判断完成 reason=secret`)).toBeNull();
  });
  it('岗位名称清洗与接收端的 Unicode 校验一致', () => {
    expect(project('工作【项目\u0085运营】 投递成功')?.job).toBe('项目 运营');
    expect(project('工作【\u0085】 投递成功')?.job).toBeUndefined();
  });
  it('从当前版本的回执原文中保留同一追踪号与耗时', () => {
    expect(
      project(
        prefix +
          '+159ms 收到匹配送达回执 phase=delivered channel=worker 通道耗时=87ms 已获提交凭据=是'
      )
    ).toMatchObject({
      kind: 'followup',
      job: title,
      trace: 'F-fixture-send-001',
      phase: 'delivered',
      channel: 'worker',
      elapsedMs: 87,
      late: false,
      submitted: true,
    });
    expect(project(prefix + '已获服务器送达回执')).toBeNull();
  });
  it('保留超时后状态码，丢弃自由文本、重复结果、图片消息以及无日期的旧记录', () => {
    const text =
      prefix +
      '+15010ms 超时后查询同一 Worker 状态 phase=status_probe channel=worker 通道耗时=15010ms 已获提交凭据=否 迟到事件 CONNECTED (2ms) private';
    const event = project(text);
    expect(event).toMatchObject({ phase: 'status_probe', probe: 'CONNECTED', late: true });
    expect(JSON.stringify(event)).not.toContain('private');
    expect(project(text.replace('自定义招呼语', '图片简历'))).toBeNull();
    expect(projectBridgeEvent({ ...common, timeMs: 0, message: '开始投递' })).toBeNull();
  });
});
