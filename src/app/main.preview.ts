import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import '@/styles/ui-migration.css';

import App from '@/app/App.vue';
import { request } from '@/core/http/request';

declare global {
  interface Window {
    __AI_JOB_HUNTING_PREVIEW_MOUNTED__?: boolean;
    __AI_JOB_HUNTING_PREVIEW_MOUNTING__?: boolean;
  }
}

const ROOT_ID = 'ai-job';

type PreviewPlatform = {
  selfDefPushCountLimit: number;
  collectMode: boolean;
  pushMock: boolean;
  startPush: () => Promise<void>;
  pausePush: () => void;
  getMountEle: () => Promise<{ el: HTMLElement; p: 'end' }>;
};

const previewPlatform: PreviewPlatform = {
  selfDefPushCountLimit: 20,
  collectMode: false,
  pushMock: true,
  startPush: async () => {
    return Promise.resolve();
  },
  pausePush: () => {
    return;
  },
  getMountEle: async () => ({ el: document.body, p: 'end' }),
};

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: zhCn });
app.provide('$platform', previewPlatform);
app.provide('$axios', request);

const ensureSingleRoot = () => {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(`#${ROOT_ID}`));
  if (roots.length > 1) {
    roots.slice(1).forEach((node) => node.remove());
  }
  return roots[0] || null;
};

const mountPreviewApp = () => {
  const existingRoot = ensureSingleRoot();
  if (existingRoot) {
    window.__AI_JOB_HUNTING_PREVIEW_MOUNTED__ = true;
    return;
  }

  if (window.__AI_JOB_HUNTING_PREVIEW_MOUNTED__) {
    return;
  }

  if (window.__AI_JOB_HUNTING_PREVIEW_MOUNTING__) {
    return;
  }

  window.__AI_JOB_HUNTING_PREVIEW_MOUNTING__ = true;
  try {
    const rootApp = document.createElement('div');
    rootApp.id = ROOT_ID;
    rootApp.classList.add('page-job-content');
    document.body.appendChild(rootApp);
    app.mount(rootApp);
    window.__AI_JOB_HUNTING_PREVIEW_MOUNTED__ = true;
  } finally {
    window.__AI_JOB_HUNTING_PREVIEW_MOUNTING__ = false;
  }
};

mountPreviewApp();
