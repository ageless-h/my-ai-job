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

const _withScopeId = (n) => (pushScopeId("data-v-c984eb47"), n = n(), popScopeId(), n);
      const _hoisted_1$1 = { class: "ai-config" };
      const _hoisted_2$1 = { class: "tune-form" };
      const _hoisted_3 = { style: { "display": "flex" } };
      const _hoisted_4 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("span", { class: "unit" }, "秒", -1));
      const _hoisted_5 = { class: "chat-history" };
      const _hoisted_6 = { class: "bubble" };
      const _hoisted_7 = { class: "meta" };
      const _hoisted_8 = { class: "content" };
      const _hoisted_9 = {
        key: 0,
        class: "tags"
      };
      const _hoisted_10 = { class: "chat-composer" };
      const _hoisted_11 = { class: "composer-input" };
      const _sfc_main$2 = /* @__PURE__ */ defineComponent({
        __name: "AiConfig",
        setup(__props) {
          const providerOptions = [
            { label: "自定义", value: 0 },
            { label: "Deepseek", value: 1 },
            { label: "火山引擎", value: 2 },
            { label: "硅基流动", value: 3 },
            { label: "月之暗面", value: 4 },
            { label: "Open Router", value: 5 }
          ];
          const modelOptions = {
            0: [],
            // Custom
            1: ["deepseek-chat", "deepseek-reasoner"],
            2: ["deepseek-r1-250120", "..."],
            3: ["deepseek-ai/DeepSeek-V3", "..."],
            4: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
            5: ["deepseek/deepseek-chat-v3-0324:free", "..."]
          };
          const formRef = ref();
          const availableModels = ref([]);
          const providerDetails = ref({});
          const form = ref({
            userId: 0,
            provider: 1,
            modelName: "",
            apiKey: "",
            baseUrl: "",
            timeout: 60,
            completionsPath: "",
            testPassed: 0,
            status: 0,
            userPrompt: ""
          });
          const isTestLoading = ref(false);
          const activeCollapseNames = ref(["tune"]);
          const debugDialogVisible = ref(false);
          const debugQuestion = ref("");
          const isDebugLoading = ref(false);
          const debugHistory = ref([]);
          const aiConfigExt = ref(Tools.getAiConfigExt());
          const selectedPresetId = ref("");
          const memoryScopeOptions = [
            { label: "会话级", value: "session" },
            { label: "岗位级", value: "job" },
            { label: "全局级", value: "global" }
          ];
          const memoryProfile = ref({
            enabled: true,
            scope: "session",
            maxTurns: 20,
            summaryThreshold: 12,
            clearOnModelSwitch: true
          });
          const normalizeMemoryProfile = (profile) => {
            return {
              enabled: (profile == null ? void 0 : profile.enabled) !== false,
              scope: (profile == null ? void 0 : profile.scope) || "session",
              maxTurns: Number((profile == null ? void 0 : profile.maxTurns) || 20),
              summaryThreshold: Number((profile == null ? void 0 : profile.summaryThreshold) || 12),
              clearOnModelSwitch: (profile == null ? void 0 : profile.clearOnModelSwitch) !== false
            };
          };
          const buildCurrentModelChannelKey = () => Tools.buildModelChannelKey(form.value.provider, form.value.modelName);
          const ensureAiConfigExtSchema = () => {
            if (!aiConfigExt.value) {
              aiConfigExt.value = Tools.getAiConfigExt();
            }
            if (!aiConfigExt.value.currentConfig) {
              aiConfigExt.value.currentConfig = { provider: 1, modelName: "" };
            }
            if (!aiConfigExt.value.memoryProfiles) {
              aiConfigExt.value.memoryProfiles = {};
            }
            if (!aiConfigExt.value.promptPresetStore) {
              aiConfigExt.value.promptPresetStore = { global: [], personal: {} };
            }
            if (!Array.isArray(aiConfigExt.value.promptPresetStore.global)) {
              aiConfigExt.value.promptPresetStore.global = [];
            }
            if (!aiConfigExt.value.promptPresetStore.personal) {
              aiConfigExt.value.promptPresetStore.personal = {};
            }
            if (!aiConfigExt.value.debugHistoryByChannel) {
              aiConfigExt.value.debugHistoryByChannel = {};
            }
            if (!aiConfigExt.value.uiLayout) {
              aiConfigExt.value.uiLayout = { style: "dashboard-2col" };
            }
            if (!aiConfigExt.value.uiLayout.style) {
              aiConfigExt.value.uiLayout.style = "dashboard-2col";
            }
            return aiConfigExt.value;
          };
          const persistAiConfigExt = () => {
            aiConfigExt.value = Tools.saveAiConfigExt(ensureAiConfigExtSchema());
          };
          const ensureGlobalPresetCatalog = () => {
            const ext = ensureAiConfigExtSchema();
            if ((ext.promptPresetStore.global || []).length > 0) {
              return;
            }
            ext.promptPresetStore.global = [
              {
                id: "global-brief-professional",
                name: "简洁专业",
                tags: ["通用", "稳健"],
                content: "请使用简洁、专业、礼貌的语气回复，优先给出可执行结论。",
                scope: "global",
                enabled: true
              },
              {
                id: "global-value-driven",
                name: "价值导向",
                tags: ["通用", "亮点"],
                content: "回答中优先突出可量化成果、项目价值和岗位匹配度，避免空泛表达。",
                scope: "global",
                enabled: true
              }
            ];
            persistAiConfigExt();
          };
          const getCurrentChannelPresetList = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            const current = ext.promptPresetStore.personal[key];
            if (!Array.isArray(current)) {
              ext.promptPresetStore.personal[key] = [];
              persistAiConfigExt();
            }
            return ext.promptPresetStore.personal[key];
          };
          const getMergedPresetList = () => {
            const ext = ensureAiConfigExtSchema();
            const channelPresetList = getCurrentChannelPresetList().map((preset) => ({
              ...preset,
              scope: "personal"
            }));
            const channelNameSet = /* @__PURE__ */ new Set(channelPresetList.map((preset) => `${preset.name || ""}`.trim()).filter((name) => !!name));
            const globalPresetList = (ext.promptPresetStore.global || []).filter((preset) => {
              const name = `${preset.name || ""}`.trim();
              return !name || !channelNameSet.has(name);
            }).map((preset) => ({
              ...preset,
              scope: "global"
            }));
            return [...globalPresetList, ...channelPresetList];
          };
          const getPresetById = (presetId) => {
            if (!presetId) {
              return null;
            }
            const mergedPreset = getMergedPresetList().find((preset) => preset.id === presetId);
            if (mergedPreset) {
              return mergedPreset;
            }
            return null;
          };
          const presetOptions = computed(() => {
            return getMergedPresetList().map((preset) => ({
              ...preset,
              optionLabel: `${preset.scope === "personal" ? "[模型]" : "[全局]"} ${preset.name}`
            }));
          });
          const finalPromptPreview = computed(() => {
            const enabledMergedText = getMergedPresetList().filter((preset) => preset.enabled !== false).map((preset, index) => `# ${preset.scope === "personal" ? "模型" : "全局"}预设${index + 1} ${preset.name}\n${preset.content}`).join("\n\n");
            const userPromptText = `${form.value.userPrompt || ""}`.trim();
            const userPromptSection = userPromptText ? `# 用户附加提示词\n${userPromptText}` : "";
            const mergedText = [enabledMergedText, userPromptSection].filter((text) => !!text).join("\n\n");
            return mergedText || "暂无可用提示词内容";
          });
          const saveCurrentMemoryProfileSilently = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            ext.memoryProfiles[key] = normalizeMemoryProfile(memoryProfile.value);
            persistAiConfigExt();
          };
          const saveCurrentMemoryProfile = () => {
            saveCurrentMemoryProfileSilently();
            ElMessage({ type: "success", message: "模型记忆策略已保存" });
          };
          const loadCurrentMemoryProfile = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            memoryProfile.value = normalizeMemoryProfile(ext.memoryProfiles[key]);
          };
          const syncCurrentChannelToExt = () => {
            const ext = ensureAiConfigExtSchema();
            ext.currentConfig = {
              provider: form.value.provider,
              modelName: form.value.modelName || ""
            };
            persistAiConfigExt();
          };
          const loadCurrentDebugHistory = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            const list = ext.debugHistoryByChannel[key];
            debugHistory.value = Array.isArray(list) ? list.slice(-20).map((item) => ({ ...item })) : [];
          };
          const persistCurrentDebugHistory = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            ext.debugHistoryByChannel[key] = Array.isArray(debugHistory.value) ? debugHistory.value.slice(-20).map((item) => ({ ...item })) : [];
            persistAiConfigExt();
          };
          const saveDebugHistoryByChannelKey = (channelKey, historyList) => {
            if (!channelKey) {
              return;
            }
            const ext = ensureAiConfigExtSchema();
            ext.debugHistoryByChannel[channelKey] = Array.isArray(historyList) ? historyList.slice(-20).map((item) => ({ ...item })) : [];
            persistAiConfigExt();
          };
          const saveCurrentPromptAsPreset = async () => {
            const promptText = `${form.value.userPrompt || ""}`.trim();
            if (!promptText) {
              ElMessage({ type: "warning", message: "请先填写用户提示词" });
              return;
            }
            const { value } = await ElMessageBox.prompt("请输入预设名称", "保存提示词预设", {
              confirmButtonText: "保存",
              cancelButtonText: "取消",
              inputPlaceholder: "例如：技术岗稳健沟通"
            }).catch(() => ({ value: "" }));
            if (!value) {
              return;
            }
            const preset = {
              id: `personal-${Date.now()}`,
              name: value,
              tags: ["个人"],
              content: promptText,
              scope: "personal",
              enabled: true,
              updatedAt: Date.now()
            };
            getCurrentChannelPresetList().push(preset);
            persistAiConfigExt();
            selectedPresetId.value = preset.id;
            ElMessage({ type: "success", message: "已保存到当前模型预设库" });
          };
          const applySelectedPreset = () => {
            const preset = getPresetById(selectedPresetId.value);
            if (!preset) {
              ElMessage({ type: "warning", message: "请先选择预设" });
              return;
            }
            form.value.userPrompt = preset.content || "";
            ElMessage({ type: "success", message: "预设已应用到用户提示词" });
          };
          const deleteSelectedPreset = async () => {
            const preset = getPresetById(selectedPresetId.value);
            if (!preset) {
              ElMessage({ type: "warning", message: "请先选择预设" });
              return;
            }
            if (preset.scope === "global") {
              ElMessage({ type: "warning", message: "全局预设不可删除，可复制后另存为个人预设" });
              return;
            }
            const confirmed = await ElMessageBox.confirm(`确认删除预设【${preset.name}】？`, "删除确认", {
              confirmButtonText: "删除",
              cancelButtonText: "取消",
              type: "warning"
            }).then(() => true).catch(() => false);
            if (!confirmed) {
              return;
            }
            const list = getCurrentChannelPresetList();
            const idx = list.findIndex((item) => item.id === preset.id);
            if (idx >= 0) {
              list.splice(idx, 1);
              selectedPresetId.value = "";
              persistAiConfigExt();
              ElMessage({ type: "success", message: "预设已删除" });
            }
          };
          const rules2 = {
            provider: [{ required: true, message: "请选择提供商类型", trigger: "change" }],
            modelName: [
              { required: true, message: "请输入模型名称", trigger: "change" },
              {
                validator: (rule, value, callback) => {
                  if (value === "...") {
                    callback(new Error("请选择具体模型名或输入模型名称"));
                  } else {
                    callback();
                  }
                },
                trigger: "change"
              }
            ],
            apiKey: [{ required: true, message: "请输入API Key", trigger: "change" }],
            timeout: [{ required: true, message: "请输入超时时间", trigger: "change" }],
            baseUrl: [{ required: true, message: "Base URL 不能为空", trigger: "change" }]
          };
          const fetchAllProviderDetails = async () => {
            try {
              const response = await request.get("/api/user/ai/config/all/provider");
              if (response.data.code === 200) {
                const details = response.data.data;
                providerDetails.value = details.reduce((acc, detail) => {
                  acc[detail.code] = detail;
                  return acc;
                }, {});
              }
            } catch (error) {
              ElMessage({
                type: "error",
                message: "获取供应商信息失败"
              });
            }
          };
          const lastFetchedConfig = ref(null);
          const compareWithLastConfig = () => {
            if (!lastFetchedConfig.value)
              return false;
            const currentConfig = form.value;
            const normalizeCompletionsPath = (path) => {
              return !path || path.trim() === "" ? "" : path;
            };
            return currentConfig.provider === lastFetchedConfig.value.provider && currentConfig.modelName === lastFetchedConfig.value.modelName && currentConfig.apiKey === lastFetchedConfig.value.apiKey && currentConfig.baseUrl === lastFetchedConfig.value.baseUrl && normalizeCompletionsPath(currentConfig.completionsPath) === normalizeCompletionsPath(lastFetchedConfig.value.completionsPath);
          };
          const handleProviderChange = (value, keepModelName = false) => {
            availableModels.value = modelOptions[value] || [];
            if (!keepModelName) {
              form.value.modelName = "";
            }
            if (value !== 0 && providerDetails.value[value]) {
              form.value.baseUrl = providerDetails.value[value].defaultBaseUrl;
            }
            const isDataUnchanged = compareWithLastConfig();
            if (!isDataUnchanged) {
              form.value.testPassed = 0;
            }
          };
          const fetchConfig = async () => {
            try {
              const response = await request.get("/api/user/ai/config/current");
              if (response.data.code === 200) {
                ensureGlobalPresetCatalog();
                let config = response.data.data;
                if (!config) {
                  config = {
                    status: 0,
                    provider: 1,
                    timeout: 60
                  };
                }
                form.value = { ...form.value, ...config };
                lastFetchedConfig.value = { ...config };
                const ext = ensureAiConfigExtSchema();
                if (!form.value.modelName && (ext == null ? void 0 : ext.currentConfig) && ext.currentConfig.provider === form.value.provider && ext.currentConfig.modelName) {
                  form.value.modelName = ext.currentConfig.modelName;
                }
                handleProviderChange(form.value.provider, true);
                syncCurrentChannelToExt();
                loadCurrentMemoryProfile();
                loadCurrentDebugHistory();
                selectedPresetId.value = "";
              }
            } catch (error) {
              ElMessage({
                type: "error",
                message: "获取配置失败"
              });
            }
          };
          watch(() => ({
            provider: form.value.provider,
            modelName: form.value.modelName,
            apiKey: form.value.apiKey,
            baseUrl: form.value.baseUrl,
            completionsPath: form.value.completionsPath,
            timeout: form.value.timeout,
            status: form.value.status
          }), () => {
            var _a;
            const isDataUnchanged = compareWithLastConfig();
            if (!isDataUnchanged) {
              form.value.testPassed = 0;
            }
            if (((_a = lastFetchedConfig.value) == null ? void 0 : _a.testPassed) && isDataUnchanged) {
              form.value.testPassed = 1;
            }
          }, { deep: true });
          const handleSave = async () => {
            if (!formRef.value)
              return;
            await formRef.value.validate(async (valid) => {
              if (valid) {
                try {
                  const { userPrompt, ...rest } = form.value;
                  const response = await request.post("/api/user/ai/config/save", rest);
                  if (response.data.code === 200) {
                    syncCurrentChannelToExt();
                    saveCurrentMemoryProfileSilently();
                    ElMessage({
                      type: "success",
                      message: "保存成功"
                    });
                  }
                } catch (e) {
                  ElMessage({
                    type: "error",
                    message: "保存失败"
                  });
                }
              }
            });
          };
          const handleTempSave = async () => {
            if (!formRef.value)
              return;
            await formRef.value.validate(async (valid) => {
              if (valid) {
                try {
                  const { userPrompt, ...rest } = form.value;
                  const response = await request.post("/api/user/ai/config/temp/save", rest);
                  if (response.data.code === 200) {
                    syncCurrentChannelToExt();
                    saveCurrentMemoryProfileSilently();
                    ElMessage({
                      type: "success",
                      message: "保存成功"
                    });
                    await fetchConfig();
                  }
                } catch (error) {
                  ElMessage({
                    type: "error",
                    message: "保存失败"
                  });
                }
              }
            });
          };
          const handleSavePrompt = async () => {
            try {
              const resp = await request.post("/api/user/ai/config/temp/save", {
                userPrompt: form.value.userPrompt || "",
                userId: form.value.userId
              });
              if (resp.data.code === 200) {
                syncCurrentChannelToExt();
                ElMessage({ type: "success", message: "保存成功" });
              }
            } catch (e) {
              ElMessage({ type: "error", message: "保存失败" });
            }
          };
          const handleTest = async () => {
            if (!formRef.value)
              return;
            await formRef.value.validate(async (valid) => {
              if (!valid) {
                return;
              }
              isTestLoading.value = true;
              try {
                const response = await request.post("/api/user/ai/config/test", form.value, { timeout: form.value.timeout * 1e3 - 200 });
                if (response.data.code === 200) {
                  ElNotification({
                    title: "测试通过",
                    message: response.data.data,
                    type: "success"
                  });
                  form.value.testPassed = 1;
                  return;
                }
                ElNotification({
                  title: "测试失败",
                  message: response.data.message,
                  type: "error",
                  customClass: "test-failed-notification"
                });
              } catch (e) {
                ElNotification({
                  title: "测试失败",
                  message: e,
                  type: "error",
                  customClass: "test-failed-notification"
                });
              } finally {
                isTestLoading.value = false;
              }
            });
          };
          const handleStatusChange = () => {
            ElNotification({
              title: "自有ApiKey提示",
              message: "需要点击保存按钮后生效",
              type: "info",
              duration: 3e3
            });
          };
          const openDebugDialog = () => {
            loadCurrentDebugHistory();
            debugDialogVisible.value = true;
          };
          const jobKey = ref("");
          const getJobKey = () => {
            if (jobKey.value) {
              return jobKey.value;
            }
            let key = "ask-debug-" + Tools.window._PAGE.uid + "-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + "@" + Tools.buildModelChannelKey(form.value.provider, form.value.modelName);
            jobKey.value = key;
            return key;
          };
          const handleSendDebug = async () => {
            var _a;
            if (!debugQuestion.value) {
              ElMessage({ type: "warning", message: "请输入问题" });
              return;
            }
            if (debugHistory.value.length >= 20) {
              ElMessage({ type: "warning", message: "总对话长度不能超过20条，请先清空历史消息重试" });
              return;
            }
            const question = debugQuestion.value;
            debugHistory.value.push({ role: "user", content: question });
            persistCurrentDebugHistory();
            debugQuestion.value = "";
            isDebugLoading.value = true;
            try {
              const payload = {
                jobKey: getJobKey(),
                question,
                jobInfo: {},
                userPrompt: finalPromptPreview.value || "",
                messageList: debugHistory.value.slice(0, debugHistory.value.length - 1)
              };
              const resp = await request.post("/api/user/ai/config/debug", payload, {
                timeout: 6e4,
                headers: { "Content-Type": "application/json" }
              });
              const data = ((_a = resp == null ? void 0 : resp.data) == null ? void 0 : _a.data) || {};
              const answer = (data == null ? void 0 : data.answerContent) || "";
              const answerTypes = Array.isArray(data == null ? void 0 : data.answerTypeList) ? data.answerTypeList : [];
              const operationTypes = Array.isArray(data == null ? void 0 : data.operationTypeList) ? data.operationTypeList : [];
              debugHistory.value.push({ role: "assistant", content: answer, answerTypes, operationTypes });
              persistCurrentDebugHistory();
            } catch (e) {
              ElMessage({ type: "error", message: "调试失败" });
            } finally {
              isDebugLoading.value = false;
            }
          };
          const handleClearHistory = () => {
            debugHistory.value = [];
            persistCurrentDebugHistory();
            jobKey.value = "";
          };
          const mapAnswerType = (t) => {
            if (t === 0)
              return "NULL";
            if (t === 1)
              return "发送消息";
            if (t === 2)
              return "BOSS操作";
            if (t === 3)
              return "不回复当前消息";
            if (t === 4)
              return "AI服务异常";
            return String(t);
          };
          const mapOperationType = (t) => {
            if (t === 0)
              return "NULL";
            if (t === 1)
              return "发送简历";
            return String(t);
          };
          const mapRoleTitle = (role) => {
            if (role === "user")
              return "HR";
            return "AI代聊";
          };
          watch(() => `${form.value.provider}:${form.value.modelName || ""}`, (newChannelKey, oldChannelKey) => {
            if (oldChannelKey && oldChannelKey !== newChannelKey) {
              const ext = ensureAiConfigExtSchema();
              ext.memoryProfiles[oldChannelKey] = normalizeMemoryProfile(memoryProfile.value);
              saveDebugHistoryByChannelKey(oldChannelKey, debugHistory.value);
            }
            syncCurrentChannelToExt();
            loadCurrentMemoryProfile();
            loadCurrentDebugHistory();
            selectedPresetId.value = "";
            jobKey.value = "";
          });
          onMounted(() => {
            fetchAllProviderDetails();
            fetchConfig();
          });
          return (_ctx, _cache) => {
            const _component_el_input = ElInput;
            const _component_el_form_item = ElFormItem;
            const _component_el_button = ElButton;
            const _component_el_form = ElForm;
            const _component_el_collapse_item = ElCollapseItem;
            const _component_el_switch = ElSwitch;
            const _component_el_tooltip = ElTooltip;
            const _component_el_option = ElOption;
            const _component_el_select = ElSelect;
            const _component_el_input_number = ElInputNumber;
            const _component_el_collapse = ElCollapse;
            const _component_el_empty = ElEmpty;
            const _component_el_tag = ElTag;
            const _component_el_dialog = ElDialog;
            return openBlock(), createElementBlock("div", _hoisted_1$1, [
              createVNode(_component_el_collapse, {
                modelValue: activeCollapseNames.value,
                "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => activeCollapseNames.value = $event)
              }, {
                default: withCtx(() => [
                  createVNode(_component_el_collapse_item, {
                    name: "tune",
                    title: ">模型微调(点击展开收起)",
                    class: "tune-form"
                  }, {
                    default: withCtx(() => [
                      createElementVNode("div", _hoisted_2$1, [
                        createVNode(_component_el_form, { "label-width": "120px" }, {
                          default: withCtx(() => [
                            createVNode(_component_el_form_item, { label: "用户提示词" }, {
                              default: withCtx(() => [
                                createVNode(_component_el_input, {
                                  modelValue: form.value.userPrompt,
                                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.value.userPrompt = $event),
                                  type: "textarea",
                                  rows: 6,
                                  maxlength: 5e3,
                                  "show-word-limit": "",
                                  placeholder: "请输入用于微调的用户提示词，将作为AI代聊的部分系统提示词使用 示例如下：\r\n## 语气风格\r\n- 使用比较轻快活泼的风格交流，同时保持积极专业的沟通态度\r\n- 避免过于正式或刻板的表达，保持对话流畅性\r\n\r\n## 信息处理\r\n- 用数据化成果突出个人价值，如完成3个百万级项目\r\n- 对薪资、到岗时间等敏感问题采用策略性回应\r\n\r\n## 以上仅作为示例写法，无实际意义\r\n"
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            }),
                            createVNode(_component_el_form_item, { label: "提示词预设" }, {
                              default: withCtx(() => [
                                createElementVNode("div", { style: { "display": "flex", "align-items": "center", "gap": "8px", "flex-wrap": "wrap", "width": "100%" } }, [
                                  createVNode(_component_el_select, {
                                    modelValue: selectedPresetId.value,
                                    "onUpdate:modelValue": ($event) => selectedPresetId.value = $event,
                                    placeholder: "选择全局或当前模型预设",
                                    clearable: "",
                                    style: { "width": "320px" }
                                  }, {
                                    default: withCtx(() => [
                                      (openBlock(true), createElementBlock(Fragment, null, renderList(presetOptions.value, (preset) => {
                                        return openBlock(), createBlock(_component_el_option, {
                                          key: preset.id,
                                          label: preset.optionLabel || preset.name,
                                          value: preset.id
                                        }, null, 8, ["label", "value"]);
                                      }), 128))
                                    ]),
                                    _: 1
                                  }, 8, ["modelValue"]),
                                  createVNode(_component_el_button, {
                                    type: "primary",
                                    plain: "",
                                    onClick: applySelectedPreset
                                  }, {
                                    default: withCtx(() => [
                                      createTextVNode("应用预设")
                                    ]),
                                    _: 1
                                  }),
                                  createVNode(_component_el_button, {
                                    type: "success",
                                    plain: "",
                                    onClick: saveCurrentPromptAsPreset
                                  }, {
                                    default: withCtx(() => [
                                      createTextVNode("另存为预设")
                                    ]),
                                    _: 1
                                  }),
                                  createVNode(_component_el_button, {
                                    type: "danger",
                                    plain: "",
                                    onClick: deleteSelectedPreset
                                  }, {
                                    default: withCtx(() => [
                                      createTextVNode("删除预设")
                                    ]),
                                    _: 1
                                  })
                                ])
                              ]),
                              _: 1
                            }),
                            createVNode(_component_el_form_item, { label: "记忆策略" }, {
                              default: withCtx(() => [
                                createElementVNode("div", { style: { "display": "flex", "align-items": "center", "gap": "8px", "flex-wrap": "wrap", "width": "100%" } }, [
                                  createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "启用"),
                                  createVNode(_component_el_switch, {
                                    modelValue: memoryProfile.value.enabled,
                                    "onUpdate:modelValue": ($event) => memoryProfile.value.enabled = $event
                                  }, null, 8, ["modelValue"]),
                                  createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "范围"),
                                  createVNode(_component_el_select, {
                                    modelValue: memoryProfile.value.scope,
                                    "onUpdate:modelValue": ($event) => memoryProfile.value.scope = $event,
                                    style: { "width": "120px" }
                                  }, {
                                    default: withCtx(() => [
                                      (openBlock(true), createElementBlock(Fragment, null, renderList(memoryScopeOptions, (option) => {
                                        return openBlock(), createBlock(_component_el_option, {
                                          key: option.value,
                                          label: option.label,
                                          value: option.value
                                        }, null, 8, ["label", "value"]);
                                      }), 128))
                                    ]),
                                    _: 1
                                  }, 8, ["modelValue"]),
                                  createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "最大轮数"),
                                  createVNode(_component_el_input_number, {
                                    modelValue: memoryProfile.value.maxTurns,
                                    "onUpdate:modelValue": ($event) => memoryProfile.value.maxTurns = $event,
                                    min: 1,
                                    max: 100
                                  }, null, 8, ["modelValue"]),
                                  createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "摘要阈值"),
                                  createVNode(_component_el_input_number, {
                                    modelValue: memoryProfile.value.summaryThreshold,
                                    "onUpdate:modelValue": ($event) => memoryProfile.value.summaryThreshold = $event,
                                    min: 1,
                                    max: 100
                                  }, null, 8, ["modelValue"]),
                                  createVNode(_component_el_button, {
                                    type: "primary",
                                    plain: "",
                                    onClick: saveCurrentMemoryProfile
                                  }, {
                                    default: withCtx(() => [
                                      createTextVNode("保存记忆")
                                    ]),
                                    _: 1
                                  })
                                ])
                              ]),
                              _: 1
                            }),
                            createVNode(_component_el_form_item, null, {
                              default: withCtx(() => [
                                createVNode(_component_el_button, {
                                  type: "primary",
                                  onClick: handleSavePrompt
                                }, {
                                  default: withCtx(() => [
                                    createTextVNode("保存")
                                  ]),
                                  _: 1
                                }),
                                createVNode(_component_el_button, {
                                  type: "warning",
                                  onClick: openDebugDialog
                                }, {
                                  default: withCtx(() => [
                                    createTextVNode("调试")
                                  ]),
                                  _: 1
                                })
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_collapse_item, {
                    name: "api",
                    title: ">自有API(点击展开收起)",
                    class: "tune-form"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_form, {
                        ref_key: "formRef",
                        ref: formRef,
                        model: form.value,
                        rules: rules2,
                        "label-width": "120px",
                        class: "config-form"
                      }, {
                        default: withCtx(() => [
                          createElementVNode("div", _hoisted_3, [
                            createVNode(_component_el_tooltip, {
                              class: "box-item",
                              effect: "dark",
                              content: "测试不通过，测试通过后才可保存生效",
                              placement: "bottom",
                              visible: !form.value.testPassed && form.value.status === 1
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_el_form_item, {
                                  label: "启用自有API",
                                  prop: "status"
                                }, {
                                  default: withCtx(() => [
                                    createVNode(_component_el_switch, {
                                      modelValue: form.value.status,
                                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.value.status = $event),
                                      "active-value": 1,
                                      "inactive-value": 0,
                                      onChange: handleStatusChange
                                    }, null, 8, ["modelValue"])
                                  ]),
                                  _: 1
                                })
                              ]),
                              _: 1
                            }, 8, ["visible"]),
                            createVNode(_component_el_form_item, {
                              class: "select-opt-item",
                              label: "提供商",
                              prop: "provider"
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_el_select, {
                                  modelValue: form.value.provider,
                                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.value.provider = $event),
                                  placeholder: "请选择大模型提供商",
                                  onChange: handleProviderChange
                                }, {
                                  default: withCtx(() => [
                                    (openBlock(), createElementBlock(Fragment, null, renderList(providerOptions, (option) => {
                                      return createVNode(_component_el_option, {
                                        key: option.value,
                                        label: option.label,
                                        value: option.value
                                      }, null, 8, ["label", "value"]);
                                    }), 64))
                                  ]),
                                  _: 1
                                }, 8, ["modelValue"])
                              ]),
                              _: 1
                            }),
                            createVNode(_component_el_form_item, {
                              class: "select-opt-item",
                              label: "模型名称",
                              prop: "modelName"
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_el_select, {
                                  modelValue: form.value.modelName,
                                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.value.modelName = $event),
                                  placeholder: "请选择或输入模型名称",
                                  filterable: "",
                                  "allow-create": "",
                                  "default-first-option": ""
                                }, {
                                  default: withCtx(() => [
                                    (openBlock(true), createElementBlock(Fragment, null, renderList(availableModels.value, (model) => {
                                      return openBlock(), createBlock(_component_el_option, {
                                        key: model,
                                        label: model,
                                        value: model
                                      }, null, 8, ["label", "value"]);
                                    }), 128))
                                  ]),
                                  _: 1
                                }, 8, ["modelValue"])
                              ]),
                              _: 1
                            })
                          ]),
                          createVNode(_component_el_form_item, {
                            label: "API KEY",
                            prop: "apiKey"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.apiKey,
                                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.value.apiKey = $event),
                                placeholder: "请输入API Key",
                                "show-password": ""
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, {
                            label: "BASE URL",
                            prop: "baseUrl"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.baseUrl,
                                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => form.value.baseUrl = $event),
                                placeholder: "选择大模型提供商自动获取BASE URL"
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, {
                            label: "Completions",
                            prop: "completionsPath"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.completionsPath,
                                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => form.value.completionsPath = $event),
                                placeholder: "不用填写 默认：/chat/completions"
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, {
                            label: "超时时间",
                            prop: "timeout"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input_number, {
                                modelValue: form.value.timeout,
                                "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => form.value.timeout = $event),
                                min: 1,
                                max: 120
                              }, null, 8, ["modelValue"]),
                              _hoisted_4
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, null, {
                            default: withCtx(() => [
                              createVNode(_component_el_button, {
                                type: "info",
                                onClick: handleTempSave
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("暂存")
                                ]),
                                _: 1
                              }),
                              createVNode(_component_el_button, {
                                type: "success",
                                loading: isTestLoading.value,
                                onClick: handleTest
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("测试")
                                ]),
                                _: 1
                              }, 8, ["loading"]),
                              createVNode(_component_el_tooltip, {
                                class: "box-item",
                                effect: "dark",
                                content: "请先测试；测试通过后才可保存生效",
                                placement: "bottom"
                              }, {
                                default: withCtx(() => [
                                  createVNode(_component_el_button, {
                                    type: "primary",
                                    onClick: handleSave,
                                    disabled: !form.value.testPassed
                                  }, {
                                    default: withCtx(() => [
                                      createTextVNode("保存")
                                    ]),
                                    _: 1
                                  }, 8, ["disabled"])
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["model"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_el_dialog, {
                modelValue: debugDialogVisible.value,
                "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => debugDialogVisible.value = $event),
                title: "调试用户提示词",
                width: "800px"
              }, {
                footer: withCtx(() => [
                  createVNode(_component_el_button, {
                    type: "warning",
                    disabled: isDebugLoading.value || debugHistory.value.length === 0,
                    onClick: handleClearHistory
                  }, {
                    default: withCtx(() => [
                      createTextVNode("清空历史 ")
                    ]),
                    _: 1
                  }, 8, ["disabled"]),
                  createVNode(_component_el_button, {
                    onClick: _cache[10] || (_cache[10] = ($event) => debugDialogVisible.value = false)
                  }, {
                    default: withCtx(() => [
                      createTextVNode("关闭")
                    ]),
                    _: 1
                  })
                ]),
                default: withCtx(() => [
                  createElementVNode("div", _hoisted_5, [
                    withDirectives(createVNode(_component_el_empty, { description: "暂无历史消息，请在下方开始你的调试吧" }, null, 512), [
                      [vShow, debugHistory.value.length === 0]
                    ]),
                    (openBlock(true), createElementBlock(Fragment, null, renderList(debugHistory.value, (m, idx) => {
                      return openBlock(), createElementBlock("div", {
                        key: idx,
                        class: normalizeClass(["chat-row", m.role === "user" ? "from-user" : "from-ai"])
                      }, [
                        createElementVNode("div", _hoisted_6, [
                          createElementVNode("div", _hoisted_7, toDisplayString(mapRoleTitle(m.role)), 1),
                          createElementVNode("div", _hoisted_8, toDisplayString(m.content), 1),
                          m.role === "assistant" ? (openBlock(), createElementBlock("div", _hoisted_9, [
                            (openBlock(true), createElementBlock(Fragment, null, renderList(m.answerTypes || [], (t, i) => {
                              return openBlock(), createBlock(_component_el_tag, {
                                key: "a-" + i,
                                size: "small",
                                type: "info"
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(mapAnswerType(t)), 1)
                                ]),
                                _: 2
                              }, 1024);
                            }), 128)),
                            (openBlock(true), createElementBlock(Fragment, null, renderList(m.operationTypes || [], (t, i) => {
                              return openBlock(), createBlock(_component_el_tag, {
                                key: "o-" + i,
                                size: "small",
                                type: "success"
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(mapOperationType(t)), 1)
                                ]),
                                _: 2
                              }, 1024);
                            }), 128))
                          ])) : createCommentVNode("", true)
                        ])
                      ], 2);
                    }), 128))
                  ]),
                  createElementVNode("div", _hoisted_10, [
                    createElementVNode("div", _hoisted_11, [
                      createVNode(_component_el_input, {
                        modelValue: debugQuestion.value,
                        "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => debugQuestion.value = $event),
                        type: "textarea",
                        autosize: { minRows: 3, maxRows: 8 },
                        maxlength: 5e3,
                        "show-word-limit": "",
                        placeholder: "作为招聘的HR角色提出你的问题,AI代聊将结合你的偏好设置与微调提示词给出最终回答",
                        clearable: ""
                      }, null, 8, ["modelValue"]),
                      createVNode(_component_el_button, {
                        class: "send-btn",
                        type: "primary",
                        loading: isDebugLoading.value,
                        onClick: handleSendDebug
                      }, {
                        default: withCtx(() => [
                          createTextVNode("发送 ")
                        ]),
                        _: 1
                      }, 8, ["loading"])
                    ])
                  ])
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]);
          };
        }
      });

const RenderComponent = _sfc_main$2;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
:deep(.ai-config){padding:15px 1px 1px;background:#fff}
:deep(.config-form){margin:0}
:deep(.unit){margin-left:8px}
:deep(.select-opt-item){width:400px}
:deep(.tune-form), :deep(.debug-form){margin-bottom:10px}
:deep(.chat-history){max-height:420px;overflow-y:auto;padding:8px 4px;background:#fafafa;border:1px solid #eee;border-radius:6px}
:deep(.chat-composer){display:flex;gap:10px;margin-top:10px}
:deep(.composer-input){position:relative;width:100%}
:deep(.composer-input .el-textarea__inner){padding-right:84px;padding-bottom:50px}
:deep(.composer-input .el-input__count){bottom:40px;right:8px}
:deep(.send-btn){position:absolute;right:8px;bottom:8px}
:deep(.chat-row){display:flex;margin:8px 0}
:deep(.chat-row.from-user){justify-content:flex-start}
:deep(.chat-row.from-ai){justify-content:flex-end}
:deep(.bubble){max-width:80%;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:0 1px 2px #0000000f}
:deep(.from-user .bubble){background:#f5f7fa}
:deep(.from-ai .bubble){background:#e8f6f3}
:deep(.bubble .content){white-space:pre-wrap;word-break:break-word;font-size:13px}
:deep(.bubble .meta){font-size:12px;color:#909399;margin-bottom:4px}
:deep(.bubble .tags){margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}
:deep(.tune-form){padding:0 10px;font-weight:700}
</style>
