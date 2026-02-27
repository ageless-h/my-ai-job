<template>
  <div class="cleaner-wrapper">
    <!-- 操作栏 -->
    <div class="cleaner-toolbar">
      <el-button type="primary" :loading="scanning" @click="startScan" :disabled="deleting">
        {{ scanning ? progressMsg : '扫描待清理会话' }}
      </el-button>
      <el-button
        v-if="candidates.length && !scanning"
        type="danger"
        :loading="deleting"
        :disabled="selectedCount === 0"
        @click="confirmDelete"
      >
        删除选中 ({{ selectedCount }})
      </el-button>
      <span v-if="deleteResult" class="cleaner-result">
        {{ deleteResult }}
      </span>
    </div>

    <!-- 进度条 -->
    <el-progress
      v-if="scanning && progress.total > 0"
      :percentage="Math.round((progress.current / progress.total) * 100)"
      :stroke-width="6"
      style="margin:8px 0;"
    />

    <!-- 结果列表 -->
    <div v-if="candidates.length && !scanning" class="cleaner-list">
      <div class="cleaner-list-header">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选</el-checkbox>
        <span class="cleaner-list-count">共 {{ candidates.length }} 个待清理会话</span>
      </div>
      <div v-for="(item, idx) in candidates" :key="item.friendId" class="cleaner-card">
        <el-checkbox v-model="item.selected" class="cleaner-card__check" />
        <div class="cleaner-card__info">
          <div class="cleaner-card__name">{{ item.name }} · {{ item.brandName }} · {{ item.title }}</div>
          <div class="cleaner-card__detail">
            <el-tag size="small" :type="reasonTagType(item.reason)">{{ reasonLabel(item.reason) }}</el-tag>
            <span class="cleaner-card__reason">{{ item.reasonDetail }}</span>
          </div>
          <div class="cleaner-card__meta">
            最后活跃: {{ formatTime(item.updateTime) }} · 最后消息: {{ (item.lastText || '(无文本)').substring(0, 50) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!candidates.length && !scanning && scanned" class="cleaner-empty">
      没有找到需要清理的会话
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed } from 'vue';
import {
  scanConversations,
  batchDelete,
} from '@/services/conversation-cleaner';
import type { CleanCandidate, ScanProgress } from '@/services/conversation-cleaner';

import { ElMessage } from '@/services/request';
import { ElMessageBox } from 'element-plus';
const candidates = ref<CleanCandidate[]>([]);
const scanning = ref(false);
const scanned = ref(false);
const deleting = ref(false);
const deleteResult = ref('');
const progress = ref<ScanProgress>({ phase: 'idle', current: 0, total: 0, message: '' });
const progressMsg = computed(() => progress.value.message || '扫描中...');

const selectedCount = computed(() => candidates.value.filter((c) => c.selected).length);
const selectAll = computed({
  get: () => candidates.value.length > 0 && candidates.value.every((c) => c.selected),
  set: () => {},
});

function toggleSelectAll(val: boolean) {
  candidates.value.forEach((c) => (c.selected = val));
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    hr_rejected: 'HR拒绝',
    self_rejected: '我拒绝',
    stale_no_reply: '已读不回',
    ai_detected: 'AI判定',
  };
  return map[reason] || reason;
}

function reasonTagType(reason: string): string {
  const map: Record<string, string> = {
    hr_rejected: 'danger',
    self_rejected: 'warning',
    stale_no_reply: 'info',
    ai_detected: '',
  };
  return map[reason] || '';
}

function formatTime(ts: number): string {
  if (!ts) return '--';
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ts) / (24 * 60 * 60 * 1000));
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  return diffDays > 0 ? `${dateStr} (${diffDays}天前)` : dateStr;
}

async function startScan() {
  scanning.value = true;
  scanned.value = false;
  candidates.value = [];
  deleteResult.value = '';

  try {
    const result = await scanConversations((p) => {
      progress.value = p;
    });
    candidates.value = result;
  } catch (e: any) {
    ElMessage({ type: 'error', message: `扫描失败: ${e?.message || e}` });
  } finally {
    scanning.value = false;
    scanned.value = true;
  }
}

async function confirmDelete() {
  const count = selectedCount.value;
  if (!count) return;

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${count} 个会话？删除后将从 BOSS 直聘列表中移除，同时删除聊天记录。`,
      '批量删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }

  deleting.value = true;
  deleteResult.value = '';

  try {
    const selectedBeforeDelete = new Set(
      candidates.value.filter((c) => c.selected).map((c) => c.securityId),
    );

    const { success, failed, lastError, topFailReason, successSecurityIds } = await batchDelete(
      candidates.value,
      (cur, total, name, failReason) => {
        deleteResult.value = failReason
          ? `删除中 ${cur}/${total}: ${name} — 失败: ${failReason}`
          : `删除中 ${cur}/${total}: ${name}`;
      },
    );
    const successSet = new Set(successSecurityIds);
    const failReasonText = topFailReason || lastError;
    deleteResult.value = `完成: 成功 ${success} 个${failed ? `，失败 ${failed} 个 (${failReasonText})，失败项已保留可再次清理` : ''}`;
    // 只移除成功删除项，失败项保留便于再次清理
    candidates.value = candidates.value.filter((c) => !successSet.has(c.securityId));
    candidates.value.forEach((c) => {
      c.selected = selectedBeforeDelete.has(c.securityId) && !successSet.has(c.securityId);
    });
  } catch (e: any) {
    ElMessage({ type: 'error', message: `删除失败: ${e?.message || e}` });
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.cleaner-wrapper{padding:0}
.cleaner-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cleaner-result{font-size:12px;color:#67c23a}
.cleaner-list{margin-top:10px;max-height:400px;overflow-y:auto}
.cleaner-list-header{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--ai-border,#ebeef5)}
.cleaner-list-count{font-size:12px;color:#909399}
.cleaner-card{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--ai-border,#ebeef5)}
.cleaner-card__check{flex-shrink:0;margin-top:2px}
.cleaner-card__info{flex:1;min-width:0}
.cleaner-card__name{font-size:13px;font-weight:500;color:var(--ai-text,#303133)}
.cleaner-card__detail{display:flex;align-items:center;gap:6px;margin-top:4px}
.cleaner-card__reason{font-size:12px;color:#606266;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cleaner-card__meta{font-size:11px;color:#909399;margin-top:3px}
.cleaner-empty{text-align:center;padding:20px;color:#909399;font-size:13px}
</style>
