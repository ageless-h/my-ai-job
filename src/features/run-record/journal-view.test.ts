import { describe, expect, it, vi } from 'vitest';
import { journalStorage, LogJournal } from '@/core/engine/log-journal';
import {
  compactMessage,
  describeRow,
  exportJournal,
  filterRows,
  useJournalReader,
  type LogFilter,
} from './journal-view';

const filter: LogFilter = {
  timeRange: null,
  level: '',
  keyword: '',
  actionType: '',
  aiDecision: '',
};
const row = (id: string, message: string, level = 'info') => ({
  id,
  message,
  level,
  timestamp: '22:25:54.371',
});
const first = row('a', '系统启动');
const second = row('b', '自定义招呼语 followup=F-x phase=request_error 请求超时', 'warn');

describe('运行日志面板和导出', () => {
  for (const scope of ['all', 'filtered'] as const) {
    for (const format of ['json', 'txt'] as const) {
      it(`${scope} ${format} 点击时读取当前完整快照、标明范围及条数`, () => {
        const snapshot = vi.fn(() => [first, second]);
        const result = exportJournal(snapshot, { ...filter, keyword: 'F-x' }, scope, format);
        const expectedCount = scope === 'all' ? 2 : 1;
        expect(snapshot).toHaveBeenCalledTimes(1);
        expect(result.count).toBe(expectedCount);
        expect(result.content).toContain(second.message);
        if (format === 'json') {
          const parsed = JSON.parse(result.content);
          expect(parsed).toMatchObject({
            scope,
            count: expectedCount,
            totalCount: 2,
            filters: scope === 'all' ? null : { keyword: 'F-x' },
          });
          expect(parsed.logs.map((e: { id: string }) => e.id)).toEqual(
            scope === 'all' ? ['a', 'b'] : ['b']
          );
        } else {
          expect(result.content).toContain(`# 导出条数: ${expectedCount} / 总条数: 2`);
          expect(result.content).toContain(result.scopeLabel);
          expect(result.content.includes(first.message)).toBe(scope === 'all');
        }
      });
    }
  }
  it('保留同毫秒各条记录，阅读历史时固定旧页，恢复实时显示最新行', () => {
    const reader = useJournalReader();
    reader.pageSize.value = 1;
    reader.setRows([first, second]);
    expect(reader.totalLogs.value).toBe(2);
    expect(reader.logs.value[0].id).toBe('b');
    reader.currentPage.value = 2;
    reader.pauseReading();
    reader.setRows([first, second, row('c', '新事件', 'warn')]);
    expect(reader.logs.value[0].id).toBe('a');
    expect(reader.pending.value).toBe(1);
    reader.resumeLive();
    expect(reader.logs.value[0].id).toBe('c');
    expect(reader.currentPage.value).toBe(1);
  });
  it('另一个标签的写入通知尚未到达时，立即导出仍抓到同毫秒事件', () => {
    const shared = new Map<string, unknown>();
    vi.stubGlobal('GM_listValues', () => Array.from(shared.keys()));
    vi.stubGlobal('GM_getValue', (key: string) => shared.get(key));
    vi.stubGlobal('GM_setValue', (key: string, value: unknown) => shared.set(key, value));
    vi.stubGlobal('GM_deleteValue', (key: string) => shared.delete(key));
    vi.stubGlobal('GM_addValueChangeListener', vi.fn());
    const writer = new LogJournal(journalStorage('test-ui'), 1000, 'writer');
    const viewer = new LogJournal(journalStorage('test-ui'), 1000, 'viewer');
    const reader = useJournalReader();
    const unsubscribe = viewer.subscribe(() => reader.setRows(viewer.page(1, 1000)));
    vi.spyOn(Date, 'now').mockReturnValue(1795616729000);
    try {
      expect([viewer.storageMode, writer.storageMode]).toEqual(['persistent', 'persistent']);
      viewer.append('info', '调用 Worker');
      expect(reader.logs.value[0].message).toBe('调用 Worker');
      writer.append('info', '收到服务器回执');
      expect(reader.logs.value).toHaveLength(1);
      const exported = JSON.parse(
        exportJournal(() => viewer.snapshot(), filter, 'all', 'json').content
      );
      expect(exported.logs.map((r: { message: string }) => r.message)).toEqual([
        '调用 Worker',
        '收到服务器回执',
      ]);
      expect(exported.logs[0].timestamp).toBe(exported.logs[1].timestamp);
    } finally {
      vi.restoreAllMocks();
      unsubscribe();
      vi.unstubAllGlobals();
    }
  });
  it('筛选结果可为空，此时仍能导出所有日志；新增提示只统计命中筛选的记录', () => {
    const reader = useJournalReader();
    reader.filter.level = 'warn';
    reader.setRows([first]);
    reader.pauseReading();
    reader.setRows([first, second, row('c', '系统更新')]);
    expect(reader.pending.value).toBe(1);
    expect(reader.logs.value).toHaveLength(0);
    expect(exportJournal(() => [first], reader.filter, 'all', 'txt').count).toBe(1);
    expect(exportJournal(() => [first], reader.filter, 'filtered', 'txt').count).toBe(0);
  });
  it('诊断行可按追踪号和消息发送类型检索，简洁模式保留完整阶段与错误', () => {
    const msg =
      '工作【测试岗位】自定义招呼语 ' +
      'x'.repeat(200) +
      ' followup=F-1 phase=deadline elapsed=15000';
    const entry = describeRow(row('trace', msg));
    expect(compactMessage(entry)).toBe(msg);
    expect(
      filterRows(
        [entry, describeRow(row('setting', '投递过滤设置保存成功 - 自定义招呼语: 开启'))],
        { ...filter, actionType: 'followup' }
      )
    ).toEqual([entry]);
    expect(filterRows([entry], { ...filter, keyword: 'f-1' })).toEqual([entry]);
  });
});
