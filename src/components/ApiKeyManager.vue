<template>
  <div :class="['api-view-wrapper', apiView === 'edit' ? 'is-edit' : '']">
    <div class="api-view-panels">
      <div class="api-view-list api-config-list">
        <div class="api-list-header">
          <span class="api-list-tip">管理多个 API Key，按需启用</span>
          <el-button type="primary" @click="startNewConfig">新增配置</el-button>
        </div>
        <template v-if="apiConfigList.length">
          <div v-for="item in apiConfigList" :key="item.id" class="api-config-card">
            <div class="api-config-card__meta">
              <div class="api-config-card__line">
                <span class="api-config-card__label">Base URL</span>
                <span class="api-config-card__value">{{ item.baseUrl || '--' }}</span>
              </div>
              <div class="api-config-card__line">
                <span class="api-config-card__label">模型</span>
                <span class="api-config-card__value">{{ item.modelName || '--' }}</span>
              </div>
              <div class="api-config-card__line">
                <span class="api-config-card__label">API Key</span>
                <span class="api-config-card__value">{{ maskApiKey(item.apiKey) }}</span>
              </div>
            </div>
            <div class="api-config-card__actions">
              <el-tag size="small" :type="item.id === activeApiConfigId ? 'success' : 'info'">
                {{ item.id === activeApiConfigId ? '已启用' : '未启用' }}
              </el-tag>
              <div class="api-config-card__buttons">
                <el-button size="small" type="primary" plain @click="startEditConfig(item.id)">编辑</el-button>
                <el-button size="small" type="success" :disabled="item.id === activeApiConfigId" @click="activateApiConfig(item.id)">
                  启用
                </el-button>
                <el-button size="small" type="danger" plain @click="deleteApiConfig(item.id)">删除</el-button>
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
          label-width="120px"
          class="config-form api-config-form"
        >
          <div class="api-edit-header">
            <el-button link type="primary" @click="backToList">← 返回列表</el-button>
            <span class="api-edit-title">{{ editingConfigId ? '编辑配置' : '新增配置' }}</span>
          </div>

          <el-form-item label="BASE URL" prop="baseUrl">
            <el-input v-model="editForm.baseUrl" placeholder="请输入 Base URL，如 https://api.openai.com/v1" />
          </el-form-item>

          <el-form-item label="API KEY" prop="apiKey">
            <el-input v-model="editForm.apiKey" placeholder="请输入 API Key" show-password />
          </el-form-item>

          <el-form-item label="模型名称" prop="modelName">
            <el-input v-model="editForm.modelName" placeholder="请输入模型名称，如 gpt-4o / deepseek-chat" />
          </el-form-item>

          <el-form-item>
            <el-button type="info" @click="handleTempSave">暂存</el-button>
            <el-button type="success" :loading="isTestLoading" @click="handleTest">测试</el-button>
            <el-button type="primary" @click="saveApiConfig">保存配置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, inject, onMounted, ref } from 'vue';
import { ElNotification } from 'element-plus';
import { request } from '@/services/request';

const state = inject('aiConfigState');
if (!state) {
  throw new Error('ApiKeyManager 缺少 aiConfigState 注入');
}

const apiConfigList = ref([]);
const apiView = ref('list');
const editingConfigId = ref(null);
const formRef = ref();
const isTestLoading = ref(false);
const editForm = ref({
  provider: 1,
  modelName: '',
  apiKey: '',
  baseUrl: '',
  timeout: 60,
  completionsPath: '',
  status: 0,
  testPassed: 0,
});

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

const activeApiConfigId = computed(() => `${state.aiConfigExt.value?.activeApiConfigId || ''}`);

const createApiConfigId = () => {
  return `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeApiConfigItem = (config) => {
  const current = config || {};
  return {
    id: current.id || createApiConfigId(),
    provider: Number(current.provider ?? 1),
    modelName: `${current.modelName || ''}`,
    apiKey: `${current.apiKey || ''}`,
    baseUrl: `${current.baseUrl || ''}`,
    timeout: Number(current.timeout || 60),
    completionsPath: `${current.completionsPath || ''}`,
    status: Number(current.status || 0),
    testPassed: Number(current.testPassed || 0),
  };
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
    status: normalizedConfig.status,
    testPassed: normalizedConfig.testPassed,
  };
  state.handleProviderChange?.(state.form.value.provider, true);
};

const persistApiConfigList = (nextList, nextActiveId = void 0) => {
  const ext = state.ensureAiConfigExtSchema();
  ext.apiConfigs = nextList.map((item) => normalizeApiConfigItem(item));
  if (nextActiveId !== void 0) {
    ext.activeApiConfigId = nextActiveId || '';
  }
  state.persistAiConfigExt();
  apiConfigList.value = ext.apiConfigs.map((item) => ({ ...item }));
};

const loadApiConfigs = () => {
  const ext = state.ensureAiConfigExtSchema();
  let list = Array.isArray(ext.apiConfigs) ? ext.apiConfigs.map((item) => normalizeApiConfigItem(item)) : [];
  let activeId = typeof ext.activeApiConfigId === 'string' ? ext.activeApiConfigId : '';
  let changed = false;

  if (!list.length && (state.form.value.apiKey || state.form.value.modelName || state.form.value.baseUrl)) {
    const defaultConfig = normalizeApiConfigItem({ ...state.form.value, id: createApiConfigId() });
    list = [defaultConfig];
    if (defaultConfig.status === 1) {
      activeId = defaultConfig.id;
    }
    changed = true;
  }

  if (activeId && !list.some((item) => item.id === activeId)) {
    activeId = '';
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
      status: item.id === activeId ? 1 : 0,
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
  apiView.value = 'list';
  editingConfigId.value = null;
};

const startNewConfig = () => {
  editingConfigId.value = null;
  editForm.value = {
    provider: Number(state.form.value.provider || 1),
    modelName: '',
    apiKey: '',
    baseUrl: '',
    timeout: Number(state.form.value.timeout || 60),
    completionsPath: `${state.form.value.completionsPath || ''}`,
    status: 0,
    testPassed: 0,
  };
  apiView.value = 'edit';
};

const startEditConfig = (id) => {
  const selected = apiConfigList.value.find((item) => item.id === id);
  if (!selected) {
    state.ElMessage({ type: 'warning', message: '配置不存在' });
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

    const id = editingConfigId.value || createApiConfigId();
    const nextItem = normalizeApiConfigItem({ ...editForm.value, id });
    const nextList = apiConfigList.value.map((item) => ({ ...item }));
    const existsIndex = nextList.findIndex((item) => item.id === id);
    if (existsIndex >= 0) {
      nextList[existsIndex] = nextItem;
    } else {
      nextList.unshift(nextItem);
    }

    const ext = state.ensureAiConfigExtSchema();
    let activeId = ext.activeApiConfigId || '';
    if (nextItem.status === 1) {
      activeId = id;
    }

    const normalizedStatusList = nextList.map((item) => ({
      ...item,
      status: activeId && item.id === activeId ? 1 : activeId ? 0 : item.status,
    }));

    persistApiConfigList(normalizedStatusList, activeId);
    editingConfigId.value = id;
    apiView.value = 'list';
    state.ElMessage({ type: 'success', message: '配置已保存' });
  });
};

const deleteApiConfig = async (id) => {
  const current = apiConfigList.value.find((item) => item.id === id);
  if (!current) {
    return;
  }

  const confirmed = await state.ElMessageBox
    .confirm(`确认删除配置【${current.modelName || '未命名模型'}】？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    .then(() => true)
    .catch(() => false);

  if (!confirmed) {
    return;
  }

  const nextList = apiConfigList.value.filter((item) => item.id !== id).map((item) => ({ ...item }));
  const ext = state.ensureAiConfigExtSchema();
  const activeId = ext.activeApiConfigId === id ? '' : ext.activeApiConfigId || '';
  persistApiConfigList(nextList, activeId);

  if (editingConfigId.value === id) {
    backToList();
  }

  state.ElMessage({ type: 'success', message: '配置已删除' });
};

const activateApiConfig = async (id) => {
  const selected = apiConfigList.value.find((item) => item.id === id);
  if (!selected) {
    state.ElMessage({ type: 'warning', message: '配置不存在' });
    return;
  }

  const nextList = apiConfigList.value.map((item) => ({
    ...item,
    status: item.id === id ? 1 : 0,
  }));
  persistApiConfigList(nextList, id);
  syncEditFormToParent({ ...selected, status: 1 });
  await state.handleSave?.();
  backToList();
};

const handleTempSave = async () => {
  if (!formRef.value) {
    return;
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }

    try {
      const payload = {
        ...state.form.value,
        ...editForm.value,
      };
      const response = await request.post('/api/user/ai/config/temp/save', payload);
      if (response.data.code === 200) {
        state.ElMessage({ type: 'success', message: '保存成功' });
        syncEditFormToParent(editForm.value);
        await state.fetchConfig?.();
      }
    } catch (error) {
      state.ElMessage({ type: 'error', message: '保存失败' });
    }
  });
};

const handleTest = async () => {
  if (!formRef.value) {
    return;
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }

    isTestLoading.value = true;
    try {
      const payload = {
        ...state.form.value,
        ...editForm.value,
      };
      const response = await request.post('/api/user/ai/config/test', payload, {
        timeout: Number(editForm.value.timeout || 60) * 1000 - 200,
      });
      if (response.data.code === 200) {
        ElNotification({
          title: '测试通过',
          message: response.data.data,
          type: 'success',
        });
        editForm.value.testPassed = 1;
        return;
      }
      ElNotification({
        title: '测试失败',
        message: response.data.message,
        type: 'error',
        customClass: 'test-failed-notification',
      });
    } catch (e) {
      ElNotification({
        title: '测试失败',
        message: `${e || ''}`,
        type: 'error',
        customClass: 'test-failed-notification',
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
</style>
