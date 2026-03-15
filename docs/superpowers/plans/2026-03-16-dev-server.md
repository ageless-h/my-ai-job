# 独立开发服务器实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建独立的开发服务器，支持 UI 热更新和独立测试

**Architecture:** 通过 Vite 配置区分开发/生产模式，开发模式使用独立入口和 MockPlatform，生产模式保持不变

**Tech Stack:** Vite, Vue 3, TypeScript, vite-plugin-monkey

---

## Chunk 1: 基础文件结构

### Task 1: 创建开发目录和 HTML 入口

**Files:**

- Create: `dev/index.html`

- [ ] **Step 1: 创建 dev 目录**

```bash
mkdir dev
```

- [ ] **Step 2: 创建 HTML 入口文件**

创建 `dev/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI 求职助手 - 开发模式</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: 验证文件创建**

```bash
ls dev/index.html
```

Expected: 文件存在

- [ ] **Step 4: Commit**

```bash
git add dev/index.html
git commit -m "feat: 添加开发模式 HTML 入口"
```

---

### Task 2: 创建模拟数据文件

**Files:**

- Create: `dev/mock-data.ts`

- [ ] **Step 1: 创建模拟数据文件**

创建 `dev/mock-data.ts`:

```typescript
// 模拟职位列表数据
export const MOCK_JOB_LIST = [
  {
    id: 'job-001',
    encryptJobId: 'job-001',
    jobName: '前端开发工程师',
    brandName: '某科技公司',
    salaryDesc: '20-30K',
    cityName: '北京',
    areaDistrict: '朝阳区',
    jobExperience: '3-5年',
    jobDegree: '本科',
    skills: ['Vue', 'React', 'TypeScript'],
    positionDetail: '负责公司核心产品的前端开发，参与技术选型和架构设计。',
    bossName: '张经理',
    bossTitle: '技术总监',
    activeTimeDesc: '刚刚活跃',
  },
  {
    id: 'job-002',
    encryptJobId: 'job-002',
    jobName: 'Vue.js 高级工程师',
    brandName: '互联网公司',
    salaryDesc: '25-40K',
    cityName: '北京',
    areaDistrict: '海淀区',
    jobExperience: '5-10年',
    jobDegree: '本科',
    skills: ['Vue3', 'Vite', 'Pinia'],
    positionDetail: '负责前端架构设计和技术选型，带领团队完成核心业务开发。',
    bossName: '李总监',
    bossTitle: 'CTO',
    activeTimeDesc: '1小时内活跃',
  },
  {
    id: 'job-003',
    encryptJobId: 'job-003',
    jobName: 'TypeScript 开发工程师',
    brandName: '创业公司',
    salaryDesc: '18-25K',
    cityName: '北京',
    areaDistrict: '中关村',
    jobExperience: '1-3年',
    jobDegree: '本科',
    skills: ['TypeScript', 'Node.js', 'Express'],
    positionDetail: '负责后端服务开发，参与 API 设计和数据库优化。',
    bossName: '王经理',
    bossTitle: '技术负责人',
    activeTimeDesc: '3小时内活跃',
  },
  {
    id: 'job-004',
    encryptJobId: 'job-004',
    jobName: '全栈开发工程师',
    brandName: '外企',
    salaryDesc: '30-50K',
    cityName: '上海',
    areaDistrict: '浦东新区',
    jobExperience: '5-10年',
    jobDegree: '硕士',
    skills: ['Vue', 'Node.js', 'MongoDB'],
    positionDetail: '负责全栈开发，包括前端、后端和数据库设计。',
    bossName: 'John',
    bossTitle: 'Engineering Manager',
    activeTimeDesc: '今日活跃',
  },
  {
    id: 'job-005',
    encryptJobId: 'job-005',
    jobName: '前端架构师',
    brandName: '大厂',
    salaryDesc: '40-60K',
    cityName: '深圳',
    areaDistrict: '南山区',
    jobExperience: '10年以上',
    jobDegree: '本科',
    skills: ['Vue', 'React', 'Webpack', 'Vite'],
    positionDetail: '负责前端架构设计、技术选型和团队建设。',
    bossName: '陈总',
    bossTitle: '技术VP',
    activeTimeDesc: '本周活跃',
  },
];

// 模拟用户信息
export const MOCK_GEEK_INFO = {
  name: '测试用户',
  expectSalary: '20-30K',
  expectCity: '北京',
  workYears: 5,
};

// 错误模拟配置（可选）
export const MOCK_CONFIG = {
  simulateError: false, // 是否模拟错误
  errorRate: 0.1, // 错误率 10%
  networkDelay: 300, // 网络延迟（毫秒）
};
```

- [ ] **Step 2: 验证文件创建**

```bash
ls dev/mock-data.ts
```

Expected: 文件存在

- [ ] **Step 3: 类型检查**

```bash
npm run type-check
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add dev/mock-data.ts
git commit -m "feat: 添加模拟数据文件"
```

---

### Task 3: 创建 MockPlatform 类

**Files:**

- Create: `dev/mock-platform.ts`

- [ ] **Step 1: 创建 MockPlatform 类文件**

创建 `dev/mock-platform.ts`:

```typescript
// -*- coding: utf-8 -*-
import { AbsPlatform } from '@/core/engine/push-engine';
import { MOCK_JOB_LIST, MOCK_CONFIG } from './mock-data';

export class MockPlatform extends AbsPlatform {
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 必须实现的抽象方法（来自 AbsPlatform）
  getJobList(): any[] {
    console.log('[MockPlatform] getJobList: 返回', MOCK_JOB_LIST.length, '条职位');
    return MOCK_JOB_LIST;
  }

  hasNext(): boolean {
    console.log('[MockPlatform] hasNext: false (开发模式不需要分页)');
    return false; // 开发模式不需要分页
  }

  async acquireDataPre(): Promise<void> {
    await this.delay(MOCK_CONFIG.networkDelay);
    console.log('[MockPlatform] acquireDataPre: 数据预加载完成');
  }

  startPreHandler(): void {
    console.log('[MockPlatform] startPreHandler: 开始前置处理');
  }

  async matchJob(jobDetail: any): Promise<boolean> {
    await this.delay(200);
    console.log('[MockPlatform] matchJob:', jobDetail.id, jobDetail.jobName);
    return true; // 开发模式默认匹配所有职位
  }

  async pushAfterHandler(pushResult: any, jobDetail: any): Promise<any> {
    console.log('[MockPlatform] pushAfterHandler:', jobDetail.id, pushResult);
    return pushResult;
  }

  pushPreHandler(jobDetail: any): any {
    console.log('[MockPlatform] pushPreHandler:', jobDetail.id);
    return jobDetail;
  }

  getJobKey(jobDetail: any): string {
    return jobDetail.id || jobDetail.encryptJobId || '';
  }

  async doPush(jobDetail: any): Promise<any> {
    await this.delay(MOCK_CONFIG.networkDelay);

    // 模拟错误场景
    if (MOCK_CONFIG.simulateError && Math.random() < MOCK_CONFIG.errorRate) {
      console.error('[MockPlatform] doPush: 模拟投递失败', jobDetail.id);
      throw new Error('模拟投递失败');
    }

    console.log('[MockPlatform] doPush: 投递成功', jobDetail.id, jobDetail.jobName);
    return { success: true, message: '投递成功' };
  }

  // 其他平台特定方法（如果需要）
  async doCollect(jobDetail: any): Promise<any> {
    await this.delay(200);

    // 模拟错误场景
    if (MOCK_CONFIG.simulateError && Math.random() < MOCK_CONFIG.errorRate) {
      console.error('[MockPlatform] doCollect: 模拟收藏失败', jobDetail.id);
      throw new Error('模拟收藏失败');
    }

    console.log('[MockPlatform] doCollect: 收藏成功', jobDetail.id, jobDetail.jobName);
    return { success: true };
  }
}
```

- [ ] **Step 2: 验证文件创建**

```bash
ls dev/mock-platform.ts
```

Expected: 文件存在

- [ ] **Step 3: 类型检查**

```bash
npm run type-check
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add dev/mock-platform.ts
git commit -m "feat: 添加 MockPlatform 类实现"
```

---

### Task 4: 创建开发模式入口文件

**Files:**

- Create: `dev/main.ts`

- [ ] **Step 1: 创建开发入口文件**

创建 `dev/main.ts`:

```typescript
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
```

- [ ] **Step 2: 验证文件创建**

```bash
ls dev/main.ts
```

Expected: 文件存在

- [ ] **Step 3: 类型检查**

```bash
npm run type-check
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add dev/main.ts
git commit -m "feat: 添加开发模式入口文件"
```

---

## Chunk 2: Vite 配置修改

### Task 5: 修改 Vite 配置支持开发模式

**Files:**

- Modify: `vite.config.ts`

- [ ] **Step 1: 备份原配置**

```bash
cp vite.config.ts vite.config.ts.backup
```

- [ ] **Step 2: 修改 Vite 配置**

修改 `vite.config.ts`，在 `export default defineConfig` 部分：

将：

```typescript
export default defineConfig(async () => ({
```

改为：

```typescript
export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development'

  return {
```

然后在 `plugins` 数组中修改：

将：

```typescript
    plugins: [
      vue(),
      monkey({
```

改为：

```typescript
    plugins: [
      vue(),
      // 只在生产模式使用 monkey 插件
      ...(isDev ? [] : [
        monkey({
```

在 `monkey` 插件配置后添加：

```typescript
        })
      ])
    ],
```

在配置对象末尾（`plugins` 之后）添加：

```typescript
    // 开发模式使用 dev/ 作为根目录
    ...(isDev ? {
      root: 'dev',
      server: {
        port: 5173,
        open: true
      }
    } : {})
  }
})
```

完整的修改后的结构应该是：

```typescript
export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development';

  return {
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
                // ... 保留现有配置
              },
              build: {
                externalGlobals: [],
              },
            }),
          ]),
    ],
    // 开发模式使用 dev/ 作为根目录
    ...(isDev
      ? {
          root: 'dev',
          server: {
            port: 5173,
            open: true,
          },
        }
      : {}),
  };
});
```

- [ ] **Step 3: 类型检查**

```bash
npm run type-check
```

Expected: 无类型错误

- [ ] **Step 4: 测试开发模式启动**

```bash
npm run dev
```

Expected:

- Vite 开发服务器启动
- 浏览器自动打开 http://localhost:5173
- 控制台显示 "[Dev Mode] 启动开发模式"

- [ ] **Step 5: 停止开发服务器**

按 Ctrl+C 停止服务器

- [ ] **Step 6: 测试生产构建**

```bash
npm run build
```

Expected:

- 构建成功
- 输出 dist/ai-job-hunting.user.js

- [ ] **Step 7: 验证生产构建不包含 dev/ 代码**

```bash
grep -q "MockPlatform" dist/ai-job-hunting.user.js && echo "ERROR: dev code in production build" || echo "OK: no dev code"
```

Expected: "OK: no dev code"

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts
git commit -m "feat: 修改 Vite 配置支持开发/生产模式切换"
```

---

## Chunk 3: 验证和文档

### Task 6: 验证开发服务器功能

**Files:**

- None (验证任务)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

Expected: 浏览器打开 http://localhost:5173

- [ ] **Step 2: 验证 UI 渲染**

在浏览器中检查：

- [ ] Panel 组件正常渲染
- [ ] Element Plus 样式正常加载
- [ ] 控制台无错误

- [ ] **Step 3: 验证热更新**

修改 `src/features/panel/components/Panel.vue` 中的任意文本，保存文件

Expected: 浏览器自动更新，无需刷新

- [ ] **Step 4: 验证 MockPlatform 日志**

打开浏览器控制台，查看是否有 `[MockPlatform]` 开头的日志

Expected: 有相关日志输出

- [ ] **Step 5: 验证 Vue DevTools**

打开 Vue DevTools（浏览器扩展）

Expected:

- 可以查看组件树
- 可以查看 Pinia store 状态

- [ ] **Step 6: 停止开发服务器**

按 Ctrl+C 停止

---

### Task 7: 更新文档

**Files:**

- Modify: `README.md`

- [ ] **Step 1: 在 README.md 的"开发"部分添加说明**

在 `## 开发` 部分添加：

```markdown
## 开发

### 开发模式（推荐）

使用独立开发服务器，支持热更新和完整调试：

\`\`\`bash
npm install
npm run dev
\`\`\`

浏览器会自动打开 http://localhost:5173，你可以：

- 实时查看 UI 修改效果（热更新）
- 使用 Vue DevTools 调试组件和状态
- 在控制台查看 MockPlatform 日志

### 生产模式

构建用户脚本：

\`\`\`bash
npm run build
\`\`\`

构建输出：`dist/ai-job-hunting.user.js`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: 添加开发模式使用说明"
```

---

### Task 8: 最终验证

**Files:**

- None (验证任务)

- [ ] **Step 1: 清理构建产物**

```bash
rm -rf dist dist-dev node_modules/.vite
```

- [ ] **Step 2: 重新安装依赖**

```bash
npm install
```

Expected: 安装成功

- [ ] **Step 3: 类型检查**

```bash
npm run type-check
```

Expected: 无类型错误

- [ ] **Step 4: 开发模式测试**

```bash
npm run dev
```

Expected:

- 服务器启动成功
- 浏览器打开并显示 UI
- 控制台有 MockPlatform 日志

停止服务器（Ctrl+C）

- [ ] **Step 5: 生产构建测试**

```bash
npm run build
```

Expected:

- 构建成功
- dist/ai-job-hunting.user.js 存在
- 文件大小合理（不包含 dev/ 代码）

- [ ] **Step 6: 验证生产构建不包含开发代码**

```bash
grep -q "MockPlatform\|mock-platform\|mock-data" dist/ai-job-hunting.user.js && echo "ERROR: dev code found" || echo "OK: clean build"
```

Expected: "OK: clean build"

- [ ] **Step 7: 最终 Commit**

```bash
git add -A
git commit -m "feat: 完成独立开发服务器实现"
```

---

## 完成标准

- [ ] 开发服务器可以正常启动（`npm run dev`）
- [ ] UI 正常渲染，无控制台错误
- [ ] 热更新功能正常工作
- [ ] Vue DevTools 可以正常使用
- [ ] MockPlatform 日志正常输出
- [ ] 生产构建不受影响（`npm run build`）
- [ ] 生产构建产物不包含开发代码
- [ ] 类型检查通过（`npm run type-check`）
- [ ] 文档已更新

---

## 注意事项

1. **类型安全** - 所有新增代码必须通过类型检查
2. **零侵入** - 生产代码不包含任何开发模式逻辑
3. **频繁提交** - 每个任务完成后立即提交
4. **验证优先** - 每个步骤都要验证结果
5. **错误处理** - 如果遇到错误，先回滚再修复
