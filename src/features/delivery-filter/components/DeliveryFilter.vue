<template>
  <div class="delivery-filter-tab">
    <div class="header-title">投递过滤</div>

    <!-- 硬性约束部分 - 始终执行 -->
    <div class="boss-card">
      <div class="card-title">硬性约束（始终执行）</div>
      <div class="sub-desc mb-16">
        以下规则在 AI 模式和传统模式下都会执行，作为投递的基础门槛。
      </div>

      <div class="switch-grid">
        <el-checkbox v-model="userStore.user.preference.fhE" border class="boss-grid-check"
          >自动过滤猎头岗位</el-checkbox
        >
        <el-checkbox v-model="userStore.user.preference.polE" border class="boss-grid-check"
          >仅投递 BOSS 刚刚活跃/在线</el-checkbox
        >
      </div>

      <div class="activity-filter mt-16">
        <el-checkbox v-model="userStore.user.preference.acE" class="mr-12" border
          >启用活跃度过滤</el-checkbox
        >
        <div class="activity-dims" :class="{ 'is-disabled': !userStore.user.preference.acE }">
          <span class="dim-label">允许的活跃维度：</span>
          <el-checkbox
            v-model="userStore.user.preference.acW"
            :disabled="!userStore.user.preference.acE"
            >本周活跃</el-checkbox
          >
          <el-checkbox
            v-model="userStore.user.preference.acM"
            :disabled="!userStore.user.preference.acE"
            >本月活跃</el-checkbox
          >
          <el-checkbox
            v-model="userStore.user.preference.acY"
            :disabled="!userStore.user.preference.acE"
            >半年前活跃</el-checkbox
          >
        </div>
      </div>
    </div>

    <!-- AI 智能过滤部分 -->
    <div class="boss-card mt-16">
      <div class="card-title">AI 智能过滤</div>
      <div class="setting-row">
        <div class="switch-content">
          <span class="label">启用 AI 智能过滤</span>
          <div class="sub-desc mt-4">
            开启后将使用 AI 针对岗位 JD 和您的简历进行精准判断。关闭后仅使用传统规则。
          </div>
        </div>
        <el-switch
          v-model="aiForm.enabled"
          active-text="开"
          inactive-text="关"
          inline-prompt
          :style="{
            '--el-switch-on-color': 'var(--boss-primary, #00bebd)',
            '--el-switch-off-color': '#dcdfe6',
          }"
          @change="handleAiToggle"
        />
      </div>

      <div v-if="aiForm.enabled" class="ai-config-section mt-16">
        <div class="judge-divider"></div>

        <div class="judge-inline-switches mt-16">
          <div class="switch-content">
            <span>包含求职者个人信息</span>
            <div class="sub-desc mt-4">将您的基本信息（学历、经验等）加入 AI 判断上下文。</div>
          </div>
          <el-switch
            v-model="aiForm.includeUserProfile"
            inline-prompt
            active-text="开"
            inactive-text="关"
          />
        </div>

        <el-form label-position="top" class="judge-form mt-16">
          <el-form-item label="核心技能要求 (AI将重点匹配)">
            <el-select
              v-model="focusSkills"
              multiple
              default-first-option
              allow-create
              filterable
              class="full-width"
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
              placeholder="输入排除词并按回车确认，例如：外包"
            />
            <div class="sub-desc mt-4">输入关键词并按回车添加。AI 识别到这些词将直接拒绝该岗位。</div>
          </el-form-item>
        </el-form>

        <div class="judge-divider mt-16"></div>

        <el-form label-position="top" class="judge-form mt-16">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="AI请求失败策略">
                <el-select v-model="aiForm.onAiError" class="full-width">
                  <el-option label="拒绝投递（默认，更保守）" value="reject" />
                  <el-option label="回退到传统投递规则" value="fallback-traditional" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AI结果无法解析策略">
                <el-select v-model="aiForm.onInvalidResult" class="full-width">
                  <el-option label="拒绝投递（默认，更保守）" value="reject" />
                  <el-option label="回退到传统投递规则" value="fallback-traditional" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>

    <!-- 传统软过滤部分 -->
    <div class="boss-card mt-16">
      <div class="card-title">传统软过滤</div>
      <div class="setting-row">
        <div class="switch-content">
          <span class="label">启用传统投递规则</span>
          <div class="sub-desc mt-4">
            关闭后将跳过传统规则过滤（如公司名/岗位名/薪资等），仅保留硬性约束。
          </div>
        </div>
        <el-switch
          v-model="userStore.user.preference.traditionalDeliveryE"
          active-text="开"
          inactive-text="关"
          inline-prompt
          :style="{
            '--el-switch-on-color': 'var(--boss-primary, #00bebd)',
            '--el-switch-off-color': '#dcdfe6',
          }"
          @change="handleTraditionalToggle"
        />
      </div>

      <div v-if="userStore.user.preference.traditionalDeliveryE" class="traditional-config-section mt-16">
        <div class="judge-divider"></div>

        <div class="card-subtitle mt-16">基本要求过滤</div>

        <div class="responsive-grid mt-16">
          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.srE">薪资要求 (月薪k)</el-checkbox>
            <el-input
              v-model="userStore.user.preference.sr"
              placeholder="例如：15-30"
            />
          </el-form-item>

          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.csrE">公司规模范围</el-checkbox>
            <el-input
              v-model="userStore.user.preference.csr"
              placeholder="例如：100-9999"
            />
          </el-form-item>
        </div>

        <div class="judge-divider mt-16"></div>

        <div class="card-subtitle mt-16">关键词过滤 (包含/排除)</div>

        <div class="responsive-grid mt-16">
          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.cniE">
              公司名
              <el-tag size="small" type="success" effect="light" round class="ml-4">包含</el-tag>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.cni"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="输入后回车添加"
            >
              <el-option v-for="item in companyHints" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.cneE">
              公司名
              <el-tag size="small" type="danger" effect="light" round class="ml-4">排除</el-tag>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.cne"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="输入后回车添加"
            >
              <el-option v-for="item in companyHints" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </div>

        <div class="responsive-grid">
          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.jniE">
              岗位名称
              <el-tag size="small" type="success" effect="light" round class="ml-4">包含</el-tag>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.jni"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="例如：前端, Web (输入后回车)"
            >
              <el-option v-for="item in jobNameHints" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.jneE">
              岗位名称
              <el-tag size="small" type="danger" effect="light" round class="ml-4">排除</el-tag>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.jne"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="例如：外包, 实习 (输入后回车)"
            >
              <el-option
                v-for="item in jobNameExcludeHints"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="responsive-grid">
          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.jciE">
              工作内容JD
              <el-tag size="small" type="success" effect="light" round class="ml-4">包含</el-tag>
              <span class="text-xs text-muted ml-4">(任一命中)</span>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.jci"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="例如：Vue3, TS (输入后回车)"
            >
              <el-option v-for="item in jobContentHints" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <el-form-item class="custom-chk-label">
            <el-checkbox v-model="userStore.user.preference.jceE">
              工作内容JD
              <el-tag size="small" type="danger" effect="light" round class="ml-4">排除</el-tag>
            </el-checkbox>
            <el-select
              v-model="userStore.user.preference.jce"
              multiple
              filterable
              remote
              allow-create
              default-first-option
              :reserve-keyword="false"
              placeholder="例如：驻场, 催收 (输入后回车)"
            >
              <el-option
                v-for="item in jobContentExcludeHints"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>
        </div>
      </div>
    </div>

    <!-- 沟通与运行节律 -->
    <div class="boss-card mt-16 mb-24">
      <div class="card-title">沟通与运行节律</div>

      <el-form-item class="custom-chk-label">
        <el-checkbox v-model="userStore.user.preference.cgE">投递时发送自定义招呼语</el-checkbox>
        <el-input v-model="userStore.user.preference.cg" type="textarea" :rows="3" />
      </el-form-item>

      <div class="interval-groups mt-16">
        <div class="interval-item">
          <span class="interval-label">投递频率间隔：</span>
          <el-input-number
            v-model="userStore.user.preference.pi"
            :min="3"
            :max="60"
            controls-position="right"
          />
          <span class="interval-unit">秒 / 次</span>
        </div>

        <div class="interval-item">
          <span class="interval-label">翻页等待间隔：</span>
          <el-input-number
            v-model="userStore.user.preference.npi"
            :min="6"
            :max="60"
            controls-position="right"
          />
          <span class="interval-unit">秒 / 页</span>
        </div>
      </div>
    </div>

    <div class="action-footer mt-24">
      <div class="footer-right buttons">
        <el-button link class="text-muted" @click="resetForm">恢复默认过滤</el-button>
        <el-button
          color="#00bebd"
          type="primary"
          class="save-btn"
          style="color: white"
          @click="submitForm"
          >保存投递过滤设置</el-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, reactive, ref } from 'vue';
import { showAppMessage } from '@/core/http/request';
import { Tools } from '@/shared/utils/tools';
import { normalizePreferenceBoolean } from '@/shared/utils/preference';
import { UserStore } from '@/state/user';
import { loginInterceptor } from '@/core/auth/auth';

const userStore = UserStore();
const axios2 = inject('$axios') as any;
const PREFERENCE_SAVE_TIMEOUT_MS = 30_000;

const companyHints = ['请输入公司名'];
const jobNameHints = ['请输入工作名'];
const jobNameExcludeHints = ['请输入岗位名称'];
const jobContentHints = ['请输入工作内容'];
const jobContentExcludeHints = ['请输入工作内容字符串'];

// AI 配置
const currentConfig = Tools.getAiDeliveryJudgeConfig(userStore.user?.preference || {});
const focusSkills = ref<string[]>(currentConfig.focusSkills);
const excludeKeywords = ref<string[]>(currentConfig.excludeKeywords);

const aiForm = reactive({
  enabled: currentConfig.enabled,
  includeUserProfile: currentConfig.includeUserProfile,
  onAiError: currentConfig.onAiError,
  onInvalidResult: currentConfig.onInvalidResult,
});

// AI 和传统规则互斥逻辑
const handleAiToggle = (enabled: boolean) => {
  if (enabled && userStore.user.preference.traditionalDeliveryE) {
    userStore.user.preference.traditionalDeliveryE = false;
    showAppMessage({
      message: '已自动关闭传统投递规则（AI 模式和传统模式互斥）',
      type: 'info',
      duration: 3000,
    });
  }
};

const handleTraditionalToggle = (enabled: boolean) => {
  if (enabled && aiForm.enabled) {
    aiForm.enabled = false;
    showAppMessage({
      message: '已自动关闭 AI 智能过滤（AI 模式和传统模式互斥）',
      type: 'info',
      duration: 3000,
    });
  }
};

const upgradePrefNumber = (value: any, oldDefault: number, nextDefault: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n === oldDefault) {
    return nextDefault;
  }
  return n;
};

const preferenceDefaultValueHandler = () => {
  userStore.user.preference.acE = normalizePreferenceBoolean(userStore.user.preference.acE, false);
  userStore.user.preference.acW = normalizePreferenceBoolean(userStore.user.preference.acW, true);
  userStore.user.preference.acM = normalizePreferenceBoolean(userStore.user.preference.acM, true);
  userStore.user.preference.acY = normalizePreferenceBoolean(userStore.user.preference.acY, true);
  if (typeof userStore.user.preference.imE !== 'boolean') {
    userStore.user.preference.imE = false;
  }
  if (typeof userStore.user.preference.traditionalDeliveryE !== 'boolean') {
    userStore.user.preference.traditionalDeliveryE = true;
  }
  userStore.user.preference.maxSessionActions = upgradePrefNumber(
    userStore.user.preference.maxSessionActions,
    35,
    60
  );
  userStore.user.preference.maxDailyActions = upgradePrefNumber(
    userStore.user.preference.maxDailyActions,
    80,
    120
  );
  userStore.user.preference.maxDailyActions = upgradePrefNumber(
    userStore.user.preference.maxDailyActions,
    120,
    150
  );
  userStore.user.preference.maxActionsPerMinute = upgradePrefNumber(
    userStore.user.preference.maxActionsPerMinute,
    6,
    9
  );
  userStore.user.preference.imMaxReloadPerDay = upgradePrefNumber(
    userStore.user.preference.imMaxReloadPerDay,
    10,
    15
  );
  if (!userStore.user.preference.cleanerMaxScanCount) {
    userStore.user.preference.cleanerMaxScanCount = 120;
  }
  if (!userStore.user.preference.cleanerMaxDeleteCount) {
    userStore.user.preference.cleanerMaxDeleteCount = 40;
  }
  if (!userStore.user.preference.cleanerManualConfirmThreshold) {
    userStore.user.preference.cleanerManualConfirmThreshold = 20;
  }
  userStore.user.preference.autoContactMinIntervalSec = upgradePrefNumber(
    userStore.user.preference.autoContactMinIntervalSec,
    12,
    10
  );
  userStore.user.preference.chatMinReplyIntervalSec = upgradePrefNumber(
    userStore.user.preference.chatMinReplyIntervalSec,
    15,
    12
  );
  userStore.user.preference.chatMaxPerMinute = upgradePrefNumber(
    userStore.user.preference.chatMaxPerMinute,
    4,
    6
  );
  userStore.user.preference.chatMaxSessionReplies = upgradePrefNumber(
    userStore.user.preference.chatMaxSessionReplies,
    50,
    75
  );
  userStore.user.preference.autoResumeMaxPerSession = upgradePrefNumber(
    userStore.user.preference.autoResumeMaxPerSession,
    8,
    12
  );
};

const submitForm = async () => {
  if (!loginInterceptor()) {
    return;
  }

  // 保存 AI 配置
  Tools.saveAiDeliveryJudgeConfig({
    enabled: aiForm.enabled,
    focusSkills: focusSkills.value,
    excludeKeywords: excludeKeywords.value,
    includeUserProfile: aiForm.includeUserProfile,
    onAiError: aiForm.onAiError,
    onInvalidResult: aiForm.onInvalidResult,
  });

  // 保存传统配置
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
      showAppMessage({
        message: '投递过滤设置保存成功',
        type: 'success',
        duration: 2000,
      });
    });
};

const resetForm = () => {
  userStore.user.preference = {};
  preferenceDefaultValueHandler();
  
  // 重置 AI 配置
  aiForm.enabled = true;
  aiForm.includeUserProfile = true;
  aiForm.onAiError = 'reject';
  aiForm.onInvalidResult = 'reject';
  focusSkills.value = [];
  excludeKeywords.value = [];
};

preferenceDefaultValueHandler();
</script>

<style scoped>
.delivery-filter-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
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
}

.boss-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef0f5;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.card-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background-color: var(--boss-primary, #00bebd);
  margin-right: 8px;
  border-radius: 2px;
}

.card-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.switch-content {
  flex: 1;
  min-width: 0;
}

.label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.sub-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}

.judge-divider {
  height: 1px;
  background-color: #f0f2f5;
  margin: 16px 0;
}

.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 0 24px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
}

.activity-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #fafafa;
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.activity-dims {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-left: 12px;
  padding-left: 20px;
  border-left: 1px solid #dcdfe6;
}

.dim-label {
  font-size: 13px;
  color: #666;
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.judge-inline-switches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}

.switch-content span {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.judge-form {
  width: 100%;
}

.full-width {
  width: 100%;
}

.interval-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  background: #fdfdfd;
  padding: 16px;
  border-radius: 6px;
  border: 1px dashed #dcdfe6;
}

.interval-item {
  display: flex;
  align-items: center;
}

.interval-label {
  font-size: 14px;
  color: #333;
  margin-right: 8px;
}

.interval-unit {
  font-size: 13px;
  color: #999;
  margin-left: 8px;
}

.action-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  margin-bottom: 40px;
}

.footer-right.buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.text-muted {
  color: #909399;
}

.save-btn {
  padding: 0 32px;
}

.mt-4 {
  margin-top: 4px;
}

.mt-8 {
  margin-top: 8px;
}

.mt-16 {
  margin-top: 16px;
}

.mt-24 {
  margin-top: 24px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-24 {
  margin-bottom: 24px;
}

.ml-4 {
  margin-left: 4px;
}

.mr-12 {
  margin-right: 12px;
}

.text-xs {
  font-size: 12px;
}

:deep(.custom-chk-label) {
  display: flex;
  flex-direction: column;
}

:deep(.custom-chk-label .el-checkbox) {
  margin-bottom: 6px;
  height: auto;
  margin-right: 0;
}

:deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.4;
  word-break: break-word;
  vertical-align: middle;
}

:deep(.boss-grid-check.el-checkbox.is-bordered) {
  margin-right: 0;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  background-color: #fff;
}

:deep(.boss-grid-check.el-checkbox.is-bordered.is-checked) {
  background-color: #f0fbfb;
  border-color: var(--boss-primary, #00bebd);
}

:deep(.boss-grid-check .el-checkbox__label) {
  white-space: normal;
  line-height: 1.4;
  flex: 1;
}

:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-form-item__label) {
  color: #444;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  padding-bottom: 4px;
}
</style>
