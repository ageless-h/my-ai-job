<template>
  <el-form
    ref="ruleFormRef"
    :model="userStore.user"
    label-position="right"
    label-width="auto"
    class="form-preference"
    size="large"
  >
    <el-text v-if="Tools.window.location.href.includes('job-recommend')" class="mx-1 top-title" type="danger">
      !!!请前往顶部【搜索】按钮所在页面保存偏好设置!!!
    </el-text>

    <el-text class="mx-1 top-title" type="warning">投递设置</el-text>

    <div class="delivery-mode-card">
      <div class="delivery-mode-card__title">传统投递总开关</div>
      <div class="delivery-mode-card__desc">
        关闭后将跳过传统规则过滤（如公司名/岗位名/薪资等），仅保留基础状态检查。
      </div>
      <div class="delivery-mode-card__switch">
        <span>启用传统投递规则</span>
        <el-switch
          v-model="userStore.user.preference.traditionalDeliveryE"
          active-text="开"
          inactive-text="关"
          inline-prompt
          :style="{ '--el-switch-on-color': '#409eff', '--el-switch-off-color': '#dcdfe6' }"
        />
      </div>
    </div>

    <div class="setting-row">
      <el-form-item label="公司名包含" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.cniE" label="" size="large" />
          公司名包含
        </template>
        <el-select
          v-model="userStore.user.preference.cni"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="公司名包含"
          style="width: 240px"
        >
          <el-option v-for="item in companyHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item label="公司名排除" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.cneE" label="" size="large" />
          公司名排除
        </template>
        <el-select
          v-model="userStore.user.preference.cne"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="公司名排除"
          style="width: 240px"
        >
          <el-option v-for="item in companyHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
    </div>

    <div class="setting-row">
      <el-form-item label="岗位名称包含" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.jniE" label="" size="large" />
          岗位名称包含
        </template>
        <el-select
          v-model="userStore.user.preference.jni"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="岗位名称包含"
          style="width: 240px"
        >
          <el-option v-for="item in jobNameHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item label="岗位名称排除" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.jneE" label="" size="large" />
          岗位名称排除
        </template>
        <el-select
          v-model="userStore.user.preference.jne"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="岗位名称排除"
          style="width: 240px"
        >
          <el-option v-for="item in jobNameExcludeHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
    </div>

    <div class="setting-row">
      <el-form-item label="工作内容包含(任一)" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.jciE" label="" size="large" />
          内容包含(任一)
        </template>
        <el-select
          v-model="userStore.user.preference.jci"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="工作内容包含(任一关键词命中)"
          style="width: 240px"
        >
          <el-option v-for="item in jobContentHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>

      <el-form-item label="工作内容排除" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.jceE" label="" size="large" />
          工作内容排除
        </template>
        <el-select
          v-model="userStore.user.preference.jce"
          multiple
          filterable
          remote
          allow-create
          default-first-option
          :reserve-keyword="false"
          placeholder="工作内容排除"
          style="width: 240px"
        >
          <el-option v-for="item in jobContentExcludeHints" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
    </div>

    <div class="setting-row">
      <el-form-item label="薪资范围" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.srE" label="" size="large" />
          薪资范围(月薪k)
        </template>
        <el-input v-model="userStore.user.preference.sr" placeholder="薪资范围 例:9-15" />
      </el-form-item>

      <el-form-item label="公司规模范围" class="setting-item">
        <template #label>
          <el-checkbox v-model="userStore.user.preference.csrE" label="" size="large" />
          公司规模范围
        </template>
        <el-input v-model="userStore.user.preference.csr" placeholder="公司规模范围 例:10-5000" style="width: 242px" />
      </el-form-item>
    </div>

    <el-form-item label="发送自定义招呼语">
      <template #label>
        <el-checkbox v-model="userStore.user.preference.cgE" label="" size="large" />
        <span>发送自定义招呼语</span>
      </template>
      <el-input v-model="userStore.user.preference.cg" type="textarea" />
    </el-form-item>

    <div class="single-setting-row">
      <el-checkbox v-model="userStore.user.preference.fhE" label="" size="large">过滤猎头</el-checkbox>
    </div>

    <div class="single-setting-row">
      <el-checkbox v-model="userStore.user.preference.polE" label="" size="large">仅投递 BOSS 在线岗位</el-checkbox>
    </div>

    <div class="single-setting-row">
      <div class="activity-row">
        <el-checkbox v-model="userStore.user.preference.acE" label="" size="large">活跃度过滤</el-checkbox>
        <span>维度</span>
        <el-checkbox v-model="userStore.user.preference.acW" label="" size="large">周</el-checkbox>
        <el-checkbox v-model="userStore.user.preference.acM" label="" size="large">月</el-checkbox>
        <el-checkbox v-model="userStore.user.preference.acY" label="" size="large">年</el-checkbox>
      </div>
    </div>

    <div class="single-setting-row">
      <div class="interval-row">
        <p class="time-interval">投递间隔</p>
        <el-input-number v-model="userStore.user.preference.pi" :min="3" :max="60" size="small" />
        <p class="time-interval">秒</p>
      </div>
    </div>

    <div class="single-setting-row">
      <div class="interval-row">
        <p class="time-interval">翻页间隔</p>
        <el-input-number v-model="userStore.user.preference.npi" :min="6" :max="60" size="small" />
        <p class="time-interval">秒</p>
      </div>
    </div>

    <el-form-item>
      <el-button type="primary" @click="submitForm">保存偏好设置</el-button>
      <el-button @click="resetForm">清除偏好设置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
// @ts-nocheck
import { inject, ref } from 'vue';
import { ElMessage } from '@/core/http/request';
import { Tools } from '@/shared/utils/tools';
import { normalizePreferenceBoolean } from '@/shared/utils/preference';
import { UserStore } from '@/state/user';
import { loginInterceptor } from '@/core/auth/auth';

const userStore = UserStore();
const axios2 = inject('$axios') as any;
const ruleFormRef = ref();
const PREFERENCE_SAVE_TIMEOUT_MS = 30_000;

const companyHints = ['请输入公司名'];
const jobNameHints = ['请输入工作名'];
const jobNameExcludeHints = ['请输入岗位名称'];
const jobContentHints = ['请输入工作内容'];
const jobContentExcludeHints = ['请输入工作内容字符串'];

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
  userStore.user.preference.maxSessionActions = upgradePrefNumber(userStore.user.preference.maxSessionActions, 35, 60);
  userStore.user.preference.maxDailyActions = upgradePrefNumber(userStore.user.preference.maxDailyActions, 80, 120);
  userStore.user.preference.maxActionsPerMinute = upgradePrefNumber(userStore.user.preference.maxActionsPerMinute, 6, 9);
  userStore.user.preference.maxConsecutiveFailures = upgradePrefNumber(userStore.user.preference.maxConsecutiveFailures, 8, 10);
  userStore.user.preference.cooldownMinutesOnLimit = upgradePrefNumber(userStore.user.preference.cooldownMinutesOnLimit, 30, 25);
  if (typeof userStore.user.preference.safetyTimeWindowE !== 'boolean') {
    userStore.user.preference.safetyTimeWindowE = false;
  }
  if (userStore.user.preference.safetyStartHour === undefined || userStore.user.preference.safetyStartHour === null) {
    userStore.user.preference.safetyStartHour = 8;
  }
  if (userStore.user.preference.safetyEndHour === undefined || userStore.user.preference.safetyEndHour === null) {
    userStore.user.preference.safetyEndHour = 22;
  }
  userStore.user.preference.imMaxReloadPerDay = upgradePrefNumber(userStore.user.preference.imMaxReloadPerDay, 10, 15);
  if (!userStore.user.preference.cleanerMaxScanCount) {
    userStore.user.preference.cleanerMaxScanCount = 120;
  }
  if (!userStore.user.preference.cleanerMaxDeleteCount) {
    userStore.user.preference.cleanerMaxDeleteCount = 40;
  }
  if (!userStore.user.preference.cleanerManualConfirmThreshold) {
    userStore.user.preference.cleanerManualConfirmThreshold = 20;
  }
  userStore.user.preference.autoContactMinIntervalSec = upgradePrefNumber(userStore.user.preference.autoContactMinIntervalSec, 12, 10);
  userStore.user.preference.maxAutoMessagePerSession = upgradePrefNumber(userStore.user.preference.maxAutoMessagePerSession, 20, 30);
  userStore.user.preference.maxAutoResumePerSession = upgradePrefNumber(userStore.user.preference.maxAutoResumePerSession, 12, 18);
  userStore.user.preference.chatMinReplyIntervalSec = upgradePrefNumber(userStore.user.preference.chatMinReplyIntervalSec, 15, 12);
  userStore.user.preference.chatMaxPerMinute = upgradePrefNumber(userStore.user.preference.chatMaxPerMinute, 4, 6);
  userStore.user.preference.chatMaxSessionReplies = upgradePrefNumber(userStore.user.preference.chatMaxSessionReplies, 50, 75);
  userStore.user.preference.autoResumeMaxPerSession = upgradePrefNumber(userStore.user.preference.autoResumeMaxPerSession, 8, 12);
};

const submitForm = async () => {
  if (!loginInterceptor()) {
    return;
  }
  await axios2
    .post('/api/user/save/preference', {
      ...userStore.user,
      aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0,
    }, {
      timeout: PREFERENCE_SAVE_TIMEOUT_MS,
    })
    .then(() => {
      ElMessage({
        message: '偏好设置保存成功',
        type: 'success',
        duration: 2000,
      });
    });
};

const resetForm = () => {
  userStore.user.preference = {};
  preferenceDefaultValueHandler();
};

preferenceDefaultValueHandler();
</script>

<style scoped>
.form-preference {
  width: 100%;
}

.delivery-mode-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
}

.delivery-mode-card__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.delivery-mode-card__desc {
  margin-top: 4px;
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.delivery-mode-card__switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.setting-row {
  display: flex;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 12px;
}

.setting-item {
  margin-bottom: 10px;
}

.single-setting-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
  flex-wrap: wrap;
}

.activity-row,
.interval-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

:deep(.el-input-number--small) {
  line-height: 22px;
  width: 80px;
}

.time-interval {
  margin: 0;
}
</style>
