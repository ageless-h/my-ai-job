import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey from 'vite-plugin-monkey';
import path from 'node:path';

// Backend API is disabled in the frontend-only build.
const DEFAULT_API_BASE_URL = '';

const normalizeApiBaseUrl = (rawUrl: string | undefined): string => {
  const candidate = `${rawUrl || ''}`.trim();
  if (!candidate) {
    return DEFAULT_API_BASE_URL;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  return `https://${candidate}`;
};

const apiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL || process.env.VITE_API_BASE_URL);
const userscriptName = process.env.USERSCRIPT_NAME || 'AI求职助手（个人版）';
const userscriptNamespace = process.env.USERSCRIPT_NAMESPACE || 'https://ai-job-hunting.personal';
const userscriptAuthor = process.env.USERSCRIPT_AUTHOR || 'personal';
const userscriptDescription =
  process.env.USERSCRIPT_DESCRIPTION ||
  '个人版 AI 求职助手：AI对话、批量投递、自动发送简历、偏好筛选与运行记录。';
const userscriptIcon = process.env.USERSCRIPT_ICON || '';

const resolveHostByUrl = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const extraConnectHosts = `${process.env.USERSCRIPT_CONNECT_HOSTS || ''}`
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const allowAllConnect = `${process.env.USERSCRIPT_CONNECT_ALLOW_ALL || '1'}` === '1';

const connectHosts = Array.from(
  new Set(
    [
      ...(allowAllConnect ? ['*'] : []),
      'www.zhipin.com',
      'docdownload.zhipin.com',
      'api.openai.com',
      'openrouter.ai',
      'api.deepseek.com',
      'api.siliconflow.cn',
      'api.moonshot.cn',
      'ark.cn-beijing.volces.com',
      resolveHostByUrl(apiBaseUrl),
      ...extraConnectHosts,
    ].filter(Boolean)
  )
);

export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development';

  const config: any = {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    define: {
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    plugins: [
      vue(),
      // 只在生产模式使用 monkey 插件
      ...(isDev
        ? []
        : [
            monkey({
              entry: 'src/app/main.ts',
              userscript: {
                name: userscriptName,
                namespace: userscriptNamespace,
                version: process.env.npm_package_version || '0.0.0',
                author: userscriptAuthor,
                description: userscriptDescription,
                license: 'Apache License 2.0',
                ...(userscriptIcon ? { icon: userscriptIcon } : {}),
                match: ['https://www.zhipin.com/web/geek/*', 'https://www.zhipin.com/overseas/*'],
                connect: connectHosts,
                grant: [
                  'GM_addStyle',
                  'GM_addValueChangeListener',
                  'GM_getResourceText',
                  'GM_getValue',
                  'GM_notification',
                  'GM_setValue',
                  'GM_xmlhttpRequest',
                  'unsafeWindow',
                ],
              },
              build: {
                externalGlobals: [],
              },
            }),
          ]),
    ],
  };

  // 开发模式使用 dev/ 作为根目录
  if (isDev) {
    config.root = 'dev';
    config.server = {
      port: 5173,
      open: true,
    };
  }

  return config;
});
