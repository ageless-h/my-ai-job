<template>
  <div :class="['preset-view-wrapper', presetView === 'edit' ? 'is-edit' : '']">
    <div class="preset-view-panels">
      <div class="preset-view-list">
        <div class="preset-list-header">
          <span class="preset-list-tip">管理提示词预设，启用后自动合并到系统提示词</span>
          <el-button type="primary" size="small" @click="startNewPreset">新增预设</el-button>
        </div>

        <template v-if="presetOptions.length">
          <div v-for="preset in presetOptions" :key="preset.id" class="preset-card">
            <div class="preset-card__header">
              <span class="preset-card__name">{{ preset.name }}</span>
              <el-tag size="small" :type="preset.scope === 'global' ? 'warning' : 'primary'">
                {{ preset.scope === 'global' ? '全局' : '模型' }}
              </el-tag>
            </div>
            <div class="preset-card__content">
              {{
                (preset.content || '').length > 80
                  ? `${(preset.content || '').slice(0, 80)}...`
                  : preset.content || '暂无内容'
              }}
            </div>
            <div class="preset-card__actions">
              <el-switch
                :model-value="preset.enabled !== false"
                size="small"
                active-text="启用"
                inactive-text=""
                @update:model-value="togglePresetEnabled(preset.id)"
              />
              <div class="preset-card__buttons">
                <el-button size="small" type="primary" plain @click="startEditPreset(preset.id)">编辑</el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="preset.scope === 'global'"
                  @click="deletePresetById(preset.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无预设，点击右上角新增" />
      </div>

      <div class="preset-view-edit">
        <div class="preset-edit-header">
          <el-button link type="primary" @click="backToPresetList">← 返回列表</el-button>
          <span class="preset-edit-title">{{ editingPresetId ? '编辑预设' : '新增预设' }}</span>
        </div>

        <el-form-item label="预设名称">
          <el-input v-model="presetForm.name" placeholder="例如：技术岗稳健沟通" />
        </el-form-item>

        <el-form-item label="预设内容">
          <el-input
            v-model="presetForm.content"
            type="textarea"
            :rows="6"
            :maxlength="5000"
            show-word-limit
            placeholder="输入提示词预设内容"
          />
        </el-form-item>

        <div class="variable-hint">
          <div class="variable-hint__title">可用变量（输入后投递时自动替换为岗位真实信息）</div>
          <div class="variable-hint__tags">
            <el-tag
              v-for="v in PROMPT_VARIABLE_DEFS"
              :key="v.key"
              size="small"
              type="info"
              class="variable-tag"
              @click="insertVariable(v.label)"
            >
              {{ v.label }}
            </el-tag>
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <el-button @click="backToPresetList">取消</el-button>
          <el-button type="primary" @click="savePreset">保存预设</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, inject, ref } from 'vue';
import { PROMPT_VARIABLE_DEFS } from '@/utils/tools';

const state = inject('aiConfigState');
if (!state) {
  throw new Error('PromptPresetManager 缺少 aiConfigState 注入');
}

const presetView = ref('list');
const editingPresetId = ref(null);
const presetForm = ref({ name: '', content: '', scope: 'personal' });

const presetOptions = computed(() => {
  return state.getMergedPresetList().map((preset) => ({
    ...preset,
    optionLabel: `${preset.scope === 'personal' ? '[模型]' : '[全局]'} ${preset.name}`,
  }));
});

const backToPresetList = () => {
  presetView.value = 'list';
  editingPresetId.value = null;
};

const startNewPreset = () => {
  editingPresetId.value = null;
  presetForm.value = { name: '', content: '', scope: 'personal' };
  presetView.value = 'edit';
};
const insertVariable = (label: string) => {
  presetForm.value.content = (presetForm.value.content || '') + label;
};

const startEditPreset = (id) => {
  const preset = state.getPresetById(id);
  if (!preset) {
    state.ElMessage({ type: 'warning', message: '预设不存在' });
    return;
  }
  editingPresetId.value = id;
  presetForm.value = {
    name: preset.name || '',
    content: preset.content || '',
    scope: preset.scope || 'personal',
  };
  presetView.value = 'edit';
};

const savePreset = () => {
  const name = (presetForm.value.name || '').trim();
  const content = (presetForm.value.content || '').trim();
  if (!name) {
    state.ElMessage({ type: 'warning', message: '请输入预设名称' });
    return;
  }
  if (!content) {
    state.ElMessage({ type: 'warning', message: '请输入预设内容' });
    return;
  }

  const ext = state.ensureAiConfigExtSchema();
  if (editingPresetId.value) {
    const list = state.getCurrentChannelPresetList();
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
      tags: ['个人'],
      content,
      scope: 'personal',
      enabled: true,
      updatedAt: Date.now(),
    };
    state.getCurrentChannelPresetList().push(preset);
  }

  state.persistAiConfigExt();
  state.ElMessage({ type: 'success', message: editingPresetId.value ? '预设已更新' : '预设已创建' });
  backToPresetList();
};

const togglePresetEnabled = (id) => {
  const ext = state.ensureAiConfigExtSchema();
  const list = state.getCurrentChannelPresetList();
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    list[idx].enabled = !list[idx].enabled;
    state.persistAiConfigExt();
    return;
  }

  const globalList = ext.promptPresetStore.global || [];
  const gIdx = globalList.findIndex((item) => item.id === id);
  if (gIdx >= 0) {
    globalList[gIdx].enabled = !globalList[gIdx].enabled;
    state.persistAiConfigExt();
  }
};

const deletePresetById = async (id) => {
  const preset = state.getPresetById(id);
  if (!preset) {
    return;
  }
  if (preset.scope === 'global') {
    state.ElMessage({ type: 'warning', message: '全局预设不可删除' });
    return;
  }

  const confirmed = await state.ElMessageBox
    .confirm(`确认删除预设【${preset.name}】？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    .then(() => true)
    .catch(() => false);
  if (!confirmed) {
    return;
  }

  const list = state.getCurrentChannelPresetList();
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    state.persistAiConfigExt();
    state.ElMessage({ type: 'success', message: '预设已删除' });
    if (state.selectedPresetId.value === id) {
      state.selectedPresetId.value = '';
    }
  }
};
</script>

<style scoped>
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
:deep(.variable-hint){margin-top:4px;padding:8px 10px;background:#fafafa;border:1px dashed #dcdfe6;border-radius:4px}
:deep(.variable-hint__title){font-size:12px;color:#909399;margin-bottom:6px}
:deep(.variable-hint__tags){display:flex;flex-wrap:wrap;gap:6px}
:deep(.variable-tag){cursor:pointer}
:deep(.variable-tag:hover){color:var(--ai-primary,#409eff);border-color:var(--ai-primary,#409eff)}
</style>
