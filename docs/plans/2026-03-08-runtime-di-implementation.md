# Runtime DI 解耦改造 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变 `bindPlatformRuntime(counter, userStore)` 对外签名的前提下，移除 `push-engine` 对 Pinia store 的直接依赖，并通过 app 适配器 + 工厂注入实现 core 解耦。  
**Architecture:** 在 `core/runtime` 定义最小运行时契约，`push-engine` 仅依赖契约；`app/adapters` 提供 Pinia 到契约的映射；`PlatformFactory` 接收可选注入并保持静态 API 兼容；`main.ts` 负责装配。  
**Tech Stack:** TypeScript, Vue 3, Pinia, Vite, Vitest

---

### Task 1: 定义 core 运行时契约

**Files:**
- Create: `src/core/runtime/runtime-contracts.ts`

**Step 1: 新建契约文件并定义接口**

```ts
export interface PushResultCounterRuntime { /* 计数 + 行为 */ }
export interface RuntimeUserStore { /* user/platformType/loadStatus 等 */ }
export interface PlatformRuntimeDeps { counter: PushResultCounterRuntime; userStore: RuntimeUserStore; }
```

**Step 2: 确认接口覆盖 push-engine 实际访问字段**

Run: 静态检查代码引用（无需构建）
Expected: 接口字段可覆盖 `runtimeCounter()/runtimeUserStoreRef()` 的使用点。

### Task 2: 改造 push-engine 为接口依赖

**Files:**
- Modify: `src/core/engine/push-engine.ts`

**Step 1: 移除 Pinia store 类型导入，改为契约导入**

```ts
import type { PushResultCounterRuntime, RuntimeUserStore } from "@/core/runtime/runtime-contracts";
```

**Step 2: 保持 bindPlatformRuntime 原签名并替换类型**

```ts
export function bindPlatformRuntime(counter: PushResultCounterRuntime, userStore: RuntimeUserStore): void
```

**Step 3: 保留兼容导出变量**

```ts
export let pushResultCounter: PushResultCounterRuntime = {} as PushResultCounterRuntime;
export let runtimeUserStore: RuntimeUserStore = {} as RuntimeUserStore;
```

**Step 4: 运行最小检查**

Run: `npm run type-check`
Expected: 无新增类型错误。

### Task 3: 在 app 层实现 Pinia 适配器

**Files:**
- Create: `src/app/adapters/store-adapter.ts`

**Step 1: 创建适配器函数**

```ts
export function createStoreRuntimeAdapter(): PlatformRuntimeDeps
```

**Step 2: 在函数内获取 Pinia store 并返回契约对象**

```ts
const counter = usePushResultStore();
const userStore = useUserStore();
return { counter, userStore };
```

### Task 4: 改造 PlatformFactory 为依赖注入

**Files:**
- Modify: `src/core/platform/platform-factory.ts`

**Step 1: 删除对 state 层 store 的直接导入**

**Step 2: 增加构造函数注入**

```ts
constructor(private readonly runtimeDeps?: PlatformRuntimeDeps) {}
```

**Step 3: 保持静态 API 兼容并转发到实例方法**

```ts
static getInstance(url: string, runtimeDeps?: PlatformRuntimeDeps): BossPlatform
```

**Step 4: 在平台匹配处绑定 runtime（存在才绑定）并继续调用 userRemoteLoad**

### Task 5: main.ts 装配注入

**Files:**
- Modify: `src/app/main.ts`

**Step 1: 引入并创建 runtime adapter**

```ts
const runtimeDeps = createStoreRuntimeAdapter();
```

**Step 2: 通过可选参数注入工厂**

```ts
const platform = PlatformFactory.getInstance(location.href, runtimeDeps);
```

### Task 6: 校验与收尾

**Files:**
- Check: `src/core/runtime/runtime-contracts.ts`
- Check: `src/core/engine/push-engine.ts`
- Check: `src/app/adapters/store-adapter.ts`
- Check: `src/core/platform/platform-factory.ts`
- Check: `src/app/main.ts`

**Step 1: LSP 诊断**

Run: 对上述改动文件执行 diagnostics  
Expected: 无 error。

**Step 2: 类型检查**

Run: `npm run type-check`  
Expected: 通过。

**Step 3: 构建检查**

Run: `npm run build`  
Expected: 通过，产物正常生成。
