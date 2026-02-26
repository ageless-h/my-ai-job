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
          const apiConfigList = ref([]);
          const apiView = ref("list");
          const editingConfigId = ref(null);
          const selectedPresetId = ref("");
          const presetView = ref("list");
          const editingPresetId = ref(null);
          const presetForm = ref({ name: "", content: "", scope: "personal" });
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
            if (!Array.isArray(aiConfigExt.value.apiConfigs)) {
              aiConfigExt.value.apiConfigs = [];
            }
            if (typeof aiConfigExt.value.activeApiConfigId !== "string") {
              aiConfigExt.value.activeApiConfigId = "";
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
          const createApiConfigId = () => {
            return `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          };
          const normalizeApiConfigItem = (config) => {
            const current = config || {};
            return {
              id: current.id || createApiConfigId(),
              provider: Number(current.provider ?? 1),
              modelName: `${current.modelName || ""}`,
              apiKey: `${current.apiKey || ""}`,
              baseUrl: `${current.baseUrl || ""}`,
              timeout: Number(current.timeout || 60),
              completionsPath: `${current.completionsPath || ""}`,
              status: Number(current.status || 0),
              testPassed: Number(current.testPassed || 0)
            };
          };
          const getProviderLabel = (provider) => {
            const found = providerOptions.find((item) => item.value === provider);
            return found ? found.label : `提供商${provider}`;
          };
          const maskApiKey = (apiKey) => {
            const value = `${apiKey || ""}`;
            if (!value) {
              return "--";
            }
            const head = value.slice(0, Math.min(4, value.length));
            const tail = value.slice(-Math.min(4, value.length));
            return `${head}****${tail}`;
          };
          const applyApiConfigToForm = (config) => {
            const normalizedConfig = normalizeApiConfigItem(config);
            form.value = {
              ...form.value,
              provider: normalizedConfig.provider,
              modelName: normalizedConfig.modelName,
              apiKey: normalizedConfig.apiKey,
              baseUrl: normalizedConfig.baseUrl,
              timeout: normalizedConfig.timeout,
              completionsPath: normalizedConfig.completionsPath,
              status: normalizedConfig.status,
              testPassed: normalizedConfig.testPassed
            };
            handleProviderChange(form.value.provider, true);
          };
          const persistApiConfigList = (nextList, nextActiveId = void 0) => {
            const ext = ensureAiConfigExtSchema();
            ext.apiConfigs = nextList.map((item) => normalizeApiConfigItem(item));
            if (nextActiveId !== void 0) {
              ext.activeApiConfigId = nextActiveId || "";
            }
            persistAiConfigExt();
            apiConfigList.value = ext.apiConfigs.map((item) => ({ ...item }));
          };
          const loadApiConfigs = () => {
            const ext = ensureAiConfigExtSchema();
            let list = Array.isArray(ext.apiConfigs) ? ext.apiConfigs.map((item) => normalizeApiConfigItem(item)) : [];
            let activeId = typeof ext.activeApiConfigId === "string" ? ext.activeApiConfigId : "";
            let changed = false;
            if (!list.length && (form.value.apiKey || form.value.modelName || form.value.baseUrl)) {
              const defaultConfig = normalizeApiConfigItem({ ...form.value, id: createApiConfigId() });
              list = [defaultConfig];
              if (defaultConfig.status === 1) {
                activeId = defaultConfig.id;
              }
              changed = true;
            }
            if (activeId && !list.some((item) => item.id === activeId)) {
              activeId = "";
              changed = true;
            }
            if (!activeId) {
              const enabledItem = list.find((item) => item.status === 1);
              if (enabledItem) {
                activeId = enabledItem.id;
                changed = true;
              }
            }
            if (activeId) {
              const normalizedStatusList = list.map((item) => ({
                ...item,
                status: item.id === activeId ? 1 : 0
              }));
              if (normalizedStatusList.some((item, index) => item.status !== list[index].status)) {
                list = normalizedStatusList;
                changed = true;
              }
            }
            if (changed) {
              persistApiConfigList(list, activeId);
              return;
            }
            apiConfigList.value = list;
          };
          const backToList = () => {
            apiView.value = "list";
            editingConfigId.value = null;
          };
          const startNewConfig = () => {
            editingConfigId.value = null;
            form.value = {
              ...form.value,
              modelName: "",
              apiKey: "",
              baseUrl: "",
              status: 0,
              testPassed: 0
            };
            apiView.value = "edit";
          };
          const startEditConfig = (id) => {
            const selected = apiConfigList.value.find((item) => item.id === id);
            if (!selected) {
              ElMessage({ type: "warning", message: "配置不存在" });
              return;
            }
            editingConfigId.value = id;
            applyApiConfigToForm(selected);
            apiView.value = "edit";
          };
          const saveApiConfig = async () => {
            if (!formRef.value) {
              return;
            }
            await formRef.value.validate(async (valid) => {
              if (!valid) {
                return;
              }
              const id = editingConfigId.value || createApiConfigId();
              const nextItem = normalizeApiConfigItem({ ...form.value, id });
              const nextList = apiConfigList.value.map((item) => ({ ...item }));
              const existsIndex = nextList.findIndex((item) => item.id === id);
              if (existsIndex >= 0) {
                nextList[existsIndex] = nextItem;
              } else {
                nextList.unshift(nextItem);
              }
              const ext = ensureAiConfigExtSchema();
              let activeId = ext.activeApiConfigId || "";
              if (nextItem.status === 1) {
                activeId = id;
              }
              const normalizedStatusList = nextList.map((item) => ({
                ...item,
                status: activeId && item.id === activeId ? 1 : activeId ? 0 : item.status
              }));
              persistApiConfigList(normalizedStatusList, activeId);
              editingConfigId.value = id;
              apiView.value = "list";
              ElMessage({ type: "success", message: "配置已保存" });
            });
          };
          const deleteApiConfig = async (id) => {
            const current = apiConfigList.value.find((item) => item.id === id);
            if (!current) {
              return;
            }
            const confirmed = await ElMessageBox.confirm(`确认删除配置【${current.modelName || "未命名模型"}】？`, "删除确认", {
              confirmButtonText: "删除",
              cancelButtonText: "取消",
              type: "warning"
            }).then(() => true).catch(() => false);
            if (!confirmed) {
              return;
            }
            const nextList = apiConfigList.value.filter((item) => item.id !== id).map((item) => ({ ...item }));
            const ext = ensureAiConfigExtSchema();
            const activeId = ext.activeApiConfigId === id ? "" : ext.activeApiConfigId || "";
            persistApiConfigList(nextList, activeId);
            if (editingConfigId.value === id) {
              backToList();
            }
            ElMessage({ type: "success", message: "配置已删除" });
          };
          const activateApiConfig = async (id) => {
            const selected = apiConfigList.value.find((item) => item.id === id);
            if (!selected) {
              ElMessage({ type: "warning", message: "配置不存在" });
              return;
            }
            const nextList = apiConfigList.value.map((item) => ({
              ...item,
              status: item.id === id ? 1 : 0
            }));
            persistApiConfigList(nextList, id);
            applyApiConfigToForm({ ...selected, status: 1 });
            await handleSave();
            backToList();
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
          const backToPresetList = () => {
            presetView.value = "list";
            editingPresetId.value = null;
          };
          const startNewPreset = () => {
            editingPresetId.value = null;
            presetForm.value = { name: "", content: "", scope: "personal" };
            presetView.value = "edit";
          };
          const startEditPreset = (id) => {
            const preset = getPresetById(id);
            if (!preset) {
              ElMessage({ type: "warning", message: "预设不存在" });
              return;
            }
            editingPresetId.value = id;
            presetForm.value = {
              name: preset.name || "",
              content: preset.content || "",
              scope: preset.scope || "personal"
            };
            presetView.value = "edit";
          };
          const savePreset = () => {
            const name = (presetForm.value.name || "").trim();
            const content = (presetForm.value.content || "").trim();
            if (!name) {
              ElMessage({ type: "warning", message: "请输入预设名称" });
              return;
            }
            if (!content) {
              ElMessage({ type: "warning", message: "请输入预设内容" });
              return;
            }
            const ext = ensureAiConfigExtSchema();
            if (editingPresetId.value) {
              const list = getCurrentChannelPresetList();
              const idx = list.findIndex((item) => item.id === editingPresetId.value);
              if (idx >= 0) {
                list[idx] = { ...list[idx], name, content, updatedAt: Date.now() };
              } else {
                const globalList = ext.promptPresetStore.global || [];
                const gIdx = globalList.findIndex((item) => item.id === editingPresetId.value);
                if (gIdx >= 0) {
                  globalList[gIdx] = { ...globalList[gIdx], name, content };
                }
              }
            } else {
              const preset = {
                id: `personal-${Date.now()}`,
                name,
                tags: ["个人"],
                content,
                scope: "personal",
                enabled: true,
                updatedAt: Date.now()
              };
              getCurrentChannelPresetList().push(preset);
            }
            persistAiConfigExt();
            ElMessage({ type: "success", message: editingPresetId.value ? "预设已更新" : "预设已创建" });
            backToPresetList();
          };
          const togglePresetEnabled = (id) => {
            const ext = ensureAiConfigExtSchema();
            const list = getCurrentChannelPresetList();
            const idx = list.findIndex((item) => item.id === id);
            if (idx >= 0) {
              list[idx].enabled = !list[idx].enabled;
              persistAiConfigExt();
              return;
            }
            const globalList = ext.promptPresetStore.global || [];
            const gIdx = globalList.findIndex((item) => item.id === id);
            if (gIdx >= 0) {
              globalList[gIdx].enabled = !globalList[gIdx].enabled;
              persistAiConfigExt();
            }
          };
          const deletePresetById = async (id) => {
            const preset = getPresetById(id);
            if (!preset) {
              return;
            }
            if (preset.scope === "global") {
              ElMessage({ type: "warning", message: "全局预设不可删除" });
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
            const idx = list.findIndex((item) => item.id === id);
            if (idx >= 0) {
              list.splice(idx, 1);
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
          onMounted(async () => {
            fetchAllProviderDetails();
            await fetchConfig();
            loadApiConfigs();
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
              createElementVNode("div", { class: "ai-section" }, [
                createElementVNode("div", { class: "ai-section-title" }, "\u6A21\u578B\u5FAE\u8C03"),
                createElementVNode("div", _hoisted_2$1, [
                  createVNode(_component_el_form, { "label-width": "120px" }, {
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
                                createElementVNode("div", {
                                  class: normalizeClass(["preset-view-wrapper", presetView.value === "edit" ? "is-edit" : ""])
                                }, [
                                  createElementVNode("div", { class: "preset-view-panels" }, [
                                    createElementVNode("div", { class: "preset-view-list" }, [
                                      createElementVNode("div", { class: "preset-list-header" }, [
                                        createElementVNode("span", { class: "preset-list-tip" }, "管理提示词预设，启用后自动合并到系统提示词"),
                                        createVNode(_component_el_button, {
                                          type: "primary",
                                          size: "small",
                                          onClick: startNewPreset
                                        }, {
                                          default: withCtx(() => [createTextVNode("新增预设")]),
                                          _: 1
                                        })
                                      ]),
                                      presetOptions.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(presetOptions.value, (preset) => {
                                        return openBlock(), createElementBlock("div", {
                                          key: preset.id,
                                          class: "preset-card"
                                        }, [
                                          createElementVNode("div", { class: "preset-card__header" }, [
                                            createElementVNode("span", { class: "preset-card__name" }, toDisplayString(preset.name), 1),
                                            createVNode(_component_el_tag, {
                                              size: "small",
                                              type: preset.scope === "global" ? "warning" : "primary"
                                            }, {
                                              default: withCtx(() => [
                                                createTextVNode(toDisplayString(preset.scope === "global" ? "全局" : "模型"), 1)
                                              ]),
                                              _: 2
                                            }, 1032, ["type"])
                                          ]),
                                          createElementVNode("div", { class: "preset-card__content" }, toDisplayString(
                                            (preset.content || "").length > 80 ? (preset.content || "").slice(0, 80) + "..." : preset.content || "暂无内容"
                                          ), 1),
                                          createElementVNode("div", { class: "preset-card__actions" }, [
                                            createVNode(_component_el_switch, {
                                              modelValue: preset.enabled !== false,
                                              "onUpdate:modelValue": ($event) => togglePresetEnabled(preset.id),
                                              size: "small",
                                              "active-text": "启用",
                                              "inactive-text": ""
                                            }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                            createElementVNode("div", { class: "preset-card__buttons" }, [
                                              createVNode(_component_el_button, {
                                                size: "small",
                                                type: "primary",
                                                plain: "",
                                                onClick: ($event) => startEditPreset(preset.id)
                                              }, {
                                                default: withCtx(() => [createTextVNode("编辑")]),
                                                _: 2
                                              }, 1032, ["onClick"]),
                                              createVNode(_component_el_button, {
                                                size: "small",
                                                type: "danger",
                                                plain: "",
                                                disabled: preset.scope === "global",
                                                onClick: ($event) => deletePresetById(preset.id)
                                              }, {
                                                default: withCtx(() => [createTextVNode("删除")]),
                                                _: 2
                                              }, 1032, ["disabled", "onClick"])
                                            ])
                                          ])
                                        ]);
                                      }), 128)) : (openBlock(), createBlock(_component_el_empty, {
                                        key: 1,
                                        description: "暂无预设，点击右上角新增"
                                      }))
                                    ]),
                                    createElementVNode("div", { class: "preset-view-edit" }, [
                                      createElementVNode("div", { class: "preset-edit-header" }, [
                                        createVNode(_component_el_button, {
                                          link: "",
                                          type: "primary",
                                          onClick: backToPresetList
                                        }, {
                                          default: withCtx(() => [createTextVNode("← 返回列表")]),
                                          _: 1
                                        }),
                                        createElementVNode("span", { class: "preset-edit-title" }, toDisplayString(editingPresetId.value ? "编辑预设" : "新增预设"), 1)
                                      ]),
                                      createVNode(_component_el_form_item, { label: "预设名称" }, {
                                        default: withCtx(() => [
                                          createVNode(_component_el_input, {
                                            modelValue: presetForm.value.name,
                                            "onUpdate:modelValue": ($event) => presetForm.value.name = $event,
                                            placeholder: "例如：技术岗稳健沟通"
                                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                        ]),
                                        _: 1
                                      }),
                                      createVNode(_component_el_form_item, { label: "预设内容" }, {
                                        default: withCtx(() => [
                                          createVNode(_component_el_input, {
                                            modelValue: presetForm.value.content,
                                            "onUpdate:modelValue": ($event) => presetForm.value.content = $event,
                                            type: "textarea",
                                            rows: 6,
                                            maxlength: 5e3,
                                            "show-word-limit": "",
                                            placeholder: "输入提示词预设内容"
                                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                        ]),
                                        _: 1
                                      }),
                                      createElementVNode("div", { style: { "display": "flex", "gap": "8px", "justify-content": "flex-end" } }, [
                                        createVNode(_component_el_button, {
                                          onClick: backToPresetList
                                        }, {
                                          default: withCtx(() => [createTextVNode("取消")]),
                                          _: 1
                                        }),
                                        createVNode(_component_el_button, {
                                          type: "primary",
                                          onClick: savePreset
                                        }, {
                                          default: withCtx(() => [createTextVNode("保存预设")]),
                                          _: 1
                                        })
                                      ])
                                    ])
                                  ])
                                ], 2)
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
                  })
                ])
              ]),
              createElementVNode("div", { class: "ai-section" }, [
                createElementVNode("div", { class: "ai-section-title" }, "\u81EA\u6709API\u914D\u7F6E"),
                createElementVNode("div", {
                  class: normalizeClass(["api-view-wrapper", apiView.value === "edit" ? "is-edit" : ""])
                }, [
                  createElementVNode("div", { class: "api-view-panels" }, [
                    createElementVNode("div", { class: "api-view-list api-config-list" }, [
                      createElementVNode("div", { class: "api-list-header" }, [
                        createElementVNode("span", { class: "api-list-tip" }, "管理多个 API Key，按需启用"),
                        createVNode(_component_el_button, {
                          type: "primary",
                          onClick: startNewConfig
                        }, {
                          default: withCtx(() => [
                            createTextVNode("新增配置")
                          ]),
                          _: 1
                        })
                      ]),
                      apiConfigList.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(apiConfigList.value, (item) => {
                        return openBlock(), createElementBlock("div", {
                          key: item.id,
                          class: "api-config-card"
                        }, [
                          createElementVNode("div", { class: "api-config-card__meta" }, [
                            createElementVNode("div", { class: "api-config-card__line" }, [
                              createElementVNode("span", { class: "api-config-card__label" }, "Base URL"),
                              createElementVNode("span", { class: "api-config-card__value" }, toDisplayString(item.baseUrl || "--"), 1)
                            ]),
                            createElementVNode("div", { class: "api-config-card__line" }, [
                              createElementVNode("span", { class: "api-config-card__label" }, "模型"),
                              createElementVNode("span", { class: "api-config-card__value" }, toDisplayString(item.modelName || "--"), 1)
                            ]),
                            createElementVNode("div", { class: "api-config-card__line" }, [
                              createElementVNode("span", { class: "api-config-card__label" }, "API Key"),
                              createElementVNode("span", { class: "api-config-card__value" }, toDisplayString(maskApiKey(item.apiKey)), 1)
                            ])
                          ]),
                          createElementVNode("div", { class: "api-config-card__actions" }, [
                            createVNode(_component_el_tag, {
                              size: "small",
                              type: item.id === aiConfigExt.value.activeApiConfigId ? "success" : "info"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(item.id === aiConfigExt.value.activeApiConfigId ? "已启用" : "未启用"), 1)
                              ]),
                              _: 2
                            }, 1032, ["type"]),
                            createElementVNode("div", { class: "api-config-card__buttons" }, [
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "primary",
                                plain: "",
                                onClick: ($event) => startEditConfig(item.id)
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("编辑")
                                ]),
                                _: 2
                              }, 1032, ["onClick"]),
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "success",
                                disabled: item.id === aiConfigExt.value.activeApiConfigId,
                                onClick: ($event) => activateApiConfig(item.id)
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("启用")
                                ]),
                                _: 2
                              }, 1032, ["disabled", "onClick"]),
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "danger",
                                plain: "",
                                onClick: ($event) => deleteApiConfig(item.id)
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("删除")
                                ]),
                                _: 2
                              }, 1032, ["onClick"])
                            ])
                          ])
                        ]);
                      }), 128)) : (openBlock(), createBlock(_component_el_empty, {
                        key: 1,
                        description: "暂无配置，点击右上角新增配置"
                      }))
                    ]),
                    createElementVNode("div", { class: "api-view-edit" }, [
                createVNode(_component_el_form, {
                  ref_key: "formRef",
                  ref: formRef,
                  model: form.value,
                  rules: rules2,
                  "label-width": "120px",
                  class: "config-form api-config-form"
                }, {
                  default: withCtx(() => [
                          createElementVNode("div", { class: "api-edit-header" }, [
                            createVNode(_component_el_button, {
                              link: "",
                              type: "primary",
                              onClick: backToList
                            }, {
                              default: withCtx(() => [
                                createTextVNode("\u2190 返回列表")
                              ]),
                              _: 1
                            }),
                            createElementVNode("span", { class: "api-edit-title" }, toDisplayString(editingConfigId.value ? "编辑配置" : "新增配置"), 1)
                          ]),
                          createVNode(_component_el_form_item, {
                            label: "BASE URL",
                            prop: "baseUrl"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.baseUrl,
                                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => form.value.baseUrl = $event),
                                placeholder: "请输入 Base URL，如 https://api.openai.com/v1"
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, {
                            label: "API KEY",
                            prop: "apiKey"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.apiKey,
                                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.value.apiKey = $event),
                                placeholder: "请输入 API Key",
                                "show-password": ""
                              }, null, 8, ["modelValue"])
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_form_item, {
                            label: "模型名称",
                            prop: "modelName"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_input, {
                                modelValue: form.value.modelName,
                                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.value.modelName = $event),
                                placeholder: "请输入模型名称，如 gpt-4o / deepseek-chat"
                              }, null, 8, ["modelValue"])
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
                              createVNode(_component_el_button, {
                                type: "primary",
                                onClick: saveApiConfig
                              }, {
                                default: withCtx(() => [
                                  createTextVNode("保存配置")
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1

                }, 8, ["model"])
                    ])
                  ])
                ], 2)
              ]),
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
:deep(.api-view-wrapper){position:relative;overflow:hidden}
:deep(.api-view-panels){display:flex;width:200%;transition:transform .28s ease}
:deep(.api-view-wrapper.is-edit .api-view-panels){transform:translateX(-50%)}
:deep(.api-view-list), :deep(.api-view-edit){width:50%;flex-shrink:0}
:deep(.api-config-list){padding-right:2px}
:deep(.api-list-header){display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
:deep(.api-list-tip){font-size:12px;color:#909399}
:deep(.api-config-card){border:1px solid var(--ai-border,#f0f2f5);border-radius:var(--ai-radius-sm,6px);padding:10px 12px;margin-bottom:10px;background:var(--ai-bg-subtle,#f5f7fa);box-shadow:var(--ai-shadow-sm,0 1px 2px rgba(0,0,0,.05))}
:deep(.api-config-card__meta){display:flex;flex-direction:column;gap:6px}
:deep(.api-config-card__line){display:flex;justify-content:space-between;gap:8px;font-size:12px}
:deep(.api-config-card__label){color:#909399}
:deep(.api-config-card__value){color:#303133;word-break:break-all;text-align:right}
:deep(.api-config-card__actions){margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
:deep(.api-config-card__buttons){display:flex;align-items:center;gap:8px}
:deep(.api-view-edit){padding-left:4px}
:deep(.api-edit-header){display:flex;align-items:center;gap:10px;margin-bottom:6px}
:deep(.api-edit-title){font-size:13px;font-weight:600;color:#303133}
:deep(.api-config-form){padding-right:2px}
:deep(.preset-view-wrapper){position:relative;overflow:hidden}
:deep(.preset-view-panels){display:flex;width:200%;transition:transform .28s ease}
:deep(.preset-view-wrapper.is-edit .preset-view-panels){transform:translateX(-50%)}
:deep(.preset-view-list), :deep(.preset-view-edit){width:50%;flex-shrink:0}
:deep(.preset-list-header){display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
:deep(.preset-list-tip){font-size:12px;color:#909399}
:deep(.preset-card){border:1px solid var(--ai-border,#f0f2f5);border-radius:var(--ai-radius-sm,6px);padding:10px 12px;margin-bottom:10px;background:var(--ai-bg-subtle,#f5f7fa);box-shadow:var(--ai-shadow-sm,0 1px 2px rgba(0,0,0,.05))}
:deep(.preset-card__header){display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
:deep(.preset-card__name){font-size:13px;font-weight:600;color:#303133}
:deep(.preset-card__content){font-size:12px;color:#606266;line-height:1.5;margin-bottom:8px;word-break:break-all}
:deep(.preset-card__actions){display:flex;align-items:center;justify-content:space-between;gap:8px}
:deep(.preset-card__buttons){display:flex;align-items:center;gap:8px}
:deep(.preset-view-edit){padding-left:4px}
:deep(.preset-edit-header){display:flex;align-items:center;gap:10px;margin-bottom:6px}
:deep(.preset-edit-title){font-size:13px;font-weight:600;color:#303133}
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
