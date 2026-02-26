// -*- coding: utf-8 -*-
import { defineStore } from "pinia";
import { ref } from "vue";

export const LoginStore = defineStore("LoginStore", () => {
  const login = ref<boolean | undefined>();
  const loginFailStatus = ref<boolean | undefined>();

  function loginSuccess(): void {
    login.value = true;
  }

  function loginFail(): void {
    loginFailStatus.value = true;
  }

  return {
    login,
    loginSuccess,
    loginFailStatus,
    loginFail
  };
});
