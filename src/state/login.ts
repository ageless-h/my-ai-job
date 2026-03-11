// -*- coding: utf-8 -*-
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLoginStore = defineStore('ai-login', () => {
  const login = ref<boolean | undefined>();
  const loginFailStatus = ref<boolean | undefined>();

  function loginSuccess(): void {
    login.value = true;
    loginFailStatus.value = false;
  }

  function loginFail(): void {
    login.value = false;
    loginFailStatus.value = true;
  }

  return {
    login,
    loginSuccess,
    loginFailStatus,
    loginFail,
  };
});

// Backward-compatible alias for legacy naming.
export const LoginStore = useLoginStore;
