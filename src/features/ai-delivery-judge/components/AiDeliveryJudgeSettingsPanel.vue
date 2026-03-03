<template>
  <div class="ai-delivery-judge">
    <div class="judge-section" :class="{ 'is-embedded': embedded }">
      <template v-if="showSectionHeader">
        <div class="judge-section__title">{{ sectionTitle }}</div>
        <div class="judge-section__desc">
          AI过滤与常规过滤为二选一：开启后仅使用 AI 判定，关闭后仅使用常规过滤。
        </div>
      </template>

      <el-form label-position="top" size="default" class="judge-form">
        <el-form-item label="AI 投递判定总开关">
          <el-switch
            v-model="form.enabled"
            active-text="开"
            inactive-text="关"
            inline-prompt
            :style="{ '--el-switch-on-color': '#409eff', '--el-switch-off-color': '#dcdfe6' }"
          />
        </el-form-item>

        <el-form-item label="判定上下文">
          <div class="judge-inline-switches">
            <span>包含求职者个人信息</span>
            <el-switch v-model="form.includeUserProfile" inline-prompt active-text="开" inactive-text="关" />
          </div>
          <div class="judge-inline-switches">
            <span>包含传统规则摘要（仅用于辅助 AI 判定）</span>
            <el-switch v-model="form.includeTraditionalSnapshot" inline-prompt active-text="开" inactive-text="关" />
          </div>
        </el-form-item>

        <el-form-item label="AI请求失败策略">
          <el-select v-model="form.onAiError" placeholder="请选择失败策略" :teleported="false">
            <el-option label="拒绝投递（默认，更保守）" value="reject" />
            <el-option label="回退到传统投递规则" value="fallback-traditional" />
          </el-select>
        </el-form-item>

        <el-form-item label="AI结果异常策略（返回无法解析时）">
          <el-select v-model="form.onInvalidResult" placeholder="请选择异常策略" :teleported="false">
            <el-option label="拒绝投递（默认，更保守）" value="reject" />
            <el-option label="回退到传统投递规则" value="fallback-traditional" />
          </el-select>
        </el-form-item>

        <div class="judge-policy-hint">当失败策略选择“回退到传统投递规则”时，需要在「传统投递」中启用规则过滤。</div>
      </el-form>

      <div class="judge-actions">
        <el-button type="primary" @click="handleSave">保存 AI 投递判定设置</el-button>
        <el-button :loading="previewLoading" @click="handlePreviewInputOnce">测试一次看输入</el-button>
        <el-button @click="resetToDefault">恢复默认配置</el-button>
      </div>

      <div v-if="showSyncHint" class="judge-sync-hint">
        此处配置与「AI 投递判定」页共享同一份数据，修改后会立即同步。
      </div>
    </div>

    <el-dialog v-model="previewVisible" title="AI输入预览" width="820px">
      <div class="preview-head">
        <div class="preview-head__label">测试岗位</div>
        <div class="preview-head__value">{{ previewJobLabel || "未命名岗位" }}</div>
      </div>
      <el-input v-model="previewPayloadText" type="textarea" :rows="18" readonly />
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from "vue";
import { showAppMessage } from "@/core/http/request";
import { Tools } from "@/shared/utils/tools";
import {
  buildAiDeliveryFilterJobInput,
  buildAiDeliveryJudgePrompt,
  buildAiDeliveryUserProfile,
  buildTraditionalRuleSnapshot
} from "@/shared/utils/ai-delivery";
import { UserStore } from "@/state/user";

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
    sectionTitle: "AI 投递判定（岗位级）",
    embedded: false,
    showSyncHint: true
  }
);

const userStore = UserStore();
const platform = inject<JobPreviewPlatform | null>("$platform", null);

const previewVisible = ref(false);
const previewLoading = ref(false);
const previewJobLabel = ref("");
const previewPayloadText = ref("");

const showSectionHeader = computed(() => props.showSectionHeader);
const sectionTitle = computed(() => props.sectionTitle);
const embedded = computed(() => props.embedded);
const showSyncHint = computed(() => props.showSyncHint);

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toText = (value: unknown, fallback = ""): string => {
  return `${value ?? fallback}`;
};

const currentConfig = Tools.getAiDeliveryJudgeConfig(userStore.user?.preference || {});

const form = reactive({
  enabled: currentConfig.enabled,
  includeUserProfile: currentConfig.includeUserProfile,
  includeTraditionalSnapshot: currentConfig.includeTraditionalSnapshot,
  onAiError: currentConfig.onAiError,
  onInvalidResult: currentConfig.onInvalidResult
});

const handleSave = () => {
  const saved = Tools.saveAiDeliveryJudgeConfig({
    enabled: form.enabled,
    includeUserProfile: form.includeUserProfile,
    includeTraditionalSnapshot: form.includeTraditionalSnapshot,
    onAiError: form.onAiError,
    onInvalidResult: form.onInvalidResult
  });

  form.enabled = saved.enabled;
  form.includeUserProfile = saved.includeUserProfile;
  form.includeTraditionalSnapshot = saved.includeTraditionalSnapshot;
  form.onAiError = saved.onAiError;
  form.onInvalidResult = saved.onInvalidResult;
  showAppMessage({
    message: "AI 投递判定设置已保存",
    type: "success",
    duration: 2000
  });
};

const resetToDefault = () => {
  form.enabled = true;
  form.includeUserProfile = true;
  form.includeTraditionalSnapshot = false;
  form.onAiError = "reject";
  form.onInvalidResult = "reject";
};

const handlePreviewInputOnce = async () => {
  if (!platform) {
    showAppMessage({
      type: "warning",
      message: "当前页面不支持测试输入预览"
    });
    return;
  }

  const jobList = platform.getJobList();
  const firstJob = Array.isArray(jobList) ? jobList.find((item) => item && typeof item === "object") : null;
  if (!firstJob) {
    showAppMessage({
      type: "warning",
      message: "当前页面没有可测试岗位，请先进入岗位列表页"
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
    const traditionalSnapshot = buildTraditionalRuleSnapshot(preference);
    const prompt = buildAiDeliveryJudgePrompt(
      {
        prompt: toText(latestConfig.prompt).trim(),
        extraPrompt: toText(latestConfig.extraPrompt).trim(),
        includeUserProfile: form.includeUserProfile,
        includeTraditionalSnapshot: form.includeTraditionalSnapshot
      },
      userProfile,
      traditionalSnapshot
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
        jobExtInfo: filterInput.jobExtInfo
      },
      null,
      2
    );
    previewVisible.value = true;
  } catch (error) {
    showAppMessage({
      type: "error",
      message: `测试失败：${(error as Error | undefined)?.message || "生成输入预览失败"}`,
      duration: 5000,
      showClose: true
    });
  } finally {
    previewLoading.value = false;
  }
};
</script>

<style scoped>
.ai-delivery-judge {
  width: 100%;
}

.judge-section {
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
}

.judge-section.is-embedded {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.judge-section__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.judge-section__desc {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.judge-form {
  width: 100%;
}

.judge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.judge-inline-switches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.judge-inline-switches:last-child {
  margin-bottom: 0;
}

.judge-sync-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.judge-policy-hint {
  margin: -2px 0 12px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.preview-head {
  margin-bottom: 10px;
}

.preview-head__label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.preview-head__value {
  font-size: 13px;
  color: #303133;
  line-height: 1.5;
  word-break: break-all;
}
</style>
