<template>
  <el-dialog v-model="debugDialogVisible" title="调户提示词" width="800px">
    <div class="chat-history">
      <el-empty
        v-if="debugHistory.length === 0"
        description="暂无历史消息，请在下方开始你的调试吧"
      />
      <div
        v-for="(m, idx) in debugHistory"
        :key="idx"
        :class="['chat-row', m.role === 'user' ? 'from-user' : 'from-ai']"
      >
        <div class="bubble">
          <div class="meta">{{ mapRoleTitle(m.role) }}</div>
          <div class="content">{{ m.content }}</div>
          <div v-if="m.role === 'assistant'" class="tags">
            <el-tag v-for="(t, i) in m.answerTypes || []" :key="`a-${i}`" size="small" type="info">
              {{ mapAnswerType(t) }}
            </el-tag>
            <el-tag
              v-for="(t, i) in m.operationTypes || []"
              :key="`o-${i}`"
              size="small"
              type="success"
            >
              {{ mapOperationType(t) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-composer">
      <div class="composer-input">
        <el-input
          v-model="debugQuestion"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 8 }"
          :maxlength="5000"
          show-word-limit
          placeholder="作为招聘的HR角色提出你的问题,AI代聊将结合你的偏好设置与微调提示词给出最终回答"
          clearable
        />
        <el-button
          class="send-btn"
          type="primary"
          :loading="isDebugLoading"
          @click="handleSendDebug"
          >发送</el-button
        >
      </div>
    </div>

    <template #footer>
      <el-button
        type="warning"
        :disabled="isDebugLoading || debugHistory.length === 0"
        @click="handleClearHistory"
      >
        清空历史
      </el-button>
      <el-button @click="debugDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, inject, ref, watch } from 'vue';
import { request } from '@/core/http/request';
import { Tools, resolvePromptVariables, PROMPT_VARIABLE_DEFS } from '@/shared/utils/tools';
import { getActiveDirectConfig, directAiCall } from '@/core/ai/direct-ai-client';

const state = inject('aiConfigState');
if (!state) {
  throw new Error('DebugConsole 缺少 aiConfigState 注入');
}
const DEBUG_MOCK_VARS: Record<string, string> = {};
PROMPT_VARIABLE_DEFS.forEach((v) => {
  DEBUG_MOCK_VARS[v.key] = `[示例${v.label}]`;
});

const debugDialogVisible = ref(false);
const debugQuestion = ref('');
const isDebugLoading = ref(false);
const debugHistory = ref([]);
const jobKey = ref('');

const finalPromptPreview = computed(() => {
  const enabledMergedText = state
    .getMergedPresetList()
    .filter((preset) => preset.enabled !== false)
    .map(
      (preset, index) =>
        `# ${preset.scope === 'personal' ? '模型' : '全局'}预设${index + 1} ${preset.name}\n${preset.content}`
    )
    .join('\n\n');
  return enabledMergedText || '暂无可用提示词内容';
});

const openDebugDialog = () => {
  loadCurrentDebugHistory();
  debugDialogVisible.value = true;
};

const getJobKey = () => {
  if (jobKey.value) {
    return jobKey.value;
  }
  const key =
    'ask-debug-' +
    Tools.window._PAGE.uid +
    '-' +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    '@' +
    Tools.buildModelChannelKey(state.form.value.provider, state.form.value.modelName);
  jobKey.value = key;
  return key;
};

const persistCurrentDebugHistory = () => {
  const ext = state.ensureAiConfigExtSchema();
  const key = state.buildCurrentModelChannelKey();
  ext.debugHistoryByChannel[key] = Array.isArray(debugHistory.value)
    ? debugHistory.value.slice(-20).map((item) => ({ ...item }))
    : [];
  state.persistAiConfigExt();
};

const loadCurrentDebugHistory = () => {
  const ext = state.ensureAiConfigExtSchema();
  const key = state.buildCurrentModelChannelKey();
  const list = ext.debugHistoryByChannel[key];
  debugHistory.value = Array.isArray(list) ? list.slice(-20).map((item) => ({ ...item })) : [];
};

const saveDebugHistoryByChannelKey = (channelKey, historyList) => {
  if (!channelKey) {
    return;
  }
  const ext = state.ensureAiConfigExtSchema();
  ext.debugHistoryByChannel[channelKey] = Array.isArray(historyList)
    ? historyList.slice(-20).map((item) => ({ ...item }))
    : [];
  state.persistAiConfigExt();
};

const handleSendDebug = async () => {
  if (!debugQuestion.value) {
    state.showAppMessage({ type: 'warning', message: '请输入问题' });
    return;
  }
  if (debugHistory.value.length >= 20) {
    state.showAppMessage({
      type: 'warning',
      message: '总对话长度不能超过20条，请先清空历史消息重试',
    });
    return;
  }

  const question = debugQuestion.value;
  debugHistory.value.push({ role: 'user', content: question });
  persistCurrentDebugHistory();
  debugQuestion.value = '';
  isDebugLoading.value = true;

  try {
    const directConfig = getActiveDirectConfig();
    if (directConfig) {
      // 直接调用用户 API
      const systemPrompt = resolvePromptVariables(finalPromptPreview.value || '', DEBUG_MOCK_VARS);
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      // 添加历史消息
      debugHistory.value.slice(0, debugHistory.value.length - 1).forEach((m) => {
        messages.push({ role: m.role, content: m.content });
      });
      messages.push({ role: 'user', content: question });
      const answer = await directAiCall(directConfig, messages);
      debugHistory.value.push({
        role: 'assistant',
        content: answer || '(未返回内容)',
        answerTypes: [1],
        operationTypes: [],
      });
      persistCurrentDebugHistory();
    } else {
      // 走后端
      const payload = {
        jobKey: getJobKey(),
        question,
        jobInfo: {},
        userPrompt: resolvePromptVariables(finalPromptPreview.value || '', DEBUG_MOCK_VARS),
        messageList: debugHistory.value.slice(0, debugHistory.value.length - 1),
      };
      const resp = await request.post('/api/user/ai/config/debug', payload, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      });
      const data = resp?.data?.data || {};
      const answer = data?.answerContent || '';
      const answerTypes = Array.isArray(data?.answerTypeList) ? data.answerTypeList : [];
      const operationTypes = Array.isArray(data?.operationTypeList) ? data.operationTypeList : [];
      debugHistory.value.push({ role: 'assistant', content: answer, answerTypes, operationTypes });
      persistCurrentDebugHistory();
    }
  } catch (e) {
    state.showAppMessage({ type: 'error', message: `调试失败: ${e?.message || e || ''}` });
  } finally {
    isDebugLoading.value = false;
  }
};

const handleClearHistory = () => {
  debugHistory.value = [];
  persistCurrentDebugHistory();
  jobKey.value = '';
};

const mapAnswerType = (t) => {
  if (t === 0) return 'NULL';
  if (t === 1) return '发送消息';
  if (t === 2) return 'BOSS操作';
  if (t === 3) return '不回复当前消息';
  if (t === 4) return 'AI服务异常';
  return String(t);
};

const mapOperationType = (t) => {
  if (t === 0) return 'NULL';
  if (t === 1) return '发送简历';
  return String(t);
};

const mapRoleTitle = (role) => {
  if (role === 'user') return 'HR';
  return 'AI代聊';
};

watch(
  () => `${state.form.value.provider}:${state.form.value.modelName || ''}`,
  (newChannelKey, oldChannelKey) => {
    if (oldChannelKey && oldChannelKey !== newChannelKey) {
      saveDebugHistoryByChannelKey(oldChannelKey, debugHistory.value);
    }
    loadCurrentDebugHistory();
    jobKey.value = '';
  }
);

defineExpose({
  open: openDebugDialog,
});
</script>

<style scoped>
:deep(.chat-history) {
  max-height: 420px;
  overflow-y: auto;
  padding: var(--spacing-lg) var(--spacing-sm);
  background: var(--boss-bg-color);
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius-card);
}
:deep(.chat-composer) {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
:deep(.composer-input) {
  position: relative;
  width: 100%;
}
:deep(.composer-input .el-textarea__inner) {
  padding-right: 84px;
  padding-bottom: 50px;
}
:deep(.composer-input .el-input__count) {
  bottom: 40px;
  right: 8px;
}
:deep(.send-btn) {
  position: absolute;
  right: 8px;
  bottom: 8px;
}
:deep(.chat-row) {
  display: flex;
  margin: var(--spacing-lg) 0;
}
:deep(.chat-row.from-user) {
  justify-content: flex-start;
}
:deep(.chat-row.from-ai) {
  justify-content: flex-end;
}
:deep(.bubble) {
  max-width: 80%;
  padding: var(--spacing-lg) var(--spacing-2-5);
  border-radius: var(--radius-card);
  background: var(--boss-bg-white);
  box-shadow: var(--shadow-card);
}
:deep(.from-user .bubble) {
  background: var(--boss-bg-color);
}
:deep(.from-ai .bubble) {
  background: var(--boss-primary-light);
}
:deep(.bubble .content) {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
}
:deep(.bubble .meta) {
  font-size: 12px;
  color: var(--boss-text-tertiary);
  margin-bottom: 4px;
}
:deep(.bubble .tags) {
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
