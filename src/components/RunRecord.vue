<script setup lang="ts">
// @ts-nocheck
import * as Vue from "vue";
import * as ElementPlus from "element-plus";
import * as Icons from "@element-plus/icons-vue";
import axios from "axios";
import { request, ElMessage, isProdEnv } from "@/services/request";
import { Tools } from "@/utils/tools";
import { UserStore } from "@/stores/user";
import { LoginStore } from "@/stores/login";
import { pushResultCount } from "@/stores/push-result";
import { ProductStore } from "@/stores/product";
import { LogRecorder, PushStatus } from "@/services/push-engine";
import { loginInterceptor, silentlyLogin, fetchWithGM_request } from "@/services/auth";
import { AiPower } from "@/services/ai-power";
import { Message } from "@/protocol/message";
import { TampermonkeyApi } from "@/utils/tampermonkey";

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
            logs.value = allLogs.slice(startIndex, startIndex + pageSize.value);
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
          // === 趋势图数据 ===
          const trendData = ref([]);
          const loadTrendData = () => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const dateStr = `${y}-${m}-${day}`;
              const label = `${m}-${day}`;
              const success = TampermonkeyApi.GmGetValue(`pushSuccessCount:${dateStr}`, 0);
              const fail = TampermonkeyApi.GmGetValue(`pushFailCount:${dateStr}`, 0);
              days.push({ date: dateStr, label, success, fail });
            }
            trendData.value = days;
          };
          const trendMax = computed(() => {
            let max = 0;
            trendData.value.forEach((d) => { if (d.success > max) max = d.success; if (d.fail > max) max = d.fail; });
            return max || 1;
          });
          onMounted(() => {
            fetchLogs();
            loadTrendData();
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
            return openBlock(), createElementBlock("div", null, [
              // === 趋势图 SVG ===
              createElementVNode("div", { class: "trend-chart-wrapper" }, [
                createElementVNode("div", { class: "trend-chart-title" }, "最近 7 天投递趋势"),
                (openBlock(), createElementBlock("svg", {
                  viewBox: "0 0 420 140",
                  class: "trend-chart-svg"
                }, [
                  // Y轴网格线
                  ...[0, 0.25, 0.5, 0.75, 1].map((ratio) =>
                    createElementVNode("line", {
                      x1: 40, y1: 10 + (1 - ratio) * 100,
                      x2: 410, y2: 10 + (1 - ratio) * 100,
                      stroke: "#eee", "stroke-width": 1
                    })
                  ),
                  // 柱状图
                  ...trendData.value.flatMap((d, i) => {
                    const barW = 16;
                    const gap = 50;
                    const x = 55 + i * gap;
                    const maxH = 100;
                    const sH = Math.round((d.success / trendMax.value) * maxH);
                    const fH = Math.round((d.fail / trendMax.value) * maxH);
                    return [
                      createElementVNode("rect", {
                        x: x, y: 110 - sH, width: barW, height: Math.max(sH, 0),
                        fill: "#67c23a", rx: 2
                      }),
                      createElementVNode("rect", {
                        x: x + barW + 2, y: 110 - fH, width: barW, height: Math.max(fH, 0),
                        fill: "#f56c6c", rx: 2
                      }),
                      createElementVNode("text", {
                        x: x + barW, y: 128,
                        "text-anchor": "middle",
                        style: "font-size:10px;fill:#909399"
                      }, d.label)
                    ];
                  }),
                  // 图例
                  createElementVNode("rect", { x: 42, y: 132, width: 10, height: 6, fill: "#67c23a", rx: 1 }),
                  createElementVNode("text", { x: 55, y: 138, style: "font-size:9px;fill:#606266" }, "成功"),
                  createElementVNode("rect", { x: 82, y: 132, width: 10, height: 6, fill: "#f56c6c", rx: 1 }),
                  createElementVNode("text", { x: 95, y: 138, style: "font-size:9px;fill:#606266" }, "失败"),
                  // Y轴标签
                  createElementVNode("text", { x: 36, y: 14, "text-anchor": "end", style: "font-size:9px;fill:#909399" }, String(trendMax.value)),
                  createElementVNode("text", { x: 36, y: 114, "text-anchor": "end", style: "font-size:9px;fill:#909399" }, "0"),
                ])),
              ]),
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
                    width: "120"
                  }),
                  createVNode(_component_el_table_column, {
                    prop: "level",
                    label: "级别",
                    width: "100"
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
                background: "",
                layout: "prev, pager, next"
              }, null, 8, ["current-page", "page-size", "total"])
            ]);
          };
        }
      });

const RenderComponent = _sfc_main$6;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
:deep(.filter-bar){margin-bottom:20px}
:deep(.trend-chart-wrapper){margin-bottom:16px;padding:12px;background:#fafafa;border:1px solid #eee;border-radius:6px}
:deep(.trend-chart-title){font-size:13px;font-weight:600;color:#303133;margin-bottom:8px}
:deep(.trend-chart-svg){width:100%;max-width:420px;height:auto}
</style>
