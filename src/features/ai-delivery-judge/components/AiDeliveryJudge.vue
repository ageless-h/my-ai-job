<!--
/**
 * AiDeliveryJudge.vue - AI 投递判定组件
 * 
 * 封装 AI 投递判定设置面板，提供简洁的标签页入口。
 * 
 * 主要功能：
 * - 嵌入 AiDeliveryJudgeSettingsPanel 组件
 * - 提供统一的标题和布局
 * 
 * @component
 */
-->
<template>
  <div class="ai-delivery-judge-tab">
    <div class="header-title">AI 投递判定</div>
    <AiDeliveryJudgeSettingsPanel
      :show-section-header="false"
      :embedded="true"
      :show-sync-hint="false"
    />
    <div class="bottom-spacer" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import AiDeliveryJudgeSettingsPanel from '@/features/ai-delivery-judge/components/AiDeliveryJudgeSettingsPanel.vue';
</script>

<style scoped>
.ai-delivery-judge-tab {
  height: 100%;
  width: 100%;
  padding: var(--spacing-2xl);
  overflow-y: auto;
  box-sizing: border-box;
  background: var(--ai-bg-subtle);
}

.header-title {
  font-size: var(--text-xl);
  font-weight: 500;
  color: var(--ai-text-main);
  margin-bottom: var(--spacing-2xl);
  border-left: 3px solid var(--boss-primary, #00bebd);
  padding-left: var(--spacing-lg);
  line-height: 1;
}

.bottom-spacer {
  height: 120px;
  width: 100%;
  pointer-events: none;
}
</style>
