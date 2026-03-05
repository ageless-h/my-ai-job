<template>
  <div class="ai-delivery-judge-tab">
    <div class="header-title">AI 投递判定</div>
    <AiDeliveryJudgeSettingsPanel :show-section-header="false" :embedded="true" :show-sync-hint="false" />
    <div class="bottom-spacer" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import AiDeliveryJudgeSettingsPanel from "@/features/ai-delivery-judge/components/AiDeliveryJudgeSettingsPanel.vue";
</script>

<style scoped>
.ai-delivery-judge-tab {
  height: 100%;
  width: 100%;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
  background: #f8f9fa;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
  border-left: 3px solid var(--boss-primary, #00bebd);
  padding-left: 8px;
  line-height: 1;
}

.bottom-spacer {
  height: 120px;
  width: 100%;
  pointer-events: none;
}
</style>
