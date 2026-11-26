<template>
  <div class="dsh-bridge">
    <strong>本机 DSH 同步</strong>
    <span role="status">{{ state.status }}</span>
    <small v-if="state.lastSync">上次同步 {{ new Date(state.lastSync).toLocaleString() }}</small>
    <el-button v-if="state.enabled || state.status === '正在配对'" size="small" @click="stop"
      >关闭</el-button
    >
    <template v-else
      ><el-button v-if="state.paired" size="small" @click="bridge.resume">恢复同步</el-button
      ><el-button size="small" @click="connect">{{
        state.paired ? '重新配对' : '配对'
      }}</el-button></template
    >
  </div>
</template>
<script setup lang="ts">
import { getBridgeSync } from './runtime';
const bridge = getBridgeSync();
const state = bridge.state;
function connect() {
  const code = window.prompt(
    '输入本机 DSH 插件提供的一次性配对码。配对后将同步当前日志中的岗位、时间、策略和发送状态。'
  );
  if (code?.trim()) void bridge.pair(code);
}
function stop() {
  bridge.disable();
}
</script>
<style scoped>
.dsh-bridge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}
.dsh-bridge small {
  color: var(--el-text-color-secondary);
}
</style>
