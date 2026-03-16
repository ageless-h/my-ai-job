// -*- coding: utf-8 -*-
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import '@/styles/boss-design-system.css';
import '@/styles/ui-migration.css';

import App from '@/app/App.vue';
import { MockPlatform } from './mock-platform';
import { request } from '@/core/http/request';
import { bindPlatformRuntime } from '@/core/engine/push-engine';
import { usePushResultStore } from '@/state/push-result';
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
const pushResultStore = usePushResultStore();
const userStore = useUserStore();

bindPlatformRuntime(
  {
    notMatchCount: pushResultStore.notMatchCount,
    successCount: pushResultStore.successCount,
    onceSuccessCount: pushResultStore.onceSuccessCount,
    failCount: pushResultStore.failCount,
    collectSuccessCount: pushResultStore.collectSuccessCount,
    collectFailCount: pushResultStore.collectFailCount,
    onceCollectSuccessCount: pushResultStore.onceCollectSuccessCount,
    notMatchIncr: () => pushResultStore.notMatchIncr(),
    successIncr: () => pushResultStore.successIncr(),
    failIncr: () => pushResultStore.failIncr(),
    collectSuccessIncr: () => pushResultStore.collectSuccessIncr(),
    collectFailIncr: () => pushResultStore.collectFailIncr(),
    clearOnceSuccessCount: () => pushResultStore.clearOnceSuccessCount(),
    clearOnceCollectSuccessCount: () => pushResultStore.clearOnceCollectSuccessCount(),
  },
  {
    user: userStore.user,
    platformType: 'boss',
    preferenceLoadStatus: userStore.preferenceLoadStatus,
    preferenceLoadError: userStore.preferenceLoadError,
  }
);

console.log('[Dev Mode] 挂载应用到 #ai-job');

// 直接挂载到 #ai-job
app.mount('#ai-job');
