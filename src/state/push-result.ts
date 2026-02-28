// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { ref } from "vue";
import { TampermonkeyApi } from '@/shared/utils/tampermonkey';

export const pushResultCount = defineStore("pushResultCount", () => {
  const notMatchCount = ref(0);
  const successCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, 0));
  const onceSuccessCount = ref(0);
  const failCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_FAIL_COUNT, 0));

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

  function clearOnceSuccessCount(): void {
    onceSuccessCount.value = 0;
  }

  function clearCounts(): void {
    notMatchCount.value = 0;
    successCount.value = 0;
    failCount.value = 0;
    onceSuccessCount.value = 0;
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, successCount.value);
    TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_FAIL_COUNT, failCount.value);
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
    clearCounts
  };
});
