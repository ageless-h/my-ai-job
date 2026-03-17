<template>
  <div :class="['api-view-wrapper', apiView === 'edit' ? 'is-edit' : '']">
    <div class="api-view-panels">
      <div class="api-view-list api-config-list">
        <div class="api-list-header">
          <div class="api-list-tip-group">
            <span class="api-list-tip">管理多个 API Key，按需启用</span>
            <span class="api-list-note">自有 API 配置仅本地保存，不会上传到远端</span>
          </div>
          <el-button type="primary" @click="startNewConfig">新增配置</el-button>
        </div>

        <div class="api-overview" v-if="apiConfigList.length">
          <div class="api-overview__item">
            <span class="api-overview__label">配置总数</span>
            <strong class="api-overview__value">{{ apiConfigList.length }}</strong>
          </div>
          <div class="api-overview__item">
            <span class="api-overview__label">当前启用模型</span>
            <strong class="api-overview__value">{{ activeConfig?.modelName || '--' }}</strong>
          </div>
          <div class="api-overview__item">
            <span class="api-overview__label">当前协议</span>
            <strong class="api-overview__value">{{
              getApiFormatLabel(activeConfig?.apiFormat)
            }}</strong>
          </div>
        </div>

        <template v-if="apiConfigList.length">
          <div v-for="item in apiConfigList" :key="item.id" class="api-config-card">
            <div class="api-config-card__header">
              <div class="api-config-card__title-wrap">
                <div class="api-config-card__title">{{ item.modelName || '未命名模型' }}</div>
                <div class="api-config-card__sub">{{ item.baseUrl || '--' }}</div>
              </div>
              <div class="api-config-card__badges">
                <el-tag size="small" type="info" effect="plain">
                  {{ getApiFormatLabel(item.apiFormat) }}
                </el-tag>
                <el-tag size="small" :type="item.id === activeApiConfigId ? 'success' : 'info'">
                  {{ item.id === activeApiConfigId ? '已启用' : '未启用' }}
                </el-tag>
              </div>
            </div>

            <div class="api-config-card__meta">
              <div class="api-config-card__line">
                <span class="api-config-card__label">API Key</span>
                <span class="api-config-card__value api-config-card__value--mono">{{
                  maskApiKey(item.apiKey)
                }}</span>
              </div>
              <div class="api-config-card__line">
                <span class="api-config-card__label">配置 ID</span>
                <span class="api-config-card__value api-config-card__value--mono">{{
                  item.id
                }}</span>
              </div>
            </div>

            <div class="api-config-card__actions">
              <div class="api-config-card__buttons">
                <el-button size="small" type="primary" plain @click="startEditConfig(item.id)"
                  >编辑</el-button
                >
                <el-button
                  size="small"
                  type="success"
                  :disabled="item.id === activeApiConfigId"
                  @click="activateApiConfig(item.id)"
                >
                  启用
                </el-button>
                <el-button size="small" type="danger" plain @click="deleteApiConfig(item.id)"
                  >删除</el-button
                >
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无配置，点击右上角新增配置" />
      </div>

      <div class="api-view-edit">
        <el-form
          ref="formRef"
          :model="editForm"
          :rules="rules"
          label-position="top"
          label-width="0"
          class="config-form api-config-form"
        >
          <div class="api-edit-header">
            <el-button link type="primary" @click="backToList">← 返回列表</el-button>
            <span class="api-edit-title">{{ editingConfigId ? '编辑配置' : '新增配置' }}</span>
          </div>
          <div class="api-edit-subtitle">先套用模板，再补充密钥并进行直连测试。</div>

          <div class="api-form-section">
            <div class="api-form-section__title">快速套用模板</div>
            <div class="api-form-section__desc">一键填充常用供应商配置，可再手动微调。</div>

            <el-form-item label="模型供应商模板">
              <el-select
                v-model="selectedPresetId"
                clearable
                filterable
                :teleported="false"
                placeholder="可选：直接套用内置供应商模板"
                style="width: 100%"
                @change="handlePresetProviderChange"
              >
                <el-option
                  v-for="preset in presetProviderOptions"
                  :key="preset.id"
                  :label="`[${preset.apiFormat}] ${preset.name}`"
                  :value="preset.id"
                />
              </el-select>
              <div class="api-preset-tip">
                模板将自动填充 Base URL、API 格式和默认模型（来源：内置模型目录）。
              </div>
              <div class="api-template-actions">
                <el-button type="primary" plain @click="handleApplyPreset">应用模板</el-button>
              </div>
            </el-form-item>
          </div>

          <div class="api-form-section">
            <div class="api-form-section__title">手动配置参数</div>
            <div class="api-form-section__desc">
              支持 OpenAI / Claude / Gemini 等协议的直连参数。
            </div>

            <el-form-item label="BASE URL" prop="baseUrl">
              <el-input
                v-model="editForm.baseUrl"
                placeholder="请输入 Base URL，如 https://api.openai.com/v1"
              />
            </el-form-item>

            <el-form-item label="API KEY" prop="apiKey">
              <el-input v-model="editForm.apiKey" placeholder="请输入 API Key" show-password />
              <div v-if="selectedPresetLink" class="api-preset-link-row">
                <el-link
                  :href="selectedPresetLink.apiKeyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  type="primary"
                  >获取 API Key</el-link
                >
              </div>
              <div
                v-if="selectedPresetLink && selectedPresetLink.linkType === 'invite'"
                class="api-preset-note"
              >
                通过该链接购买可享优惠。
              </div>
            </el-form-item>

            <el-form-item label="模型名称" prop="modelName">
              <el-input
                v-model="editForm.modelName"
                placeholder="请输入模型名称，如 gpt-4o / deepseek-chat"
              />
            </el-form-item>

            <el-form-item label="API 格式">
              <el-select v-model="editForm.apiFormat" style="width: 100%" :teleported="false">
                <el-option label="Chat Completions（标准）" value="completions" />
                <el-option label="Responses API（GPT-5 系列）" value="responses" />
                <el-option label="Anthropic Messages（Claude 生态）" value="anthropic-messages" />
                <el-option
                  label="Google Generative AI（Gemini 生态）"
                  value="google-generative-ai"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="api-form-actions">
            <div class="api-action-status">
              <el-tag v-if="editForm.testPassed === 1" type="success" effect="plain"
                >最近测试通过</el-tag
              >
              <span class="api-test-note">网络超时会自动重试 1 次，鉴权/跨域/404 不重试</span>
            </div>
            <div class="api-action-buttons">
              <el-button type="info" :loading="isTempSaving" @click="handleTempSave"
                >暂存</el-button
              >
              <el-button type="success" :loading="isTestLoading" @click="handleTest"
                >直连测试</el-button
              >
              <el-button type="primary" @click="saveApiConfig">保存配置</el-button>
            </div>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, inject, onMounted, ref } from 'vue';
import { directTest } from '@/core/ai/direct-ai-client';
import {
  MODEL_PROVIDER_TEMPLATES,
  getModelProviderApiKeyLink,
  getModelProviderTemplateById,
  isSupportedDirectModelProtocol,
} from '@/features/ai-config/constants/model-catalog';
import { Tools } from '@/shared/utils/tools';

const state = inject('aiConfigState');
if (!state) {
  throw new Error('ApiKeyManager 缺少 aiConfigState 注入');
}

const apiConfigList = ref([]);
const apiView = ref('list');
const editingConfigId = ref(null);
const formRef = ref();
const isTestLoading = ref(false);
const isTempSaving = ref(false);
const selectedPresetId = ref('');
const editForm = ref({
  provider: 0,
  modelName: '',
  apiKey: '',
  baseUrl: '',
  timeout: 60,
  completionsPath: '',
  apiFormat: 'completions',
  status: 0,
  testPassed: 0,
});

const notify = (payload) => {
  const normalized = {
    type: payload?.type || 'info',
    message: `${payload?.message || ''}`,
    duration: payload?.duration,
    showClose: payload?.showClose,
  };
  if (typeof state.showAppMessage === 'function') {
    state.showAppMessage(normalized);
    return;
  }
  console.warn('[ApiKeyManager] 缺少 showAppMessage 注入', normalized);
};

const normalizeApiFormat = (value) => {
  if (value === 'responses') {
    return 'responses';
  }
  if (value === 'anthropic-messages') {
    return 'anthropic-messages';
  }
  if (value === 'google-generative-ai') {
    return 'google-generative-ai';
  }
  return 'completions';
};

const normalizeBaseUrl = (value) => `${value || ''}`.trim().replace(/\/+$/, '').toLowerCase();

const isTemplateBaseUrl = (value) => /\$\{[^}]+\}/.test(`${value || ''}`);

const selectedPreset = computed(() => getModelProviderTemplateById(selectedPresetId.value));
const selectedPresetLink = computed(() => {
  const preset = selectedPreset.value;
  if (!preset) {
    return null;
  }
  return getModelProviderApiKeyLink(preset.id);
});
const presetProviderOptions = computed(() => MODEL_PROVIDER_TEMPLATES);
const activeConfig = computed(() => {
  const activeId = `${activeApiConfigId.value || ''}`.trim();
  if (!activeId) {
    return null;
  }
  return apiConfigList.value.find((item) => `${item?.id || ''}`.trim() === activeId) || null;
});

const apiFormatLabelMap = {
  completions: 'Completions',
  responses: 'Responses',
  'anthropic-messages': 'Anthropic',
  'google-generative-ai': 'Gemini',
};

const getApiFormatLabel = (value) => {
  const key = `${value || ''}`.trim();
  return apiFormatLabelMap[key] || key || '--';
};

const rules = {
  modelName: [
    { required: true, message: '请输入模型名称', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (value === '...') {
          callback(new Error('请选择具体模型名或输入模型名称'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  apiKey: [{ required: true, message: '请输入API Key', trigger: 'change' }],
  timeout: [{ required: true, message: '请输入超时时间', trigger: 'change' }],
  baseUrl: [{ required: true, message: 'Base URL 不能为空', trigger: 'change' }],
};

const activeApiConfigId = computed(() => {
  const ext = state.aiConfigExt.value || {};
  return Tools.getModelConfigState(ext).activeConfigId;
});

const createApiConfigId = () => {
  return `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeApiConfigItem = (config) => {
  const current = config || {};
  return {
    id: current.id || createApiConfigId(),
    provider: 0,
    modelName: `${current.modelName || ''}`,
    apiKey: `${current.apiKey || ''}`,
    baseUrl: `${current.baseUrl || ''}`,
    timeout: Number(current.timeout || 60),
    completionsPath: `${current.completionsPath || ''}`,
    apiFormat: normalizeApiFormat(current.apiFormat),
    status: Number(current.status || 0),
    testPassed: Number(current.testPassed || 0),
  };
};

const syncPresetSelectionFromConfig = (config) => {
  const normalized = normalizeApiConfigItem(config);
  const normalizedBase = normalizeBaseUrl(normalized.baseUrl);
  const normalizedFormat = normalizeApiFormat(normalized.apiFormat);

  const matchedPreset = MODEL_PROVIDER_TEMPLATES.find((preset) => {
    if (!preset.baseUrl) {
      return false;
    }
    if (normalizeBaseUrl(preset.baseUrl) !== normalizedBase) {
      return false;
    }
    if (isSupportedDirectModelProtocol(preset.apiFormat)) {
      return normalizeApiFormat(preset.apiFormat) === normalizedFormat;
    }
    return false;
  });

  if (!matchedPreset) {
    selectedPresetId.value = '';
    return;
  }

  selectedPresetId.value = matchedPreset.id;
};

const applyPresetToEditForm = (presetId) => {
  const preset = getModelProviderTemplateById(presetId);
  if (!preset) {
    return;
  }

  if (preset.baseUrl) {
    editForm.value.baseUrl = preset.baseUrl;
    if (isTemplateBaseUrl(preset.baseUrl)) {
      notify({
        type: 'warning',
        message: `预设【${preset.name}】含模板变量，请先替换 URL 中的占位符后再测试`,
        duration: 3800,
      });
    }
  }

  if (isSupportedDirectModelProtocol(preset.apiFormat)) {
    editForm.value.apiFormat = normalizeApiFormat(preset.apiFormat);
  } else {
    notify({
      type: 'warning',
      message: `预设【${preset.name}】使用 ${preset.apiFormat} 协议，当前脚本暂不支持自动直连该协议`,
      duration: 4200,
    });
  }

  const nextModel = `${preset.models[0]?.id || ''}`.trim();
  if (nextModel) {
    editForm.value.modelName = nextModel;
  }
  editForm.value.testPassed = 0;
};

const handlePresetProviderChange = (presetId) => {
  if (!presetId) {
    return;
  }
  applyPresetToEditForm(presetId);
};

const handleApplyPreset = () => {
  if (!selectedPresetId.value) {
    notify({ type: 'warning', message: '请先选择供应商模板' });
    return;
  }

  const currentPreset = selectedPreset.value;
  applyPresetToEditForm(selectedPresetId.value);

  if (currentPreset && !isSupportedDirectModelProtocol(currentPreset.apiFormat)) {
    notify({
      type: 'error',
      message: `预设【${currentPreset.name}】协议暂不支持，已填充信息但禁止测试/保存`,
      duration: 4200,
    });
    return;
  }
  if (isTemplateBaseUrl(editForm.value.baseUrl)) {
    notify({
      type: 'warning',
      message: '预设 URL 含模板变量，请先替换占位符后再测试/保存',
      duration: 4200,
    });
    return;
  }
  notify({ type: 'success', message: '已应用预设配置，请补充 API Key 后可测试' });
};

const ensureEditablePresetSupport = (actionLabel) => {
  const preset = selectedPreset.value;
  if (preset && !isSupportedDirectModelProtocol(preset.apiFormat)) {
    notify({
      type: 'error',
      message: `${actionLabel}失败：预设【${preset.name}】使用 ${preset.apiFormat}，当前脚本暂不支持该协议`,
      duration: 4500,
      showClose: true,
    });
    return false;
  }

  if (isTemplateBaseUrl(editForm.value.baseUrl)) {
    notify({
      type: 'error',
      message: `${actionLabel}失败：Base URL 仍包含模板占位符，请先替换后重试`,
      duration: 4500,
      showClose: true,
    });
    return false;
  }
  return true;
};

const maskApiKey = (apiKey) => {
  const value = `${apiKey || ''}`;
  if (!value) {
    return '--';
  }
  const head = value.slice(0, Math.min(4, value.length));
  const tail = value.slice(-Math.min(4, value.length));
  return `${head}****${tail}`;
};

const applyApiConfigToForm = (config) => {
  const normalizedConfig = normalizeApiConfigItem(config);
  editForm.value = { ...normalizedConfig };
  syncPresetSelectionFromConfig(normalizedConfig);
};

const syncEditFormToParent = (config) => {
  const normalizedConfig = normalizeApiConfigItem(config);
  state.form.value = {
    ...state.form.value,
    provider: normalizedConfig.provider,
    modelName: normalizedConfig.modelName,
    apiKey: normalizedConfig.apiKey,
    baseUrl: normalizedConfig.baseUrl,
    timeout: normalizedConfig.timeout,
    completionsPath: normalizedConfig.completionsPath,
    apiFormat: normalizedConfig.apiFormat,
    status: normalizedConfig.status,
    testPassed: normalizedConfig.testPassed,
  };
  state.handleProviderChange?.(state.form.value.provider, true);
};

const persistApiConfigList = (nextList, nextActiveId = void 0) => {
  const modelState = Tools.saveModelConfigState(nextList, nextActiveId);
  state.aiConfigExt.value = Tools.getAiConfigExt();
  apiConfigList.value = modelState.configs.map((item) => ({ ...item }));
};

const syncActiveConfigToParent = (list, activeId) => {
  if (!activeId) {
    return;
  }
  const activeItem = (list || []).find((item) => item.id === activeId);
  if (!activeItem) {
    return;
  }
  syncEditFormToParent({ ...activeItem, status: 1 });
};

const loadApiConfigs = () => {
  const modelState = Tools.getModelConfigState(state.aiConfigExt.value || {});
  let list = modelState.configs.map((item) => normalizeApiConfigItem(item));
  let activeId = modelState.activeConfigId;

  if (
    !list.length &&
    (state.form.value.apiKey || state.form.value.modelName || state.form.value.baseUrl)
  ) {
    const defaultConfig = normalizeApiConfigItem({ ...state.form.value, id: createApiConfigId() });
    list = [defaultConfig];
    if (defaultConfig.status === 1) {
      activeId = defaultConfig.id;
    }
    persistApiConfigList(list, activeId);
    syncActiveConfigToParent(list, activeId);
    return;
  }

  apiConfigList.value = list;
  syncActiveConfigToParent(list, activeId);
};

const backToList = () => {
  apiView.value = 'list';
  editingConfigId.value = null;
};

const startNewConfig = () => {
  editingConfigId.value = null;
  selectedPresetId.value = '';
  editForm.value = {
    provider: 0,
    modelName: '',
    apiKey: '',
    baseUrl: '',
    timeout: Number(state.form.value.timeout || 60),
    completionsPath: `${state.form.value.completionsPath || ''}`,
    apiFormat: 'completions',
    status: 0,
    testPassed: 0,
  };
  apiView.value = 'edit';
};

const startEditConfig = (id) => {
  const selected = apiConfigList.value.find((item) => item.id === id);
  if (!selected) {
    notify({ type: 'warning', message: '配置不存在' });
    return;
  }
  editingConfigId.value = id;
  applyApiConfigToForm(selected);
  apiView.value = 'edit';
};

const saveApiConfig = async () => {
  if (!formRef.value) {
    return;
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }
    if (!ensureEditablePresetSupport('保存配置')) {
      return;
    }

    const id = editingConfigId.value || createApiConfigId();
    const nextItem = normalizeApiConfigItem({ ...editForm.value, id });
    const nextList = apiConfigList.value.map((item) => ({ ...item }));
    const existsIndex = nextList.findIndex((item) => item.id === id);
    if (existsIndex >= 0) {
      nextList[existsIndex] = nextItem;
    } else {
      nextList.unshift(nextItem);
    }

    const modelState = Tools.getModelConfigState(state.aiConfigExt.value || {});
    let activeId = modelState.activeConfigId;
    if (nextItem.status === 1) {
      activeId = id;
    }

    const normalizedStatusList = nextList.map((item) => ({
      ...item,
      status: activeId && item.id === activeId ? 1 : activeId ? 0 : item.status,
    }));

    persistApiConfigList(normalizedStatusList, activeId);
    if (activeId && activeId === id) {
      syncEditFormToParent({ ...nextItem, status: 1 });
    }
    editingConfigId.value = id;
    apiView.value = 'list';
    notify({ type: 'success', message: '配置已保存' });
  });
};

const deleteApiConfig = async (id) => {
  const current = apiConfigList.value.find((item) => item.id === id);
  if (!current) {
    return;
  }

  const confirmed = await state.ElMessageBox.confirm(
    `确认删除配置【${current.modelName || '未命名模型'}】？`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => true)
    .catch(() => false);

  if (!confirmed) {
    return;
  }

  const nextList = apiConfigList.value
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item }));
  const modelState = Tools.getModelConfigState(state.aiConfigExt.value || {});
  const activeId = modelState.activeConfigId === id ? '' : modelState.activeConfigId || '';
  persistApiConfigList(nextList, activeId);

  if (editingConfigId.value === id) {
    backToList();
  }

  notify({ type: 'success', message: '配置已删除' });
};

const activateApiConfig = async (id) => {
  const selected = apiConfigList.value.find((item) => item.id === id);
  if (!selected) {
    notify({ type: 'warning', message: '配置不存在' });
    return;
  }

  const nextList = apiConfigList.value.map((item) => ({
    ...item,
    status: item.id === id ? 1 : 0,
  }));
  persistApiConfigList(nextList, id);
  syncEditFormToParent({ ...selected, status: 1 });
  notify({ type: 'success', message: '配置已启用' });
  backToList();
};

const handleTempSave = async () => {
  if (!formRef.value) {
    return;
  }

  isTempSaving.value = true;
  try {
    await formRef.value.validate(async (valid) => {
      if (!valid) {
        return;
      }
      if (!ensureEditablePresetSupport('暂存配置')) {
        return;
      }

      const id = editingConfigId.value || createApiConfigId();
      const nextItem = normalizeApiConfigItem({ ...editForm.value, id });
      const nextList = apiConfigList.value.map((item) => ({ ...item }));
      const existsIndex = nextList.findIndex((item) => item.id === id);
      if (existsIndex >= 0) {
        nextList[existsIndex] = nextItem;
      } else {
        nextList.unshift(nextItem);
      }

      const modelState = Tools.getModelConfigState(state.aiConfigExt.value || {});
      let activeId = modelState.activeConfigId;
      if (nextItem.status === 1) {
        activeId = id;
      }

      const normalizedStatusList = nextList.map((item) => ({
        ...item,
        status: activeId && item.id === activeId ? 1 : activeId ? 0 : item.status,
      }));

      persistApiConfigList(normalizedStatusList, activeId);
      editingConfigId.value = id;
      applyApiConfigToForm(nextItem);
      syncEditFormToParent(nextItem);
      notify({ type: 'success', message: '暂存成功' });
    });
  } finally {
    isTempSaving.value = false;
  }
};

const handleTest = async () => {
  if (!formRef.value) {
    return;
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }
    if (!ensureEditablePresetSupport('直连测试')) {
      return;
    }

    isTestLoading.value = true;
    try {
      // 直接调用用户 API 测试连通性
      const answer = await directTest({
        baseUrl: editForm.value.baseUrl,
        apiKey: editForm.value.apiKey,
        modelName: editForm.value.modelName,
        apiFormat: normalizeApiFormat(editForm.value.apiFormat),
        timeout: Number(editForm.value.timeout || 60),
      });
      notify({
        type: 'success',
        message: `直连测试通过: ${(answer || '').slice(0, 100)}`,
      });
      editForm.value.testPassed = 1;
    } catch (e) {
      notify({
        type: 'error',
        message: `直连测试失败: ${e?.message || e || ''}`,
        showClose: true,
        duration: 6000,
      });
    } finally {
      isTestLoading.value = false;
    }
  });
};

onMounted(() => {
  loadApiConfigs();
});
</script>

<style scoped>
.api-view-wrapper {
  position: relative;
  overflow: hidden;
}
.api-view-panels {
  display: block;
  width: 100%;
}
.api-view-list,
.api-view-edit {
  width: 100%;
}
.api-view-edit {
  display: none;
}
.api-view-wrapper.is-edit .api-view-edit {
  display: block;
}
.api-view-wrapper.is-edit .api-view-list {
  display: none;
}
.api-config-list {
  padding-right: var(--spacing-xs);
}
.api-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}
.api-list-tip-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.api-list-tip {
  font-size: var(--text-base);
  color: var(--ai-text-secondary);
  font-weight: 500;
}
.api-list-note {
  font-size: var(--text-sm);
  color: var(--ai-success);
}
.api-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}
.api-overview__item {
  border: 1px solid var(--ai-border);
  border-radius: var(--radius-lg);
  background: var(--ai-bg-lighter);
  padding: var(--spacing-2-5) var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.api-overview__label {
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
}
.api-overview__value {
  font-size: var(--text-base);
  color: var(--ai-text-main);
  word-break: break-all;
}
.api-config-card {
  border: 1px solid var(--ai-border, #f0f2f5);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) 14px;
  margin-bottom: var(--spacing-lg);
  background: var(--ai-bg);
  box-shadow: var(--shadow-xs);
}
.api-config-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}
.api-config-card__title-wrap {
  min-width: 0;
}
.api-config-card__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--ai-text-main);
  line-height: var(--line-height-tight);
}
.api-config-card__sub {
  margin-top: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  word-break: break-all;
}
.api-config-card__badges {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  justify-content: flex-end;
}
.api-config-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
.api-config-card__line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
  font-size: var(--text-sm);
}
.api-config-card__label {
  color: var(--ai-text-sub);
  white-space: nowrap;
}
.api-config-card__value {
  color: var(--ai-text-main);
  word-break: break-all;
  text-align: right;
}
.api-config-card__value--mono {
  font-family: Consolas, Monaco, Menlo, monospace;
  font-size: var(--text-xs);
}
.api-config-card__actions {
  margin-top: var(--spacing-xl);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px dashed var(--ai-border);
}
.api-config-card__buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}
.api-view-edit {
  padding-left: var(--spacing-sm);
}
.api-edit-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}
.api-edit-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--ai-text-main);
}
.api-edit-subtitle {
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  margin-bottom: var(--spacing-xl);
}
.api-config-form {
  padding-right: var(--spacing-xs);
}

:deep(.api-config-form .el-form-item) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

:deep(.api-config-form .el-form-item__label) {
  width: 100% !important;
  justify-content: flex-start !important;
  text-align: left !important;
  height: auto !important;
  line-height: var(--line-height-normal);
  padding: 0 0 var(--spacing-md) !important;
}

:deep(.api-config-form .el-form-item__content) {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-left: 0 !important;
  justify-content: flex-start;
}

.api-form-section {
  border: 1px solid var(--ai-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-xs);
  margin-bottom: var(--spacing-xl);
  background: var(--ai-bg-lighter);
}
.api-form-section__title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ai-text-main);
}
.api-form-section__desc {
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
  margin: var(--spacing-sm) 0 var(--spacing-lg);
}
.api-preset-tip {
  margin-top: var(--spacing-md);
  font-size: var(--text-sm);
  line-height: var(--line-height-normal);
  color: var(--ai-text-sub);
}
.api-preset-link-row {
  margin-top: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}
.api-preset-note {
  margin-top: var(--spacing-md);
  font-size: var(--text-sm);
  line-height: var(--line-height-normal);
  color: var(--ai-warning);
}
.api-template-actions {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-start;
}
.api-form-actions {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: var(--spacing-lg);
  padding-top: var(--spacing-md);
  flex-wrap: wrap;
  flex-direction: column;
}
.api-action-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  justify-content: flex-start;
  width: 100%;
}
.api-action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

:deep(.api-config-form .el-form-item__content) {
  justify-content: flex-start;
}

:deep(.api-config-form .el-form-item__content .el-button) {
  margin-left: 0 !important;
}
.api-test-note {
  font-size: var(--text-sm);
  color: var(--ai-text-sub);
}

@media (max-width: 768px) {
  .api-overview {
    grid-template-columns: 1fr;
  }
  .api-list-header {
    flex-direction: column;
  }
  .api-config-card__header {
    flex-direction: column;
  }
  .api-config-card__line {
    flex-direction: column;
    align-items: flex-start;
  }
  .api-config-card__value {
    text-align: left;
  }
  .api-form-actions {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .api-view-panels,
  .api-view-list,
  .api-view-edit {
    transition: none !important;
    animation: none !important;
  }
}
</style>
