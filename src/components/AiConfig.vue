<script setup lang="ts">
// @ts-nocheck
import { computed, onMounted, provide, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { request, ElMessage } from '@/services/request';
import { Tools } from '@/utils/tools';
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


const memoryScopeOptions = [
  { label: '会话级', value: 'session' },
  { label: '岗位级', value: 'job' },
  { label: '全局级', value: 'global' },
];

const memoryProfile = ref({
  enabled: true,
  scope: 'session',
  maxTurns: 20,
  summaryThreshold: 12,
  clearOnModelSwitch: true,
});

const normalizeMemoryProfile = (profile) => {
  return {
    enabled: profile?.enabled !== false,
    scope: profile?.scope || 'session',
    maxTurns: Number(profile?.maxTurns || 20),
    summaryThreshold: Number(profile?.summaryThreshold || 12),
    clearOnModelSwitch: profile?.clearOnModelSwitch !== false,
  };
};

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



const saveCurrentMemoryProfileSilently = () => {
  const ext = ensureAiConfigExtSchema();
  const key = buildCurrentModelChannelKey();
  ext.memoryProfiles[key] = normalizeMemoryProfile(memoryProfile.value);
  persistAiConfigExt();
};

const saveCurrentMemoryProfile = () => {
  saveCurrentMemoryProfileSilently();
  ElMessage({ type: 'success', message: '模型记忆策略已保存' });
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
    const response = await request.get('/api/user/ai/config/all/provider');
    if (response.data.code === 200) {
      const details = response.data.data;
      providerDetails.value = details.reduce((acc, detail) => {
        acc[detail.code] = detail;
        return acc;
      }, {});
    }
  } catch (error) {
    ElMessage({ type: 'error', message: '获取供应商信息失败' });
  }
};

const fetchConfig = async () => {
  try {
    const response = await request.get('/api/user/ai/config/current');
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
      loadCurrentMemoryProfile();

    }
  } catch (error) {
    ElMessage({ type: 'error', message: '获取配置失败' });
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
  const { userPrompt, ...rest } = form.value;
  const response = await request.post(endpoint, rest);
  if (response.data.code === 200) {
    syncCurrentChannelToExt();
    saveCurrentMemoryProfileSilently();
    return true;
  }
  return false;
};

const handleSave = async () => {
  try {
    const ok = await doPersistConfig('/api/user/ai/config/save');
    if (ok) {
      ElMessage({ type: 'success', message: '保存成功' });
    }
  } catch (e) {
    ElMessage({ type: 'error', message: '保存失败' });
  }
};

const handleTempSave = async () => {
  try {
    const ok = await doPersistConfig('/api/user/ai/config/temp/save');
    if (ok) {
      ElMessage({ type: 'success', message: '保存成功' });
      await fetchConfig();
    }
  } catch (error) {
    ElMessage({ type: 'error', message: '保存失败' });
  }
};

const handleSavePrompt = async () => {
  try {
    const composedPrompt = finalPromptPreview.value || '';
    const resp = await request.post('/api/user/ai/config/temp/save', {
      userPrompt: composedPrompt,
      userId: form.value.userId,
    });
    if (resp.data.code === 200) {
      syncCurrentChannelToExt();
      ElMessage({ type: 'success', message: '保存成功' });
    }
  } catch (e) {
    ElMessage({ type: 'error', message: '保存失败' });
  }
};

const handleTest = async () => {
  isTestLoading.value = true;
  try {
    const response = await request.post('/api/user/ai/config/test', form.value, {
      timeout: form.value.timeout * 1000 - 200,
    });
    if (response.data.code === 200) {
      ElMessage({ type: 'success', message: `测试通过: ${response.data.data || ''}` });
      form.value.testPassed = 1;
      return;
    }
    ElMessage({ type: 'error', message: `测试失败: ${response.data.message || ''}` });
  } catch (e) {
    ElMessage({ type: 'error', message: `测试失败: ${e || ''}` });
  } finally {
    isTestLoading.value = false;
  }
};

watch(
  () => `${form.value.provider}:${form.value.modelName || ''}`,
  () => {
    syncCurrentChannelToExt();
    loadCurrentMemoryProfile();

  }
);

const openDebugDialog = () => {
  debugConsoleRef.value?.open?.();
};

provide('aiConfigState', {
  form,
  aiConfigExt,

  memoryProfile,

  ensureAiConfigExtSchema,
  persistAiConfigExt,
  buildCurrentModelChannelKey,
  getCurrentChannelPresetList,
  getMergedPresetList,
  getPresetById,

  ElMessage,
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
});
</script>

<template>
  <div class="ai-config">
    <div class="ai-section">
      <div class="ai-section-title">提示词与记忆</div>
      <div class="tune-form">
        <el-form ref="formRef" label-width="120px">
          <el-form-item label="提示词管理">
            <PromptPresetManager />
          </el-form-item>

          <el-form-item label="记忆策略">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;">
              <span style="font-size:12px;color:#606266;">启用</span>
              <el-switch v-model="memoryProfile.enabled" />

              <span style="font-size:12px;color:#606266;">范围</span>
              <el-select v-model="memoryProfile.scope" style="width:120px;" :teleported="false">
                <el-option v-for="option in memoryScopeOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>

              <span style="font-size:12px;color:#606266;">最大轮数</span>
              <el-input-number v-model="memoryProfile.maxTurns" :min="1" :max="100" />

              <span style="font-size:12px;color:#606266;">摘要阈值</span>
              <el-input-number v-model="memoryProfile.summaryThreshold" :min="1" :max="100" />

              <el-button type="primary" plain @click="saveCurrentMemoryProfile">保存记忆</el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSavePrompt">保存</el-button>
            <el-button type="warning" @click="openDebugDialog">调试</el-button>
          </el-form-item>
        </el-form>
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
</style>
