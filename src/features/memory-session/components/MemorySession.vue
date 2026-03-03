<template>
  <div class="memory-session">
    <!-- AI 对话 -->
    <div class="ms-section">
      <div class="ms-section__title">AI 对话</div>
      <div class="ms-section__body">
        <div class="ms-setting-row">
          <span class="ms-setting-label">AI 对话开关</span>
          <el-switch
            v-model="userStore.user.aiSeatStatus"
            active-text="开"
            inactive-text="关"
            inline-prompt
            :style="{ '--el-switch-on-color': '#409eff', '--el-switch-off-color': '#dcdfe6' }"
            @change="handleAISeatStatusChange"
          />
        </div>
        <div class="ms-setting-row">
          <el-checkbox v-model="userStore.user.preference.drE" label="" size="large" />
          <span class="ms-setting-label">延迟回复</span>
          <el-input-number
            v-model="userStore.user.preference.dr"
            :min="0"
            :max="30"
            size="small"
          />
          <span class="ms-setting-unit">秒</span>
        </div>
      </div>
    </div>

    <!-- 交互设置 -->
    <div class="ms-section">
      <div class="ms-section__title">交互设置</div>
      <div class="ms-section__body">
        <el-form label-width="auto" label-position="top" size="default">
          <el-form-item>
            <template #label>
              <el-checkbox v-model="userStore.user.preference.ppE" label="" size="large" />
              预设问题
            </template>
            <el-input type="textarea" v-model="userStore.user.preference.pp" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <el-checkbox v-model="userStore.user.preference.rfE" label="" size="large" />
              拒绝挽留
            </template>
            <el-input type="textarea" v-model="userStore.user.preference.rf" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 高意向设置 -->
    <div class="ms-section">
      <div class="ms-section__title">高意向设置</div>
      <div class="ms-section__body">
        <div class="ms-setting-row">
          <el-checkbox v-model="userStore.user.preference.hiaE" label="" size="large" />
          <span class="ms-setting-label">高意向后停止AI对话</span>
        </div>
        <el-form label-width="auto" label-position="left" size="default" class="ms-hi-form">
          <el-form-item label="对话轮数 >=">
            <el-input
              type="number"
              style="width: 80px"
              size="small"
              v-model="userStore.user.preference.crC"
            />
          </el-form-item>
          <el-form-item label="或包含关键词">
            <el-select
              v-model="userStore.user.preference.crK"
              multiple
              filterable
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="包含关键词"
              style="width: 100%"
              :teleported="false"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 邮件通知 -->
    <div class="ms-section">
      <div class="ms-section__title">邮件通知</div>
      <div class="ms-section__body">
        <div class="ms-setting-row">
          <el-checkbox v-model="userStore.user.preference.ermE" label="" size="large" />
          <span class="ms-setting-label">每轮对话邮件通知</span>
        </div>
        <div class="ms-setting-row">
          <el-checkbox v-model="userStore.user.preference.crE" label="" size="large" />
          <span class="ms-setting-label" style="color: var(--el-color-danger)">高意向邮件通知</span>
        </div>
      </div>
    </div>

    <!-- 记忆策略 -->
    <div class="ms-section">
      <div class="ms-section__title">记忆策略</div>
      <div class="ms-section__body">
        <div class="ms-memory-grid">
          <div class="ms-setting-row">
            <span class="ms-setting-label">启用</span>
            <el-switch v-model="memoryProfile.enabled" />
          </div>
          <div class="ms-setting-row">
            <span class="ms-setting-label">范围</span>
            <el-select v-model="memoryProfile.scope" style="width: 120px" :teleported="false">
              <el-option
                v-for="opt in memoryScopeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <div class="ms-setting-row">
            <span class="ms-setting-label">最大轮数</span>
            <el-input-number v-model="memoryProfile.maxTurns" :min="1" :max="100" />
          </div>
          <div class="ms-setting-row">
            <span class="ms-setting-label">摘要阈值</span>
            <el-input-number v-model="memoryProfile.summaryThreshold" :min="1" :max="100" />
          </div>
        </div>
        <el-button type="primary" plain @click="saveMemoryProfile" style="margin-top: 8px">
          保存记忆策略
        </el-button>
      </div>
    </div>

    <!-- 会话清理 -->
    <div class="ms-section">
      <div class="ms-section__title">会话清理</div>
      <div class="ms-section__body">
        <ConversationCleaner />
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="ms-section">
      <el-button type="primary" @click="handleSavePreference">保存对话设置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, inject, onMounted } from 'vue';
import { showAppMessage } from '@/core/http/request';
import { Tools } from '@/shared/utils/tools';
import { normalizePreferenceBoolean } from '@/shared/utils/preference';
import { UserStore } from '@/state/user';
import { loginInterceptor } from '@/core/auth/auth';
import ConversationCleaner from '@/features/conversation-cleaner/components/ConversationCleaner.vue';

const userStore = UserStore();
const axios2 = inject('$axios') as any;
const PREFERENCE_SAVE_TIMEOUT_MS = 30_000;

// ---- Memory strategy (migrated from AiConfig) ----
const memoryScopeOptions = [
  { label: '会话级', value: 'session' },
  { label: '岗位级', value: 'job' },
  { label: '全局级', value: 'global' },
];

const memoryProfile = ref({
  enabled: true,
  scope: 'session',
  maxTurns: 20,
  summaryThreshold: 12,
  clearOnModelSwitch: true,
});

const normalizeMemoryScope = (scope: unknown): 'session' | 'job' | 'global' => {
  if (scope === 'session' || scope === 'job' || scope === 'global') {
    return scope;
  }
  return 'session';
};

const normalizePositiveNumber = (value: unknown, defaultValue: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const normalized = Math.floor(parsed);
  if (normalized < min || normalized > max) {
    return defaultValue;
  }

  return normalized;
};

const normalizeMemoryProfile = (profile: any) => ({
  enabled: normalizePreferenceBoolean(profile?.enabled, true),
  scope: normalizeMemoryScope(profile?.scope),
  maxTurns: normalizePositiveNumber(profile?.maxTurns, 20, 1, 100),
  summaryThreshold: normalizePositiveNumber(profile?.summaryThreshold, 12, 1, 100),
  clearOnModelSwitch: normalizePreferenceBoolean(profile?.clearOnModelSwitch, true),
});

const aiConfigExt = ref(Tools.getAiConfigExt());

const ensureAiConfigExtSchema = () => {
  if (!aiConfigExt.value) aiConfigExt.value = Tools.getAiConfigExt();
  if (!aiConfigExt.value.memoryProfiles) aiConfigExt.value.memoryProfiles = {};
  return aiConfigExt.value;
};

const buildCurrentModelChannelKey = () => {
  const ext = ensureAiConfigExtSchema();
  const cfg = ext.currentConfig || { provider: 1, modelName: '' };
  return Tools.buildModelChannelKey(cfg.provider, cfg.modelName);
};

const loadCurrentMemoryProfile = () => {
  const ext = ensureAiConfigExtSchema();
  const key = buildCurrentModelChannelKey();
  memoryProfile.value = normalizeMemoryProfile(ext.memoryProfiles[key]);
};

const saveMemoryProfile = () => {
  const ext = ensureAiConfigExtSchema();
  const key = buildCurrentModelChannelKey();
  ext.memoryProfiles[key] = normalizeMemoryProfile(memoryProfile.value);
  Tools.saveAiConfigExt(ext);
  showAppMessage({ type: 'success', message: '模型记忆策略已保存' });
};

// ---- AI 对话 switch (legacy field: aiSeatStatus) ----
const handleAISeatStatusChange = async (val: boolean) => {
  if (!loginInterceptor()) return;
  try {
    await axios2.post('/api/user/save/preference', {
      aiSeatStatus: val ? 1 : 0,
    }, {
      timeout: PREFERENCE_SAVE_TIMEOUT_MS,
    });
  } catch (_error) {
    showAppMessage({ type: 'error', message: 'AI 对话开关保存失败，请重试' });
  }
};

// ---- Save preference (subset) ----
const handleSavePreference = async () => {
  if (!loginInterceptor()) return;
  await axios2.post('/api/user/save/preference', {
    ...userStore.user,
    aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0,
  }, {
    timeout: PREFERENCE_SAVE_TIMEOUT_MS,
  }).then(() => {
    showAppMessage({ message: '对话与通知设置保存成功', type: 'success', duration: 2000 });
  });
};

onMounted(() => {
  loadCurrentMemoryProfile();
});
</script>

<style scoped>
.memory-session {
  width: 100%;
}
.ms-section {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.ms-section__title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}
.ms-section__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ms-setting-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ms-setting-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.ms-setting-unit {
  font-size: 13px;
  color: #909399;
}
.ms-memory-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.ms-hi-form {
  width: 100%;
}
:deep(.ms-hi-form .el-form-item) {
  margin-bottom: 8px;
}
:deep(.el-input-number--small) {
  width: 100px;
}
</style>
