<template>
  <div ref="panel" class="run-record-tab" @scroll.passive="onScroll">
    <div class="boss-card">
      <BridgeSettings />
      <div class="filter-bar">
        <el-select
          v-model="filter.actionType"
          placeholder="操作类型"
          clearable
          class="filter-item action-type-select"
          :teleported="false"
        >
          <el-option label="全部类型" value="" />
          <el-option label="投递判定" value="delivery" />
          <el-option label="AI 对话" value="chat" />
          <el-option label="消息发送" value="followup" />
          <el-option label="系统操作" value="system" />
        </el-select>

        <el-select
          v-model="filter.aiDecision"
          placeholder="判定结果"
          clearable
          class="filter-item decision-select"
          :teleported="false"
        >
          <el-option label="全部结果" value="" />
          <el-option label="通过" value="通过" />
          <el-option label="不通过" value="不通过" />
          <el-option label="已投递" value="已投递" />
          <el-option label="失败" value="失败" />
          <el-option label="不可解析" value="不可解析" />
        </el-select>

        <el-select
          v-model="filter.level"
          placeholder="日志级别"
          clearable
          class="filter-item level-select"
          :teleported="false"
        >
          <el-option label="全部级别" value="" />
          <el-option label="Error" value="error" />
          <el-option label="Warn" value="warn" />
          <el-option label="Info" value="info" />
          <el-option label="Debug" value="debug" />
        </el-select>

        <el-time-picker
          v-model="filter.timeRange"
          is-range
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="HH:mm"
          clearable
          class="filter-item time-picker"
          :teleported="false"
        />

        <el-input
          v-model="filter.keyword"
          placeholder="搜索关键词..."
          clearable
          class="filter-item search-input"
          :prefix-icon="Search"
        />

        <div class="spacer"></div>

        <el-dropdown trigger="click" :teleported="false" @command="handleExport">
          <el-button type="success" plain>
            <el-icon class="mr-4"><Download /></el-icon>导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="all-txt">全部日志 · TXT</el-dropdown-item>
              <el-dropdown-item command="all-json">全部日志 · JSON</el-dropdown-item>
              <el-dropdown-item divided command="filtered-txt">当前筛选结果 · TXT</el-dropdown-item>
              <el-dropdown-item command="filtered-json">当前筛选结果 · JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-popover
          placement="bottom-end"
          :width="240"
          trigger="click"
          :teleported="false"
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

        <el-button type="danger" plain @click="clearLogs">
          <el-icon class="mr-4"><Delete /></el-icon>清空
        </el-button>
      </div>

      <div class="live-controls">
        <span aria-live="polite">{{ pending ? `有 ${pending} 条新记录` : reading ? '正在阅读历史记录' : '实时更新 · 最新在前' }}</span>
        <el-button v-if="reading" size="small" @click="resumeLive">查看最新</el-button>
        <el-button v-else size="small" @click="pauseReading">暂停跟随</el-button>
      </div>
      <div class="table-container" @pointerdown="pauseReading" @focusin="pauseReading">
        <el-table
          :data="logs" row-key="id"
          style="width: 100%"
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
            :width="displayMode === 'compact' ? 110 : 160"
            class-name="col-timestamp"
          >
            <template #default="scope">
              <span>{{ scope.row.timestamp }}</span>
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
                {{
                  displayMode === 'compact'
                    ? getLevelShort(scope.row.level)
                    : String(scope.row.level || '').toUpperCase()
                }}
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
            v-if="visibleColumns.includes('aiReason')"
            prop="aiReason"
            label="判定理由"
            :width="displayMode === 'compact' ? 180 : 240"
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
              <span v-if="displayMode === 'compact'">{{ compactMessage(scope.row) }}</span>
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowDown, Delete, Download, Search, Setting } from '@element-plus/icons-vue';
import BridgeSettings from '@/features/dsh-sync/BridgeSettings.vue';
import { LogRecorder } from '@/core/engine/push-engine';

import { compactMessage, exportJournal, useJournalReader, type LogItem } from '../journal-view';

const logRecorder = new LogRecorder();
const panel = ref<HTMLElement>();
const { currentPage, pageSize, filter, reading, pending, logs, totalLogs, pauseReading, resumeLive, setRows } =
  useJournalReader(() => { if (panel.value) panel.value.scrollTop = 0; });
const displayMode = ref<'compact' | 'detailed'>('compact');
const visibleColumns = ref(['timestamp', 'level', 'aiDecision', 'message']);
let unsubscribe: (() => void) | undefined;
function updateLogs() {
  setRows(logRecorder.getLogs(1, logRecorder.getLogCount()));
}
function onScroll() {
  if (panel.value && panel.value.scrollTop > 20) pauseReading();
}

const getLevelShort = (level: string): string => {
  const normalized = `${level || ''}`.toLowerCase();
  if (normalized === 'error') return 'ERR';
  if (normalized === 'warn') return 'WRN';
  if (normalized === 'info') return 'INF';
  if (normalized === 'debug') return 'DBG';
  return normalized.toUpperCase().slice(0, 3);
};

function handlePageChange(page: number) {
  currentPage.value = page;
  if (page > 1) pauseReading();
}
function handleSizeChange(size: number) {
  pageSize.value = size;
  resumeLive();
}
function clearLogs() {
  try {
    logRecorder.clearLogs();
    resumeLive();
  } catch {
    ElMessage.error('未能确认日志已清空，请刷新页面后重试');
  }
}
const triggerDownload = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // 释放 URL，避免内存泄漏
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const buildExportFilename = (ext: string) => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `ai-job-logs-${stamp}.${ext}`;
};

function handleExport(command: string) {
  const scope = command.startsWith('filtered-') ? 'filtered' : 'all';
  const format = command.endsWith('-txt') ? 'txt' : 'json';
  const result = exportJournal(() => logRecorder.snapshot(), filter, scope, format);
  triggerDownload(buildExportFilename(`${scope}.${format}`), result.content,
    format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8');
  if (logRecorder.storageMode === 'memory') {
    ElMessage.warning(`日志持久存储不可用，本次仅导出当前页面内存中的 ${result.count} 条记录`);
  } else {
    ElMessage.success(`已导出${result.scopeLabel}，共 ${result.count} 条`);
  }
}
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

watch(filter, resumeLive, { deep: true, flush: 'sync' });
onMounted(() => {
  logRecorder.snapshot();
  updateLogs();
  unsubscribe = logRecorder.subscribe(updateLogs);
});
onBeforeUnmount(() => unsubscribe?.());
</script>

<style scoped>
.run-record-tab {
  padding: var(--spacing-2xl);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--boss-bg-color);
  overflow-y: auto;
  padding-bottom: 80px;
}

.boss-card {
  background: var(--boss-bg-white);
  border-radius: var(--radius-card);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--boss-border-color);
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.live-controls {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  background: var(--boss-bg-white);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}

.filter-item {
  margin-bottom: 0;
  flex-shrink: 0;
}

:deep(.action-type-select) {
  width: 110px;
  flex: 0 0 110px;
}

:deep(.decision-select) {
  width: 110px;
  flex: 0 0 110px;
}

:deep(.level-select) {
  width: 110px;
  flex: 0 0 110px;
}

:deep(.time-picker) {
  --el-date-editor-width: 220px;
  width: 220px !important;
  min-width: 220px !important;
  max-width: 220px !important;
  flex: 0 0 220px !important;
}

:deep(.search-input) {
  width: 200px;
  flex: 0 0 200px;
}

.spacer {
  flex: 1;
  min-width: 8px;
}

.config-dropdown {
  margin-left: 0;
}

.display-config-panel {
  padding: var(--spacing-2xl);
}

.config-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--boss-text-primary);
  margin-bottom: 12px;
}

.mode-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 4px;
}

.config-divider {
  height: 1px;
  background-color: var(--boss-border-color);
  margin: var(--spacing-2xl) 0;
}

.column-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 4px;
}

:deep(.mode-radio-group .el-radio) {
  margin-right: 0;
  height: auto;
}

:deep(.column-checkbox-group .el-checkbox) {
  margin-right: 0;
  height: auto;
}

.mr-4 {
  margin-right: 4px;
}

.table-container {
  flex: 0 0 auto;
  min-height: 0;
  max-height: none;
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius-card);
  overflow: visible;
}

.boss-table {
  --el-table-border-color: var(--boss-border-color);
  --el-table-header-bg-color: var(--boss-bg-color);
  --el-table-header-text-color: var(--boss-text-primary);
}

:deep(.boss-table th.el-table__cell) {
  font-weight: 600;
  font-size: var(--text-base);
  padding: var(--spacing-lg) 0;
}

:deep(.boss-table td.el-table__cell) {
  font-size: var(--text-base);
  color: var(--boss-text-secondary);
  padding: var(--spacing-md) 0;
}

.boss-table.compact-mode :deep(th.el-table__cell) {
  padding: var(--spacing-md) 0;
}

.boss-table.compact-mode :deep(td.el-table__cell) {
  padding: var(--spacing-sm) 0;
  line-height: var(--line-height-tight);
}

.level-tag {
  font-weight: bold;
  border-color: transparent;
  font-size: var(--text-xs);
  padding: var(--spacing-xs) var(--spacing-md);
}

.decision-text {
  font-weight: 500;
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.decision-text.is-success {
  color: #0f766e;
  background: #ecfdf5;
}

.decision-text.is-danger {
  color: #b42318;
  background: #fef3f2;
}

.decision-text.is-warning {
  color: #b54708;
  background: #fff7ed;
}

.reason-text {
  color: var(--boss-text-regular);
  font-size: var(--text-sm);
}

.text-muted {
  color: var(--boss-text-tertiary);
}

:deep(.el-table .row-error) {
  background-color: #fff8f8 !important;
}

:deep(.el-table .row-warn) {
  background-color: #fffbf5 !important;
}

.pagination-footer {
  margin-top: 12px;
  display: flex;
  flex-shrink: 0;
  padding-top: 4px;
  overflow-x: auto;
}

.btn-clear-soft {
  color: var(--boss-text-secondary);
  border-color: var(--boss-border-color);
  background: var(--boss-bg-white);
}

.btn-clear-soft:hover:not(:disabled) {
  color: var(--ai-danger);
  border-color: rgba(245, 108, 108, 0.5);
  background: var(--ai-danger-light);
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
    font-size: var(--text-sm);
  }

  :deep(.boss-table th.el-table__cell) {
    font-size: var(--text-sm);
    padding: var(--spacing-md) var(--spacing-sm);
  }

  :deep(.boss-table td.el-table__cell) {
    font-size: var(--text-xs);
    padding: var(--spacing-sm) var(--spacing-sm);
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
    font-size: var(--text-sm);
  }

  :deep(.el-pagination .el-pagination__sizes) {
    display: none;
  }

  :deep(.el-pagination .el-pagination__jump) {
    display: none;
  }
}
</style>
