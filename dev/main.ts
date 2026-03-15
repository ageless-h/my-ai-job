// -*- coding: utf-8 -*-
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import '@/styles/ui-migration.css';

import App from '@/app/App.vue';
import { MockPlatform } from './mock-platform';
import { request } from '@/core/http/request';
import { bindPlatformRuntime } from '@/core/engine/push-engine';
import { useCounterStore } from '@/state/counter';
import { useUserStore } from '@/state/user';

console.log('[Dev Mode] 启动开发模式');

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(ElementPlus, { locale: zhCn });

// 开发模式：直接注入 MockPlatform
const mockPlatform = new MockPlatform();
app.provide('$platform', mockPlatform);
app.provide('$axios', request);

// 绑定运行时依赖
const counterStore = useCounterStore();
const userStore = useUserStore();

bindPlatformRuntime(
  {
    notMatchCount: counterStore.notMatchCount,
    successCount: counterStore.successCount,
    onceSuccessCount: counterStore.onceSuccessCount,
    failCount: counterStore.failCount,
    collectSuccessCount: counterStore.collectSuccessCount,
    collectFailCount: counterStore.collectFailCount,
    onceCollectSuccessCount: counterStore.onceCollectSuccessCount,
    notMatchIncr: () => counterStore.notMatchIncr(),
    successIncr: () => counterStore.successIncr(),
    failIncr: () => counterStore.failIncr(),
    collectSuccessIncr: () => counterStore.collectSuccessIncr(),
    collectFailIncr: () => counterStore.collectFailIncr(),
    clearOnceSuccessCount: () => counterStore.clearOnceSuccessCount(),
    clearOnceCollectSuccessCount: () => counterStore.clearOnceCollectSuccessCount(),
  },
  {
    user: userStore.user,
    platformType: 'boss',
    preferenceLoadStatus: userStore.preferenceLoadStatus,
    preferenceLoadError: userStore.preferenceLoadError,
  }
);

console.log('[Dev Mode] 挂载应用到 #app');

// 直接挂载到 #app
app.mount('#app');
