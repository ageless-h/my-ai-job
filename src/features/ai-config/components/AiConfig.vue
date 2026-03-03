<script setup lang="ts">
// @ts-nocheck
import { computed, onMounted, provide, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { request, showAppMessage } from '@/core/http/request';
import { Tools, DEFAULT_AI_DELIVERY_JUDGE_PROMPT } from '@/shared/utils/tools';
import ApiKeyManager from './ApiKeyManager.vue';
import PromptPresetManager from './PromptPresetManager.vue';
import DebugConsole from './DebugConsole.vue';

const formRef = ref();
const debugConsoleRef = ref();

const providerOptions = [
  { label: '自定义', value: 0 },
  { label: 'Deepseek', value: 1 },
  { label: '火山引擎', value: 2 },
  { label: '硅基流动', value: 3 },
  { label: '月之暗面', value: 4 },
  { label: 'Open Router', value: 5 },
];

const modelOptions = {
  0: [],
  1: ['deepseek-chat', 'deepseek-reasoner'],
  2: ['deepseek-r1-250120', '...'],
  3: ['deepseek-ai/DeepSeek-V3', '...'],
  4: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  5: ['deepseek/deepseek-chat-v3-0324:free', '...'],
};

const availableModels = ref([]);
const providerDetails = ref({});
const lastFetchedConfig = ref(null);
const hasShownConfigFallbackWarning = ref(false);

const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || '未知错误';
};

const form = ref({
  userId: 0,
  provider: 1,
  modelName: '',
  apiKey: '',
  baseUrl: '',
  timeout: 60,
  completionsPath: '',
  testPassed: 0,
  status: 0,
  userPrompt: '',
});

const isTestLoading = ref(false);
const aiConfigExt = ref(Tools.getAiConfigExt());
const DEFAULT_AI_DELIVERY_EXTRA_PROMPT = '办公地点不进行限制，只要在国内即可';
const DEFAULT_AI_DELIVERY_PROMPT_NAME = '默认提示词';
const aiDeliveryPromptView = ref('list');
const editingAiDeliveryPromptId = ref('');
const aiDeliveryPromptEditForm = ref({
  name: '',
  prompt: '',
  extraPrompt: '',
});


const buildCurrentModelChannelKey = () => Tools.buildModelChannelKey(form.value.provider, form.value.modelName);

const ensureAiConfigExtSchema = () => {
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
    aiConfigExt.value.promptPresetStore.globalPresetInitialized = aiConfigExt.value.promptPresetStore.global.length > 0;
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
  if (!aiConfigExt.value.aiDeliveryPromptStore || typeof aiConfigExt.value.aiDeliveryPromptStore !== 'object') {
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
  const channelPresetList = getCurrentChannelPresetList().map((preset) => ({ ...preset, scope: 'personal' }));
  const channelNameSet = new Set(
    channelPresetList
      .map((preset) => `${preset.name || ''}`.trim())
      .filter((name) => !!name)
  );
  const globalPresetList = (ext.promptPresetStore.global || [])
    .filter((preset) => {
      const name = `${preset.name || ''}`.trim();
      return !name || !channelNameSet.has(name);
    })
    .map((preset) => ({ ...preset, scope: 'global' }));
  return [...globalPresetList, ...channelPresetList];
};

const getPresetById = (presetId) => {
  if (!presetId) {
    return null;
  }
  return getMergedPresetList().find((preset) => preset.id === presetId) || null;
};

const presetOptions = computed(() => {
  return getMergedPresetList().map((preset) => ({
    ...preset,
    optionLabel: `${preset.scope === 'personal' ? '[模型]' : '[全局]'} ${preset.name}`,
  }));
});

const finalPromptPreview = computed(() => {
  const enabledMergedText = getMergedPresetList()
    .filter((preset) => preset.enabled !== false)
    .map((preset, index) => `# ${preset.scope === 'personal' ? '模型' : '全局'}预设${index + 1} ${preset.name}\n${preset.content}`)
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
  const normalizeCompletionsPath = (path) => {
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

const handleProviderChange = (value, keepModelName = false) => {
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
  try {
    const response = await request.get('/api/user/ai/config/all/provider', {
      silentErrorToast: true,
      silentTimeoutToast: true,
      silentNetworkToast: true,
    });
    if (response.data.code === 200) {
      const details = response.data.data;
      providerDetails.value = details.reduce((acc, detail) => {
        acc[detail.code] = detail;
        return acc;
      }, {});
    }
  } catch (error) {
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

  if (!hasShownConfigFallbackWarning.value) {
    showAppMessage({ type: 'warning', message: '配置接口暂不可用，已使用本地配置' });
    hasShownConfigFallbackWarning.value = true;
  }
};

const fetchConfig = async () => {
  try {
    const response = await request.get('/api/user/ai/config/current', {
      silentErrorToast: true,
      silentTimeoutToast: true,
      silentNetworkToast: true,
    });
    if (response.data.code === 200) {
      ensureGlobalPresetCatalog();
      let config = response.data.data;
      if (!config) {
        config = {
          status: 0,
          provider: 1,
          timeout: 60,
        };
      }
      form.value = { ...form.value, ...config };
      lastFetchedConfig.value = { ...config };
      const ext = ensureAiConfigExtSchema();
      if (!form.value.modelName && ext?.currentConfig && ext.currentConfig.provider === form.value.provider && ext.currentConfig.modelName) {
        form.value.modelName = ext.currentConfig.modelName;
      }
      handleProviderChange(form.value.provider, true);
      syncCurrentChannelToExt();

    }
  } catch (error) {
    console.warn('[AI对话] 获取配置失败，已降级到本地配置', error);
    applyLocalConfigFallback();
  }
};

watch(
  () => ({
    provider: form.value.provider,
    modelName: form.value.modelName,
    apiKey: form.value.apiKey,
    baseUrl: form.value.baseUrl,
    completionsPath: form.value.completionsPath,
    timeout: form.value.timeout,
    status: form.value.status,
  }),
  () => {
    const isDataUnchanged = compareWithLastConfig();
    if (!isDataUnchanged) {
      form.value.testPassed = 0;
    }
    if (lastFetchedConfig.value?.testPassed && isDataUnchanged) {
      form.value.testPassed = 1;
    }
  },
  { deep: true }
);

const doPersistConfig = async (endpoint) => {
  if (Number(form.value.provider) === 0) {
    syncCurrentChannelToExt();
    return true;
  }

  const { userPrompt, apiFormat, ...rest } = form.value;
  const response = await request.post(endpoint, rest, {
    silentErrorToast: true,
    silentTimeoutToast: true,
    silentNetworkToast: true,
  });
  if (response.data.code === 200) {
    syncCurrentChannelToExt();
    return true;
  }
  return false;
};

const handleSave = async () => {
  try {
    const ok = await doPersistConfig('/api/user/ai/config/save');
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
    const ok = await doPersistConfig('/api/user/ai/config/temp/save');
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
    const composedPrompt = finalPromptPreview.value || '';
    const resp = await request.post('/api/user/ai/config/temp/save', {
      userPrompt: composedPrompt,
      userId: form.value.userId,
    }, {
      silentErrorToast: true,
      silentTimeoutToast: true,
      silentNetworkToast: true,
    });
    if (resp.data.code === 200) {
      syncCurrentChannelToExt();
      showAppMessage({ type: 'success', message: '保存成功' });
    }
  } catch (e) {
    showAppMessage({ type: 'error', message: `保存失败: ${getErrorMessage(e)}` });
  }
};

const buildAiDeliveryPromptId = () => `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getAiDeliveryPromptStore = () => {
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

const aiDeliveryPromptList = computed(() => getAiDeliveryPromptStore().items || []);
const activeAiDeliveryPromptId = computed(() => getAiDeliveryPromptStore().activePromptId || '');

const getActiveAiDeliveryPrompt = () => {
  const store = getAiDeliveryPromptStore();
  const active = (store.items || []).find((item) => item.id === store.activePromptId);
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
  } else if (!store.activePromptId || !store.items.some((item) => item.id === store.activePromptId)) {
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

const startEditAiDeliveryPrompt = (id) => {
  const item = getAiDeliveryPromptStore().items.find((entry) => entry.id === id);
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
  showAppMessage({ type: 'success', message: editingAiDeliveryPromptId.value ? '提示词已更新' : '提示词已创建并启用' });
  backToAiDeliveryPromptList();
};

const activateAiDeliveryPrompt = (id) => {
  const store = getAiDeliveryPromptStore();
  const item = store.items.find((entry) => entry.id === id);
  if (!item) {
    showAppMessage({ type: 'warning', message: '提示词不存在' });
    return;
  }
  store.activePromptId = id;
  persistAiConfigExt();
  syncAiDeliveryPromptToJudgeConfig(false);
  showAppMessage({ type: 'success', message: `已启用：${item.name}` });
};

const deleteAiDeliveryPrompt = async (id) => {
  const store = getAiDeliveryPromptStore();
  const item = store.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  const confirmed = await ElMessageBox
    .confirm(`确认删除提示词【${item.name}】？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    .then(() => true)
    .catch(() => false);

  if (!confirmed) {
    return;
  }

  const index = store.items.findIndex((entry) => entry.id === id);
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

const handleTest = async () => {
  isTestLoading.value = true;
  try {
    const response = await request.post('/api/user/ai/config/test', form.value, {
      timeout: form.value.timeout * 1000 - 200,
      silentErrorToast: true,
      silentTimeoutToast: true,
      silentNetworkToast: true,
    });
    if (response.data.code === 200) {
      showAppMessage({ type: 'success', message: `测试通过: ${response.data.data || ''}` });
      form.value.testPassed = 1;
      return;
    }
    showAppMessage({ type: 'error', message: `测试失败: ${response.data.message || ''}` });
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
  <div class="ai-config">
    <div class="ai-section">
      <div class="ai-section-title">提示词中心</div>
      <div class="tune-form">
        <div class="subpage-entry-card">
          <div class="subpage-entry-card__title">提示词预设管理</div>
          <div class="subpage-entry-card__desc">管理全局与模型预设，启用后自动合并到系统提示词。</div>
          <div class="subpage-entry-card__body">
            <PromptPresetManager />
          </div>
          <div class="subpage-entry-card__actions">
            <el-button type="primary" @click="handleSavePrompt">保存</el-button>
            <el-button type="warning" @click="openDebugDialog">调试</el-button>
          </div>
        </div>

        <div class="subpage-entry-card">
          <div class="subpage-entry-card__title">AI投递提示词</div>
          <div class="subpage-entry-card__desc">统一维护岗位级 AI 判定提示词与附加指令；判定开关请在「AI 投递判定」中设置。</div>
          <div class="subpage-entry-card__body">
            <div :class="['delivery-view-wrapper', aiDeliveryPromptView === 'edit' ? 'is-edit' : '']">
              <div class="delivery-view-panels">
                <div class="delivery-view-list">
                  <div class="delivery-list-header">
                    <span class="delivery-list-tip">卡片支持启用、编辑、删除，启用项会同步到 AI 投递判定。</span>
                    <el-button type="primary" size="small" @click="startNewAiDeliveryPrompt">新增提示词</el-button>
                  </div>

                  <template v-if="aiDeliveryPromptList.length">
                    <div
                      v-for="item in aiDeliveryPromptList"
                      :key="item.id"
                      class="subpage-entry-card subpage-entry-card--nested delivery-prompt-card"
                    >
                      <div class="subpage-entry-card__title">{{ item.name }}</div>
                      <div class="subpage-entry-card__desc">
                        {{
                          (item.prompt || '').length > 90
                            ? `${(item.prompt || '').slice(0, 90)}...`
                            : item.prompt || '暂无判断提示词'
                        }}
                      </div>
                      <div class="subpage-entry-card__body delivery-prompt-card__extra">
                        <span>附加指令：</span>
                        <span>{{ item.extraPrompt || '无' }}</span>
                      </div>
                      <div class="subpage-entry-card__actions delivery-prompt-card__actions">
                        <el-switch
                          :model-value="activeAiDeliveryPromptId === item.id"
                          size="small"
                          active-text="启用"
                          inactive-text=""
                          @update:model-value="(value) => value && activateAiDeliveryPrompt(item.id)"
                        />
                        <div class="delivery-prompt-card__buttons">
                          <el-button size="small" type="primary" plain @click="startEditAiDeliveryPrompt(item.id)">编辑</el-button>
                          <el-button size="small" type="danger" plain @click="deleteAiDeliveryPrompt(item.id)">删除</el-button>
                        </div>
                      </div>
                    </div>
                  </template>
                  <el-empty v-else description="暂无提示词，点击右上角新增" />
                </div>

                <div class="delivery-view-edit">
                  <div class="delivery-edit-header">
                    <el-button link type="primary" @click="backToAiDeliveryPromptList">← 返回列表</el-button>
                    <span class="delivery-edit-title">{{ editingAiDeliveryPromptId ? '编辑提示词' : '新增提示词' }}</span>
                  </div>

                  <el-form-item label="提示词名称">
                    <el-input v-model="aiDeliveryPromptEditForm.name" placeholder="例如：宽松地域策略" />
                  </el-form-item>

                  <el-form-item label="判断提示词">
                    <el-input
                      v-model="aiDeliveryPromptEditForm.prompt"
                      type="textarea"
                      :rows="8"
                      :maxlength="5000"
                      show-word-limit
                      placeholder='示例：你是求职投递决策助手。请根据岗位信息和求职者个人信息判断是否建议投递。只输出JSON：{"match":true|false,"reason":"原因"}。'
                    />
                  </el-form-item>

                  <el-form-item label="附加指令（可选）">
                    <el-input
                      v-model="aiDeliveryPromptEditForm.extraPrompt"
                      type="textarea"
                      :rows="3"
                      :maxlength="2000"
                      show-word-limit
                      placeholder="办公地点不进行限制，只要在国内即可"
                    />
                  </el-form-item>

                  <div class="delivery-edit-actions">
                    <el-button @click="backToAiDeliveryPromptList">取消</el-button>
                    <el-button type="primary" @click="saveAiDeliveryPromptItem">保存提示词</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="subpage-entry-card__actions">
            <el-button type="primary" @click="handleSaveAiDeliveryPrompt">保存AI投递提示词</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="ai-section">
      <div class="ai-section-title">自有API配置</div>
      <ApiKeyManager />
    </div>

    <DebugConsole ref="debugConsoleRef" />
  </div>
</template>

<style scoped>
:deep(.ai-config){padding:15px 1px 1px;background:#fff}
:deep(.config-form){margin:0}
:deep(.tune-form){margin-bottom:10px;padding:0 10px;font-weight:700}
:deep(.ai-section-desc){margin:0 10px 10px;font-size:12px;line-height:1.6;color:#606266;font-weight:400}
.subpage-entry-card{border:1px solid #e4e7ed;border-radius:8px;padding:12px;margin-bottom:12px;background:#fff}
.subpage-entry-card__title{font-size:14px;font-weight:600;color:#303133}
.subpage-entry-card__desc{margin-top:4px;margin-bottom:10px;font-size:12px;line-height:1.6;color:#606266;font-weight:400}
.subpage-entry-card__body{font-weight:400}
.subpage-entry-card__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.subpage-entry-card--nested{margin-bottom:0;padding:10px}
.subpage-entry-card--nested + .subpage-entry-card--nested{margin-top:10px}
.subpage-entry-card--nested .subpage-entry-card__title{font-size:13px}
.subpage-entry-card--nested .subpage-entry-card__desc{margin-bottom:8px}
.delivery-view-wrapper{position:relative;overflow:hidden}
.delivery-view-panels{display:flex;width:200%;transition:transform .28s ease}
.delivery-view-wrapper.is-edit .delivery-view-panels{transform:translateX(-50%)}
.delivery-view-list,.delivery-view-edit{width:50%;flex-shrink:0}
.delivery-view-edit{visibility:hidden;max-height:0;overflow:hidden}
.delivery-view-wrapper.is-edit .delivery-view-edit{visibility:visible;max-height:none;overflow:visible}
.delivery-view-wrapper.is-edit .delivery-view-list{visibility:hidden;max-height:0;overflow:hidden}
.delivery-list-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.delivery-list-tip{font-size:12px;line-height:1.6;color:#606266}
.delivery-prompt-card{background:#fff}
.delivery-prompt-card__extra{font-size:12px;line-height:1.6;color:#606266;display:flex;gap:4px;word-break:break-all}
.delivery-prompt-card__actions{justify-content:space-between}
.delivery-prompt-card__buttons{display:flex;align-items:center;gap:8px}
.delivery-view-edit{padding-left:4px}
.delivery-edit-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.delivery-edit-title{font-size:13px;font-weight:600;color:#303133}
.delivery-edit-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
</style>
