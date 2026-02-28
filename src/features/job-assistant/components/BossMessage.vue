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
import { ProductStore } from "@/state/product";
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

const _withScopeId = (n) => (pushScopeId("data-v-251fd5d8"), n = n(), popScopeId(), n);
      const _hoisted_1 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_2 = {
        key: 0,
        class: "batch-send-float"
      };
      const _hoisted_3 = {
        class: "dialog-footer",
        style: { "margin-top": "10px", "text-align": "right" }
      };
      const _sfc_main = /* @__PURE__ */ defineComponent({
        __name: "BossMessage",
        setup(__props) {
          const batchSendDialogVisible = ref(false);
          const batchMessageText = ref("");
          const cleanupBatchUI = () => {
            const checkboxes = document.querySelectorAll(".batch-checkbox");
            checkboxes.forEach((checkbox) => checkbox.remove());
            const selectedElements = document.querySelectorAll(".batch-send-item");
            selectedElements.forEach((element) => element.classList.remove("batch-send-item"));
          };
          const onCancel = () => {
            batchSendDialogVisible.value = false;
            cleanupBatchUI();
            batchMessageText.value = "";
          };
          const checkAndCreateBatchSendButton = () => {
            const labelList = document.querySelector(".label-list");
            if (!labelList)
              return;
            const existingButton = labelList.querySelector(".batch-send-btn");
            if (existingButton)
              return;
            const batchSendButton = document.createElement("button");
            batchSendButton.className = "batch-send-btn";
            batchSendButton.innerHTML = "批量发送消息";
            batchSendButton.style.cssText = `
        margin: 10px 0px;
        padding: 8px 8px;
        background-color: #6ead34;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
            batchSendButton.addEventListener("click", () => {
              addCheckboxesToItems();
              batchSendDialogVisible.value = true;
            });
            labelList.appendChild(batchSendButton);
          };
          const addCheckboxesToItems = () => {
            const items = document.querySelectorAll(".friend-content-warp");
            items.forEach((item) => {
              if (item.querySelector(".batch-checkbox"))
                return;
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.className = "batch-checkbox";
              checkbox.style.cssText = `
            margin-right: 8px;
            transform: scale(1.2);
        `;
              checkbox.addEventListener("click", (e) => {
                e.stopPropagation();
              });
              checkbox.addEventListener("change", (e) => {
                const target = e.target;
                e.stopPropagation();
                if (target.checked) {
                  item.classList.add("batch-send-item");
                } else {
                  item.classList.remove("batch-send-item");
                }
              });
              let firstElementChild = item.firstElementChild;
              firstElementChild.insertBefore(checkbox, firstElementChild.firstChild);
            });
          };
          const sendBatchMessage = () => {
            if (!batchMessageText.value.trim()) {
              ElMessage({
                type: "warning",
                message: "请输入消息内容"
              });
              return;
            }
            const selectedItems = document.querySelectorAll(".friend-content-warp.batch-send-item");
            if (selectedItems.length === 0) {
              ElMessage({
                type: "warning",
                message: "请至少选择一个联系人"
              });
              return;
            }
            selectedItems.forEach((item) => {
              const vueInstance = item.__vue__;
              if (vueInstance && vueInstance.source) {
                const to_uid = vueInstance.source.uid;
                const to_name = vueInstance.source.encryptBossId;
                if (to_uid && to_name) {
                  const message = new Message({
                    form_uid: Tools.window._PAGE.uid.toString(),
                    to_uid: to_uid.toString(),
                    to_name,
                    content: batchMessageText.value,
                    image: void 0
                  });
                  message.send();
                }
              }
            });
            ElMessage({
              duration: 3e3,
              type: "success",
              message: `已发送消息给 ${selectedItems.length} 个联系人; 刷新页面查看结果`
            });
            batchMessageText.value = "";
            batchSendDialogVisible.value = false;
            cleanupBatchUI();
          };
          setInterval(() => {
            checkAndCreateBatchSendButton();
          }, 1e3);
          const handlerClick = () => {
            var _a, _b, _c;
            const element = document.querySelector(".friend-content.selected");
            const encryptJobId = (_c = (_b = (_a = element == null ? void 0 : element.parentElement) == null ? void 0 : _a.__vue__) == null ? void 0 : _b.source) == null ? void 0 : _c.encryptJobId;
            if (!encryptJobId) {
              ElMessage({
                type: "info",
                message: "请先进入聊天窗口"
              });
              return;
            }
            const jobKey = BossOption.buildJobKey({ encryptJobId });
            AiPower.updateAskStatus(jobKey, false).then((_) => {
              ElMessage({
                type: "success",
                message: "已重新触发AI代聊"
              });
            });
          };
          return (_ctx, _cache) => {
            const _component_el_button = ElButton;
            const _component_el_input = ElInput;
            return openBlock(), createElementBlock(Fragment, null, [
              _hoisted_1,
              createVNode(_component_el_button, {
                style: { "margin-left": "10px" },
                type: "success",
                onClick: handlerClick
              }, {
                default: withCtx(() => [
                  createTextVNode("重启当前会话AI代聊")
                ]),
                _: 1
              }),
              batchSendDialogVisible.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
                createVNode(_component_el_input, {
                  modelValue: batchMessageText.value,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => batchMessageText.value = $event),
                  type: "textarea",
                  rows: 4,
                  placeholder: "请输入要发送的消息内容"
                }, null, 8, ["modelValue"]),
                createElementVNode("div", _hoisted_3, [
                  createVNode(_component_el_button, { onClick: onCancel }, {
                    default: withCtx(() => [
                      createTextVNode("取消")
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    type: "primary",
                    onClick: sendBatchMessage
                  }, {
                    default: withCtx(() => [
                      createTextVNode("发送")
                    ]),
                    _: 1
                  })
                ])
              ])) : createCommentVNode("", true)
            ], 64);
          };
        }
      });

const RenderComponent = _sfc_main;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
:deep(.batch-send-btn:hover){background-color:#337ecc!important}
:deep(.batch-checkbox){margin-right:8px;transform:scale(1.2)}
:deep(.batch-send-item){background-color:#f0f9ff!important;border:2px solid #409eff!important}
:deep(.batch-send-float){position:fixed;right:24px;bottom:24px;width:480px;padding:16px;background:#fff;box-shadow:0 6px 16px #00000026;border-radius:8px;z-index:9999}
</style>
