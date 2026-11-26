import { computed, reactive, ref, shallowRef } from 'vue';

export interface JournalRow {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}
export interface LogFilter {
  timeRange: Date[] | null;
  level: string;
  keyword: string;
  actionType: string;
  aiDecision: string;
}

function decisionFor(message: string) {
  if (message.includes('AI投递判断通过')) return '通过';
  if (message.includes('AI投递判断不通过')) return '不通过';
  if (message.includes('AI判定结果不可解析')) return '不可解析';
  if (message.includes('AI投递判断失败')) return '失败';
  if (message.includes('投递成功') && message.includes('AI理由')) return '已投递';
  return '';
}
function actionFor(message: string) {
  if (/\bfollowup=F-\S+|^工作【.*】(?:自定义招呼语|图片简历)/.test(message)) return 'followup';
  if (/ai投递|投递判|投递成功|投递失败/i.test(message)) return 'delivery';
  if (/ai对话|ai回复|聊天/i.test(message)) return 'chat';
  return 'system';
}
export function describeRow(row: JournalRow) {
  const aiReason = (row.message.match(/(?:AI理由[:：]|\breason=)\s*([\s\S]*)$/)?.[1] ?? '').trim();
  return {
    ...row,
    aiDecision: decisionFor(row.message),
    aiReason,
    actionType: actionFor(row.message),
  };
}
export type LogItem = ReturnType<typeof describeRow>;
export function compactMessage(row: LogItem) {
  if (row.actionType === 'followup') return row.message;
  const text = (row.aiDecision && row.aiReason) || row.message;
  return text.length <= 180 ? text : `${text.slice(0, 180)}…`;
}

function clockMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
export function filterRows(rows: LogItem[], filter: LogFilter) {
  const keyword = filter.keyword.trim().toLowerCase();
  const range = filter.timeRange?.length === 2 ? filter.timeRange.map(clockMinutes) : undefined;
  return rows.filter((row) => {
    if (filter.level && filter.level !== row.level.toLowerCase()) return false;
    if (filter.actionType && filter.actionType !== row.actionType) return false;
    if (filter.aiDecision && filter.aiDecision !== row.aiDecision) return false;
    if (keyword && !row.message.toLowerCase().includes(keyword)) return false;
    if (range?.every(Number.isFinite)) {
      const clock = row.timestamp.match(/^(\d{2}):(\d{2}):/);
      const minute = clock ? Number(clock[1]) * 60 + Number(clock[2]) : NaN;
      return minute >= Math.min(...range) && minute <= Math.max(...range);
    }
    return true;
  });
}

export type ExportScope = 'all' | 'filtered';
export type ExportFormat = 'txt' | 'json';
export function exportJournal(
  snapshot: () => JournalRow[],
  filter: LogFilter,
  scope: ExportScope,
  format: ExportFormat
) {
  const all = snapshot().map(describeRow);
  const logs = scope === 'all' ? all : filterRows(all, filter);
  const scopeLabel = scope === 'all' ? '全部日志' : '当前筛选结果';
  const exportedAt = new Date().toISOString();
  const filters =
    scope === 'all'
      ? null
      : {
          level: filter.level,
          keyword: filter.keyword,
          actionType: filter.actionType,
          aiDecision: filter.aiDecision,
          timeRange:
            filter.timeRange?.map(
              (d) =>
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            ) ?? [],
        };
  const content =
    format === 'json'
      ? JSON.stringify(
          {
            scope,
            scopeLabel,
            exportedAt,
            count: logs.length,
            totalCount: all.length,
            filters,
            logs,
          },
          null,
          2
        )
      : [
          '# AI 求职助手运行日志',
          `# 导出时间: ${exportedAt}`,
          `# 导出范围: ${scopeLabel}`,
          `# 导出条数: ${logs.length} / 总条数: ${all.length}`,
          ...(filters ? [`# 筛选条件: ${JSON.stringify(filters)}`] : []),
          '# --------',
          ...logs.map(
            (row) =>
              `${row.timestamp}  ${row.level.toUpperCase()}  ${row.aiDecision ? `[${row.aiDecision}] ` : ''}${row.message}`
          ),
        ].join('\n');
  return { content, count: logs.length, scopeLabel };
}

export function newMatchingCount(latest: LogItem[], readingSnapshot: LogItem[]) {
  const seen = new Set(readingSnapshot.map((log) => log.id));
  return latest.filter((log) => !seen.has(log.id)).length;
}

export function useJournalReader(resetScroll?: () => void) {
  const latest = shallowRef<LogItem[]>([]);
  const frozen = shallowRef<LogItem[] | null>(null);
  const reading = computed(() => frozen.value !== null);
  const currentPage = ref(1);
  const pageSize = ref(20);

  const filter = reactive<LogFilter>({
    timeRange: [],
    level: '',
    keyword: '',
    actionType: '',
    aiDecision: '',
  });
  const matching = computed(() => filterRows(latest.value, filter));
  const displayed = computed(() => frozen.value ?? matching.value);
  const totalLogs = computed(() => displayed.value.length);
  const pending = computed(() =>
    frozen.value ? newMatchingCount(matching.value, frozen.value) : 0
  );
  const logs = computed(() =>
    displayed.value.slice(
      (currentPage.value - 1) * pageSize.value,
      currentPage.value * pageSize.value
    )
  );

  function setRows(rows: JournalRow[]) {
    latest.value = rows.map(describeRow).reverse();
    if (!latest.value.length) resumeLive();
  }
  function pauseReading() {
    if (!reading.value) frozen.value = matching.value;
  }
  function resumeLive() {
    frozen.value = null;
    currentPage.value = 1;
    resetScroll?.();
  }
  return {
    currentPage,
    pageSize,
    filter,
    reading,
    pending,
    logs,
    totalLogs,
    pauseReading,
    resumeLive,
    setRows,
  };
}
