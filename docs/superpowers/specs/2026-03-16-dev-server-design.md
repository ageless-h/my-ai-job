# 独立开发服务器设计文档

**日期：** 2026-03-16  
**目标：** 为 AI 求职助手插件创建独立的开发服务器，支持 UI 测试和热更新

---

## 1. 背景与目标

### 当前问题

AI 求职助手是一个 Tampermonkey 用户脚本，必须在 BOSS 直聘页面环境中运行。这导致：

1. 每次修改代码需要重新构建并刷新页面
2. 无法使用 Vue DevTools 等开发工具
3. 调试困难，依赖真实页面环境
4. 开发效率低，反馈周期长

### 设计目标

创建一个独立的开发服务器，实现：

1. **热更新** - 代码修改后立即生效，无需手动刷新
2. **独立运行** - 不依赖 BOSS 直聘页面，可以在本地浏览器中直接访问
3. **完整调试** - 支持 Vue DevTools、断点调试等开发工具
4. **最小侵入** - 不影响生产构建流程，保持代码结构清晰

---

## 2. 方案选择

### 对比的方案

**方案 A：完整 Vite 开发服务器 + Mock 平台适配器**

- 优点：原生 HMR，开发体验最佳
- 缺点：需要实现较多 Mock 逻辑

**方案 B：独立 HTML 页面 + 内联构建产物**

- 优点：最接近真实环境
- 缺点：热更新需要手动刷新，开发体验差

**方案 C：Vite 开发服务器 + 环境变量切换（选定）**

- 优点：保持代码结构，完整 HMR 支持，最小侵入性
- 缺点：需要维护 Mock 平台与真实平台的接口一致性

### 选定方案：方案 C

通过环境变量在开发模式和生产模式间切换平台实现，保持代码结构不变。

---

## 3. 整体架构

### 架构图

```
开发模式 (npm run dev)
├─ Vite Dev Server (localhost:5173)
├─ dev/index.html (开发页面入口)
├─ dev/main.ts (开发模式专用入口)
│   ├─ 创建 Vue 应用
│   ├─ 注入 MockPlatform
│   └─ 挂载到 #app
├─ dev/mock-platform.ts (模拟平台实现)
└─ dev/mock-data.ts (模拟数据)

生产模式 (npm run build)
├─ vite-plugin-monkey 构建
├─ src/app/main.ts (真实入口)
│   ├─ 使用 PlatformFactory
│   └─ 挂载到 BOSS 直聘页面
└─ 输出 dist/ai-job-hunting.user.js
```

### 关键决策

1. **独立入口文件** - `dev/main.ts` 作为开发模式专用入口，避免污染生产代码
2. **环境隔离** - 通过 Vite 配置区分开发/生产模式，零运行时开销
3. **接口一致性** - MockPlatform 实现 IPlatform 接口，保证类型安全

---

## 4. 文件结构

### 新增文件

```
dev/
├─ index.html              # 开发页面入口，提供挂载点 <div id="app"></div>
├─ main.ts                 # 开发模式专用入口文件
├─ mock-platform.ts        # MockPlatform 类实现
├─ mock-data.ts            # 模拟数据（职位列表、用户信息等）
└─ types.ts                # 开发模式相关类型定义
```

### 修改文件

```
vite.config.ts             # 添加开发模式配置，根据 mode 切换插件
package.json               # 保持 dev 脚本不变（已有 "dev": "vite"）
```

### 不修改的文件

```
src/app/main.ts            # 生产模式入口，保持不变
src/app/App.vue            # 根组件，保持不变
src/core/platform/*        # 平台相关代码，保持不变
```

---

## 5. 核心实现

### 5.1 开发入口 (dev/main.ts)

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import '@/styles/ui-migration.css';

import App from '@/app/App.vue';
import { MockPlatform } from './mock-platform';
import { request } from '@/core/http/request';

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: zhCn });

// 开发模式：直接注入 MockPlatform
const mockPlatform = new MockPlatform();
app.provide('$platform', mockPlatform);
app.provide('$axios', request);

// 直接挂载到 #app
app.mount('#app');
```

**职责：**

- 创建 Vue 应用实例
- 注册 Pinia 和 Element Plus
- 注入 MockPlatform 替代真实平台
- 挂载到开发页面的 #app 元素

### 5.2 Mock 平台 (dev/mock-platform.ts)

```typescript
import type { IPlatform, JobItem, GeekInfo, DeliveryResult } from '@/core/platform/types';
import { MOCK_JOB_LIST, MOCK_GEEK_INFO } from './mock-data';

export class MockPlatform implements IPlatform {
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getMountEle() {
    return {
      el: document.getElementById('app')!,
      p: 'end' as const,
    };
  }

  async getJobList(): Promise<JobItem[]> {
    await this.delay(500); // 模拟网络延迟
    return MOCK_JOB_LIST;
  }

  async getGeekInfo(): Promise<GeekInfo> {
    await this.delay(300);
    return MOCK_GEEK_INFO;
  }

  async deliverResume(jobId: string): Promise<DeliveryResult> {
    await this.delay(300);
    console.log('[MockPlatform] 投递简历:', jobId);
    return { success: true, message: '投递成功' };
  }

  async collectJob(jobId: string): Promise<void> {
    await this.delay(200);
    console.log('[MockPlatform] 收藏职位:', jobId);
  }

  // ... 实现其他 IPlatform 接口方法
}
```

**职责：**

- 实现 IPlatform 接口的所有方法
- 返回模拟数据，模拟网络延迟
- 提供控制台日志，便于调试

**实现策略：**

1. **简化实现** - 只返回必要的模拟数据，不实现复杂业务逻辑
2. **延迟响应** - 使用 setTimeout 模拟网络延迟，测试加载状态
3. **可配置数据** - 通过 mock-data.ts 集中管理
4. **控制台日志** - 记录所有方法调用，便于调试

### 5.3 模拟数据 (dev/mock-data.ts)

```typescript
import type { JobItem, GeekInfo } from '@/core/platform/types';

export const MOCK_JOB_LIST: JobItem[] = [
  {
    id: 'job-001',
    title: '前端开发工程师',
    company: '某科技公司',
    salary: '20-30K',
    location: '北京·朝阳区',
    experience: '3-5年',
    education: '本科',
    tags: ['Vue', 'React', 'TypeScript'],
    description: '负责公司核心产品的前端开发...',
    bossName: '张经理',
    bossTitle: '技术总监',
    activeTime: '刚刚活跃',
  },
  // ... 更多模拟职位
];

export const MOCK_GEEK_INFO: GeekInfo = {
  name: '测试用户',
  resumeUrl: 'https://example.com/resume.pdf',
  expectSalary: '20-30K',
  expectCity: '北京',
  workYears: 5,
};
```

**职责：**

- 集中管理所有模拟数据
- 提供不同测试场景的数据集
- 便于修改和扩展

### 5.4 开发页面 (dev/index.html)

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

**职责：**

- 提供基础 HTML 结构
- 提供挂载点 #app
- 引入开发入口文件

### 5.5 Vite 配置修改 (vite.config.ts)

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
                /* ... */
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

**关键修改：**

1. 接收 `mode` 参数，判断是否为开发模式
2. 开发模式下不加载 `vite-plugin-monkey`
3. 开发模式下设置 `root: 'dev'`，使用 dev/index.html 作为入口
4. 保持生产模式配置不变

---

## 6. 数据流与交互

### 开发模式数据流

```
用户操作 (点击投递按钮)
  ↓
Vue 组件 (Panel.vue)
  ↓
Pinia Store (useDeliveryStore)
  ↓
注入的 $platform (MockPlatform)
  ↓
mock-platform.ts (deliverResume 方法)
  ↓
返回模拟数据 + 控制台日志
  ↓
Store 更新状态
  ↓
组件响应式更新 UI
```

### 生产模式数据流

```
用户操作 (点击投递按钮)
  ↓
Vue 组件 (Panel.vue)
  ↓
Pinia Store (useDeliveryStore)
  ↓
注入的 $platform (BossPlatform)
  ↓
boss-platform.ts (deliverResume 方法)
  ↓
调用 BOSS 直聘真实 API
  ↓
Store 更新状态
  ↓
组件响应式更新 UI
```

**关键点：**

- 组件和 Store 代码完全不变
- 只有注入的 $platform 实例不同
- 保证开发和生产环境的行为一致性

---

## 7. 热更新机制

### Vite HMR 支持

开发模式下自动启用 Vite 的 HMR（Hot Module Replacement），支持：

1. **Vue 组件热更新** - 修改 .vue 文件后立即生效，保持组件状态
2. **CSS 热更新** - 修改样式文件后立即生效，无需刷新页面
3. **Pinia Store 热更新** - 修改 Store 后自动重新加载，保持应用状态

### 开发工作流

```bash
# 1. 启动开发服务器
npm run dev

# 2. 浏览器自动打开 http://localhost:5173

# 3. 修改代码
#    - 修改 Panel.vue → 组件立即更新
#    - 修改 ui-migration.css → 样式立即更新
#    - 修改 useDeliveryStore.ts → Store 重新加载

# 4. 查看效果
#    - 无需手动刷新
#    - 保持应用状态
#    - 使用 Vue DevTools 查看组件树和状态
```

---

## 8. 调试支持

### 开发工具

1. **Vue DevTools**
   - 查看组件树和 props
   - 查看 Pinia store 状态
   - 时间旅行调试

2. **浏览器 DevTools**
   - 断点调试
   - 控制台日志
   - 网络请求监控

3. **Vite 开发服务器**
   - 错误提示和堆栈跟踪
   - 源码映射（Source Map）
   - 快速冷启动

### Mock 平台日志

MockPlatform 的所有方法调用都会输出控制台日志：

```
[MockPlatform] 投递简历: job-001
[MockPlatform] 收藏职位: job-002
[MockPlatform] 获取职位列表: 返回 10 条数据
```

便于追踪应用行为和调试问题。

---

## 9. 与生产环境的切换

### 开发模式

```bash
npm run dev
# → 启动 Vite 开发服务器
# → 使用 dev/main.ts 入口
# → 注入 MockPlatform
# → 访问 http://localhost:5173
```

### 生产模式

```bash
npm run build
# → 使用 vite-plugin-monkey 构建
# → 使用 src/app/main.ts 入口
# → 使用 PlatformFactory
# → 输出 dist/ai-job-hunting.user.js
```

### 切换流程

1. 开发阶段：使用 `npm run dev` 快速迭代
2. 测试阶段：使用 `npm run build` 构建生产版本
3. 部署阶段：在 Tampermonkey 中安装 dist/ai-job-hunting.user.js

**关键保证：**

- 开发和生产使用相同的组件和 Store 代码
- 只有平台实现不同（MockPlatform vs BossPlatform）
- 类型系统保证接口一致性

---

## 10. 实现清单

### 必须实现的文件

- [ ] `dev/index.html` - 开发页面入口
- [ ] `dev/main.ts` - 开发模式专用入口
- [ ] `dev/mock-platform.ts` - MockPlatform 类实现
- [ ] `dev/mock-data.ts` - 模拟数据
- [ ] `dev/types.ts` - 类型定义（如果需要）

### 必须修改的文件

- [ ] `vite.config.ts` - 添加开发模式配置

### 可选优化

- [ ] 添加错误模拟开关（测试错误处理）
- [ ] 添加延迟配置（测试加载状态）
- [ ] 添加更多测试场景的模拟数据

---

## 11. 风险与限制

### 已知限制

1. **环境差异** - 开发环境与真实 BOSS 直聘页面存在差异，可能遗漏边界情况
2. **Mock 维护** - 需要保持 MockPlatform 与真实平台接口的一致性
3. **DOM 结构** - 开发环境的 DOM 结构与真实页面不同，可能影响样式测试

### 风险缓解

1. **类型系统** - 使用 TypeScript 接口保证 MockPlatform 与 IPlatform 一致
2. **定期测试** - 在真实环境中定期测试，确保功能正常
3. **文档维护** - 记录开发环境与生产环境的差异

---

## 12. 总结

### 核心价值

1. **开发效率提升** - 热更新机制大幅缩短反馈周期
2. **调试体验改善** - 完整的开发工具支持
3. **代码质量保证** - 最小侵入性，保持代码结构清晰
4. **生产环境不受影响** - 构建流程保持不变

### 实现原则

1. **独立入口** - 开发和生产使用不同的入口文件
2. **接口一致** - MockPlatform 实现 IPlatform 接口
3. **环境隔离** - 通过 Vite 配置区分模式
4. **零运行时开销** - 生产代码不包含任何开发模式逻辑

### 下一步

1. 实现 dev/ 目录下的所有文件
2. 修改 vite.config.ts 配置
3. 测试开发服务器启动和热更新
4. 验证生产构建流程不受影响
