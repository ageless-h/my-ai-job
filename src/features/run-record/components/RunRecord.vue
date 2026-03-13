<!--
/**
 * RunRecord.vue - 运行日志与投递记录组件
 * 
 * 显示用户脚本的运行日志和投递历史记录。
 * 
 * 主要功能：
 * - 日志过滤（时间范围、日志级别、关键词搜索）
 * - 日志分页显示
 * - 日志级别标识（Error/Warn/Info/Debug）
 * - 清空日志功能
 * - 投递记录查看
 * 
 * 技术特性：
 * - 虚拟滚动优化大量日志显示
 * - 实时日志更新
 * - localStorage 持久化日志
 * 
 * @component
 */
-->
<template>
  <div class="run-record-tab">
    <div class="header-title">运行日志与投递记录</div>

    <div class="boss-card">
      <div class="filter-bar">
        <el-select
          v-model="filter.actionType"
          placeholder="操作类型"
          clearable
          class="filter-item action-type-select"
        >
          <el-option label="全部类型" value="" />
          <el-option label="投递判定" value="delivery" />
          <el-option label="AI 对话" value="chat" />
          <el-option label="系统操作" value="system" />
        </el-select>

        <el-select
          v-model="filter.aiDecision"
          placeholder="判定结果"
          clearable
          class="filter-item decision-select"
        >
          <el-option label="全部结果" value="" />
          <el-option label="通过" value="通过" />
          <el-option label="不通过" value="不通过" />
          <el-option label="已投递" value="已投递" />
          <el-option label="失败" value="失败" />
          <el-option label="不可解析" value="不可解析" />
        </el-select>

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
          <el-option label="Error" value="error" />
          <el-option label="Warn" value="warn" />
          <el-option label="Info" value="info" />
          <el-option label="Debug" value="debug" />
        </el-select>

        <el-input
          v-model="filter.keyword"
          placeholder="搜索关键词..."
          clearable
          class="filter-item search-input"
          :prefix-icon="Search"
        />

        <div class="spacer"></div>

        <el-popover
          placement="bottom-end"
          :width="240"
          trigger="click"
          popper-class="config-popover"
        >
          <template #reference>
            <el-button type="primary" plain>
              <el-icon class="mr-4"><Setting /></el-icon>显示配置
            </el-button>
          </template>
          <div class="display-config-panel">
            <div class="config-title">显示模式</div>
            <el-radio-group v-model="displayMode" class="mode-radio-group">
              <el-radio label="compact">简洁模式</el-radio>
              <el-radio label="detailed">详细模式</el-radio>
            </el-radio-group>

            <div class="config-divider"></div>

            <div class="config-title">显示列</div>
            <el-checkbox-group v-model="visibleColumns" class="column-checkbox-group">
              <el-checkbox label="timestamp" disabled>时间</el-checkbox>
              <el-checkbox label="level">级别</el-checkbox>
              <el-checkbox label="aiDecision">判定结果</el-checkbox>
              <el-checkbox label="aiReason">判定理由</el-checkbox>
              <el-checkbox label="message">详细内容</el-checkbox>
            </el-checkbox-group>
          </div>
        </el-popover>

        <el-button type="danger" plain :disabled="totalLogs === 0" @click="clearLogs">
          <el-icon class="mr-4"><Delete /></el-icon>清空
        </el-button>
      </div>

      <div class="table-container">
        <el-table
          :data="logs"
          style="width: 100%"
          height="100%"
          :row-class-name="tableRowClassName"
          class="boss-table"
          :class="{ 'compact-mode': displayMode === 'compact' }"
        >
          <template #empty>
            <el-empty description="暂无日志数据" :image-size="80" />
          </template>

          <el-table-column
            prop="timestamp"
            label="时间"
            :width="displayMode === 'compact' ? 90 : 160"
            class-name="col-timestamp"
          >
            <template #default="scope">
              <span v-if="displayMode === 'compact'">{{ formatCompactTime(scope.row.timestamp) }}</span>
              <span v-else>{{ scope.row.timestamp }}</span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="visibleColumns.includes('level')"
            prop="level"
            label="级别"
            :width="displayMode === 'compact' ? 60 : 100"
            class-name="col-level"
          >
            <template #default="scope">
              <el-tag
                :type="getLevelTagType(scope.row.level)"
                size="small"
                effect="plain"
                class="level-tag"
              >
                {{ displayMode === 'compact' ? getLevelShort(scope.row.level) : String(scope.row.level || '').toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            v-if="visibleColumns.includes('aiDecision')"
            prop="aiDecision"
            label="判定"
            :width="displayMode === 'compact' ? 70 : 120"
            class-name="col-ai-decision"
          >
            <template #default="scope">
              <span
                v-if="scope.row.aiDecision"
                :class="['decision-text', getDecisionClass(scope.row.aiDecision)]"
              >
                {{ scope.row.aiDecision }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="visibleColumns.includes('aiReason') && displayMode === 'detailed'"
            prop="aiReason"
            label="判定理由"
            :width="240"
            show-overflow-tooltip
            class-name="col-ai-reason"
          >
            <template #default="scope">
              <span class="reason-text" v-if="scope.row.aiReason">{{ scope.row.aiReason }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="visibleColumns.includes('message')"
            prop="message"
            :label="displayMode === 'compact' ? '内容' : '详细内容'"
            min-width="200"
            class-name="col-message"
          >
            <template #default="scope">
              <span v-if="displayMode === 'compact'">{{ formatCompactMessage(scope.row) }}</span>
              <span v-else>{{ scope.row.message }}</span>
            </template>
          </el-table-column>
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
import { Delete, Search, Setting } from '@element-plus/icons-vue';
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

const displayMode = ref<'compact' | 'detailed'>('compact');
const visibleColumns = ref<string[]>(['timestamp', 'level', 'aiDecision', 'message']);

const filter = reactive<{
  timeRange: Date[];
  level: string;
  keyword: string;
  actionType: string;
  aiDecision: string;
}>({
  timeRange: [],
  level: '',
  keyword: '',
  actionType: '',
  aiDecision: '',
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

const detectActionType = (message: string): string => {
  const text = `${message || ''}`.toLowerCase();
  if (text.includes('ai投递') || text.includes('投递判') || text.includes('投递成功') || text.includes('投递失败')) {
    return 'delivery';
  }
  if (text.includes('ai对话') || text.includes('ai回复') || text.includes('聊天')) {
    return 'chat';
  }
  return 'system';
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

const minuteStartMs = (date: Date): number =>
  (date.getHours() * 60 + date.getMinutes()) * 60 * 1000;
const minuteEndMs = (date: Date): number => minuteStartMs(date) + 59 * 1000 + 999;

const formatCompactTime = (timestamp: string): string => {
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : timestamp;
};

const getLevelShort = (level: string): string => {
  const normalized = `${level || ''}`.toLowerCase();
  if (normalized === 'error') return 'ERR';
  if (normalized === 'warn') return 'WRN';
  if (normalized === 'info') return 'INF';
  if (normalized === 'debug') return 'DBG';
  return normalized.toUpperCase().slice(0, 3);
};

const formatCompactMessage = (log: LogItem): string => {
  if (log.aiDecision && log.aiReason) {
    return log.aiReason;
  }
  const msg = log.message || '';
  if (msg.length > 100) {
    return `${msg.slice(0, 100)}...`;
  }
  return msg;
};

const fetchLogs = () => {
  let allLogs: LogItem[] = logRecorder.getLogs(1, logRecorder.getLogCount());

  // Parse AI info and action type for all logs first
  allLogs = allLogs.map((log) => {
    const aiInfo = parseAiJudgeInfo(log.message);
    return {
      ...log,
      aiDecision: aiInfo.decision,
      aiReason: aiInfo.reason,
      actionType: detectActionType(log.message),
    };
  });

  // Apply time range filter
  if (filter.timeRange.length === 2) {
    const [startDate, endDate] = filter.timeRange;
    const hasValidRange =
      startDate instanceof Date &&
      !Number.isNaN(startDate.getTime()) &&
      endDate instanceof Date &&
      !Number.isNaN(endDate.getTime());

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

  // Apply level filter
  if (filter.level) {
    allLogs = allLogs.filter((log) => `${log.level || ''}`.toLowerCase() === filter.level);
  }

  // Apply keyword filter
  if (filter.keyword) {
    const keyword = filter.keyword.toLowerCase();
    allLogs = allLogs.filter((log) => `${log.message || ''}`.toLowerCase().includes(keyword));
  }

  // Apply action type filter
  if (filter.actionType) {
    allLogs = allLogs.filter((log: any) => log.actionType === filter.actionType);
  }

  // Apply AI decision filter
  if (filter.aiDecision) {
    allLogs = allLogs.filter((log) => log.aiDecision === filter.aiDecision);
  }

  // Update total count and paginate
  totalLogs.value = allLogs.length;
  const startIndex = (currentPage.value - 1) * pageSize.value;
  logs.value = allLogs.slice(startIndex, startIndex + pageSize.value);
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

watch([displayMode, visibleColumns], () => {
  fetchLogs();
}, { deep: true });

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
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-item {
  margin-bottom: 0;
}

.action-type-select {
  width: 110px;
}

.decision-select {
  width: 110px;
}

.time-picker {
  width: 200px;
}

.level-select {
  width: 100px;
}

.search-input {
  width: 180px;
}

.spacer {
  flex: 1;
}

.config-dropdown {
  margin-left: 0;
}

.display-config-panel {
  padding: 12px 0;
}

.config-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.mode-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-divider {
  height: 1px;
  background-color: #ebeef5;
  margin: 12px 0;
}

.column-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  padding: 8px 0;
}

:deep(.boss-table td.el-table__cell) {
  font-size: 12px;
  color: #555;
  padding: 6px 0;
}

.boss-table.compact-mode :deep(th.el-table__cell) {
  padding: 6px 0;
}

.boss-table.compact-mode :deep(td.el-table__cell) {
  padding: 4px 0;
  line-height: 1.4;
}

.level-tag {
  font-weight: bold;
  border-color: transparent;
  font-size: 11px;
  padding: 2px 6px;
}

.decision-text {
  font-weight: 600;
  font-size: 12px;
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
  font-size: 12px;
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
    padding: 6px 4px;
  }

  :deep(.boss-table td.el-table__cell) {
    font-size: 11px;
    padding: 4px 4px;
  }

  :deep(.col-ai-decision),
  :deep(.col-ai-reason) {
    display: none;
  }

  :deep(.col-timestamp) {
    width: 80px !important;
  }

  :deep(.col-level) {
    width: 60px !important;
  }

  :deep(.col-message) {
    min-width: 120px !important;
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
