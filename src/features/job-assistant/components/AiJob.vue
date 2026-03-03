<script setup lang="ts">
// @ts-nocheck
import * as Vue from "vue";
import * as ElementPlus from "element-plus";
import * as Icons from "@element-plus/icons-vue";
import { request, showAppMessage, isProdEnv } from "@/core/http/request";
import { Tools } from "@/shared/utils/tools";
import { UserStore } from "@/state/user";
import { LoginStore } from "@/state/login";
import { pushResultCount } from "@/state/push-result";
import { LogRecorder, PushStatus } from "@/core/engine/push-engine";
import { loginInterceptor, silentlyLogin, userRemoteLoad } from "@/core/auth/auth";
import { AiPower } from "@/core/ai/ai-power";
import { Message } from "@/core/protocol/message";
import { normalizePreferenceBoolean } from "@/shared/utils/preference";

const VueAny = Vue as any;
const ElementAny = ElementPlus as any;
const IconsAny = Icons as any;

const {
  defineComponent,
  computed,
  watch,
  provide,
  reactive,
  toRefs,
  openBlock,
  createElementBlock,
  normalizeClass,
  unref,
  renderSlot,
  inject,
  ref,
  onMounted,
  onBeforeUnmount,
  onUpdated,
  createVNode,
  Fragment,
  useSlots,
  withCtx,
  createBlock,
  resolveDynamicComponent,
  normalizeStyle,
  createTextVNode,
  toDisplayString,
  createCommentVNode,
  createElementVNode,
  TransitionGroup,
  useAttrs,
  nextTick,
  mergeProps,
  withModifiers,
  Transition,
  toHandlers,
  withKeys,
  withDirectives,
  vShow,
  getCurrentInstance,
  h,
  watchEffect,
  toRef,
  renderList,
  shallowRef,
  createSlots,
  toRaw,
  resolveComponent,
  resolveDirective,
  vModelText,
  onUnmounted,
  isRef
} = VueAny;

const pushScopeId = VueAny.pushScopeId || (() => undefined);
const popScopeId = VueAny.popScopeId || (() => undefined);

const {
  ElMenu,
  ElMenuItem,
  ElText,
  ElIcon,
  ElButton,
  ElLink,
  ElInputNumber,
  ElSwitch,
  ElTooltip,
  ElForm,
  ElFormItem,
  ElCheckbox,
  ElOption,
  ElSelect,
  ElUpload,
  ElRow,
  ElCol,
  ElTimePicker,
  ElPagination,
  ElCollapse,
  ElCollapseItem,
  ElMessageBox,
  ElNotification
} = ElementAny;

const {
  CircleCloseFilled,
  Promotion,
  Collection
} = IconsAny;

const GlobalAny = globalThis as any;
const logger$1 = GlobalAny.logger$1 || console;
const BossOption = GlobalAny.BossOption || { buildJobKey: (_data: any) => "" };

const _withScopeId$3 = (n) => (pushScopeId("data-v-13350d57"), n = n(), popScopeId(), n);
      const _hoisted_1$6 = { key: 0 };
      const _hoisted_2$5 = /* @__PURE__ */ _withScopeId$3(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_3$3 = /* @__PURE__ */ _withScopeId$3(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_5$3 = { style: { "font-size": "15px" } };
      const _hoisted_8$3 = { class: "fixed-stop-button" };
      const _hoisted_9$3 = { class: "push-records-container" };
      const _hoisted_10$3 = /* @__PURE__ */ _withScopeId$3(() => /* @__PURE__ */ createElementVNode("div", { class: "push-records-header" }, [
        /* @__PURE__ */ createElementVNode("span", null, "实时操作记录")
      ], -1));
      const _hoisted_11$3 = { class: "push-records-content" };
      const _hoisted_12$1 = { class: "record-time" };
      const _hoisted_13$1 = {
        key: 0,
        class: "no-records"
      };
      const _sfc_main$8 = /* @__PURE__ */ defineComponent({
        __name: "AiJob",
        setup(__props) {
          const platform = inject("$platform");
          const pushStatus = ref(PushStatus.NOT_START);
          const collectMode = ref(false);
          const actionLabel = computed(() => collectMode.value ? "收藏" : "投递");
          const getStartButtonText = () => collectMode.value ? "开始收藏" : "开始投递";
          const pushBtnType = ref("primary");
          const pushBtnText = ref(getStartButtonText());
          const logRecorder = new LogRecorder();
          const latestPushRecords = ref([]);
          const RECOMMEND_LOOP_RELOAD_KEY = "ai-job-recommend-loop-reload";
          const RECOMMEND_LOOP_TTL_MS = 5 * 60 * 1e3;
          const RECOMMEND_LOOP_RESUME_MAX_ATTEMPTS = 15;
          const RECOMMEND_LOOP_RESUME_INTERVAL_MS = 1200;
          let recordsUpdateTimer = null;
          let loginStore = LoginStore();
          let pushResultCounter = pushResultCount();
          const userStore = UserStore();
          const isRecommendSalaryLoopPage = () => {
            const href = String((Tools.window == null ? void 0 : Tools.window.location) ? Tools.window.location.href : location.href || "");
            try {
              const url = new URL(href);
              return url.pathname.includes("/web/geek/jobs") && url.searchParams.get("salary") === "406";
            } catch (_e) {
              return href.includes("/web/geek/jobs") && href.includes("salary=406");
            }
          };
          const normalizeText = (text) => `${text || ""}`.replace(/\s+/g, "");
          const isOtherJobsShenzhenText = (text) => {
            const normalized = normalizeText(text);
            return normalized.includes("其他职位(深圳)") || normalized.includes("其他职位（深圳）") || normalized.includes("其他职位") && normalized.includes("深圳");
          };
          const getOtherJobsShenzhenEntry = () => {
            const selectors = [
              "a.expect-item.has-tooltip",
              "a.expect-item",
              ".expect-list a"
            ];
            for (const selector of selectors) {
              const nodes = Array.from(document.querySelectorAll(selector));
              const hit = nodes.find((node) => isOtherJobsShenzhenText(node.textContent || node.innerText || ""));
              if (hit) {
                return hit;
              }
            }
            const textNodes = Array.from(document.querySelectorAll(".text-content"));
            const textHit = textNodes.find((node) => isOtherJobsShenzhenText(node.textContent || node.innerText || ""));
            if (textHit) {
              return textHit.closest("a.expect-item") || textHit;
            }
            return null;
          };
          const isOtherJobsShenzhenLikelyActive = () => {
            const activeEntries = Array.from(
              document.querySelectorAll(".expect-item.active, .expect-item.cur, .expect-item.selected, .expect-item.current, .expect-item.on")
            );
            if (activeEntries.some((entry) => isOtherJobsShenzhenText(entry.textContent || entry.innerText || ""))) {
              return true;
            }
            const activeTextEntries = Array.from(
              document.querySelectorAll(".expect-item .text-content.active, .expect-item .text-content.cur, .expect-item .text-content.selected")
            );
            return activeTextEntries.some((entry) => isOtherJobsShenzhenText(entry.textContent || entry.innerText || ""));
          };
          const triggerElementClick = (el) => {
            if (!el)
              return;
            if (typeof el.click === "function") {
              el.click();
            }
            el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
          };
          const alignOtherJobsShenzhen = async () => {
            if (!isRecommendSalaryLoopPage()) {
              return false;
            }
            const maxAttempts = 10;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              if (isOtherJobsShenzhenLikelyActive()) {
                return true;
              }
              const entry = getOtherJobsShenzhenEntry();
              if (!entry) {
                await Tools.sleep(600);
                continue;
              }
              triggerElementClick(entry);
              await Tools.sleep(900);
            }
            return isOtherJobsShenzhenLikelyActive();
          };
          const shouldEnableRecommendLoop = () => {
            return !!(userStore == null ? void 0 : userStore.user) && !!userStore.user.preference.imE && !collectMode.value && isRecommendSalaryLoopPage();
          };
          const getRecommendLoopTargetUrl = () => {
            const href = String((Tools.window == null ? void 0 : Tools.window.location) ? Tools.window.location.href : location.href || "");
            try {
              const url = new URL(href);
              return `${url.origin}/web/geek/jobs?salary=406`;
            } catch (_e) {
              return "https://www.zhipin.com/web/geek/jobs?salary=406";
            }
          };
          const markRecommendLoopReload = () => {
            const payload = {
              ts: Date.now(),
              mode: collectMode.value ? "collect" : "push",
              targetUrl: getRecommendLoopTargetUrl(),
              preferOtherShenzhen: true
            };
            localStorage.setItem(RECOMMEND_LOOP_RELOAD_KEY, JSON.stringify(payload));
          };
          const readRecommendLoopReload = () => {
            const raw = localStorage.getItem(RECOMMEND_LOOP_RELOAD_KEY);
            if (!raw)
              return null;
            try {
              const payload = JSON.parse(raw);
              if (!payload || !payload.ts || Date.now() - Number(payload.ts) > RECOMMEND_LOOP_TTL_MS) {
                localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
                return null;
              }
              return payload;
            } catch (_e) {
              localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
              return null;
            }
          };
          const clearRecommendLoopReload = () => {
            localStorage.removeItem(RECOMMEND_LOOP_RELOAD_KEY);
          };
          const tryAutoResumeRecommendLoop = async () => {
            const payload = readRecommendLoopReload();
            if (!payload) {
              return;
            }
            const jumpUrl = payload.targetUrl || getRecommendLoopTargetUrl();
            for (let attempt = 1; attempt <= RECOMMEND_LOOP_RESUME_MAX_ATTEMPTS; attempt++) {
              const latestPayload = readRecommendLoopReload();
              if (!latestPayload) {
                return;
              }
              if (!isRecommendSalaryLoopPage()) {
                if ((Tools.window == null ? void 0 : Tools.window.location) && typeof Tools.window.location.assign === "function") {
                  Tools.window.location.assign(jumpUrl);
                } else {
                  window.location.href = jumpUrl;
                }
                return;
              }
              collectMode.value = latestPayload.mode === "collect";
              if (latestPayload.preferOtherShenzhen) {
                await alignOtherJobsShenzhen();
              }
              if (pushStatus.value !== PushStatus.PUSHING) {
                const started = await startPush({ silent: true });
                if (started) {
                  clearRecommendLoopReload();
                  showAppMessage({
                    message: "推荐页无限循环：页面已刷新，已切换到其他职位(深圳)并继续运行",
                    type: "info",
                    duration: 2e3
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
            if ((Tools.window == null ? void 0 : Tools.window.location) && typeof Tools.window.location.assign === "function") {
              Tools.window.location.assign(jumpUrl);
            } else {
              window.location.href = jumpUrl;
            }
          };
          const updateLatestPushRecords = () => {
            const allLogs = logRecorder.getLogs(1, logRecorder.getLogCount());
            const pushLogs = allLogs.filter(
              (log) => log.message.toLowerCase().includes("投递") || log.message.toLowerCase().includes("收藏") || log.message.toLowerCase().includes("下一页") || log.message.toLowerCase().includes("工作")
            );
            latestPushRecords.value = pushLogs.slice(-10);
          };
          const getRecordLevelClass = (level) => {
            switch (level.toLowerCase()) {
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
          const handlerPush = () => {
            switch (pushStatus.value) {
              case PushStatus.NOT_START:
                startPush();
                break;
              case PushStatus.PUSHING:
                pausePush();
                break;
              case PushStatus.PAUSE:
                startPush();
                break;
            }
          };
          const handlerFixedStopPush = () => {
            pausePush();
            scrollToTop();
          };
          const selfDefPushCountLimit = ref(platform.selfDefPushCountLimit);
          const selfDefPushCountLimitChange = (val) => {
            platform.selfDefPushCountLimit = val;
          };
          const mockPush = ref(false);
          const getDeliveryModeFlags = () => {
            const preference = (userStore == null ? void 0 : userStore.user) && userStore.user.preference ? userStore.user.preference : {};
            return {
              aiDeliveryJudgeEnabled: Tools.getAiDeliveryJudgeConfig(preference).enabled,
              traditionalDeliveryEnabled: normalizePreferenceBoolean(preference.traditionalDeliveryE, true)
            };
          };
          const ensurePreferenceLoadedForStart = (opts = { silent: false }) => {
            if (userStore.preferenceLoadStatus === "success") {
              return true;
            }
            const { aiDeliveryJudgeEnabled, traditionalDeliveryEnabled } = getDeliveryModeFlags();
            const aiOnlyMode = aiDeliveryJudgeEnabled && !traditionalDeliveryEnabled;
            if (userStore.preferenceLoadStatus === "loading") {
              if (!opts.silent) {
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
              if (!opts.silent) {
                showAppMessage({
                  message: "已按 AI 投递模式启动，投递设置将在后台同步",
                  type: "info",
                  duration: 2500
                });
              }
              return true;
            }
            if (!opts.silent) {
              showAppMessage({
                message: userStore.preferenceLoadStatus === "failed" ? "投递设置加载失败，正在重试加载，请稍后再启动" : "投递设置加载中，请稍后再启动",
                type: "warning",
                duration: 2500
              });
            }
            return false;
          };
          const startPush = async (opts = { silent: false }) => {
            if (!loginInterceptor()) {
              return false;
            }
            if (!ensurePreferenceLoadedForStart(opts)) {
              return false;
            }
            if (shouldEnableRecommendLoop()) {
              const aligned = await alignOtherJobsShenzhen();
              if (!aligned) {
                if (!opts.silent) {
                  showAppMessage({
                    message: "未定位到“其他职位(深圳)”入口，正在重新进入目标页",
                    type: "warning",
                    duration: 2500
                  });
                }
                const targetUrl = getRecommendLoopTargetUrl();
                if ((Tools.window == null ? void 0 : Tools.window.location) && typeof Tools.window.location.assign === "function") {
                  Tools.window.location.assign(targetUrl);
                } else {
                  window.location.href = targetUrl;
                }
                return false;
              }
            }
            platform.collectMode = collectMode.value;
            platform.pushMock = mockPush.value;
            pushStatus.value = PushStatus.PUSHING;
            pushBtnType.value = "warning";
            pushBtnText.value = `停止${actionLabel.value}`;
            startRecordsUpdate();
            let pushResultPromise = platform.startPush();
            pushResultPromise.then(() => {
              const shouldLoopRestart = pushStatus.value === PushStatus.PUSHING && shouldEnableRecommendLoop();
              if (shouldLoopRestart) {
                markRecommendLoopReload();
                showAppMessage({
                  message: "推荐页无限循环：本轮完成，正在刷新并自动继续投递",
                  type: "info",
                  duration: 2500
                });
                stopRecordsUpdate();
                setTimeout(() => {
                  const targetUrl = getRecommendLoopTargetUrl();
                  if ((Tools.window == null ? void 0 : Tools.window.location) && typeof Tools.window.location.assign === "function") {
                    Tools.window.location.assign(targetUrl);
                  } else {
                    window.location.href = targetUrl;
                  }
                }, 1200);
                return;
              }
              showAppMessage({
                message: `批量${actionLabel.value}完成`,
                type: "success",
                duration: 3e3
              });
              setTimeout(() => {
                pushStatus.value = PushStatus.PAUSE;
                pushBtnType.value = "primary";
                pushBtnText.value = getStartButtonText();
                stopRecordsUpdate();
              }, 200);
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
              duration: 2e3
            });
          };
          if (!loginStore.login && !loginStore.loginFailStatus) {
            logger$1.info("页面静默登录");
            silentlyLogin("").catch((_) => {
            });
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
            stopRecordsUpdate();
          });
          return (_ctx, _cache) => {
            const _component_el_text = ElText;
            const _component_el_input_number = ElInputNumber;
            const _component_el_switch = ElSwitch;
            const _component_el_button = ElButton;
            const _component_el_tooltip = ElTooltip;
            const _component_el_link = ElLink;
            const _component_el_icon = ElIcon;
            return openBlock(), createElementBlock(Fragment, null, [
              createElementVNode("div", { class: "aj-section" }, [
                createElementVNode("div", { class: "aj-section__title" }, "投递统计"),
                createElementVNode("div", { class: "aj-section__body aj-stats-row" }, [
                  createVNode(_component_el_text, {
                    size: "large",
                    class: "mx-1",
                    type: "primary"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(actionLabel.value) + "成功：" + toDisplayString(unref(pushResultCounter).successCount) + "    ", 1)
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_text, {
                    size: "large",
                    class: "mx-1",
                    type: "danger"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(actionLabel.value) + "失败：" + toDisplayString(unref(pushResultCounter).failCount) + "    ", 1)
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    type: "info",
                    size: "small",
                    plain: "",
                    onClick: handlerClearPushRecords
                  }, {
                    default: withCtx(() => [
                      createTextVNode("清理投递记录")
                    ]),
                    _: 1
                  })
                ])
              ]),
              createElementVNode("div", { class: "aj-section" }, [
                createElementVNode("div", { class: "aj-section__title" }, "投递设置"),
                createElementVNode("div", { class: "aj-section__body aj-settings-row" }, [
                  createElementVNode("span", { class: "aj-setting-item" }, [
                    createTextVNode("单次处理限制："),
                    createVNode(_component_el_input_number, {
                      modelValue: selfDefPushCountLimit.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selfDefPushCountLimit.value = $event),
                      min: -1,
                      max: 100,
                      size: "small",
                      onChange: selfDefPushCountLimitChange
                    }, null, 8, ["modelValue"])
                  ]),
                  !unref(isProdEnv)() ? createElementVNode("span", { class: "aj-setting-item" }, [
                    createTextVNode("MOCK投递 "),
                    createVNode(_component_el_switch, {
                      modelValue: mockPush.value,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => mockPush.value = $event)
                    }, null, 8, ["modelValue"])
                  ]) : createCommentVNode("", true),
                  createElementVNode("span", { class: "aj-setting-item" }, [
                    createTextVNode("按条件收藏 "),
                    createVNode(_component_el_switch, {
                      modelValue: collectMode.value,
                      "onUpdate:modelValue": ($event) => collectMode.value = $event,
                      "active-text": "开",
                      "inactive-text": "关",
                      "inline-prompt": "",
                      style: { "--el-switch-on-color": "#67c23a", "--el-switch-off-color": "#dcdfe6" }
                    }, null, 8, ["modelValue"])
                  ]),
                  createElementVNode("span", { class: "aj-setting-item" }, [
                    createTextVNode("推荐页无限循环 "),
                    createVNode(_component_el_switch, {
                      modelValue: userStore.user.preference.imE,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => userStore.user.preference.imE = $event),
                      "active-text": "开",
                      "inactive-text": "关",
                      "inline-prompt": "",
                      style: { "--el-switch-on-color": "#409eff", "--el-switch-off-color": "#dcdfe6" }
                    }, null, 8, ["modelValue"])
                  ])
                ])
              ]),
              createElementVNode("div", { class: "aj-section" }, [
                createElementVNode("div", { class: "aj-section__title" }, "操作"),
                createElementVNode("div", { class: "aj-section__body aj-action-row" }, [
                  createVNode(_component_el_tooltip, {
                    effect: "dark",
                    "raw-content": "",
                    content: "\r\n    先通过Boss的筛选功能圈选你的意向岗位<p/><span style='color:red;'>在【传统投递】Tab 中设置</span><br/>您的投递设置，用于精准投递岗位\r\n    ",
                    placement: "bottom"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_button, {
                        icon: unref(Promotion),
                        type: pushBtnType.value,
                        onClick: handlerPush
                      }, {
                        default: withCtx(() => [
                          createElementVNode("p", _hoisted_5$3, toDisplayString(pushBtnText.value), 1)
                        ]),
                        _: 1
                      }, 8, ["icon", "type"])
                    ]),
                    _: 1
                  }),
                  createCommentVNode("", true)
                ])
              ]),
              withDirectives(createElementVNode("div", _hoisted_8$3, [
                createElementVNode("div", _hoisted_9$3, [
                  _hoisted_10$3,
                  createElementVNode("div", _hoisted_11$3, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(latestPushRecords.value, (record, index) => {
                      return openBlock(), createElementBlock("div", {
                        key: index,
                        class: "push-record-item"
                      }, [
                        createElementVNode("span", _hoisted_12$1, toDisplayString(record.timestamp), 1),
                        createElementVNode("span", {
                          class: normalizeClass(["record-message", getRecordLevelClass(record.level)])
                        }, toDisplayString(record.message), 3)
                      ]);
                    }), 128)),
                    latestPushRecords.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_13$1, " 暂无操作记录 ")) : createCommentVNode("", true)
                  ])
                ]),
                createVNode(_component_el_button, {
                  type: "warning",
                  size: "large",
                  onClick: handlerFixedStopPush
                }, {
                  default: withCtx(() => [
                    createVNode(_component_el_icon, null, {
                      default: withCtx(() => [
                        createVNode(unref(CircleCloseFilled))
                      ]),
                      _: 1
                    }),
                    createTextVNode(" 停止" + toDisplayString(actionLabel.value) + " ", 1)
                  ]),
                  _: 1
                })
              ], 512), [
                [vShow, pushStatus.value === unref(PushStatus).PUSHING]
              ]),
              createCommentVNode("", true)
            ], 64);
          };
        }
      });

const RenderComponent = _sfc_main$8;
</script>

<template>
  <div>
    <RenderComponent />
  </div>
</template>

<style scoped>
:deep(.fixed-stop-button){position:fixed;right:80px;bottom:80px;z-index:9999;background:#fffffff2;padding:8px;border-radius:8px;box-shadow:0 4px 12px #0003;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.3)}
:deep(.fixed-stop-button:hover){background:#fff;box-shadow:0 6px 16px #0000004d}
:deep(.push-records-container){margin-bottom:12px;background:#ffffffe6;border-radius:6px;border:1px solid rgba(0,0,0,.1);overflow:hidden;max-width:400px}
:deep(.push-records-header){background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 12px;font-size:14px;font-weight:500;text-align:center}
:deep(.push-records-content){max-height:200px;overflow-y:auto;padding:8px}
:deep(.push-record-item){display:flex;flex-direction:column;margin-bottom:8px;padding:6px 8px;background:#f8fafccc;border-radius:4px;border-left:3px solid #e2e8f0;font-size:12px;line-height:1.4}
:deep(.push-record-item:last-child){margin-bottom:0}
:deep(.record-time){color:#64748b;font-size:11px;margin-bottom:2px}
:deep(.record-message){color:#334155;word-break:break-word}
:deep(.record-error){color:#dc2626;border-left-color:#dc2626}
:deep(.record-warn){color:#d97706;border-left-color:#d97706}
:deep(.record-info){color:#2563eb;border-left-color:#2563eb}
:deep(.record-debug){color:#059669;border-left-color:#059669}
:deep(.record-trace){color:#7c3aed;border-left-color:#7c3aed}
:deep(.no-records){text-align:center;color:#94a3b8;font-size:12px;padding:20px 0}
:deep(.push-records-content::-webkit-scrollbar){width:4px}
:deep(.push-records-content::-webkit-scrollbar-track){background:#0000000d;border-radius:2px}
:deep(.push-records-content::-webkit-scrollbar-thumb){background:#0003;border-radius:2px}
:deep(.push-records-content::-webkit-scrollbar-thumb:hover){background:#0000004d}
:deep(.aj-section){margin-bottom:12px;padding:10px 12px;background:#fff;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
:deep(.aj-section__title){font-size:13px;font-weight:600;color:#303133;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ebeef5}
:deep(.aj-section__body){display:flex;flex-wrap:wrap;align-items:center;gap:8px}
:deep(.aj-stats-row .mx-1){margin-right:6px}
:deep(.aj-settings-row){gap:12px}
:deep(.aj-setting-item){display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#606266}
:deep(.aj-action-row){gap:8px}
:deep(.cleaner-section){margin-top:0;padding:10px 12px;background:#fff;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
:deep(.cleaner-section__title){font-size:13px;font-weight:600;color:#303133;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ebeef5}
</style>
