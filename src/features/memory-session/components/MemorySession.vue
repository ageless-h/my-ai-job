<!--
/**
 * MemorySession.vue - 对话与记忆策略组件
 * 
 * 提供 AI 代聊服务配置和对话记忆管理功能。
 * 
 * 主要功能：
 * - AI 代聊服务开关
 * - 延迟回复设置（模拟真人回复时间）
 * - 对话记忆策略配置
 * - 消息通知设置
 * - 自动回复规则
 * 
 * 技术特性：
 * - 实时同步配置到服务器
 * - 对话上下文管理
 * - 记忆策略持久化
 * 
 * @component
 */
-->
<template>
  <div class="memory-session-tab">
    <div class="boss-card">
      <div class="setting-row">
        <div class="switch-content">
          <span class="label">启用 AI 代聊服务</span>
          <div class="sub-desc mt-4">开启后，系统将自动接管 BOSS 上的新消息并进行回复。</div>
        </div>
        <el-switch
          v-model="userStore.user.aiSeatStatus"
          active-text="开"
          inactive-text="关"
          inline-prompt
          :style="{
            '--el-switch-on-color': 'var(--boss-primary, #00bebd)',
            '--el-switch-off-color': 'var(--ai-disabled)',
          }"
          @change="handleAISeatStatusChange"
        />
      </div>

      <div class="judge-divider mt-16 mb-16"></div>

      <div class="setting-row">
        <el-checkbox v-model="userStore.user.preference.drE">启用延迟回复</el-checkbox>
        <div class="delay-input" :class="{ 'is-disabled': !userStore.user.preference.drE }">
          <span class="mr-8">收到消息后延迟</span>
          <el-input-number
            v-model="userStore.user.preference.dr"
            :min="0"
            :max="30"
            controls-position="right"
            :disabled="!userStore.user.preference.drE"
          />
          <span class="ml-8">秒进行回复</span>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">快捷交互处理</div>

      <el-form class="boss-form" label-position="top">
        <div class="responsive-grid">
          <div class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.ppE">预设提问 (主动发起)</el-checkbox>
            <el-input
              v-model="userStore.user.preference.pp"
              type="textarea"
              :rows="4"
              placeholder="例如：您好，请问该岗位双休吗？是否有加班补贴？"
              @input="
                userStore.user.preference.ppE = userStore.user.preference.pp.trim().length > 0
              "
            />
          </div>
          <div class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.rfE"
              >婉拒回复术语 (手动拒绝时)</el-checkbox
            >
            <el-input
              v-model="userStore.user.preference.rf"
              type="textarea"
              :rows="4"
              placeholder="例如：非常感谢您的认可，但经过考虑我觉得该岗位与我目前的发展方向不太契合..."
              @input="
                userStore.user.preference.rfE = userStore.user.preference.rf.trim().length > 0
              "
            />
          </div>
        </div>
      </el-form>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">高意向转换策略</div>

      <div class="mb-16">
        <el-checkbox v-model="userStore.user.preference.hiaE"
          >触发高意向后，自动暂停 AI 代聊交由人工接管</el-checkbox
        >
      </div>

      <div class="condition-box" :class="{ 'is-disabled': !userStore.user.preference.hiaE }">
        <div class="condition-title">触发条件 (满足其一即可)：</div>

        <el-form class="boss-form mt-12" label-position="left" label-width="120px">
          <el-form-item label="双方对话轮数 ≥">
            <el-input-number
              v-model="userStore.user.preference.crC"
              :min="1"
              controls-position="right"
              :disabled="!userStore.user.preference.hiaE"
              style="width: 140px"
            />
            <span class="ml-8 sub-desc">轮</span>
          </el-form-item>

          <el-form-item label="HR 消息包含">
            <el-select
              v-model="userStore.user.preference.crK"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="输入关键词后回车，例如：面试, 简历, 微信"
              style="width: 100%"
              :disabled="!userStore.user.preference.hiaE"
              :teleported="false"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="responsive-grid mt-16">
      <div class="boss-card h-full">
        <div class="card-title">邮件通知设置</div>
        <div class="options-vert mt-12">
          <el-checkbox v-model="userStore.user.preference.ermE" border
            >每轮对话均发送邮件通知</el-checkbox
          >
          <el-checkbox
            v-model="userStore.user.preference.crE"
            border
            style="--el-checkbox-checked-text-color: var(--ai-danger)"
          >
            仅在触发高意向时通知 (推荐)
          </el-checkbox>
        </div>
      </div>

      <div class="boss-card h-full">
        <div class="card-title">AI 上下文记忆策略</div>

        <div class="setting-row mb-16">
          <el-checkbox v-model="memoryProfile.enabled">启用上下文抽象总结</el-checkbox>
          <div class="actions">
            <el-button link type="primary" @click="saveMemoryProfile">保存记忆策略</el-button>
          </div>
        </div>

        <div class="memory-grid" :class="{ 'is-disabled': !memoryProfile.enabled }">
          <div class="grid-item">
            <span class="grid-label">作用域</span>
            <el-select
              v-model="memoryProfile.scope"
              :disabled="!memoryProfile.enabled"
              :teleported="false"
            >
              <el-option
                v-for="opt in memoryScopeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>

          <div class="grid-item">
            <span class="grid-label">触发摘要阈值</span>
            <el-input-number
              v-model="memoryProfile.summaryThreshold"
              :min="1"
              :max="50"
              controls-position="right"
              :disabled="!memoryProfile.enabled"
            />
          </div>

          <div class="grid-item">
            <span class="grid-label">最大追溯轮数</span>
            <el-input-number
              v-model="memoryProfile.maxTurns"
              :min="1"
              :max="100"
              controls-position="right"
              :disabled="!memoryProfile.enabled"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16 mb-24">
      <div class="card-title">
        无效会话清理
        <el-tag size="small" type="info" class="ml-8" effect="plain"
          >维持列表整洁，减少系统负荷</el-tag
        >
      </div>
      <ConversationCleaner />
    </div>

    <div class="action-footer">
      <div class="buttons">
        <el-button type="primary" class="save-btn" @click="handleSavePreference"
          >保存全盘对话设置</el-button
        >
      </div>
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
  { label: '会话级 (当前HR)', value: 'session' },
  { label: '岗位级 (同种岗位)', value: 'job' },
  { label: '全局级 (所有沟通)', value: 'global' },
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

const normalizePositiveNumber = (
  value: unknown,
  defaultValue: number,
  min: number,
  max: number
): number => {
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
  summaryThreshold: normalizePositiveNumber(profile?.summaryThreshold, 12, 1, 50),
  clearOnModelSwitch: normalizePreferenceBoolean(profile?.clearOnModelSwitch, true),
});

const ensureConversationPreferenceDefaults = () => {
  if (!userStore.user.preference || typeof userStore.user.preference !== 'object') {
    userStore.user.preference = {};
  }

  const preference = userStore.user.preference as Record<string, any>;
  if (typeof userStore.user.aiSeatStatus !== 'boolean') {
    userStore.user.aiSeatStatus = normalizePreferenceBoolean(userStore.user.aiSeatStatus, true);
  }

  if (preference.drE === undefined) preference.drE = true;
  if (preference.dr === undefined) preference.dr = 5;
  if (preference.ppE === undefined) preference.ppE = false;
  if (preference.pp === undefined) preference.pp = '';
  if (preference.rfE === undefined) preference.rfE = true;
  if (preference.rf === undefined)
    preference.rf = '感谢您的回复，但我目前优先考虑离家近的机会，如果后续有机会再沟通！';
  if (preference.hiaE === undefined) preference.hiaE = true;
  if (preference.crC === undefined) preference.crC = 5;
  if (!Array.isArray(preference.crK)) preference.crK = ['面试', '微信', '电话', '简历'];
  if (preference.ermE === undefined) preference.ermE = false;
  if (preference.crE === undefined) preference.crE = true;
};

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
    await axios2.post(
      '/api/user/save/preference',
      {
        aiSeatStatus: val ? 1 : 0,
      },
      {
        timeout: PREFERENCE_SAVE_TIMEOUT_MS,
      }
    );
  } catch (_error) {
    showAppMessage({ type: 'error', message: 'AI 对话开关保存失败，请重试' });
  }
};

// ---- Save preference (subset) ----
const handleSavePreference = async () => {
  if (!loginInterceptor()) return;
  await axios2
    .post(
      '/api/user/save/preference',
      {
        ...userStore.user,
        aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0,
      },
      {
        timeout: PREFERENCE_SAVE_TIMEOUT_MS,
      }
    )
    .then(() => {
      showAppMessage({ message: '对话与通知设置保存成功', type: 'success', duration: 2000 });
    });
};

onMounted(() => {
  ensureConversationPreferenceDefaults();
  loadCurrentMemoryProfile();
});
</script>

<style scoped>
.memory-session-tab {
  padding: var(--spacing-2xl);
  height: 100%;
  overflow-y: auto;
  background-color: var(--boss-bg-color);
  padding-bottom: 80px;
}

.boss-card {
  background: var(--boss-bg-white);
  border-radius: var(--radius-card);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--boss-border-color);
}

.h-full {
  height: 100%;
  box-sizing: border-box;
}

.card-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--boss-text-primary);
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.card-title::before {
  display: none;
}

.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
}

.switch-content {
  flex: 1;
  min-width: 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.label {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--boss-text-primary);
}

.sub-desc {
  font-size: var(--text-base);
  color: var(--boss-text-tertiary);
  line-height: var(--line-height-normal);
}

.custom-chk-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.judge-divider {
  height: 1px;
  background-color: var(--boss-border-color);
}

.delay-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: var(--text-md);
  color: var(--boss-text-secondary);
  margin-top: 8px;
}

.condition-box {
  background: var(--boss-bg-color);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-card);
  border: 1px solid var(--boss-border-color);
}

.condition-title {
  font-size: var(--text-base);
  color: var(--boss-text-secondary);
  font-weight: 500;
}

.options-vert {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: 16px 20px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grid-label {
  font-size: var(--text-base);
  color: var(--boss-text-secondary);
  white-space: nowrap;
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  background: var(--boss-bg-white);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-card);
  border: 1px solid var(--boss-border-color);
  margin-bottom: 40px;
}

.buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.save-btn {
  padding: 0 32px;
}

.mt-4 {
  margin-top: 4px;
}

.mt-12 {
  margin-top: 12px;
}

.mt-16 {
  margin-top: 16px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-24 {
  margin-bottom: 24px;
}

.ml-8 {
  margin-left: 8px;
}

.mr-8 {
  margin-right: 8px;
}

:deep(.custom-chk-label .el-checkbox) {
  align-self: flex-start;
  margin-right: 0;
  height: auto;
}

:deep(.custom-chk-label .el-checkbox__label) {
  white-space: normal;
  line-height: var(--line-height-tight);
  padding-left: 8px;
  word-break: break-word;
}

:deep(.delay-input .el-input-number) {
  width: 110px;
}

:deep(.options-vert .el-checkbox) {
  margin-right: 0;
}

:deep(.memory-grid .el-select),
:deep(.memory-grid .el-input-number) {
  width: 100%;
}

:deep(.boss-form .el-form-item__label) {
  padding-bottom: 4px;
  color: var(--boss-text-primary);
  font-size: var(--text-md);
  font-weight: 500;
}

:deep(.el-checkbox__label) {
  white-space: normal;
  line-height: var(--line-height-tight);
  word-break: break-word;
  vertical-align: middle;
}
</style>
