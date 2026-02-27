import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monkey, { cdn, util } from 'vite-plugin-monkey'
import path from 'node:path'

export default defineConfig(async () => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  define: {
    __API_BASE_URL__: JSON.stringify(process.env.API_BASE_URL || 'https://43.138.246.37/')
  },
  plugins: [
    vue(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'AI工作猎手-让ai帮您找工作！',
        namespace: 'https://github.com/yangfeng20',
        version: '0.0.23-beta',
        author: 'maple.',
        description:
          '找工作，用AI工作猎手！让AI帮您找工作！ai坐席：【DeepSeek+ChatGpt】赋能，ai助理作为您的求职者分身24小时 * 7在线找工作，并结合您的简历信息定制化回复。批量投递，自动发送简历，交换联系方式。hr拒绝挽留。高意向邮件通知，让您不错过每一份工作机会。BOSS直聘',
        license: 'Apache License 2.0',
        icon: 'https://gitee.com/yangfeng20/ai-job/raw/master/file/icon.png',
        match: ['https://www.zhipin.com/web/geek/*', 'https://www.zhipin.com/overseas/*'],
        connect: ['docdownload.zhipin.com'],
        grant: [
          'GM_addStyle',
          'GM_addValueChangeListener',
          'GM_getResourceText',
          'GM_getValue',
          'GM_notification',
          'GM_setValue',
          'GM_xmlhttpRequest',
          'unsafeWindow'
        ],
      },
      build: {
        externalGlobals: [
          [
            'vue',
            cdn
              .jsdelivr('Vue', 'dist/vue.global.prod.js')
              .concat('https://unpkg.com/vue-demi@latest/lib/index.iife.js')
              .concat(
                await util.fn2dataUrl(() => {
                  // @ts-ignore
                  window.Vue = Vue;
                }),
              ),
          ],
          ['pinia', cdn.jsdelivr('Pinia', 'dist/pinia.iife.prod.js')],
          ['element-plus', cdn.jsdelivr('ElementPlus', 'dist/index.full.min.js')],
          ['protobufjs', cdn.jsdelivr('protobuf', 'dist/protobuf.min.js')],
          ['event-source-polyfill', cdn.jsdelivr('EventSourcePolyfill', 'src/eventsource.min.js')],
        ],
        externalResource: {
          'element-plus/dist/index.css': cdn.jsdelivr(),
        },
      }
    })
  ]
}))
