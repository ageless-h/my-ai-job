<template>
  <div class="ai-job-tab">
    <div class="boss-card">
      <div class="card-title">投递统计</div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">今日{{ actionLabel }}成功</span>
          <span class="stat-value text-primary">{{ pushResultCounter.successCount }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">今日{{ actionLabel }}失败</span>
          <span class="stat-value text-danger">{{ pushResultCounter.failCount }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-actions">
          <el-button type="info" size="small" plain @click="handlerClearPushRecords">
            <el-icon><Delete /></el-icon>
            清理投递记录
          </el-button>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">投递设置</div>
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-label">单次处理限制</div>
          <el-input-number
            v-model="selfDefPushCountLimit"
            :min="-1"
            :max="100"
            size="small"
            @change="selfDefPushCountLimitChange"
          />
        </div>

        <div v-if="!isProdEnv()" class="setting-item">
          <div class="setting-label">MOCK 投递</div>
          <el-switch v-model="mockPush" />
        </div>

        <div class="setting-item">
          <div class="setting-label">按条件收藏</div>
          <el-switch
            v-model="collectMode"
            active-text="开"
            inactive-text="关"
            inline-prompt
            style="--el-switch-off-color: #dcdfe6"
          />
        </div>

        <div class="setting-item">
          <div class="setting-label">推荐页无限循环</div>
          <el-switch
            v-model="infiniteLoopEnabled"
            active-text="开"
            inactive-text="关"
            inline-prompt
            style="--el-switch-off-color: #dcdfe6"
          />
        </div>
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">操作</div>
      <div class="action-row">
        <el-tooltip
          effect="dark"
          content="先通过Boss的筛选功能圈选你的意向岗位<br/><span style='color:#00bebd;'>在【传统投递】Tab 中设置</span><br/>您的投递设置，用于精准投递岗位"
          raw-content
          placement="bottom"
        >
          <el-button :type="pushBtnType" class="boss-btn-full" @click="handlerPush">
            <el-icon class="mr-6">
              <Promotion v-if="pushStatus !== PushStatus.PUSHING" />
              <VideoPause v-else />
            </el-icon>
            {{ pushBtnText }}
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="boss-card mt-16 push-records-container">
      <div class="card-title log-title">
        <div class="log-title-left">
          <span>实时操作记录</span>
          <span class="status-dot ml-8" :class="{ 'is-active': pushStatus === PushStatus.PUSHING }"></span>
        </div>
        <el-button v-if="latestPushRecords.length > 0" type="primary" link size="small" @click="handlerClearPushRecords">
          清空记录
        </el-button>
      </div>
      <div class="push-records-content" ref="logsContainer">
        <div v-if="latestPushRecords.length === 0" class="no-records">
          <el-empty description="暂无操作记录，点击上方按钮开始" :image-size="60" />
        </div>
        <div v-else v-for="(record, index) in latestPushRecords" :key="index" class="push-record-item">
          <div class="record-time">{{ record.timestamp }}</div>
          <div :class="['record-message', getRecordLevelClass(record.level)]">
            <span class="record-dot" :class="getRecordLevelClass(record.level)"></span>
            {{ record.message }}
          </div>
        </div>
      </div>
    </div>

    <transition name="el-fade-in">
      <div v-show="pushStatus === PushStatus.PUSHING" class="fixed-stop-button">
        <el-button type="danger" size="large" shadow="always" @click="handlerFixedStopPush">
          <el-icon class="mr-6">
            <VideoPause />
          </el-icon>
          停止{{ actionLabel }}
        </el-button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, inject, nextTick, onUnmounted, ref, watch } from "vue";
import { Delete, Promotion, VideoPause } from "@element-plus/icons-vue";
import { isProdEnv, showAppMessage } from "@/core/http/request";
import { Tools } from "@/shared/utils/tools";
import { UserStore } from "@/state/user";
import { LoginStore } from "@/state/login";
import { pushResultCount } from "@/state/push-result";
import { LogRecorder, PushStatus } from "@/core/engine/push-engine";
import { loginInterceptor, silentlyLogin, userRemoteLoad } from "@/core/auth/auth";
import { normalizePreferenceBoolean } from "@/shared/utils/preference";

const globalAny = globalThis as any;
const logger = globalAny.logger$1 || console;

const platform = inject<any>("$platform");
const userStore = UserStore();
const loginStore = LoginStore();
const pushResultCounter = pushResultCount();

const pushStatus = ref(PushStatus.NOT_START);
const collectMode = ref(false);
const actionLabel = computed(() => (collectMode.value ? "收藏" : "投递"));
const getStartButtonText = () => (collectMode.value ? "开始收藏" : "开始投递");
const pushBtnType = ref("primary");
const pushBtnText = ref(getStartButtonText());
const mockPush = ref(false);
const selfDefPushCountLimit = ref(platform?.selfDefPushCountLimit ?? -1);

const logRecorder = new LogRecorder();
const latestPushRecords = ref<any[]>([]);
const logsContainer = ref<HTMLElement | null>(null);
let recordsUpdateTimer: ReturnType<typeof setInterval> | null = null;
let recommendLoopCooldownTimer: ReturnType<typeof setTimeout> | null = null;

type StartPushOptions = {
  silent?: boolean;
  forceRecommendLoop?: boolean;
};

const RECOMMEND_LOOP_RELOAD_KEY = "ai-job-recommend-loop-reload";
const RECOMMEND_LOOP_TTL_MS = 45 * 60 * 1e3;
const RECOMMEND_LOOP_RESUME_MAX_ATTEMPTS = 15;
const RECOMMEND_LOOP_RESUME_INTERVAL_MS = 1200;
const RECOMMEND_LOOP_RETRY_BUFFER_MS = 1500;

const infiniteLoopEnabled = computed({
  get: () => !!userStore?.user?.preference?.imE,
  set: (value: boolean) => {
    if (userStore?.user?.preference) {
      userStore.user.preference.imE = value;
    }
  }
});

const isRecommendSalaryLoopPage = () => {
  const href = String((Tools.window?.location ? Tools.window.location.href : location.href) || "");
  try {
    const url = new URL(href);
    return url.pathname.includes("/web/geek/jobs");
  } catch (_error) {
    return href.includes("/web/geek/jobs");
  }
};

const normalizeText = (text: string) => `${text || ""}`.replace(/\s+/g, "");

const isOtherJobsShenzhenText = (text: string) => {
  const normalized = normalizeText(text);
  return (
    normalized.includes("其他职位(深圳)") ||
    normalized.includes("其他职位（深圳）") ||
    (normalized.includes("其他职位") && normalized.includes("深圳"))
  );
};

const getOtherJobsShenzhenEntry = () => {
  const selectors = ["a.expect-item.has-tooltip", "a.expect-item", ".expect-list a"];
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    const hit = nodes.find((node) => isOtherJobsShenzhenText(node.textContent || (node as HTMLElement).innerText || ""));
    if (hit) {
      return hit as HTMLElement;
    }
  }
  const textNodes = Array.from(document.querySelectorAll(".text-content"));
  const textHit = textNodes.find((node) => isOtherJobsShenzhenText(node.textContent || (node as HTMLElement).innerText || ""));
  if (textHit) {
    return ((textHit as HTMLElement).closest("a.expect-item") || textHit) as HTMLElement;
  }
  return null;
};

const isOtherJobsShenzhenLikelyActive = () => {
  const activeEntries = Array.from(
    document.querySelectorAll(".expect-item.active, .expect-item.cur, .expect-item.selected, .expect-item.current, .expect-item.on")
  );
  if (activeEntries.some((entry) => isOtherJobsShenzhenText(entry.textContent || (entry as HTMLElement).innerText || ""))) {
    return true;
  }
  const activeTextEntries = Array.from(
    document.querySelectorAll(".expect-item .text-content.active, .expect-item .text-content.cur, .expect-item .text-content.selected")
  );
  return activeTextEntries.some((entry) => isOtherJobsShenzhenText(entry.textContent || (entry as HTMLElement).innerText || ""));
};

const triggerElementClick = (element: HTMLElement | null) => {
  if (!element) {
    return;
  }
  const eventInit = { bubbles: true, cancelable: true, composed: true };
  element.dispatchEvent(new MouseEvent("mousedown", eventInit));
  element.dispatchEvent(new MouseEvent("mouseup", eventInit));
  element.dispatchEvent(new MouseEvent("click", eventInit));
  if (typeof element.click === "function") {
    element.click();
  }
};

const alignOtherJobsShenzhen = async () => {
  if (!isRecommendSalaryLoopPage()) {
    return false;
  }
  const maxAttempts = 10;
  logRecorder.info("推荐页无限循环：正在进入“其他职位(深圳)”");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isOtherJobsShenzhenLikelyActive()) {
      logRecorder.info("推荐页无限循环：已进入“其他职位(深圳)”");
      return true;
    }
    const entry = getOtherJobsShenzhenEntry();
    if (!entry) {
      await Tools.sleep(600);
      continue;
    }
    triggerElementClick(entry);
    await Tools.sleep(450);
    if (!isOtherJobsShenzhenLikelyActive()) {
      const textEntry = entry.querySelector(".text-content") as HTMLElement | null;
      if (textEntry) {
        triggerElementClick(textEntry);
      }
    }
    await Tools.sleep(900);
  }
  const aligned = isOtherJobsShenzhenLikelyActive();
  if (!aligned) {
    logRecorder.warn("推荐页无限循环：进入“其他职位(深圳)”失败，后续按当前列表继续");
  }
  return aligned;
};

const shouldEnableRecommendLoop = () => {
  return !!userStore?.user && !!userStore.user.preference.imE && !collectMode.value && isRecommendSalaryLoopPage();
};

const getRecommendLoopTargetUrl = () => {
  const href = String((Tools.window?.location ? Tools.window.location.href : location.href) || "");
  try {
    const url = new URL(href);
    return `${url.origin}/web/geek/jobs?salary=406`;
  } catch (_error) {
    return "https://www.zhipin.com/web/geek/jobs?salary=406";
  }
};

const navigateToRecommendLoopTarget = (targetUrl = getRecommendLoopTargetUrl()) => {
  if (Tools.window?.location && typeof Tools.window.location.assign === "function") {
    Tools.window.location.assign(targetUrl);
  } else {
    window.location.href = targetUrl;
  }
};

const markRecommendLoopReload = () => {
  const payload = {
    ts: Date.now(),
    mode: collectMode.value ? "collect" : "push",
    targetUrl: getRecommendLoopTargetUrl()
  };
  localStorage.setItem(RECOMMEND_LOOP_RELOAD_KEY, JSON.stringify(payload));
};

const readRecommendLoopReload = () => {
  const raw = localStorage.getItem(RECOMMEND_LOOP_RELOAD_KEY);
  if (!raw) {
    return null;
  }
  try {
    const payload = JSON.parse(raw);
    if (!payload || !payload.ts || Date.now() - Number(payload.ts) > RECOMMEND_LOOP_TTL_MS) {
      localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
      return null;
    }
    return payload;
  } catch (_error) {
    localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
    return null;
  }
};

const clearRecommendLoopReload = () => {
  localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
};

const getPlatformLastStopReason = () => {
  return `${platform?.lastStopReason || ""}`.trim();
};

const parseSafetyCooldownWaitMs = (reason: string) => {
  const match = `${reason || ""}`.match(/(\d+)\s*分钟后可继续/);
  if (!match) {
    return 0;
  }
  const waitMinutes = Number(match[1]);
  if (!Number.isFinite(waitMinutes) || waitMinutes <= 0) {
    return 0;
  }
  return waitMinutes * 60 * 1000;
};

const clearRecommendLoopCooldownTimer = () => {
  if (recommendLoopCooldownTimer) {
    clearTimeout(recommendLoopCooldownTimer);
    recommendLoopCooldownTimer = null;
  }
};

const prepareRecommendLoopBeforeStart = async (enabled: boolean, silent = false) => {
  if (!enabled) {
    return true;
  }

  if (!isRecommendSalaryLoopPage()) {
    const jumpUrl = getRecommendLoopTargetUrl();
    markRecommendLoopReload();
    if (!silent) {
      showAppMessage({
        message: "推荐页无限循环：当前不在目标页，正在跳转到推荐页",
        type: "info",
        duration: 2200
      });
    }
    navigateToRecommendLoopTarget(jumpUrl);
    return false;
  }

  const aligned = await alignOtherJobsShenzhen();
  if (aligned) {
    return true;
  }

  const warnMessage = "未定位到“其他职位(深圳)”入口，本轮按当前推荐列表继续";
  logRecorder.warn(`推荐页无限循环：${warnMessage}`);
  if (!silent) {
    showAppMessage({
      message: warnMessage,
      type: "warning",
      duration: 2500
    });
  }
  return true;
};

const scheduleRecommendLoopCooldownRetry = (reason: string, forceEnabled = false) => {
  const waitMs = parseSafetyCooldownWaitMs(reason);
  if (waitMs <= 0 || (!forceEnabled && !shouldEnableRecommendLoop())) {
    return false;
  }

  markRecommendLoopReload();
  clearRecommendLoopCooldownTimer();
  recommendLoopCooldownTimer = setTimeout(() => {
    void tryAutoResumeRecommendLoop();
  }, waitMs + RECOMMEND_LOOP_RETRY_BUFFER_MS);

  showAppMessage({
    message: `${reason}，推荐页无限循环将在冷却结束后自动继续`,
    type: "warning",
    duration: 2800
  });

  return true;
};

const updateLatestPushRecords = () => {
  const allLogs = logRecorder.getLogs(1, logRecorder.getLogCount());
  const operationKeywords = [
    "投递",
    "收藏",
    "下一页",
    "工作",
    "推荐",
    "循环",
    "暂停",
    "停止",
    "安全",
    "冷却",
    "验证",
    "阈值",
    "熔断"
  ];
  const pushLogs = allLogs.filter((log) => {
    const message = String(log.message || "").toLowerCase();
    return operationKeywords.some((keyword) => message.includes(keyword));
  });
  latestPushRecords.value = pushLogs.slice(-10);
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
};

const getRecordLevelClass = (level: string) => {
  const normalized = String(level || "").toLowerCase();
  switch (normalized) {
    case "error":
      return "record-error";
    case "warn":
      return "record-warn";
    case "info":
      return "record-info";
    case "debug":
      return "record-debug";
    case "trace":
      return "record-trace";
    default:
      return "record-info";
  }
};

const startRecordsUpdate = () => {
  if (recordsUpdateTimer) {
    clearInterval(recordsUpdateTimer);
  }
  updateLatestPushRecords();
  recordsUpdateTimer = setInterval(updateLatestPushRecords, 500);
};

const stopRecordsUpdate = () => {
  if (recordsUpdateTimer) {
    clearInterval(recordsUpdateTimer);
    recordsUpdateTimer = null;
  }
};

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

const selfDefPushCountLimitChange = (value: number) => {
  platform.selfDefPushCountLimit = value;
};

const getDeliveryModeFlags = () => {
  const preference = userStore?.user?.preference ? userStore.user.preference : {};
  return {
    aiDeliveryJudgeEnabled: Tools.getAiDeliveryJudgeConfig(preference).enabled,
    traditionalDeliveryEnabled: normalizePreferenceBoolean(preference.traditionalDeliveryE, true)
  };
};

const ensurePreferenceLoadedForStart = (options = { silent: false }) => {
  if (userStore.preferenceLoadStatus === "success") {
    return true;
  }
  const { aiDeliveryJudgeEnabled, traditionalDeliveryEnabled } = getDeliveryModeFlags();
  const aiOnlyMode = aiDeliveryJudgeEnabled && !traditionalDeliveryEnabled;

  if (userStore.preferenceLoadStatus === "loading") {
    if (!options.silent) {
      showAppMessage({
        message: "投递设置加载中，请稍后再启动",
        type: "warning",
        duration: 2500
      });
    }
    return false;
  }

  userRemoteLoad();

  if (aiOnlyMode) {
    if (!options.silent) {
      showAppMessage({
        message: "已按 AI 投递模式启动，投递设置将在后台同步",
        type: "info",
        duration: 2500
      });
    }
    return true;
  }

  if (!options.silent) {
    showAppMessage({
      message:
        userStore.preferenceLoadStatus === "failed"
          ? "投递设置加载失败，正在重试加载，请稍后再启动"
          : "投递设置加载中，请稍后再启动",
      type: "warning",
      duration: 2500
    });
  }
  return false;
};

const startPush = async (options: StartPushOptions = {}) => {
  const silent = !!options.silent;
  const recommendLoopEnabledForRun = !!options.forceRecommendLoop || shouldEnableRecommendLoop();

  if (!loginInterceptor()) {
    return false;
  }

  if (!ensurePreferenceLoadedForStart({ silent })) {
    return false;
  }

  const recommendLoopPrepared = await prepareRecommendLoopBeforeStart(recommendLoopEnabledForRun, silent);
  if (!recommendLoopPrepared) {
    return false;
  }

  platform.collectMode = collectMode.value;
  platform.pushMock = mockPush.value;
  pushStatus.value = PushStatus.PUSHING;
  pushBtnType.value = "warning";
  pushBtnText.value = `停止${actionLabel.value}`;
  startRecordsUpdate();

  const pushResultPromise = platform.startPush();
  pushResultPromise.then(() => {
    const stopReason = getPlatformLastStopReason();
    const hasStopReason = !!stopReason;
    const shouldShowPauseNotice = hasStopReason && [PushStatus.LIMIT, PushStatus.PAUSE].includes(platform.pushStatus);
    if (shouldShowPauseNotice) {
      logRecorder.warn(`暂停通知：${stopReason}`);
      updateLatestPushRecords();
    }

    if (platform.pushStatus === PushStatus.LIMIT) {
      pushStatus.value = PushStatus.LIMIT;
      pushBtnType.value = "primary";
      pushBtnText.value = getStartButtonText();
      stopRecordsUpdate();

      const scheduled = recommendLoopEnabledForRun && scheduleRecommendLoopCooldownRetry(stopReason, true);
      if (!scheduled && stopReason) {
        showAppMessage({
          message: stopReason,
          type: "warning",
          duration: 2500
        });
      }
      return;
    }

    if (platform.pushStatus === PushStatus.PAUSE) {
      pushStatus.value = PushStatus.PAUSE;
      pushBtnType.value = "primary";
      pushBtnText.value = getStartButtonText();
      stopRecordsUpdate();
      if (stopReason) {
        showAppMessage({
          message: stopReason,
          type: "warning",
          duration: 2500
        });
      }
      return;
    }

    const shouldLoopRestart = pushStatus.value === PushStatus.PUSHING && recommendLoopEnabledForRun;
    if (shouldLoopRestart) {
      markRecommendLoopReload();
      showAppMessage({
        message: "推荐页无限循环：本轮完成，正在刷新并自动继续投递",
        type: "info",
        duration: 2500
      });
      stopRecordsUpdate();
      setTimeout(() => {
        navigateToRecommendLoopTarget();
      }, 1200);
      return;
    }

    showAppMessage({
      message: `批量${actionLabel.value}完成`,
      type: "success",
      duration: 3000
    });

    setTimeout(() => {
      pushStatus.value = PushStatus.PAUSE;
      pushBtnType.value = "primary";
      pushBtnText.value = getStartButtonText();
      stopRecordsUpdate();
    }, 200);
  }).catch((error: any) => {
    const errorMsg = `${error?.message || "未知错误"}`;
    logRecorder.error(`启动${actionLabel.value}失败：${errorMsg}`);
    pushStatus.value = PushStatus.PAUSE;
    pushBtnType.value = "primary";
    pushBtnText.value = getStartButtonText();
    stopRecordsUpdate();
    showAppMessage({
      message: `启动${actionLabel.value}失败：${errorMsg}`,
      type: "error",
      duration: 3000
    });
  });

  return true;
};

const pausePush = () => {
  platform.pausePush();
  pushStatus.value = PushStatus.PAUSE;
  pushBtnType.value = "primary";
  pushBtnText.value = getStartButtonText();
  stopRecordsUpdate();
};

const handlerPush = () => {
  switch (pushStatus.value) {
    case PushStatus.NOT_START:
    case PushStatus.PAUSE:
      void startPush();
      break;
    case PushStatus.PUSHING:
      pausePush();
      break;
    default:
      break;
  }
};

const handlerFixedStopPush = () => {
  pausePush();
  scrollToTop();
};

const handlerClearPushRecords = () => {
  if (typeof logRecorder.clearLogs === "function") {
    logRecorder.clearLogs();
  }
  latestPushRecords.value = [];
  if (typeof pushResultCounter.clearCounts === "function") {
    pushResultCounter.clearCounts();
  }
  showAppMessage({
    message: "已清理投递成功/失败记录",
    type: "success",
    duration: 2000
  });
};

const tryAutoResumeRecommendLoop = async () => {
  const payload = readRecommendLoopReload();
  if (!payload) {
    clearRecommendLoopCooldownTimer();
    return;
  }

  const jumpUrl = payload.targetUrl || getRecommendLoopTargetUrl();
  for (let attempt = 1; attempt <= RECOMMEND_LOOP_RESUME_MAX_ATTEMPTS; attempt++) {
    const latestPayload = readRecommendLoopReload();
    if (!latestPayload) {
      return;
    }

    if (!isRecommendSalaryLoopPage()) {
      navigateToRecommendLoopTarget(jumpUrl);
      return;
    }

    collectMode.value = latestPayload.mode === "collect";

    if (pushStatus.value !== PushStatus.PUSHING) {
      const started = await startPush({ silent: true, forceRecommendLoop: true });
      if (started) {
        showAppMessage({
          message: "推荐页无限循环：页面已刷新，已继续自动运行",
          type: "info",
          duration: 2000
        });
        return;
      }
    }

    await Tools.sleep(RECOMMEND_LOOP_RESUME_INTERVAL_MS);
  }

  showAppMessage({
    message: "推荐页无限循环恢复超时，正在重新进入目标页",
    type: "warning",
    duration: 2500
  });
  navigateToRecommendLoopTarget(jumpUrl);
};

if (!loginStore.login && !loginStore.loginFailStatus) {
  logger.info("页面静默登录");
  silentlyLogin("").catch(() => {});
}

setTimeout(() => {
  void tryAutoResumeRecommendLoop();
}, 1500);

watch(collectMode, () => {
  if (pushStatus.value !== PushStatus.PUSHING) {
    pushBtnText.value = getStartButtonText();
  }
});

onUnmounted(() => {
  clearRecommendLoopCooldownTimer();
  stopRecordsUpdate();
});
</script>

<style scoped>
.ai-job-tab {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background-color: #f8f9fa;
}

.boss-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef0f5;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.card-title::before {
  content: "";
  display: inline-block;
  width: 3px;
  height: 14px;
  background-color: var(--boss-primary, #00bebd);
  margin-right: 8px;
  border-radius: 2px;
}

.mt-16 {
  margin-top: 16px;
}

.mr-6 {
  margin-right: 6px;
}

.ml-8 {
  margin-left: 8px;
}

.stats-row {
  display: flex;
  align-items: center;
  background-color: #fcfcfc;
  border-radius: 6px;
  padding: 12px 16px;
  border: 1px solid #f0f2f5;
}

.stat-item {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
}

.text-primary {
  color: var(--boss-primary, #00bebd);
}

.text-danger {
  color: #f56c6c;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background-color: #ebeef5;
  margin: 0 20px;
}

.stat-actions {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fcfcfc;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #f0f2f5;
}

.setting-label {
  font-size: 13px;
  color: #444;
}

.action-row {
  width: 100%;
}

.boss-btn-full {
  width: 100%;
  height: 40px;
  font-size: 15px;
  border-radius: 6px;
}

.push-records-container {
  display: flex;
  flex-direction: column;
}

.log-title {
  justify-content: space-between;
  margin-bottom: 12px;
}

.log-title-left {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dcdfe6;
  transition: all 0.3s;
}

.status-dot.is-active {
  background-color: #00bebd;
  box-shadow: 0 0 8px rgba(0, 190, 189, 0.4);
}

.push-records-content {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px 16px;
  height: 250px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
}

.no-records {
  color: #888;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.push-record-item {
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ebeef5;
}

.push-record-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.record-time {
  color: #999;
  margin-right: 12px;
  flex-shrink: 0;
  font-family: monospace;
}

.record-message {
  word-break: break-word;
  display: flex;
  align-items: center;
}

.record-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}

.record-info {
  color: #606266;
}
.record-info.record-dot {
  background-color: #909399;
}

.record-warn {
  color: #e6a23c;
}
.record-warn.record-dot {
  background-color: #e6a23c;
}

.record-error {
  color: #f56c6c;
}
.record-error.record-dot {
  background-color: #f56c6c;
}

.record-debug {
  color: #6ec6c5;
}
.record-debug.record-dot {
  background-color: #6ec6c5;
}

.record-trace {
  color: #909399;
}

.fixed-stop-button {
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 9999;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
