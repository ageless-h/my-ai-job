<template>
  <div class="run-record-tab">
    <div class="header-title">运行日志与投递记录</div>

    <div class="boss-card">
      <div class="filter-bar">
        <el-time-picker
          v-model="filter.timeRange"
          is-range
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="HH:mm"
          clearable
          class="filter-item time-picker"
        />

        <el-select
          v-model="filter.level"
          placeholder="日志级别"
          clearable
          class="filter-item level-select"
        >
          <el-option label="全部级别" value="" />
          <el-option label="Error (错误)" value="error" />
          <el-option label="Warn (警告)" value="warn" />
          <el-option label="Info (信息)" value="info" />
          <el-option label="Debug (调试)" value="debug" />
        </el-select>

        <el-input
          v-model="filter.keyword"
          placeholder="搜索日志内容关键词..."
          clearable
          class="filter-item search-input"
          :prefix-icon="Search"
        />

        <div class="spacer"></div>

        <el-button type="danger" plain @click="clearLogs">
          <el-icon class="mr-4"><Delete /></el-icon>清空日志
        </el-button>
      </div>

      <div class="table-container">
        <el-table
          :data="logs"
          style="width: 100%"
          height="100%"
          :row-class-name="tableRowClassName"
          class="boss-table"
        >
          <template #empty>
            <el-empty description="暂无日志数据" :image-size="80" />
          </template>

          <el-table-column prop="timestamp" label="记录时间" width="160" class-name="col-timestamp" />

          <el-table-column prop="level" label="级别" width="100" class-name="col-level">
            <template #default="scope">
              <el-tag :type="getLevelTagType(scope.row.level)" size="small" effect="plain" class="level-tag">
                {{ String(scope.row.level || '').toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="aiDecision" label="AI 判定" width="120" class-name="col-ai-decision">
            <template #default="scope">
              <span v-if="scope.row.aiDecision" :class="['decision-text', getDecisionClass(scope.row.aiDecision)]">
                {{ scope.row.aiDecision }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="aiReason" label="判定理由 / 提示" width="240" show-overflow-tooltip class-name="col-ai-reason">
            <template #default="scope">
              <span class="reason-text" v-if="scope.row.aiReason">{{ scope.row.aiReason }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="message" label="详细内容" min-width="300" class-name="col-message" />
        </el-table>
      </div>

      <div class="pagination-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalLogs"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { Delete, Search } from '@element-plus/icons-vue';
import { LogRecorder } from '@/core/engine/push-engine';

interface LogItem {
  timestamp: string;
  level: string;
  message: string;
  aiDecision?: string;
  aiReason?: string;
}

const logRecorder = new LogRecorder();

const logs = ref<LogItem[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const totalLogs = ref(0);

const filter = reactive<{
  timeRange: Date[];
  level: string;
  keyword: string;
}>({
  timeRange: [],
  level: '',
  keyword: ''
});

const parseAiJudgeInfo = (message: string) => {
  const text = `${message || ''}`;
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    return { decision: '', reason: '' };
  }

  let decision = '';
  if (normalizedText.includes('AI投递判断通过')) {
    decision = '通过';
  } else if (normalizedText.includes('AI投递判断不通过')) {
    decision = '不通过';
  } else if (normalizedText.includes('AI判定结果不可解析')) {
    decision = '不可解析';
  } else if (normalizedText.includes('AI投递判断失败')) {
    decision = '失败';
  } else if (normalizedText.includes('投递成功') && normalizedText.includes('AI理由')) {
    decision = '已投递';
  }

  let reason = '';
  const reasonWithLabel = normalizedText.match(/AI理由[:：]\s*(.+)$/);
  if (reasonWithLabel && reasonWithLabel[1]) {
    reason = reasonWithLabel[1].trim();
  }

  if (!reason) {
    const reasonWithKey = normalizedText.match(/\breason=\s*(.+)$/i);
    if (reasonWithKey && reasonWithKey[1]) {
      reason = reasonWithKey[1].trim();
    }
  }

  if (reason.length > 180) {
    reason = `${reason.slice(0, 180)}...`;
  }

  return { decision, reason };
};

const parseTimestampToMs = (timestamp: string): number | null => {
  const match = `${timestamp || ''}`.trim().match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const milliseconds = Number.parseInt((match[4] || '0').padEnd(3, '0'), 10);

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
};

const minuteStartMs = (date: Date): number => ((date.getHours() * 60 + date.getMinutes()) * 60) * 1000;
const minuteEndMs = (date: Date): number => minuteStartMs(date) + 59 * 1000 + 999;

const fetchLogs = () => {
  let allLogs: LogItem[] = logRecorder.getLogs(1, logRecorder.getLogCount());

  if (filter.timeRange.length === 2) {
    const [startDate, endDate] = filter.timeRange;
    const hasValidRange = startDate instanceof Date
      && !Number.isNaN(startDate.getTime())
      && endDate instanceof Date
      && !Number.isNaN(endDate.getTime());

    if (hasValidRange) {
      const startMs = minuteStartMs(startDate);
      const endMs = minuteEndMs(endDate);
      const [rangeStart, rangeEnd] = startMs <= endMs ? [startMs, endMs] : [endMs, startMs];
      allLogs = allLogs.filter((log) => {
        const logMs = parseTimestampToMs(log.timestamp);
        return logMs !== null && logMs >= rangeStart && logMs <= rangeEnd;
      });
    }
  }

  if (filter.level) {
    allLogs = allLogs.filter((log) => `${log.level || ''}`.toLowerCase() === filter.level);
  }

  if (filter.keyword) {
    const keyword = filter.keyword.toLowerCase();
    allLogs = allLogs.filter((log) => `${log.message || ''}`.toLowerCase().includes(keyword));
  }

  totalLogs.value = allLogs.length;
  const startIndex = (currentPage.value - 1) * pageSize.value;
  logs.value = allLogs.slice(startIndex, startIndex + pageSize.value).map((log) => {
    const aiInfo = parseAiJudgeInfo(log.message);
    return {
      ...log,
      aiDecision: aiInfo.decision,
      aiReason: aiInfo.reason
    };
  });
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchLogs();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchLogs();
};

const clearLogs = () => {
  logRecorder.clearLogs();
  currentPage.value = 1;
  fetchLogs();
};

const getLevelTagType = (level: string) => {
  const normalized = `${level || ''}`.toLowerCase();
  if (normalized === 'error') return 'danger';
  if (normalized === 'warn') return 'warning';
  if (normalized === 'info') return 'primary';
  return 'info';
};

const getDecisionClass = (decision: string) => {
  if (decision === '通过' || decision === '已投递') return 'is-success';
  if (decision === '不通过') return 'is-danger';
  if (decision === '失败' || decision === '不可解析') return 'is-warning';
  return '';
};

const tableRowClassName = ({ row }: { row: LogItem }) => {
  const normalized = `${row.level || ''}`.toLowerCase();
  if (normalized === 'error') return 'row-error';
  if (normalized === 'warn') return 'row-warn';
  return '';
};

watch(
  filter,
  () => {
    currentPage.value = 1;
    fetchLogs();
  },
  { deep: true }
);

onMounted(() => {
  fetchLogs();
});
</script>

<style scoped>
.run-record-tab {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #f8f9fa;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
  border-left: 3px solid var(--boss-primary, #00bebd);
  padding-left: 8px;
  line-height: 1;
  flex-shrink: 0;
}

.boss-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef0f5;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-item {
  margin-bottom: 0;
}

.time-picker {
  width: 220px;
}

.level-select {
  width: 140px;
}

.search-input {
  width: 260px;
}

.spacer {
  flex: 1;
}

.mr-4 {
  margin-right: 4px;
}

.table-container {
  flex: 1;
  min-height: 0;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.boss-table {
  --el-table-border-color: #ebeef5;
  --el-table-header-bg-color: #f8f9fa;
  --el-table-header-text-color: #333;
}

:deep(.boss-table th.el-table__cell) {
  font-weight: 600;
  font-size: 13px;
  padding: 10px 0;
}

:deep(.boss-table td.el-table__cell) {
  font-size: 13px;
  color: #555;
  padding: 8px 0;
}

.level-tag {
  font-weight: bold;
  border-color: transparent;
}

.decision-text {
  font-weight: 600;
  font-size: 13px;
}

.decision-text.is-success {
  color: #00bebd;
}

.decision-text.is-danger {
  color: #f56c6c;
}

.decision-text.is-warning {
  color: #e6a23c;
}

.reason-text {
  color: #666;
}

.text-muted {
  color: #c0c4cc;
}

:deep(.el-table .row-error) {
  background-color: #fef0f0 !important;
}

:deep(.el-table .row-warn) {
  background-color: #fdf6ec !important;
}

.pagination-footer {
  margin-top: 16px;
  display: flex;
  flex-shrink: 0;
  padding-top: 4px;
  overflow-x: auto;
}

:deep(.pagination-footer .el-pagination) {
  flex-wrap: wrap;
  justify-content: center;
  margin-left: auto;
  gap: 8px 0;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-item {
    width: 100% !important;
  }

  .spacer {
    display: none;
  }

  .table-container {
    font-size: 12px;
  }

  :deep(.boss-table th.el-table__cell) {
    font-size: 12px;
    padding: 8px 4px;
  }

  :deep(.boss-table td.el-table__cell) {
    font-size: 12px;
    padding: 6px 4px;
  }

  :deep(.col-ai-decision),
  :deep(.col-ai-reason) {
    display: none;
  }

  :deep(.col-timestamp) {
    width: 100px !important;
  }

  :deep(.col-level) {
    width: 70px !important;
  }

  :deep(.col-message) {
    min-width: 150px !important;
  }

  .pagination-footer {
    justify-content: center;
  }

  :deep(.pagination-footer .el-pagination) {
    font-size: 12px;
  }

  :deep(.el-pagination .el-pagination__sizes) {
    display: none;
  }

  :deep(.el-pagination .el-pagination__jump) {
    display: none;
  }
}
</style>
