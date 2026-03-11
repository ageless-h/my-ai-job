// -*- coding: utf-8 -*-
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import '@/styles/ui-migration.css';

import App from '@/app/App.vue';
import { createStoreRuntimeAdapter } from '@/app/adapters/store-adapter';
import { request } from '@/core/http/request';
import { PlatformFactory } from '@/core/platform/platform-factory';

declare global {
  interface Window {
    __AI_JOB_HUNTING_MOUNTED__?: boolean;
    __AI_JOB_HUNTING_MOUNTING__?: boolean;
  }
}

const ROOT_ID = 'ai-job';

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: zhCn });

const runtimeDeps = createStoreRuntimeAdapter();
const platform = PlatformFactory.getInstance(location.href, runtimeDeps);
app.provide('$platform', platform);
app.provide('$axios', request);

const ensureSingleRoot = () => {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(`#${ROOT_ID}`));
  if (roots.length > 1) {
    roots.slice(1).forEach((node) => node.remove());
  }
  return roots[0] || null;
};

const mountApp = () => {
  const existingRoot = ensureSingleRoot();
  if (existingRoot) {
    window.__AI_JOB_HUNTING_MOUNTED__ = true;
    return;
  }

  if (window.__AI_JOB_HUNTING_MOUNTED__ || window.__AI_JOB_HUNTING_MOUNTING__) {
    return;
  }

  window.__AI_JOB_HUNTING_MOUNTING__ = true;

  const rootApp = document.createElement('div');
  rootApp.id = ROOT_ID;
  rootApp.classList.add('page-job-content');

  platform
    .getMountEle()
    .then((elP) => {
      const latestRoot = ensureSingleRoot();
      if (latestRoot) {
        window.__AI_JOB_HUNTING_MOUNTED__ = true;
        return;
      }

      const containerEle = elP.el;
      if (elP.p === 'end') {
        containerEle.appendChild(rootApp);
      } else {
        containerEle.insertBefore(rootApp, containerEle.firstElementChild);
      }

      app.mount(rootApp);
      window.__AI_JOB_HUNTING_MOUNTED__ = true;
    })
    .finally(() => {
      window.__AI_JOB_HUNTING_MOUNTING__ = false;
    });
};

if (document.readyState === 'complete') {
  mountApp();
} else {
  window.addEventListener('load', mountApp, { once: true });
}
