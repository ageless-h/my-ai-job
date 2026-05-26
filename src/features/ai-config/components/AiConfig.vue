<!--
/**
 * AiConfig.vue - AI 配置面板组件
 * 
 * 提供 AI 模型配置、API 密钥管理、提示词预设等功能。
 * 
 * 主要功能：
 * - AI 供应商选择（Deepseek、火山引擎、硅基流动、月之暗面、Open Router）
 * - 模型配置（模型名称、API Key、Base URL、超时设置）
 * - API 连接测试
 * - 提示词预设管理（全局预设、模型专属预设）
 * - AI 投递判断提示词配置
 * - 调试控制台（查看 AI 请求/响应历史）
 * 
 * 技术特性：
 * - 配置持久化到 localStorage
 * - 支持多供应商配置切换
 * - 实时预览最终提示词
 * - API 配置测试验证
 * 
 * @component
 */
-->
<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Plus, Back } from '@element-plus/icons-vue';
import { request, showAppMessage } from '@/core/http/request';
import { directTest } from '@/core/ai/direct-ai-client';
import { SecureLocalDB } from '@/core/storage';
import type { AiConfig } from '@/core/storage';
import {
  Tools,
  DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
  type AiConfigExt,
  type PromptPresetItem,
  type AiDeliveryPromptItem,
  type AiDeliveryPromptStore,
} from '@/shared/utils/tools';
import ApiKeyManager from './ApiKeyManager.vue';
import PromptPresetManager from './PromptPresetManager.vue';
import DebugConsole from './DebugConsole.vue';

interface FormConfig {
  id?: string;
  userId: number;
  provider: number;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  timeout: number;
  completionsPath: string;
  apiFormat: string;
  testPassed: number;
  status: number;
  userPrompt: string;
}

interface ProviderDetail {
  code: number;
  defaultBaseUrl: string;
  [key: string]: unknown;
}

type ProviderDetailsMap = Record<number, ProviderDetail>;

type PromptPresetScope = 'global' | 'personal';

type PromptPreset = PromptPresetItem & {
  scope: PromptPresetScope;
};

interface PromptPresetOption extends PromptPreset {
  optionLabel: string;
}

interface AiDeliveryPromptEditForm {
  name: string;
  prompt: string;
  extraPrompt: string;
}

const formRef = ref<unknown>(null);
const debugConsoleRef = ref<{ open?: () => void } | null>(null);

const providerOptions = [
  { label: '自定义', value: 0 },
  { label: 'Deepseek', value: 1 },
  { label: '火山引擎', value: 2 },
  { label: '硅基流动', value: 3 },
  { label: '月之暗面', value: 4 },
  { label: 'Open Router', value: 5 },
];

const modelOptions: Record<number, string[]> = {
  0: [],
  1: ['deepseek-chat', 'deepseek-reasoner'],
  2: ['deepseek-r1-250120', '...'],
  3: ['deepseek-ai/DeepSeek-V3', '...'],
  4: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  5: ['deepseek/deepseek-chat-v3-0324:free', '...'],
};

const availableModels = ref<string[]>([]);
const providerDetails = ref<ProviderDetailsMap>({});
const lastFetchedConfig = ref<Partial<FormConfig> | null>(null);
const hasShownConfigFallbackWarning = ref(false);
const isPreviewMode =
  typeof window !== 'undefined' && window.location.pathname.includes('preview.html');

const getErrorMessage = (error: unknown): string => {
  const normalized = error as { response?: { data?: { message?: string } }; message?: string };
  return normalized?.response?.data?.message || normalized?.message || '未知错误';
};

const form = ref<FormConfig>({
  userId: 0,
  provider: 1,
  modelName: '',
  apiKey: '',
  baseUrl: '',
  timeout: 60,
  completionsPath: '',
  apiFormat: 'completions',
  testPassed: 0,
  status: 0,
  userPrompt: '',
});

const isTestLoading = ref(false);
const aiConfigExt = ref<AiConfigExt>(Tools.getAiConfigExt());
const DEFAULT_AI_DELIVERY_EXTRA_PROMPT = '办公地点不进行限制，只要在国内即可';
const DEFAULT_AI_DELIVERY_PROMPT_NAME = '默认提示词';
const aiDeliveryPromptView = ref('list');
const editingAiDeliveryPromptId = ref('');
const aiDeliveryPromptEditForm = ref<AiDeliveryPromptEditForm>({
  name: '',
  prompt: '',
  extraPrompt: '',
});

const buildCurrentModelChannelKey = () =>
  Tools.buildModelChannelKey(form.value.provider, form.value.modelName);

const ensureAiConfigExtSchema = (): AiConfigExt => {
  if (!aiConfigExt.value) {
    aiConfigExt.value = Tools.getAiConfigExt();
  }
  if (!aiConfigExt.value.currentConfig) {
    aiConfigExt.value.currentConfig = { provider: 1, modelName: '' };
  }
  if (!Array.isArray(aiConfigExt.value.apiConfigs)) {
    aiConfigExt.value.apiConfigs = [];
  }
  if (typeof aiConfigExt.value.activeApiConfigId !== 'string') {
    aiConfigExt.value.activeApiConfigId = '';
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
  if (typeof aiConfigExt.value.promptPresetStore.globalPresetInitialized !== 'boolean') {
    aiConfigExt.value.promptPresetStore.globalPresetInitialized =
      aiConfigExt.value.promptPresetStore.global.length > 0;
  }
  if (!aiConfigExt.value.promptPresetStore.personal) {
    aiConfigExt.value.promptPresetStore.personal = {};
  }
  if (!aiConfigExt.value.debugHistoryByChannel) {
    aiConfigExt.value.debugHistoryByChannel = {};
  }
  if (!aiConfigExt.value.uiLayout) {
    aiConfigExt.value.uiLayout = { style: 'dashboard-2col' };
  }
  if (!aiConfigExt.value.uiLayout.style) {
    aiConfigExt.value.uiLayout.style = 'dashboard-2col';
  }
  if (
    !aiConfigExt.value.aiDeliveryPromptStore ||
    typeof aiConfigExt.value.aiDeliveryPromptStore !== 'object'
  ) {
    aiConfigExt.value.aiDeliveryPromptStore = { items: [], activePromptId: '' };
  }
  if (!Array.isArray(aiConfigExt.value.aiDeliveryPromptStore.items)) {
    aiConfigExt.value.aiDeliveryPromptStore.items = [];
  }
  if (typeof aiConfigExt.value.aiDeliveryPromptStore.activePromptId !== 'string') {
    aiConfigExt.value.aiDeliveryPromptStore.activePromptId = '';
  }
  return aiConfigExt.value;
};

const persistAiConfigExt = () => {
  aiConfigExt.value = Tools.saveAiConfigExt(ensureAiConfigExtSchema());
};

const ensureGlobalPresetCatalog = () => {
  const ext = ensureAiConfigExtSchema();
  if (ext.promptPresetStore.globalPresetInitialized) {
    return;
  }
  ext.promptPresetStore.global = [
    {
      id: 'global-brief-professional',
      name: '简洁专业',
      tags: ['通用', '稳健'],
      content: '请使用简洁、专业、礼貌的语气回复，优先给出可执行结论。',
      scope: 'global',
      enabled: true,
    },
    {
      id: 'global-value-driven',
      name: '价值导向',
      tags: ['通用', '亮点'],
      content: '回答中优先突出可量化成果、项目价值和岗位匹配度，避免空泛表达。',
      scope: 'global',
      enabled: true,
    },
  ];
  ext.promptPresetStore.globalPresetInitialized = true;
  persistAiConfigExt();
};

const getCurrentChannelPresetList = (): PromptPresetItem[] => {
  const ext = ensureAiConfigExtSchema();
  const key = buildCurrentModelChannelKey();
  const current = ext.promptPresetStore.personal[key];
  if (!Array.isArray(current)) {
    ext.promptPresetStore.personal[key] = [];
    persistAiConfigExt();
  }
  return ext.promptPresetStore.personal[key] || [];
};

const getMergedPresetList = (): PromptPreset[] => {
  const ext = ensureAiConfigExtSchema();
  const channelPresetList = getCurrentChannelPresetList().map((preset: PromptPresetItem) => ({
    ...preset,
    scope: 'personal' as PromptPresetScope,
  }));
  const channelNameSet = new Set(
    channelPresetList.map((preset) => `${preset.name || ''}`.trim()).filter((name) => !!name)
  );
  const globalPresetList = (ext.promptPresetStore.global || [])
    .filter((preset: PromptPresetItem) => {
      const name = `${preset.name || ''}`.trim();
      return !name || !channelNameSet.has(name);
    })
    .map((preset: PromptPresetItem) => ({ ...preset, scope: 'global' as PromptPresetScope }));
  return [...globalPresetList, ...channelPresetList];
};

const getPresetById = (presetId: string | null | undefined): PromptPreset | null => {
  if (!presetId) {
    return null;
  }
  return getMergedPresetList().find((preset) => preset.id === presetId) || null;
};

const presetOptions = computed<PromptPresetOption[]>(() => {
  return getMergedPresetList().map((preset) => ({
    ...preset,
    optionLabel: `${preset.scope === 'personal' ? '[模型]' : '[全局]'} ${preset.name}`,
  }));
});

const finalPromptPreview = computed(() => {
  const enabledMergedText = getMergedPresetList()
    .filter((preset) => preset.enabled !== false)
    .map(
      (preset, index) =>
        `# ${preset.scope === 'personal' ? '模型' : '全局'}预设${index + 1} ${preset.name}\n${preset.content}`
    )
    .join('\n\n');
  return enabledMergedText || '暂无可用提示词内容';
});

const syncCurrentChannelToExt = () => {
  const ext = ensureAiConfigExtSchema();
  ext.currentConfig = {
    provider: form.value.provider,
    modelName: form.value.modelName || '',
  };
  persistAiConfigExt();
};

const compareWithLastConfig = () => {
  if (!lastFetchedConfig.value) {
    return false;
  }
  const currentConfig = form.value;
  const normalizeCompletionsPath = (path: string | null | undefined): string => {
    return !path || path.trim() === '' ? '' : path;
  };
  return (
    currentConfig.provider === lastFetchedConfig.value.provider &&
    currentConfig.modelName === lastFetchedConfig.value.modelName &&
    currentConfig.apiKey === lastFetchedConfig.value.apiKey &&
    currentConfig.baseUrl === lastFetchedConfig.value.baseUrl &&
    normalizeCompletionsPath(currentConfig.completionsPath) ===
      normalizeCompletionsPath(lastFetchedConfig.value.completionsPath)
  );
};

const handleProviderChange = (value: number, keepModelName = false): void => {
  availableModels.value = modelOptions[value] || [];
  if (!keepModelName) {
    form.value.modelName = '';
  }
  if (value !== 0 && providerDetails.value[value]) {
    form.value.baseUrl = providerDetails.value[value].defaultBaseUrl;
  }
  const isDataUnchanged = compareWithLastConfig();
  if (!isDataUnchanged) {
    form.value.testPassed = 0;
  }
};

const fetchAllProviderDetails = async () => {
  // 从本地配置获取供应商信息
  try {
    const configs = await SecureLocalDB.getAiConfigs();
    // 根据本地配置构建供应商详情
    const detailsMap: ProviderDetailsMap = {};
    configs.forEach((config) => {
      const code = Number(config.provider);
      if (Number.isFinite(code) && !detailsMap[code]) {
        detailsMap[code] = {
          code,
          name: config.provider,
          models: [config.modelName],
          defaultBaseUrl: config.baseUrl,
        } as unknown as ProviderDetail;
      } else if (detailsMap[code] && Array.isArray(detailsMap[code].models)) {
        (detailsMap[code].models as string[]).push(config.modelName);
      }
    });
    providerDetails.value = detailsMap;
  } catch (error: any) {
    providerDetails.value = {};
    console.warn('[AI对话] 获取供应商信息失败，已使用默认供应商配置', error);
  }
};

const applyLocalConfigFallback = () => {
  ensureGlobalPresetCatalog();
  const ext = ensureAiConfigExtSchema();
  const fallbackConfig = {
    status: 0,
    provider: Number(ext?.currentConfig?.provider || 1),
    timeout: 60,
    modelName: `${ext?.currentConfig?.modelName || ''}`,
  };

  form.value = { ...form.value, ...fallbackConfig };
  lastFetchedConfig.value = { ...fallbackConfig };
  handleProviderChange(form.value.provider, true);
  syncCurrentChannelToExt();

  if (!isPreviewMode && !hasShownConfigFallbackWarning.value) {
    showAppMessage({ type: 'warning', message: '配置接口暂不可用，已使用本地配置' });
    hasShownConfigFallbackWarning.value = true;
  }
};

const fetchConfig = async () => {
  try {
    // 从本地存储获取当前激活的 AI 配置
    const activeConfig = await SecureLocalDB.getActiveAiConfig();
    ensureGlobalPresetCatalog();

    if (activeConfig) {
      // 转换本地配置到表单格式
      const config = {
        id: activeConfig.id,
        userId: 0, // 本地存储不使用 userId
        provider: Number(activeConfig.provider) || 1,
        modelName: activeConfig.modelName,
        apiKey: activeConfig.apiKey,
        baseUrl: activeConfig.baseUrl,
        timeout: activeConfig.timeout || 60,
        completionsPath: '/chat/completions',
        apiFormat: activeConfig.apiFormat || 'completions',
        testPassed: 1, // 已激活的配置默认测试通过
        status: 1,
        userPrompt: '',
      };
      form.value = { ...form.value, ...config };
      lastFetchedConfig.value = { ...config };

      const ext = ensureAiConfigExtSchema();
      if (
        !form.value.modelName &&
        ext?.currentConfig &&
        ext.currentConfig.provider === form.value.provider &&
        ext.currentConfig.modelName
      ) {
        form.value.modelName = ext.currentConfig.modelName;
      }
      handleProviderChange(form.value.provider, true);
      syncCurrentChannelToExt();
    } else {
      // 没有本地配置，使用默认值
      applyLocalConfigFallback();
    }
  } catch (error) {
    applyLocalConfigFallback();
  }
};

watch(
  () => [
    form.value.provider,
    form.value.modelName,
    form.value.apiKey,
    form.value.baseUrl,
    form.value.completionsPath,
    form.value.timeout,
    form.value.status,
  ],
  () => {
    const isDataUnchanged = compareWithLastConfig();
    if (!isDataUnchanged) {
      form.value.testPassed = 0;
    }
    if (lastFetchedConfig.value?.testPassed && isDataUnchanged) {
      form.value.testPassed = 1;
    }
  }
);

const doPersistConfig = async (): Promise<boolean> => {
  if (Number(form.value.provider) === 0) {
    syncCurrentChannelToExt();
    return true;
  }

  // 保存到本地存储
  const config: AiConfig = {
    id: form.value.id || `config-${Date.now()}`,
    name: `${form.value.provider}-${form.value.modelName}`,
    provider: String(form.value.provider),
    modelName: form.value.modelName,
    apiKey: form.value.apiKey,
    baseUrl: form.value.baseUrl,
    timeout: form.value.timeout,
    apiFormat: (form.value.apiFormat as any) || 'completions',
    isActive: true,
    createdAt: Date.now(),
  };

  await SecureLocalDB.saveAiConfig(config);
  await SecureLocalDB.setActiveAiConfig(config.id);
  syncCurrentChannelToExt();
  return true;
};

const handleSave = async () => {
  try {
    const ok = await doPersistConfig();
    if (ok) {
      showAppMessage({ type: 'success', message: '保存成功' });
    }
  } catch (e) {
    const msg = getErrorMessage(e);
    showAppMessage({ type: 'error', message: `保存失败: ${msg}` });
  }
};

const handleTempSave = async () => {
  try {
    const ok = await doPersistConfig();
    if (ok) {
      showAppMessage({ type: 'success', message: '保存成功' });
      await fetchConfig();
    }
  } catch (error) {
    showAppMessage({ type: 'error', message: '保存失败' });
  }
};

const handleSavePrompt = async () => {
  if (Number(form.value.provider) === 0) {
    syncCurrentChannelToExt();
    showAppMessage({ type: 'success', message: '保存成功' });
    return;
  }

  try {
    // 提示词通过 Tools.saveAiConfigExt 保存到 localStorage
    syncCurrentChannelToExt();
    showAppMessage({ type: 'success', message: '保存成功' });
  } catch (e) {
    showAppMessage({ type: 'error', message: `保存失败: ${getErrorMessage(e)}` });
  }
};

const buildAiDeliveryPromptId = () =>
  `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getAiDeliveryPromptStore = (): AiDeliveryPromptStore => {
  const ext = ensureAiConfigExtSchema();
  if (!ext.aiDeliveryPromptStore || typeof ext.aiDeliveryPromptStore !== 'object') {
    ext.aiDeliveryPromptStore = { items: [], activePromptId: '' };
  }
  if (!Array.isArray(ext.aiDeliveryPromptStore.items)) {
    ext.aiDeliveryPromptStore.items = [];
  }
  if (typeof ext.aiDeliveryPromptStore.activePromptId !== 'string') {
    ext.aiDeliveryPromptStore.activePromptId = '';
  }
  return ext.aiDeliveryPromptStore;
};

const aiDeliveryPromptList = computed<AiDeliveryPromptItem[]>(
  () => getAiDeliveryPromptStore().items || []
);
const activeAiDeliveryPromptId = computed<string>(
  () => getAiDeliveryPromptStore().activePromptId || ''
);

const getActiveAiDeliveryPrompt = (): AiDeliveryPromptItem | null => {
  const store = getAiDeliveryPromptStore();
  const active = (store.items || []).find(
    (item: AiDeliveryPromptItem) => item.id === store.activePromptId
  );
  return active || store.items[0] || null;
};

const syncAiDeliveryPromptToJudgeConfig = (showToast = false) => {
  const store = getAiDeliveryPromptStore();
  const active = getActiveAiDeliveryPrompt();
  if (!active) {
    return;
  }
  if (store.activePromptId !== active.id) {
    store.activePromptId = active.id;
    persistAiConfigExt();
  }
  Tools.saveAiDeliveryJudgeConfig({
    prompt: `${active.prompt || ''}`.trim(),
    extraPrompt: `${active.extraPrompt || ''}`.trim(),
  });
  if (showToast) {
    showAppMessage({ type: 'success', message: 'AI投递提示词已保存' });
  }
};

const loadAiDeliveryPromptConfig = () => {
  const currentConfig = Tools.getAiDeliveryJudgeConfig();
  const store = getAiDeliveryPromptStore();

  if (!Array.isArray(store.items) || store.items.length === 0) {
    store.items = [
      {
        id: buildAiDeliveryPromptId(),
        name: DEFAULT_AI_DELIVERY_PROMPT_NAME,
        prompt: currentConfig.prompt || DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
        extraPrompt: currentConfig.extraPrompt || DEFAULT_AI_DELIVERY_EXTRA_PROMPT,
        updatedAt: Date.now(),
      },
    ];
    store.activePromptId = store.items[0].id;
    persistAiConfigExt();
  } else if (
    !store.activePromptId ||
    !store.items.some((item) => item.id === store.activePromptId)
  ) {
    store.activePromptId = store.items[0].id;
    persistAiConfigExt();
  }

  syncAiDeliveryPromptToJudgeConfig(false);
};

const backToAiDeliveryPromptList = () => {
  aiDeliveryPromptView.value = 'list';
  editingAiDeliveryPromptId.value = '';
};

const startNewAiDeliveryPrompt = () => {
  editingAiDeliveryPromptId.value = '';
  aiDeliveryPromptEditForm.value = {
    name: '',
    prompt: DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
    extraPrompt: DEFAULT_AI_DELIVERY_EXTRA_PROMPT,
  };
  aiDeliveryPromptView.value = 'edit';
};

const startEditAiDeliveryPrompt = (id: string): void => {
  const item = getAiDeliveryPromptStore().items.find(
    (entry: AiDeliveryPromptItem) => entry.id === id
  );
  if (!item) {
    showAppMessage({ type: 'warning', message: '提示词不存在' });
    return;
  }
  editingAiDeliveryPromptId.value = id;
  aiDeliveryPromptEditForm.value = {
    name: item.name || '',
    prompt: item.prompt || DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
    extraPrompt: item.extraPrompt || DEFAULT_AI_DELIVERY_EXTRA_PROMPT,
  };
  aiDeliveryPromptView.value = 'edit';
};

const saveAiDeliveryPromptItem = () => {
  const name = `${aiDeliveryPromptEditForm.value.name || ''}`.trim();
  const prompt = `${aiDeliveryPromptEditForm.value.prompt || ''}`.trim();
  const extraPrompt = `${aiDeliveryPromptEditForm.value.extraPrompt || ''}`.trim();

  if (!name) {
    showAppMessage({ type: 'warning', message: '请输入提示词名称' });
    return;
  }
  if (!prompt) {
    showAppMessage({ type: 'warning', message: '请输入判断提示词' });
    return;
  }

  const store = getAiDeliveryPromptStore();
  if (editingAiDeliveryPromptId.value) {
    const index = store.items.findIndex((item) => item.id === editingAiDeliveryPromptId.value);
    if (index >= 0) {
      store.items[index] = {
        ...store.items[index],
        name,
        prompt,
        extraPrompt,
        updatedAt: Date.now(),
      };
    }
  } else {
    const created = {
      id: buildAiDeliveryPromptId(),
      name,
      prompt,
      extraPrompt,
      updatedAt: Date.now(),
    };
    store.items.push(created);
    store.activePromptId = created.id;
  }

  persistAiConfigExt();
  syncAiDeliveryPromptToJudgeConfig(false);
  showAppMessage({
    type: 'success',
    message: editingAiDeliveryPromptId.value ? '提示词已更新' : '提示词已创建并启用',
  });
  backToAiDeliveryPromptList();
};

const activateAiDeliveryPrompt = (id: string): void => {
  const store = getAiDeliveryPromptStore();
  const item = store.items.find((entry: AiDeliveryPromptItem) => entry.id === id);
  if (!item) {
    showAppMessage({ type: 'warning', message: '提示词不存在' });
    return;
  }
  store.activePromptId = id;
  persistAiConfigExt();
  syncAiDeliveryPromptToJudgeConfig(false);
  showAppMessage({ type: 'success', message: `已启用：${item.name}` });
};

const handleAiDeliveryPromptSwitch = (id: string, value: boolean | string | number): void => {
  if (Boolean(value)) {
    activateAiDeliveryPrompt(id);
  }
};

const deleteAiDeliveryPrompt = async (id: string): Promise<void> => {
  const store = getAiDeliveryPromptStore();
  const item = store.items.find((entry: AiDeliveryPromptItem) => entry.id === id);
  if (!item) {
    return;
  }
  const confirmed = await ElMessageBox.confirm(`确认删除提示词【${item.name}】？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => true)
    .catch(() => false);

  if (!confirmed) {
    return;
  }

  const index = store.items.findIndex((entry: AiDeliveryPromptItem) => entry.id === id);
  if (index < 0) {
    return;
  }
  store.items.splice(index, 1);

  if (store.items.length === 0) {
    const fallback = {
      id: buildAiDeliveryPromptId(),
      name: DEFAULT_AI_DELIVERY_PROMPT_NAME,
      prompt: DEFAULT_AI_DELIVERY_JUDGE_PROMPT,
      extraPrompt: DEFAULT_AI_DELIVERY_EXTRA_PROMPT,
      updatedAt: Date.now(),
    };
    store.items.push(fallback);
    store.activePromptId = fallback.id;
  } else if (store.activePromptId === id) {
    store.activePromptId = store.items[0].id;
  }

  if (editingAiDeliveryPromptId.value === id) {
    backToAiDeliveryPromptList();
  }

  persistAiConfigExt();
  syncAiDeliveryPromptToJudgeConfig(false);
  showAppMessage({ type: 'success', message: '提示词已删除' });
};

const handleSaveAiDeliveryPrompt = () => {
  syncAiDeliveryPromptToJudgeConfig(true);
};

const handleTest = async (): Promise<void> => {
  isTestLoading.value = true;
  try {
    // Use local direct test instead of backend API
    const config = {
      baseUrl: form.value.baseUrl,
      apiKey: form.value.apiKey,
      modelName: form.value.modelName,
      apiFormat: (form.value.apiFormat as any) || 'completions',
      timeout: form.value.timeout,
    };
    const result = await directTest(config);
    showAppMessage({ type: 'success', message: `测试通过: ${result || ''}` });
    form.value.testPassed = 1;
  } catch (e) {
    showAppMessage({ type: 'error', message: `测试失败: ${getErrorMessage(e)}` });
  } finally {
    isTestLoading.value = false;
  }
};

watch(
  () => `${form.value.provider}:${form.value.modelName || ''}`,
  () => {
    syncCurrentChannelToExt();
  }
);

const openDebugDialog = () => {
  debugConsoleRef.value?.open?.();
};

provide('aiConfigState', {
  form,
  aiConfigExt,

  ensureAiConfigExtSchema,
  persistAiConfigExt,
  buildCurrentModelChannelKey,
  getCurrentChannelPresetList,
  getMergedPresetList,
  getPresetById,

  showAppMessage,
  ElMessageBox,

  fetchConfig,
  handleSave,
  handleTempSave,
  handleTest,
  handleProviderChange,
});

onMounted(async () => {
  fetchAllProviderDetails();
  await fetchConfig();
  loadAiDeliveryPromptConfig();
});
</script>

<template>
  <div class="ai-config-tab">
    <div class="boss-card mt-16">
      <div class="card-title">提示词中心</div>
      <div class="ai-section-desc">统一管理系统判断和代聊预设，支持调试</div>
      <div class="nested-card">
        <div class="nested-title">提示词预设管理</div>
        <div class="nested-desc">管理全局与模型预设，启用后自动合并到系统提示词。</div>
        <div class="nested-body">
          <PromptPresetManager />
        </div>
        <div class="nested-actions">
          <el-button type="primary" @click="handleSavePrompt">保存</el-button>
          <el-button type="warning" @click="openDebugDialog">调试</el-button>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">AI投递判定提示词</div>
      <div class="ai-section-desc">
        统一维护岗位级 AI 判定提示词与附加指令；判定开关请在「AI 投递判定」Tab 中打开。
      </div>
      <div class="nested-card">
        <div class="nested-body">
          <div :class="['delivery-view-wrapper', aiDeliveryPromptView === 'edit' ? 'is-edit' : '']">
            <div class="delivery-view-panels">
              <div class="delivery-view-list">
                <div class="delivery-list-header">
                  <span class="delivery-list-tip">支持多套判定策略，按需开启生效</span>
                  <el-button class="boss-btn-primary" @click="startNewAiDeliveryPrompt">
                    <el-icon class="mr-4"><Plus /></el-icon>新增判定提示词
                  </el-button>
                </div>

                <template v-if="aiDeliveryPromptList.length">
                  <div
                    v-for="item in aiDeliveryPromptList"
                    :key="item.id"
                    class="inner-card delivery-prompt-card"
                  >
                    <div class="inner-title">{{ item.name }}</div>
                    <div class="inner-desc">
                      {{
                        (item.prompt || '').length > 90
                          ? `${(item.prompt || '').slice(0, 90)}...`
                          : item.prompt || '暂无判断提示词'
                      }}
                    </div>
                    <div class="inner-extra">
                      <span class="extra-label">附加指令：</span>
                      <span class="extra-val">{{ item.extraPrompt || '无' }}</span>
                    </div>
                    <div class="inner-actions">
                      <div class="delivery-prompt-card__status inner-status">
                        <el-switch
                          :model-value="activeAiDeliveryPromptId === item.id"
                          size="small"
                          @update:model-value="handleAiDeliveryPromptSwitch(item.id, $event)"
                        />
                        <span
                          class="status-text"
                          :class="
                            activeAiDeliveryPromptId === item.id ? 'is-active' : 'is-inactive'
                          "
                        >
                          {{ activeAiDeliveryPromptId === item.id ? '当前生效中' : '未启用' }}
                        </span>
                      </div>
                      <div class="inner-buttons">
                        <el-button
                          size="small"
                          class="boss-btn-text"
                          type="primary"
                          link
                          @click="startEditAiDeliveryPrompt(item.id)"
                          >修改策略</el-button
                        >
                        <div class="divider-v" />
                        <el-button
                          size="small"
                          class="boss-btn-text"
                          type="danger"
                          link
                          @click="deleteAiDeliveryPrompt(item.id)"
                          >删除</el-button
                        >
                      </div>
                    </div>
                  </div>
                </template>
                <el-empty v-else description="暂无判定提示词，点击右上角新增" :image-size="60" />
              </div>

              <div class="delivery-view-edit">
                <div class="boss-edit-header">
                  <el-button class="boss-btn-back" @click="backToAiDeliveryPromptList">
                    <el-icon class="mr-4"><Back /></el-icon>返回策略列表
                  </el-button>
                  <div class="boss-edit-divider" />
                  <span class="boss-edit-title mb-0">{{
                    editingAiDeliveryPromptId ? '编辑判定规则' : '新增判定规则'
                  }}</span>
                </div>

                <el-form label-position="top" class="delivery-edit-form mt-16">
                  <el-form-item label="提示词名称" class="mb-24">
                    <el-input
                      v-model="aiDeliveryPromptEditForm.name"
                      placeholder="例如：宽松地域策略"
                    />
                  </el-form-item>

                  <el-form-item label="核心判断提示词" class="mb-24">
                    <el-input
                      v-model="aiDeliveryPromptEditForm.prompt"
                      type="textarea"
                      :rows="7"
                      :maxlength="5000"
                      show-word-limit
                      placeholder='示例：你是求职投递决策助手。请根据岗位信息和求职者个人信息判断是否建议投递。只输出JSON：{"match":true|false,"reason":"原因"}。'
                    />
                  </el-form-item>

                  <el-form-item label="附加过滤指令（可选）" class="mb-24">
                    <el-input
                      v-model="aiDeliveryPromptEditForm.extraPrompt"
                      type="textarea"
                      :rows="3"
                      :maxlength="2000"
                      show-word-limit
                      placeholder="例如：办公地点不进行限制，只要在国内即可"
                    />
                  </el-form-item>
                </el-form>

                <div class="boss-edit-actions">
                  <el-button
                    class="boss-btn-text"
                    style="margin-right: auto"
                    @click="backToAiDeliveryPromptList"
                    >放弃修改</el-button
                  >
                  <el-button class="boss-btn-primary" @click="saveAiDeliveryPromptItem"
                    >确定保存策略</el-button
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="nested-actions">
          <el-button type="primary" @click="handleSaveAiDeliveryPrompt">保存AI投递提示词</el-button>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16 api-card-section">
      <div class="card-title">模型与 API 配置</div>
      <div class="ai-section-desc">支持多供应商模板、协议切换与直连测试，配置仅保存在本地。</div>
      <ApiKeyManager />
    </div>

    <DebugConsole ref="debugConsoleRef" />
  </div>
</template>

<style scoped>
.ai-config-tab {
  height: 100%;
  min-height: 0;
  width: 100%;
  padding: var(--spacing-2xl);
  padding-bottom: 100px;
  box-sizing: border-box;
  background: var(--boss-bg-color);
  overflow-y: auto;
}

.mt-16 {
  margin-top: 20px;
}

.ai-config-tab > .boss-card:first-child {
  margin-top: 0;
}

.mt-24 {
  margin-top: 24px;
}

.mb-24 {
  margin-bottom: 24px;
}

.mb-0 {
  margin-bottom: 0 !important;
}

.mr-4 {
  margin-right: 4px;
}

.boss-card {
  background: var(--boss-bg-white);
  border-radius: var(--radius-card);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--boss-border-color);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--boss-text-primary);
  margin-bottom: 8px;
}

.ai-section-desc {
  font-size: 13px;
  color: var(--boss-text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.nested-card {
  background: var(--boss-bg-color);
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.nested-title {
  padding: var(--spacing-3-5) var(--spacing-2xl) 0;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--boss-text-primary);
}

.nested-desc {
  padding: var(--spacing-md) var(--spacing-2xl) var(--spacing-3-5);
  font-size: var(--text-sm);
  color: var(--boss-text-tertiary);
  line-height: 1.6;
  border-bottom: none;
  margin-bottom: 2px;
}

.nested-body {
  padding: var(--spacing-2xl);
}

.ai-config-tab > .boss-card:first-child .nested-body {
  padding-top: 0;
}

.nested-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-top: 1px solid var(--boss-border-color);
  background: transparent;
}

.api-card-section {
  border-style: dashed;
}

.api-card-section .ai-section-desc {
  margin-bottom: 14px;
}

.delivery-view-wrapper {
  position: relative;
  overflow: hidden;
}

.delivery-view-panels {
  display: block;
  width: 100%;
}

.delivery-view-list,
.delivery-view-edit {
  width: 100%;
  padding: var(--spacing-xs);
}

.delivery-view-edit {
  display: none;
}

.delivery-view-wrapper.is-edit .delivery-view-edit {
  display: block;
}

.delivery-view-wrapper.is-edit .delivery-view-list {
  display: none;
}

.delivery-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.delivery-list-tip {
  font-size: 13px;
  line-height: 1.6;
  color: var(--boss-text-tertiary);
}

.inner-card {
  background: var(--boss-bg-white);
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius-card);
  padding: var(--spacing-2xl);
  margin-bottom: 16px;
  transition: border-color 0.2s ease;
}

.inner-card:last-child {
  margin-bottom: 0;
}

.inner-card:hover {
  border-color: var(--boss-primary);
  box-shadow: var(--shadow-hover);
}

.inner-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--boss-text-primary);
  margin-bottom: 12px;
}

.inner-desc {
  font-size: 13px;
  color: var(--boss-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  background: var(--boss-bg-color);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-radius: var(--radius-card);
}

.inner-extra {
  font-size: 13px;
  line-height: 1.6;
  color: var(--boss-text-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
  word-break: break-all;
}

.extra-label {
  flex-shrink: 0;
}

.extra-val {
  color: var(--boss-text-secondary);
  font-weight: 500;
}

.inner-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px dashed var(--boss-border-color);
  gap: 12px;
  flex-wrap: wrap;
}

.inner-status,
.delivery-prompt-card__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 13px;
  transition: color 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .delivery-view-panels,
  .inner-card,
  .status-text {
    transition: none !important;
    animation: none !important;
  }
}

.status-text.is-active {
  color: var(--boss-text-primary);
  font-weight: 500;
}

.status-text.is-inactive {
  color: var(--boss-text-tertiary);
}

.inner-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.divider-v {
  width: 1px;
  height: 14px;
  background: var(--boss-border-color);
}

.delivery-view-edit {
  padding-left: 2px;
}

.boss-edit-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 20px;
  margin-bottom: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--boss-border-color);
}

.boss-edit-divider {
  width: 1px;
  height: 16px;
  margin: 0 16px;
  background-color: var(--boss-border-color);
}

.boss-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--boss-text-primary);
}

.delivery-edit-form {
  margin-top: 0;
}

.boss-edit-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--boss-border-color);
}

.boss-btn-primary {
  background-color: var(--boss-primary) !important;
  border-color: var(--boss-primary) !important;
  color: var(--boss-bg-white) !important;
}

.boss-btn-primary:hover,
.boss-btn-primary:focus {
  background-color: var(--boss-primary-hover) !important;
  border-color: var(--boss-primary-hover) !important;
  color: var(--boss-bg-white) !important;
}

.boss-btn-text.el-button.is-link {
  padding: 0;
  height: auto;
  min-height: 0;
  white-space: nowrap;
}

.boss-btn-back {
  border: 0;
  padding: 0;
  color: var(--boss-text-secondary);
  background: transparent;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--boss-text-primary);
  padding-bottom: 8px !important;
}

:deep(.config-form) {
  margin: 0;
}
</style>
