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

const _withScopeId$2 = (n) => (pushScopeId("data-v-b36666e5"), n = n(), popScopeId(), n);
      const _hoisted_1$5 = { key: 0 };
      const _hoisted_2$4 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_3$2 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
      const _hoisted_4$2 = { style: { "display": "flex", "margin-top": "10px" } };
      const _hoisted_5$2 = { style: { "display": "flex", "margin-top": "10px" } };
      const _hoisted_6$2 = { style: { "display": "flex" } };
      const _hoisted_7$2 = { style: { "display": "flex" } };
      const _hoisted_8$2 = { style: { "display": "flex" } };
      const _hoisted_9$2 = { style: { "display": "flex", "height": "40px" } };
      const _hoisted_10$2 = { style: { "display": "flex", "margin-bottom": "10px" } };
      const _hoisted_11$2 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("p", { class: "time-interval" }, "投递间隔", -1));
      const _hoisted_12 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("p", { class: "time-interval" }, "秒", -1));
      const _hoisted_13 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("p", { class: "time-interval" }, "翻页间隔", -1));
      const _hoisted_14 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("p", { class: "time-interval" }, "秒", -1));
      const _hoisted_15 = { style: { "display": "flex" } };
      const _hoisted_16 = { style: { "display": "flex", "margin-top": "10px" } };
      const _sfc_main$7 = /* @__PURE__ */ defineComponent({
        __name: "Preference",
        setup(__props) {
          const axios2 = inject("$axios");
          const platform = inject("$platform");
          const userStore = UserStore();
          const ruleFormRef = ref();
          const validateEmail = (rule, value, callback) => {
            if (value === "") {
              callback(new Error("请输入邮箱"));
            } else if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(value)) {
              callback(new Error("请输入正确的邮箱"));
            } else {
              callback();
            }
          };
          const rules2 = reactive({
            phone: [{ required: true, message: "请输入手机号；作为偏好设置唯一键", trigger: "blur" }],
            email: [{
              required: true,
              message: "请输入邮件地址；将通过邮件通知您投递进度",
              validator: validateEmail,
              trigger: "blur"
            }]
          });
          const exportSetting = async () => {
            const preference = { ...userStore.user.preference };
            const exportData = JSON.stringify(preference, null, 2);
            try {
              await navigator.clipboard.writeText(exportData);
              ElNotification({
                title: "导出成功",
                message: "偏好设置已复制到剪贴板",
                type: "success",
                duration: 2e3
              });
            } catch (error) {
              ElNotification({
                title: "导出失败",
                message: "复制到剪贴板时出错",
                type: "error",
                duration: 2e3
              });
            }
          };
          const importSetting = async () => {
            ElMessageBox.prompt("请粘贴导出的偏好设置配置", "导入偏好设置", {
              confirmButtonText: "确认",
              cancelButtonText: "取消",
              inputType: "textarea",
              inputPlaceholder: "在此粘贴配置内容"
            }).then(({ value }) => {
              try {
                const importedPreference = JSON.parse(value);
                userStore.user.preference = { ...importedPreference };
                ElNotification({
                  title: "导入成功",
                  message: "偏好设置已导入，请点击保存偏好设置以持久化保存",
                  type: "success",
                  duration: 3e3
                });
              } catch (error) {
                ElNotification({
                  title: "导入失败",
                  message: "配置格式错误，请检查后重试",
                  type: "error",
                  duration: 2e3
                });
              }
            }).catch(() => {
            });
          };
          const submitForm = async (formEl) => {
            if (!loginInterceptor()) {
              return;
            }
            if (!formEl)
              return;
            if (!userStore.user.phone || !userStore.user.email) {
              ElMessage({
                message: "请填写手机号或邮箱",
                type: "error",
                duration: 2e3
              });
            }
            let valid = await formEl.validate((valid2, fields) => {
              return valid2;
            });
            if (!valid) {
              return;
            }
            await axios2.post("/api/user/save/preference", {
              ...userStore.user,
              aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0
            }).then((resp) => {
              ElMessage({
                message: "偏好设置保存成功",
                type: "success",
                duration: 2e3
              });
            });
          };
          const resetForm = (formEl) => {
            if (!formEl)
              return;
            userStore.user.email = "";
            userStore.user.preference = {};
          };
          const importResumeLoading = ref(false);
          const handlerImportResume = async () => {
            var _a, _b, _c, _d;
            if (!loginInterceptor()) {
              return;
            }
            const token = (_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.token;
            const bossUserId = (_d = (_c = Tools.window) == null ? void 0 : _c._PAGE) == null ? void 0 : _d.uid;
            if (!token || !bossUserId) {
              ElMessage({ type: "error", message: "未获取到 Boss 登录信息，请刷新页面后重试" });
              return;
            }
            importResumeLoading.value = true;
            try {
              const resumeInfoResp = await axios.get("https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json", {
                headers: { Zp_token: token }
              });
              const attachmentList = (resumeInfoResp == null ? void 0 : resumeInfoResp.data) && resumeInfoResp.data.zpData ? resumeInfoResp.data.zpData.attachmentList || [] : [];
              if (!attachmentList.length) {
                ElMessage({ type: "error", message: "请先在 BOSS 个人中心上传附件简历，再执行导入" });
                return;
              }
              const resumeId = attachmentList[0].resumeId;
              const resumeFileResp = await fetchWithGM_request(
                "https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=" + resumeId,
                { headers: { Zp_token: token }, responseType: "arraybuffer" }
              );
              const fileBlob = new Blob([resumeFileResp.response], { type: "application/pdf" });
              const formData = new FormData();
              formData.append("file", fileBlob);
              formData.append("resumeId", resumeId);
              formData.append("uniqueId", String(bossUserId));
              const importResp = await request.post("/api/user/import/resume", formData, {
                headers: { "Content-Type": "multipart/form-data" }
              });
              if ((importResp == null ? void 0 : importResp.data) && importResp.data.code !== 200) {
                const importMsg = importResp.data.data && importResp.data.data.msg ? importResp.data.data.msg : importResp.data.message || "未知错误";
                ElMessage({ type: "error", message: `导入简历失败: ${importMsg}` });
                return;
              }
              const loginResp = await request.post("/api/user/silently/login?uniqueId=" + bossUserId);
              if ((loginResp == null ? void 0 : loginResp.data) && loginResp.data.data) {
                localStorage.setItem("Authorization", loginResp.data.data);
              }
              if (!(importResp == null ? void 0 : importResp.data) || !importResp.data.data || !importResp.data.data.email) {
                ElMessage({
                  type: "warning",
                  message: "导入简历成功，但未识别到邮箱，请在偏好设置中完善通知邮箱"
                });
                return;
              }
              ElMessage({ type: "success", message: "导入简历成功" });
            } catch (e) {
              const msg = (e == null ? void 0 : e.response) && e.response.data ? e.response.data.message : (e == null ? void 0 : e.message) || "未知错误";
              ElMessage({ type: "error", message: `导入简历失败: ${msg}` });
            } finally {
              importResumeLoading.value = false;
            }
          };
          const firstFile = ref(null);
          let jobDetail = platform.getFistJobDetail();
          const uploadData = {
            securityId: jobDetail == null ? void 0 : jobDetail.securityId,
            // securityId: BossOption.bossUserInfoMap?.values()?.next()?.value.securityId,
            source: "chat_file"
          };
          const beforeUpload = (file) => {
            firstFile.value = file;
            return true;
          };
          const handleUploadSuccess = async (response) => {
            userStore.user.preference.cI = response.zpData.url + "===" + response.zpData.tinyUrl;
            ElMessage({
              message: "图片简历上传成功；点击下方保存偏好设置可持久保存",
              type: "success",
              duration: 3e3
            });
          };
          const preferenceDefaultValueHandler = () => {
            if (!userStore.user.preference.dr) {
              userStore.user.preference.dr = 0;
            }
            if (!userStore.user.preference.srT) {
              userStore.user.preference.srT = "1";
            }
            if (typeof userStore.user.preference.imE !== "boolean") {
              userStore.user.preference.imE = false;
            }
          };
          preferenceDefaultValueHandler();
          return (_ctx, _cache) => {
            const _component_el_text = ElText;
            const _component_el_input = ElInput;
            const _component_el_form_item = ElFormItem;
            const _component_el_checkbox = ElCheckbox;
            const _component_el_option = ElOption;
            const _component_el_select = ElSelect;
            const _component_el_tooltip = ElTooltip;
            const _component_el_button = ElButton;
            const _component_el_upload = ElUpload;
            const _component_el_tag = ElTag;
            const _component_el_input_number = ElInputNumber;
            const _component_el_form = ElForm;
            return openBlock(), createBlock(_component_el_form, {
              ref_key: "ruleFormRef",
              ref: ruleFormRef,
              model: unref(userStore).user,
              rules: rules2,
              "label-position": "right",
              "label-width": "auto",
              class: "form-preference",
              size: "large",
              "status-icon": ""
            }, {
              default: withCtx(() => [
                createElementVNode("div", null, [
                  unref(Tools).window.location.href.includes("job-recommend") ? (openBlock(), createElementBlock("div", _hoisted_1$5, [
                    createVNode(_component_el_text, {
                      class: "mx-1 top-title",
                      type: "danger"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("!!!请前往顶部【搜索】按钮所在页面保存偏好设置!!!")
                      ]),
                      _: 1
                    }),
                    _hoisted_2$4,
                    _hoisted_3$2
                  ])) : createCommentVNode("", true),
                  createVNode(_component_el_text, {
                    class: "mx-1 top-title",
                    type: "warning"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("账号信息")
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_4$2, [
                    createVNode(_component_el_form_item, {
                      label: "手机号",
                      prop: "phone",
                      style: { "margin-left": "-6px" }
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_input, {
                          modelValue: unref(userStore).user.phone,
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(userStore).user.phone = $event)
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "通知邮箱",
                      prop: "email"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_input, {
                          modelValue: unref(userStore).user.email,
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(userStore).user.email = $event)
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    })
                  ]),
                  createVNode(_component_el_text, {
                    class: "mx-1 top-title",
                    type: "warning"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("投递设置")
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_5$2, [
                    createVNode(_component_el_form_item, {
                      prop: "companyInclude",
                      style: { "margin-left": "-40px" }
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.cniE,
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(userStore).user.preference.cniE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 公司名包含 ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.cni,
                          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(userStore).user.preference.cni = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "公司名包含",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入公司名"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "公司名排除",
                      prop: "companyExclude"
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.cneE,
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(userStore).user.preference.cneE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 公司名排除    ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.cne,
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(userStore).user.preference.cne = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "公司名排除",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入公司名"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    })
                  ]),
                  createElementVNode("div", _hoisted_6$2, [
                    createVNode(_component_el_form_item, {
                      label: "工作名包含",
                      style: { "margin-left": "-40px" },
                      prop: "jobNameInclude"
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.jniE,
                          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => unref(userStore).user.preference.jniE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 工作名包含 ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.jni,
                          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => unref(userStore).user.preference.jni = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "工作名包含",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入工作名"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "工作名排除",
                      prop: "jobContentExclude"
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.jneE,
                          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref(userStore).user.preference.jneE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 工作名排除    ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.jne,
                          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => unref(userStore).user.preference.jne = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "工作名排除",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入岗位名称"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    })
                  ]),
                  createElementVNode("div", _hoisted_7$2, [
                    createVNode(_component_el_form_item, {
                      label: "工作内容包含",
                      style: { "margin-left": "-40px" },
                      prop: "jobContentInclude"
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.jciE,
                          "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(userStore).user.preference.jciE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode("     内容包含 ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.jci,
                          "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(userStore).user.preference.jci = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "工作内容包含",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入工作内容"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "工作内容排除",
                      prop: "jobContentExclude"
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.jceE,
                          "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref(userStore).user.preference.jceE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 工作内容排除 ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_select, {
                          modelValue: unref(userStore).user.preference.jce,
                          "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => unref(userStore).user.preference.jce = $event),
                          multiple: "",
                          filterable: "",
                          remote: "",
                          "allow-create": "",
                          "default-first-option": "",
                          "reserve-keyword": false,
                          placeholder: "工作内容排除",
                          style: { "width": "240px" }
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(["请输入工作内容字符串"], (item, inx) => {
                              return createVNode(_component_el_option, {
                                key: inx,
                                label: item,
                                value: item
                              }, null, 8, ["label", "value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    })
                  ]),
                  createElementVNode("div", _hoisted_8$2, [
                    createVNode(_component_el_form_item, {
                      label: "薪资范围",
                      prop: "salaryRange",
                      style: { "margin-left": "0" }
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.srE,
                          "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => unref(userStore).user.preference.srE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 薪资范围(月薪k) ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_input, {
                          modelValue: unref(userStore).user.preference.sr,
                          "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => unref(userStore).user.preference.sr = $event),
                          placeholder: "薪资范围 例:9-15"
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "公司规模范围",
                      prop: "jobContentExclude",
                      style: { "margin-left": "0" }
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_checkbox, {
                          modelValue: unref(userStore).user.preference.csrE,
                          "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => unref(userStore).user.preference.csrE = $event),
                          label: "",
                          size: "large"
                        }, null, 8, ["modelValue"]),
                        createTextVNode(" 公司规模范围 ")
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_input, {
                          modelValue: unref(userStore).user.preference.csr,
                          "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => unref(userStore).user.preference.csr = $event),
                          placeholder: "公司规模范围 例:10-5000",
                          style: { "width": "242px" }
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    })
                  ]),
                  createVNode(_component_el_form_item, {
                    label: "AI过滤(语义匹配)",
                    prop: "aiFilter"
                  }, {
                    label: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.afE,
                        "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => unref(userStore).user.preference.afE = $event),
                        label: "",
                        size: "large"
                      }, null, 8, ["modelValue"]),
                      createVNode(_component_el_tooltip, {
                        effect: "dark",
                        "raw-content": "",
                        content: "\r\n    批量投递时AI会通过你的提示词过滤筛选相应岗位<p/><span style='color:red;'>未在【产品列表】中购买【ai过滤】产品请勿开启,页面会报错\r\n    </span><br/>过滤提示词举例：我希望找到武汉的java岗位，薪资至少20K，不考虑学历要求为本科及以下、或者需要超过10年工作经验的职位。\r\n    </span><br/>与简历信息不互通，如果依赖您的某些信息，请通过提示词告知AI\r\n    ",
                        placement: "bottom"
                      }, {
                        default: withCtx(() => [
                          createTextVNode(" AI 过滤(语义匹配) ")
                        ]),
                        _: 1
                      })
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        type: "textarea",
                        modelValue: unref(userStore).user.preference.af,
                        "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => unref(userStore).user.preference.af = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, {
                    label: "发送自定义招呼语",
                    prop: "jobContentExclude"
                  }, {
                    label: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.cgE,
                        "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => unref(userStore).user.preference.cgE = $event),
                        label: "",
                        size: "large"
                      }, null, 8, ["modelValue"]),
                      createTextVNode(" 发送自定义招呼语 ")
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        type: "textarea",
                        modelValue: unref(userStore).user.preference.cg,
                        "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => unref(userStore).user.preference.cg = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, {
                    label: "导入附件简历",
                    prop: "importResume",
                    class: "form-item-upload",
                    style: { "margin-left": "0" }
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_tooltip, {
                        effect: "dark",
                        "raw-content": "",
                        content: "\r\n    在Boss中更新了附件简历后请重新导入<p/>\r\n    - 仅用于AI代聊定制化回复\r\n    ",
                        placement: "bottom"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_button, {
                            type: "primary",
                            loading: importResumeLoading.value,
                            onClick: handlerImportResume
                          }, {
                            default: withCtx(() => [
                              createTextVNode("导入附件简历")
                            ]),
                            _: 1
                          }, 8, ["loading"])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, {
                    label: "发送图片简历",
                    prop: "jobContentExclude",
                    class: "form-item-upload",
                    style: { "margin-left": "0" }
                  }, {
                    label: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.cIE,
                        "onUpdate:modelValue": _cache[23] || (_cache[23] = ($event) => unref(userStore).user.preference.cIE = $event),
                        label: "",
                        size: "large"
                      }, null, 8, ["modelValue"]),
                      createTextVNode(" 发送图片简历        ")
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_el_upload, {
                        action: "https://www.zhipin.com/wapi/zpupload/image/uploadSingle",
                        "before-upload": beforeUpload,
                        "on-success": handleUploadSuccess,
                        "show-file-list": false,
                        data: uploadData,
                        headers: { "Zp_token": unref(Tools).getCookieValue("bst") }
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "primary"
                          }, {
                            default: withCtx(() => [
                              createTextVNode("选择图片简历")
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["headers"]),
                      unref(userStore).user.preference.cI ? (openBlock(), createBlock(_component_el_tag, {
                        key: 0,
                        type: "success",
                        size: "small",
                        style: { "margin-left": "5px" }
                      }, {
                        default: withCtx(() => [
                          createTextVNode("已上传")
                        ]),
                        _: 1
                      })) : createCommentVNode("", true)
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_10$2, [
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.fhE,
                      "onUpdate:modelValue": _cache[24] || (_cache[24] = ($event) => unref(userStore).user.preference.fhE = $event),
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("过滤猎头")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.polE,
                      "onUpdate:modelValue": _cache[25] || (_cache[25] = ($event) => unref(userStore).user.preference.polE = $event),
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("仅投递boss在线岗位 ")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.acE !== false,
                      "onUpdate:modelValue": ($event) => unref(userStore).user.preference.acE = $event,
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("活跃度过滤")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createTextVNode(" 维度 "),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.acW !== false,
                      "onUpdate:modelValue": ($event) => unref(userStore).user.preference.acW = $event,
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("周")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.acM !== false,
                      "onUpdate:modelValue": ($event) => unref(userStore).user.preference.acM = $event,
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("月")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.acY !== false,
                      "onUpdate:modelValue": ($event) => unref(userStore).user.preference.acY = $event,
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("年")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createTextVNode("         "),
                    _hoisted_11$2,
                    createVNode(_component_el_input_number, {
                      modelValue: unref(userStore).user.preference.pi,
                      "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event) => unref(userStore).user.preference.pi = $event),
                      min: 3,
                      max: 60,
                      size: "small"
                    }, null, 8, ["modelValue"]),
                    _hoisted_12,
                    createTextVNode("         "),
                    _hoisted_13,
                    createVNode(_component_el_input_number, {
                      modelValue: unref(userStore).user.preference.npi,
                      "onUpdate:modelValue": _cache[27] || (_cache[27] = ($event) => unref(userStore).user.preference.npi = $event),
                      min: 6,
                      max: 60,
                      size: "small"
                    }, null, 8, ["modelValue"]),
                    _hoisted_14,
                    createTextVNode("         "),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.imE,
                      "onUpdate:modelValue": ($event) => unref(userStore).user.preference.imE = $event,
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("推荐页无限循环")
                      ]),
                      _: 1
                    }, 8, ["modelValue"])
                  ]),
                  createVNode(_component_el_text, {
                    class: "mx-1 top-title",
                    type: "warning"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("交互设置")
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, {
                    label: "预测问题",
                    prop: "jobContentExclude",
                    style: { "margin-top": "10px" }
                  }, {
                    label: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.ppE,
                        "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => unref(userStore).user.preference.ppE = $event),
                        label: "",
                        size: "large"
                      }, null, 8, ["modelValue"]),
                      createTextVNode(" 预设问题               ")
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        type: "textarea",
                        modelValue: unref(userStore).user.preference.pp,
                        "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => unref(userStore).user.preference.pp = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, {
                    label: "拒绝挽留",
                    prop: "jobContentExclude"
                  }, {
                    label: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.rfE,
                        "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event) => unref(userStore).user.preference.rfE = $event),
                        label: "",
                        size: "large"
                      }, null, 8, ["modelValue"]),
                      createTextVNode(" 拒绝挽留               ")
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        type: "textarea",
                        modelValue: unref(userStore).user.preference.rf,
                        "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => unref(userStore).user.preference.rf = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_15, [
                    createVNode(_component_el_checkbox, {
                      style: { "padding-top": "6px" },
                      modelValue: unref(userStore).user.preference.hiaE,
                      "onUpdate:modelValue": _cache[32] || (_cache[32] = ($event) => unref(userStore).user.preference.hiaE = $event),
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("高意向停止AI代聊 ")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_text, {
                      type: "primary",
                      style: { "margin-top": "-20px" }
                    }, {
                      default: withCtx(() => [
                        createTextVNode("  高意向条件:")
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_form_item, {
                      label: "对话聊天轮数",
                      prop: "crC",
                      style: { "margin-left": "-30px" }
                    }, {
                      label: withCtx(() => [
                        createVNode(_component_el_text, {
                          class: "mx-1",
                          type: "primary",
                          style: { "margin-top": "5px" }
                        }, {
                          default: withCtx(() => [
                            createTextVNode("对话轮数 >=")
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        createVNode(_component_el_text, {
                          class: "mx-1",
                          type: "primary",
                          style: { "margin-top": "5px" }
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_el_input, {
                              type: "number",
                              style: { "width": "50px" },
                              size: "small",
                              modelValue: unref(userStore).user.preference.crC,
                              "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => unref(userStore).user.preference.crC = $event)
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode(_component_el_form_item, {
                          label: "对话聊天轮数关键字",
                          prop: "crC",
                          style: { "margin-left": "0", "margin-top": "3px" }
                        }, {
                          label: withCtx(() => [
                            createVNode(_component_el_text, {
                              class: "mx-1",
                              type: "primary"
                            }, {
                              default: withCtx(() => [
                                createTextVNode("OR   包含关键字")
                              ]),
                              _: 1
                            })
                          ]),
                          default: withCtx(() => [
                            createVNode(_component_el_select, {
                              modelValue: unref(userStore).user.preference.crK,
                              "onUpdate:modelValue": _cache[34] || (_cache[34] = ($event) => unref(userStore).user.preference.crK = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "包含关键字",
                              style: { "min-width": "200px", "width": "100%" }
                            }, {
                              default: withCtx(() => [
                                (openBlock(), createElementBlock(Fragment, null, renderList(["请输入包含关键字"], (item, inx) => {
                                  return createVNode(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  createVNode(_component_el_form_item, null, {
                    default: withCtx(() => [
                      createVNode(_component_el_checkbox, {
                        modelValue: unref(userStore).user.preference.drE,
                        "onUpdate:modelValue": _cache[35] || (_cache[35] = ($event) => unref(userStore).user.preference.drE = $event),
                        label: "",
                        size: "large"
                      }, {
                        default: withCtx(() => [
                          createTextVNode("AI代聊延迟回复 ")
                        ]),
                        _: 1
                      }, 8, ["modelValue"]),
                      createTextVNode("         "),
                      createVNode(_component_el_input_number, {
                        modelValue: unref(userStore).user.preference.dr,
                        "onUpdate:modelValue": _cache[36] || (_cache[36] = ($event) => unref(userStore).user.preference.dr = $event),
                        min: 0,
                        max: 30,
                        size: "small"
                      }, null, 8, ["modelValue"]),
                      createTextVNode("  秒 ")
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_text, {
                    class: "mx-1 top-title",
                    type: "warning"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("邮件通知")
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_16, [
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.ermE,
                      "onUpdate:modelValue": _cache[37] || (_cache[37] = ($event) => unref(userStore).user.preference.ermE = $event),
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("每轮交流邮件通知 ")
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_checkbox, {
                      modelValue: unref(userStore).user.preference.crE,
                      "onUpdate:modelValue": _cache[38] || (_cache[38] = ($event) => unref(userStore).user.preference.crE = $event),
                      label: "",
                      size: "large"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_text, {
                          class: "mx-1",
                          type: "danger"
                        }, {
                          default: withCtx(() => [
                            createTextVNode("高意向邮件通知")
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["modelValue"])
                  ]),
                  createVNode(_component_el_form_item, null, {
                    default: withCtx(() => [
                      createVNode(_component_el_button, {
                        type: "primary",
                        onClick: _cache[39] || (_cache[39] = ($event) => submitForm(ruleFormRef.value))
                      }, {
                        default: withCtx(() => [
                          createTextVNode("保存偏好设置")
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_button, {
                        onClick: _cache[40] || (_cache[40] = ($event) => resetForm(ruleFormRef.value))
                      }, {
                        default: withCtx(() => [
                          createTextVNode("清除偏好设置")
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_button, { onClick: exportSetting }, {
                        default: withCtx(() => [
                          createTextVNode("导出偏好设置")
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_button, { onClick: importSetting }, {
                        default: withCtx(() => [
                          createTextVNode("导入偏好设置")
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }, 8, ["model", "rules"]);
          };
        }
      });

const RenderComponent = _sfc_main$7;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
:deep(.input-opt>:first-child){width:100px}
:deep(.form-item-upload>:first-child){margin-left:0}
:deep(.el-input-number--small){line-height:22px;width:80px}
:deep(.time-interval){margin-top:10px;margin-right:1px;margin-left:1px}
</style>
