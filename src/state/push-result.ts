// -*- coding: utf-8 -*-
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { TampermonkeyApi } from '@/shared/utils/tampermonkey';

export const usePushResultStore = defineStore('ai-push-result', () => {
  const notMatchCount = ref(0);
  const successCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, 0));
  const onceSuccessCount = ref(0);
  const failCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_FAIL_COUNT, 0));

  const collectSuccessCount = ref(
    TampermonkeyApi.GmGetValue(TampermonkeyApi.COLLECT_SUCCESS_COUNT, 0)
  );
  const collectFailCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.COLLECT_FAIL_COUNT, 0));
  const onceCollectSuccessCount = ref(0);

  function notMatchIncr(): void {
    notMatchCount.value++;
  }

  function successIncr(): void {
    successCount.value++;
    onceSuccessCount.value++;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, successCount.value);
  }

  function failIncr(): void {
    failCount.value++;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_FAIL_COUNT, failCount.value);
  }

  function collectSuccessIncr(): void {
    collectSuccessCount.value++;
    onceCollectSuccessCount.value++;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.COLLECT_SUCCESS_COUNT, collectSuccessCount.value);
  }

  function collectFailIncr(): void {
    collectFailCount.value++;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.COLLECT_FAIL_COUNT, collectFailCount.value);
  }

  function clearOnceSuccessCount(): void {
    onceSuccessCount.value = 0;
  }

  function clearOnceCollectSuccessCount(): void {
    onceCollectSuccessCount.value = 0;
  }

  function clearCounts(): void {
    notMatchCount.value = 0;
    successCount.value = 0;
    failCount.value = 0;
    onceSuccessCount.value = 0;
    collectSuccessCount.value = 0;
    collectFailCount.value = 0;
    onceCollectSuccessCount.value = 0;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, successCount.value);
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_FAIL_COUNT, failCount.value);
    TampermonkeyApi.GmSetValue(TampermonkeyApi.COLLECT_SUCCESS_COUNT, collectSuccessCount.value);
    TampermonkeyApi.GmSetValue(TampermonkeyApi.COLLECT_FAIL_COUNT, collectFailCount.value);
  }

  return {
    notMatchIncr,
    successIncr,
    notMatchCount,
    successCount,
    failCount,
    failIncr,
    onceSuccessCount,
    clearOnceSuccessCount,
    collectSuccessCount,
    collectFailCount,
    collectSuccessIncr,
    collectFailIncr,
    onceCollectSuccessCount,
    clearOnceCollectSuccessCount,
    clearCounts,
  };
});

// Backward-compatible alias for legacy naming.
export const pushResultCount = usePushResultStore;
