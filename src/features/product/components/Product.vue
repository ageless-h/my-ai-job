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

const _withScopeId = (n) => (pushScopeId("data-v-5cadd0bd"), n = n(), popScopeId(), n);
      const _hoisted_1 = { class: "my-header" };
      const _hoisted_2 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_3 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("h3", null, "我的产品列表", -1));
      const _hoisted_4 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_5 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_6 = {
        type: "info",
        style: { "margin-top": "10px" }
      };
      const _hoisted_7 = { key: 0 };
      const _hoisted_8 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_9 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_10 = { style: { "padding-top": "10px", "min-width": "8%" } };
      const _hoisted_11 = { class: "demonstration" };
      const _hoisted_12 = { class: "demonstration" };
      const _hoisted_13 = { class: "demonstration" };
      const _hoisted_14 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("div", { class: "image-slot" }, "加载订单二维码失败；请稍后刷新重试", -1));
      const _hoisted_15 = { style: { "width": "80%" } };
      const _hoisted_16 = { class: "demonstration" };
      const _sfc_main$1 = /* @__PURE__ */ defineComponent({
        __name: "Product",
        setup(__props) {
          const productStore = ProductStore();
          const axios2 = inject("$axios");
          const productGroupLoading = ref(false);
          const buyProductList = ref([]);
          const showOtherProduct = ref(true);
          const orderGroup = ref([]);
          const payStatus = ref(false);
          const promotionCode = ref("");
          const lastPromotionCode = ref("");
          let pairList = [];
          const isExpired = (row) => {
            const currentTime = /* @__PURE__ */ new Date();
            const endTime = new Date(row.periodOfValidityEndTime);
            return currentTime > endTime;
          };
          const randomStyle = () => {
            const tagStyleArr = ["primary", "warning", "success", "danger"];
            let number = Math.floor(Math.random() * 4);
            return tagStyleArr[number];
          };
          const queryBuyProductList = async () => {
            let productResp = await axios2.post("/api/product/user/product/list");
            buyProductList.value = productResp.data.data;
          };
          const openProductDialog = async () => {
            await queryBuyProductList();
            if (buyProductList.value.length > 0) {
              return;
            }
            showOtherProduct.value = false;
            await showOrderGroup();
          };
          const showOrderGroup = async () => {
            if (!loginInterceptor()) {
              return;
            }
            productGroupLoading.value = true;
            let promotionCodeVar = promotionCode.value.trim();
            promotionCode.value = "";
            setTimeout(() => {
              showOtherProduct.value = true;
            }, 100);
            if (orderGroup.value.length < 1 || promotionCodeVar !== lastPromotionCode.value) {
              let orderGroupResp;
              try {
                orderGroupResp = await axios2.post("/api/pay/generate/order/group", { promotionCode: promotionCodeVar });
              } catch (e) {
                productGroupLoading.value = false;
                return;
              }
              if (orderGroupResp.data.code != 200) {
                ElMessage({
                  message: orderGroupResp.data.message,
                  type: "warning",
                  duration: 3e3
                });
                setTimeout(() => {
                  showOtherProduct.value = false;
                }, 100);
                productGroupLoading.value = false;
                return;
              }
              orderGroup.value = orderGroupResp.data.data;
              lastPromotionCode.value = promotionCodeVar;
              productGroupLoading.value = false;
              waitUsePay();
            }
            productGroupLoading.value = false;
          };
          const waitUsePay = () => {
            const sseClient = new SSEClient(axios2.defaults.baseURL + "api/sse/connect");
            sseClient.addOnMsgCallback((event) => {
              let data = event.data;
              if (data === "支付成功") {
                payStatus.value = true;
                orderGroup.value = [];
                queryBuyProductList();
                showOtherProduct.value = false;
                productStore.setShowProduct(false);
              }
            });
            sseClient.start();
            let count = 0;
            let interval = setInterval(() => {
              if (payStatus.value) {
                clearInterval(interval);
              }
              orderGroup.value.forEach((orderItem) => {
                axios2.get("/api/pay/searchOrder?outTradeNo=" + orderItem.orderId).then((resp) => {
                  if (resp.data.data === "TRADE_SUCCESS") {
                    payStatus.value = true;
                    orderGroup.value = [];
                    clearInterval(interval);
                  }
                  if (resp.data.data === "WAIT_BUYER_PAY") {
                    logger$1.debug("等待支付");
                  }
                  count++;
                  if (count >= 10) {
                    logger$1.warn("订单超时未支付");
                    clearInterval(interval);
                  }
                });
              });
            }, 3e4);
            let pair = {
              key: sseClient,
              value: interval
            };
            pairList.push(pair);
          };
          watch(
            () => productStore.showProduct,
            (newVal) => {
              if (newVal) {
                openProductDialog();
              } else {
                pairList.forEach((pair) => {
                  if (pair && pair.key instanceof SSEClient) {
                    pair.key.close();
                    clearInterval(pair.value);
                  }
                });
              }
            }
          );
          return (_ctx, _cache) => {
            const _component_el_text = ElText;
            const _component_el_icon = ElIcon;
            const _component_el_button = ElButton;
            const _component_el_table_column = ElTableColumn;
            const _component_el_tag = ElTag;
            const _component_el_table = ElTable;
            const _component_el_input = ElInput;
            const _component_el_link = ElLink;
            const _component_el_image = ElImage;
            const _component_el_dialog = ElDialog;
            return openBlock(), createBlock(_component_el_dialog, {
              modelValue: unref(productStore).showProduct,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(productStore).showProduct = $event),
              "show-close": false,
              width: "800"
            }, {
              header: withCtx(({ close }) => [
                createElementVNode("div", _hoisted_1, [
                  createVNode(_component_el_text, {
                    size: "large",
                    style: { "font-size": "20px" },
                    type: "info"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("产品列表")
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    type: "warning",
                    onClick: close
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_icon, { class: "el-icon--left" }, {
                        default: withCtx(() => [
                          createVNode(unref(CircleCloseFilled))
                        ]),
                        _: 1
                      }),
                      createTextVNode(" 关闭 ")
                    ]),
                    _: 2
                  }, 1032, ["onClick"])
                ]),
                withDirectives(createElementVNode("div", null, [
                  _hoisted_2,
                  _hoisted_3,
                  _hoisted_4,
                  withDirectives(createVNode(_component_el_table, {
                    data: buyProductList.value,
                    stripe: "",
                    style: { "width": "100%" }
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_table_column, {
                        prop: "productName",
                        label: "产品",
                        width: "180"
                      }, {
                        default: withCtx(({ row }) => [
                          createElementVNode("span", {
                            style: normalizeStyle({ textDecoration: isExpired(row) ? "line-through" : "none" })
                          }, toDisplayString(row.productName), 5)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "状态",
                        width: "100"
                      }, {
                        default: withCtx(({ row }) => [
                          createElementVNode("span", {
                            style: normalizeStyle({ color: isExpired(row) ? "red" : "green" })
                          }, toDisplayString(isExpired(row) ? "过期" : "正常"), 5)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "powerList",
                        label: "能力",
                        width: "180"
                      }, {
                        default: withCtx(({ row }) => [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(row.powerList, (power) => {
                            return openBlock(), createElementBlock("div", { key: power }, [
                              createVNode(_component_el_tag, {
                                effect: "dark",
                                type: randomStyle(),
                                size: "small"
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(power), 1)
                                ]),
                                _: 2
                              }, 1032, ["type"])
                            ]);
                          }), 128))
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "periodOfValidityStartTime",
                        label: "有效期开始时间"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "periodOfValidityEndTime",
                        label: "有效期结束时间"
                      })
                    ]),
                    _: 1
                  }, 8, ["data"]), [
                    [vShow, buyProductList.value.length > 0]
                  ]),
                  _hoisted_5
                ], 512), [
                  [vShow, buyProductList.value.length > 0]
                ]),
                createElementVNode("div", _hoisted_6, [
                  createVNode(_component_el_button, {
                    type: "danger",
                    icon: unref(Shop),
                    onClick: showOrderGroup,
                    loading: productGroupLoading.value
                  }, {
                    default: withCtx(() => [
                      createTextVNode(" 更多产品 ")
                    ]),
                    _: 1
                  }, 8, ["icon", "loading"]),
                  createVNode(_component_el_input, {
                    "suffix-icon": unref(Wallet),
                    modelValue: promotionCode.value,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => promotionCode.value = $event),
                    style: { "margin-left": "10px", "width": "240px" },
                    placeholder: "请输入您的优惠码"
                  }, null, 8, ["suffix-icon", "modelValue"]),
                  createVNode(_component_el_link, {
                    icon: unref(PriceTag),
                    type: "primary",
                    style: { "margin-left": "30px" },
                    target: "_blank",
                    href: "https://www.bilibili.com/video/BV1HKAyebESp"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("点击获取优惠码(评论区) ")
                    ]),
                    _: 1
                  }, 8, ["icon"])
                ]),
                showOtherProduct.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
                  _hoisted_8,
                  createElementVNode("p", null, [
                    createVNode(_component_el_text, {
                      class: "mx-1",
                      type: "danger"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("定价说明：")
                      ]),
                      _: 1
                    }),
                    createTextVNode(" 使用R1深度思考大模型时：首先，R1的价格更贵，深度思考的内容也会被记录token消耗。token消耗量巨大。同时由于boss的会话聊天机制，需要携带消息上下文调用。这也就意味着对话轮数越多，token消耗越多。按乘方的趋势增长。 ")
                  ]),
                  _hoisted_9,
                  (openBlock(true), createElementBlock(Fragment, null, renderList(orderGroup.value, (order) => {
                    return openBlock(), createElementBlock("div", {
                      key: order,
                      style: normalizeStyle([{ "display": "flex" }, "width: " + 1 / orderGroup.value.length]),
                      class: "block"
                    }, [
                      createElementVNode("div", _hoisted_10, [
                        createElementVNode("p", _hoisted_11, [
                          createVNode(_component_el_text, {
                            size: "large",
                            type: "primary"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(order.title), 1)
                            ]),
                            _: 2
                          }, 1024)
                        ]),
                        createElementVNode("p", _hoisted_12, [
                          createVNode(_component_el_text, {
                            size: "large",
                            type: "success"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(order.validDays) + "天", 1)
                            ]),
                            _: 2
                          }, 1024)
                        ]),
                        createElementVNode("p", _hoisted_13, [
                          createVNode(_component_el_text, {
                            size: "large",
                            type: "danger"
                          }, {
                            default: withCtx(() => [
                              createTextVNode("￥ " + toDisplayString(order.totalAmount), 1)
                            ]),
                            _: 2
                          }, 1024)
                        ])
                      ]),
                      createVNode(_component_el_image, {
                        style: { "width": "100px", "height": "100px" },
                        src: "data:image/png;base64," + order.qrCodeBase64,
                        fit: "fill"
                      }, {
                        error: withCtx(() => [
                          _hoisted_14
                        ]),
                        _: 2
                      }, 1032, ["src"]),
                      createElementVNode("div", _hoisted_15, [
                        createElementVNode("div", null, [
                          createTextVNode(" 提供能力: "),
                          (openBlock(true), createElementBlock(Fragment, null, renderList(order.tags, (tag) => {
                            return openBlock(), createBlock(_component_el_tag, {
                              style: { "margin": "10px" },
                              key: tag,
                              type: randomStyle(),
                              size: "large",
                              effect: "light"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(tag), 1)
                              ]),
                              _: 2
                            }, 1032, ["type"]);
                          }), 128))
                        ]),
                        createElementVNode("div", null, [
                          createElementVNode("span", _hoisted_16, toDisplayString(order.desc), 1)
                        ])
                      ])
                    ], 4);
                  }), 128))
                ])) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["modelValue"]);
          };
        }
      });

const RenderComponent = _sfc_main$1;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
:deep(.my-header){display:flex;flex-direction:row;justify-content:space-between;gap:16px}
</style>
