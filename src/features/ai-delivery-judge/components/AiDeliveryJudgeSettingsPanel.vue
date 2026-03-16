<template>
  <div class="ai-delivery-judge" :class="{ 'is-embedded': embedded }">
    <div class="boss-card">
      <div v-if="showSectionHeader" class="card-title">{{ sectionTitle }}</div>
      <div class="setting-row">
        <span class="label">启用 AI 智能过滤</span>
        <el-switch
          v-model="form.enabled"
          active-text="开"
          inactive-text="关"
          inline-prompt
          :style="{
            '--el-switch-on-color': 'var(--boss-primary, #00bebd)',
            '--el-switch-off-color': 'var(--ai-disabled)',
          }"
        />
      </div>
      <div class="sub-desc mt-8">
        开启后将使用 AI 针对岗位 JD 和您的简历进行精准判断。关闭后仅使用传统设置的规则。
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">判定上下文设置</div>
      <div class="judge-inline-switches">
        <div class="switch-content">
          <span>包含求职者个人信息</span>
          <div class="sub-desc mt-4">将您的基本信息（学历、经验等）加入 AI 判断上下文。</div>
        </div>
        <el-switch
          v-model="form.includeUserProfile"
          inline-prompt
          active-text="开"
          inactive-text="关"
        />
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">重点过滤规则</div>
      <el-form label-position="top" class="judge-form">
        <el-form-item label="核心技能要求 (AI将重点匹配)">
          <el-select
            v-model="focusSkills"
            multiple
            default-first-option
            allow-create
            filterable
            class="full-width"
            :teleported="false"
            placeholder="输入技能并按回车确认，例如：Vue3"
          />
          <div class="sub-desc mt-4">如果 JD 中明确不包含或不需要这些核心技能，AI 将给出低分。</div>
        </el-form-item>

        <el-form-item label="绝对排除关键词 (包含则一票否决)" class="mt-16">
          <el-select
            v-model="excludeKeywords"
            multiple
            default-first-option
            allow-create
            filterable
            class="full-width"
            :teleported="false"
            placeholder="输入排除词并按回车确认，例如：外包"
          />
          <div class="sub-desc mt-4">输入关键词并按回车添加。AI 识别到这些词将直接拒绝该岗位。</div>
        </el-form-item>
      </el-form>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">异常处理策略</div>
      <el-form label-position="top" class="judge-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="AI请求失败策略">
              <el-select v-model="form.onAiError" class="full-width" :teleported="false">
                <el-option label="拒绝投递（默认，更保守）" value="reject" />
                <el-option label="回退到传统投递规则" value="fallback-traditional" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="AI结果无法解析策略">
              <el-select v-model="form.onInvalidResult" class="full-width" :teleported="false">
                <el-option label="拒绝投递（默认，更保守）" value="reject" />
                <el-option label="回退到传统投递规则" value="fallback-traditional" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="action-footer mt-24">
      <div class="footer-right buttons">
        <el-button class="boss-btn-text text-muted" link @click="resetToDefault"
          >恢复默认配置</el-button
        >
        <el-button type="warning" plain :loading="previewLoading" @click="handlePreviewInputOnce"
          >测试重点分析</el-button
        >
        <el-button
          color="var(--boss-primary)"
          class="save-btn"
          style="color: var(--ai-bg)"
          :loading="isSaving"
          @click="handleSave"
        >
          保存判定规则
        </el-button>
      </div>
    </div>

    <div v-if="showSyncHint" class="judge-sync-hint">
      此处配置与「AI 投递判定」页共享同一份数据，修改后会立即同步。
    </div>

    <el-dialog
      v-model="previewVisible"
      title="AI判定上下文预览"
      width="92%"
      class="boss-dialog preview-dialog"
      destroy-on-close
    >
      <div class="preview-job-card">
        <div class="job-card-label">模拟测试岗位</div>
        <div class="job-card-title">{{ previewJobLabel || '未命名岗位' }}</div>
      </div>

      <div class="preview-code-container">
        <div class="code-header">
          <span>构建的 Prompt Payload</span>
          <el-button link class="boss-btn-text" @click="copyPayload">复制内容</el-button>
        </div>
        <el-input
          v-model="previewPayloadText"
          type="textarea"
          :rows="16"
          readonly
          class="code-preview-input"
        />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="previewVisible = false">关闭预览</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import { showAppMessage } from '@/core/http/request';
import { Tools } from '@/shared/utils/tools';
import {
  buildAiDeliveryFilterJobInput,
  buildAiDeliveryJudgePrompt,
  buildAiDeliveryUserProfile,
} from '@/core/delivery/ai-delivery-builder';
import { UserStore } from '@/state/user';

type JobPreviewPlatform = {
  getJobList: () => Array<Record<string, unknown>>;
  getJobKey: (jobDetail: Record<string, unknown>) => string;
  obtainBossJobDetailExt: (jobDetail: Record<string, unknown>) => Promise<Record<string, unknown>>;
  unpackBaseInfo: (jobDetail: Record<string, unknown>) => Record<string, unknown>;
  unpackExtInfo: (jobDetailExt: Record<string, unknown>) => Record<string, unknown>;
};

const props = withDefaults(
  defineProps<{
    showSectionHeader?: boolean;
    sectionTitle?: string;
    embedded?: boolean;
    showSyncHint?: boolean;
  }>(),
  {
    showSectionHeader: true,
    sectionTitle: 'AI 投递判定（岗位级）',
    embedded: false,
    showSyncHint: true,
  }
);

const userStore = UserStore();
const platform = inject<JobPreviewPlatform | null>('$platform', null);
const currentConfig = Tools.getAiDeliveryJudgeConfig(userStore.user?.preference || {});

const previewVisible = ref(false);
const previewLoading = ref(false);
const isSaving = ref(false);
const previewJobLabel = ref('');
const previewPayloadText = ref('');
const focusSkills = ref<string[]>(currentConfig.focusSkills);
const excludeKeywords = ref<string[]>(currentConfig.excludeKeywords);

const showSectionHeader = computed(() => props.showSectionHeader);
const sectionTitle = computed(() => props.sectionTitle);
const embedded = computed(() => props.embedded);
const showSyncHint = computed(() => props.showSyncHint);

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toText = (value: unknown, fallback = ''): string => {
  return `${value ?? fallback}`;
};

const form = reactive({
  enabled: currentConfig.enabled,
  includeUserProfile: currentConfig.includeUserProfile,
  onAiError: currentConfig.onAiError,
  onInvalidResult: currentConfig.onInvalidResult,
});

const handleSave = () => {
  isSaving.value = true;
  try {
    const saved = Tools.saveAiDeliveryJudgeConfig({
      enabled: form.enabled,
      focusSkills: focusSkills.value,
      excludeKeywords: excludeKeywords.value,
      includeUserProfile: form.includeUserProfile,
      onAiError: form.onAiError,
      onInvalidResult: form.onInvalidResult,
    });

    form.enabled = saved.enabled;
    focusSkills.value = saved.focusSkills;
    excludeKeywords.value = saved.excludeKeywords;
    form.includeUserProfile = saved.includeUserProfile;
    form.onAiError = saved.onAiError;
    form.onInvalidResult = saved.onInvalidResult;
    showAppMessage({
      message: 'AI 投递判定设置已保存',
      type: 'success',
      duration: 2000,
    });
  } finally {
    isSaving.value = false;
  }
};

const resetToDefault = () => {
  form.enabled = true;
  form.includeUserProfile = true;
  form.onAiError = 'reject';
  form.onInvalidResult = 'reject';
  focusSkills.value = [];
  excludeKeywords.value = [];
};

const handlePreviewInputOnce = async () => {
  if (!platform) {
    showAppMessage({
      type: 'warning',
      message: '当前页面不支持测试输入预览',
    });
    return;
  }

  const jobList = platform.getJobList();
  const firstJob = Array.isArray(jobList)
    ? jobList.find((item) => item && typeof item === 'object')
    : null;
  if (!firstJob) {
    showAppMessage({
      type: 'warning',
      message: '当前页面没有可测试岗位，请先进入岗位列表页',
    });
    return;
  }

  previewLoading.value = true;
  try {
    const latestConfig = Tools.getAiDeliveryJudgeConfig(userStore.user?.preference || {});
    const jobDetail = toRecord(firstJob);
    const user = toRecord(userStore.user);
    const preference = toRecord(user.preference);
    const userProfile = buildAiDeliveryUserProfile(user, preference);
    const prompt = buildAiDeliveryJudgePrompt(
      {
        prompt: toText(latestConfig.prompt).trim(),
        extraPrompt: toText(latestConfig.extraPrompt).trim(),
        focusSkills: focusSkills.value,
        excludeKeywords: excludeKeywords.value,
        includeUserProfile: form.includeUserProfile,
      },
      userProfile
    );
    const jobDetailExt = await platform.obtainBossJobDetailExt(jobDetail);
    const baseInfo = platform.unpackBaseInfo(jobDetail);
    const extInfo = platform.unpackExtInfo(jobDetailExt);
    const filterInput = buildAiDeliveryFilterJobInput(baseInfo, extInfo);

    previewJobLabel.value = platform.getJobKey(jobDetail);
    previewPayloadText.value = JSON.stringify(
      {
        prompt,
        jobBaseInfo: filterInput.jobBaseInfo,
        jobExtInfo: filterInput.jobExtInfo,
      },
      null,
      2
    );
    previewVisible.value = true;
  } catch (error) {
    showAppMessage({
      type: 'error',
      message: `测试失败：${(error as Error | undefined)?.message || '生成输入预览失败'}`,
      duration: 5000,
      showClose: true,
    });
  } finally {
    previewLoading.value = false;
  }
};

const copyPayload = async () => {
  if (!previewPayloadText.value.trim()) {
    showAppMessage({
      type: 'warning',
      message: '当前没有可复制的内容',
    });
    return;
  }

  if (!navigator?.clipboard?.writeText) {
    showAppMessage({
      type: 'warning',
      message: '当前环境不支持剪贴板复制',
    });
    return;
  }

  try {
    await navigator.clipboard.writeText(previewPayloadText.value);
    showAppMessage({
      type: 'success',
      message: '已复制到剪贴板',
    });
  } catch {
    showAppMessage({
      type: 'error',
      message: '复制失败，请手动选择复制',
    });
  }
};
</script>

<style scoped>
.ai-delivery-judge {
  width: 100%;
}

.ai-delivery-judge.is-embedded {
  background: transparent;
}

.boss-card {
  background: var(--ai-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl) var(--spacing-3xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--ai-border-lighter);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ai-text-main);
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-3xl);
}

.card-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background-color: var(--boss-primary, #00bebd);
  margin-right: var(--spacing-lg);
  border-radius: var(--radius-xs);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ai-text-main);
}

.sub-desc {
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  line-height: 1.5;
}

.mt-4 {
  margin-top: var(--spacing-sm);
}

.mt-8 {
  margin-top: var(--spacing-lg);
}

.mt-16 {
  margin-top: var(--spacing-2xl);
}

.mt-24 {
  margin-top: var(--spacing-6);
}

.judge-divider {
  height: 1px;
  background-color: var(--ai-border-light);
  margin: var(--spacing-2xl) 0;
}

.judge-form {
  width: 100%;
}

.full-width {
  width: 100%;
}

.judge-inline-switches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2xl);
  padding: var(--spacing-sm) 0;
}

.switch-content {
  flex: 1;
  min-width: 0;
}

.switch-content span {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--ai-text-main);
}

.action-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-2xl);
  background: var(--ai-bg);
  padding: var(--spacing-2xl) var(--spacing-3xl);
  border-radius: var(--radius-lg);
  border: 1px solid var(--ai-border);
}

.footer-right.buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
}

.judge-sync-hint {
  margin-top: 10px;
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  line-height: 1.5;
}

.judge-policy-hint {
  margin-top: var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  line-height: 1.5;
}

.text-muted {
  color: var(--ai-text-sub);
  font-size: var(--text-base);
}

.save-btn {
  padding: 0 32px;
}

:deep(.preview-dialog) {
  max-width: 820px;
}

.preview-job-card {
  background: var(--ai-bg-subtle);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl) var(--spacing-3xl);
  margin-bottom: var(--spacing-3xl);
  border: 1px solid var(--ai-border);
}

.job-card-label {
  font-size: var(--text-base);
  color: var(--ai-text-sub);
  margin-bottom: var(--spacing-lg);
}

.job-card-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--ai-text-main);
}

.preview-code-container {
  border: 1px solid var(--ai-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--ai-bg-subtle);
  padding: var(--spacing-2-5) var(--spacing-2xl);
  border-bottom: 1px solid var(--ai-border);
  font-size: var(--text-base);
  color: var(--ai-text-secondary);
  font-weight: 500;
}

:deep(.code-preview-input .el-textarea__inner) {
  background-color: var(--ai-bg-subtle);
  border: none;
  border-radius: 0;
  padding: var(--spacing-2xl);
  font-family: 'JetBrains Mono', Consolas, Monaco, Courier, monospace;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--ai-text-code);
  box-shadow: none !important;
  resize: none;
}

:deep(.code-preview-input .el-textarea__inner:focus) {
  box-shadow: none !important;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

:deep(.boss-dialog .el-dialog__header) {
  padding-bottom: var(--spacing-2xl);
  border-bottom: 1px solid var(--ai-border);
  margin-right: 0;
}

:deep(.boss-dialog .el-dialog__title) {
  font-weight: 600;
  color: var(--ai-text-main);
}

:deep(.boss-dialog .el-dialog__footer) {
  border-top: 1px solid var(--ai-border);
  padding-top: var(--spacing-2xl);
}

:deep(.el-form-item__label) {
  color: #444;
  font-size: var(--text-md);
  font-weight: 500;
  line-height: 1.6;
  padding-bottom: var(--spacing-sm);
}
</style>
