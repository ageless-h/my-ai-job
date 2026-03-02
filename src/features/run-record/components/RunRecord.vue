<script setup lang="ts">
// @ts-nocheck
import * as Vue from "vue";
import * as ElementPlus from "element-plus";
import * as Icons from "@element-plus/icons-vue";
import axios from "axios";
import { request, ElMessage, isProdEnv } from "@/core/http/request";
import { Tools } from "@/shared/utils/tools";
import { UserStore } from "@/state/user";
import { LoginStore } from "@/state/login";
import { pushResultCount } from "@/state/push-result";
import { LogRecorder, PushStatus } from "@/core/engine/push-engine";
import { loginInterceptor, silentlyLogin, fetchWithGM_request } from "@/core/auth/auth";
import { AiPower } from "@/core/ai/ai-power";
import { Message } from "@/core/protocol/message";

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
  ElTableColumn,
  ElTag,
  ElTable,
  ElInput,
  ElLink,
  ElImage,
  ElDialog,
  ElInputNumber,
  ElSwitch,
  ElTooltip,
  ElEmpty,
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
  ElNotification,
  vLoading
} = ElementAny;

const {
  CircleCloseFilled,
  Upload,
  Promotion,
  Collection,
  Service,
  Shop,
  Wallet,
  PriceTag
} = IconsAny;

const GlobalAny = globalThis as any;
const logger$1 = GlobalAny.logger$1 || console;
const SSEClient =
  GlobalAny.SSEClient ||
  class {
    constructor(..._args: any[]) {}
    addOnMsgCallback(..._args: any[]) {}
    addEventListener(..._args: any[]) {}
    start(..._args: any[]) {}
    close(..._args: any[]) {}
    eventSource: any;
  };
const BossOption = GlobalAny.BossOption || { buildJobKey: (_data: any) => "" };

const _sfc_main$6 = /* @__PURE__ */ defineComponent({
        __name: "RunRecord",
        setup(__props) {
          const logRecorder = new LogRecorder();
          const logs = ref([]);
          const currentPage = ref(1);
          const pageSize = ref(10);
          const totalLogs = ref(0);
          const runRecordRoot = ref(null);
          const isCompactPagination = ref(false);
          let paginationResizeObserver = null;
          const filter = ref({
            timeRange: [],
            // 时间范围，数组：[开始时间, 结束时间]
            level: "",
            // 日志级别
            keyword: ""
            // 日志内容关键字
          });
          const fetchLogs = () => {
            var _a;
            let allLogs = logRecorder.getLogs(1, logRecorder.getLogCount());
            if (((_a = filter.value.timeRange) == null ? void 0 : _a.length) === 2) {
              const [start, end] = filter.value.timeRange.map(
                (time) => time.toTimeString().slice(0, 6) + "00"
                // 转为 'HH:mm' 格式字符串
              );
              allLogs = allLogs.filter((log) => {
                const logTime = log.timestamp;
                return logTime >= start && logTime <= end;
              });
            }
            if (filter.value.level) {
              allLogs = allLogs.filter((log) => log.level === filter.value.level);
            }
            if (filter.value.keyword) {
              const keyword = filter.value.keyword.toLowerCase();
              allLogs = allLogs.filter((log) => log.message.toLowerCase().includes(keyword));
            }
            totalLogs.value = allLogs.length;
            const startIndex = (currentPage.value - 1) * pageSize.value;
            logs.value = allLogs.slice(startIndex, startIndex + pageSize.value).map((log) => {
              const aiInfo = parseAiJudgeInfo(log.message);
              return {
                ...log,
                aiDecision: aiInfo.decision,
                aiReason: aiInfo.reason
              };
            });
          };
          const parseAiJudgeInfo = (message) => {
            const text = `${message || ""}`;
            const normalizedText = text.replace(/\s+/g, " ").trim();
            if (!normalizedText) {
              return { decision: "", reason: "" };
            }

            let decision = "";
            if (normalizedText.includes("AI投递判断通过")) {
              decision = "通过";
            } else if (normalizedText.includes("AI投递判断不通过")) {
              decision = "不通过";
            } else if (normalizedText.includes("AI判定结果不可解析")) {
              decision = "不可解析";
            } else if (normalizedText.includes("AI投递判断失败")) {
              decision = "失败";
            } else if (normalizedText.includes("投递成功") && normalizedText.includes("AI理由")) {
              decision = "已投递";
            }

            let reason = "";
            const reasonWithLabel = normalizedText.match(/AI理由[:：]\s*(.+)$/);
            if (reasonWithLabel && reasonWithLabel[1]) {
              reason = reasonWithLabel[1].trim();
            }

            if (!reason) {
              const reasonWithKey = normalizedText.match(/\breason=\s*(.+)$/i);
              if (reasonWithKey && reasonWithKey[1]) {
                reason = reasonWithKey[1].trim();
              }
            }

            if (reason.length > 180) {
              reason = `${reason.slice(0, 180)}...`;
            }

            return { decision, reason };
          };
          const handlePageChange = (page) => {
            currentPage.value = page;
            fetchLogs();
          };
          watch(filter, () => {
            currentPage.value = 1;
            fetchLogs();
          }, { deep: true });
          const clearLogs = () => {
            logRecorder.clearLogs();
            fetchLogs();
          };
          const updatePaginationMode = () => {
            const width = runRecordRoot.value?.clientWidth || 0;
            isCompactPagination.value = width > 0 && width < 440;
          };
          onMounted(() => {
            fetchLogs();
            nextTick(() => {
              updatePaginationMode();
              if (typeof ResizeObserver === "undefined" || !runRecordRoot.value) {
                return;
              }
              paginationResizeObserver = new ResizeObserver(() => {
                updatePaginationMode();
              });
              paginationResizeObserver.observe(runRecordRoot.value);
            });
          });
          onBeforeUnmount(() => {
            if (!paginationResizeObserver) {
              return;
            }
            paginationResizeObserver.disconnect();
            paginationResizeObserver = null;
          });
          return (_ctx, _cache) => {
            const _component_el_button = ElButton;
            const _component_el_col = ElCol;
            const _component_el_time_picker = ElTimePicker;
            const _component_el_option = ElOption;
            const _component_el_select = ElSelect;
            const _component_el_input = ElInput;
            const _component_el_row = ElRow;
            const _component_el_table_column = ElTableColumn;
            const _component_el_empty = ElEmpty;
            const _component_el_table = ElTable;
            const _component_el_pagination = ElPagination;
            return openBlock(), createElementBlock("div", {
              ref_key: "runRecordRoot",
              ref: runRecordRoot,
              class: "run-record-root"
            }, [
              createVNode(_component_el_row, {
                gutter: 20,
                class: "filter-bar"
              }, {
                default: withCtx(() => [
                  createVNode(_component_el_col, { span: 2 }, {
                    default: withCtx(() => [
                      createVNode(_component_el_button, {
                        type: "warning",
                        onClick: clearLogs
                      }, {
                        default: withCtx(() => [
                          createTextVNode("清空日志")
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_col, { span: 8 }, {
                    default: withCtx(() => [
                      createVNode(_component_el_time_picker, {
                        modelValue: filter.value.timeRange,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => filter.value.timeRange = $event),
                        "is-range": "",
                        "start-placeholder": "开始时间",
                        "end-placeholder": "结束时间",
                        format: "HH:mm",
                        clearable: "",
                        style: { "width": "100%" }
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_col, { span: 6 }, {
                    default: withCtx(() => [
                      createVNode(_component_el_select, {
                        modelValue: filter.value.level,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => filter.value.level = $event),
                        placeholder: "请选择日志级别",
                        style: { "width": "100%" }
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_option, {
                            label: "全部",
                            value: ""
                          }),
                          createVNode(_component_el_option, {
                            label: "Error",
                            value: "error"
                          }),
                          createVNode(_component_el_option, {
                            label: "Warn",
                            value: "warn"
                          }),
                          createVNode(_component_el_option, {
                            label: "Info",
                            value: "info"
                          }),
                          createVNode(_component_el_option, {
                            label: "Debug",
                            value: "debug"
                          }),
                          createVNode(_component_el_option, {
                            label: "Trace",
                            value: "trace"
                          })
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_col, { span: 8 }, {
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        modelValue: filter.value.keyword,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => filter.value.keyword = $event),
                        placeholder: "请输入日志内容",
                        clearable: "",
                        style: { "width": "100%" }
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              createVNode(_component_el_table, {
                data: logs.value,
                style: { "width": "100%", "min-height": "440px" }
              }, {
                empty: withCtx(() => [
                  createVNode(_component_el_empty, { description: "暂无日志数据" })
                ]),
                default: withCtx(() => [
                  createVNode(_component_el_table_column, {
                    prop: "timestamp",
                    label: "时间",
                    width: "140"
                  }),
                  createVNode(_component_el_table_column, {
                    prop: "level",
                    label: "级别",
                    width: "100"
                  }),
                  createVNode(_component_el_table_column, {
                    prop: "aiDecision",
                    label: "AI判定",
                    width: "110"
                  }),
                  createVNode(_component_el_table_column, {
                    prop: "aiReason",
                    label: "AI理由",
                    width: "220",
                    "show-overflow-tooltip": ""
                  }),
                  createVNode(_component_el_table_column, {
                    prop: "message",
                    label: "内容"
                  })
                ]),
                _: 1
              }, 8, ["data"]),
              createVNode(_component_el_pagination, {
                onCurrentChange: handlePageChange,
                "current-page": currentPage.value,
                "page-size": pageSize.value,
                total: totalLogs.value,
                class: normalizeClass(["run-record-pagination", { "is-compact": isCompactPagination.value }]),
                small: "",
                "pager-count": 5,
                background: "",
                layout: isCompactPagination.value ? "prev, next" : "prev, pager, next"
              }, null, 8, ["current-page", "page-size", "total", "class", "layout"])
            ], 512);
          };
        }
      });

const RenderComponent = _sfc_main$6;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
.run-record-root{
  width:100%;
  min-width:0;
}
:deep(.filter-bar){margin-bottom:20px}
:deep(.run-record-pagination){
  display:flex !important;
  width:100%;
  box-sizing:border-box;
  padding:0 4px;
  justify-content:center;
  align-items:center;
  flex-wrap:wrap;
  column-gap:6px;
  row-gap:8px;
  margin-top:12px;
  white-space:normal;
  height:auto;
}
:deep(.run-record-pagination .el-pager){
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:4px;
  margin:0;
  max-width:100%;
}
:deep(.run-record-pagination .btn-prev),
:deep(.run-record-pagination .btn-next),
:deep(.run-record-pagination .el-pager li){
  min-width:24px;
  margin:0 !important;
}
:deep(.run-record-pagination.is-compact){
  justify-content:space-between;
}
</style>
