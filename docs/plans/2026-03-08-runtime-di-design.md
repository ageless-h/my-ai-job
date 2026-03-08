## 背景

当前 `src/core/engine/push-engine.ts` 直接依赖 Pinia store（`usePushResultStore`、`useUserStore`），并通过全局变量 `pushResultCounter`、`runtimeUserStore` 与 `bindPlatformRuntime()` 进行绑定。这导致 core 层对具体状态容器存在硬耦合，不利于分层隔离与单元测试。

## 目标

1. 在 core 层引入运行时抽象接口，替代对 Pinia 的直接类型依赖。
2. 保持 `bindPlatformRuntime(counter, userStore)` 现有签名不变（兼容既有调用）。
3. 在 app 层提供 store 适配器，将 Pinia 实例映射为 core 抽象接口。
4. 通过依赖注入将运行时依赖传入 `PlatformFactory`，避免 factory 直接引用 Pinia store。

## 方案对比

### 方案 A（采用）

- 保留 `bindPlatformRuntime(counter, userStore)` 签名。
- 新增 `runtime-contracts.ts` 定义抽象接口。
- `push-engine.ts` 改为仅依赖接口，不再导入 Pinia store 类型。
- `platform-factory.ts` 构造函数接收 runtime 依赖对象（对外静态 API 继续可用）。
- `app/adapters/store-adapter.ts` 负责将 Pinia store 适配为接口对象。

优点：兼容性最好，改动范围可控；缺点：短期内仍保留 legacy 运行时变量以兼容旧代码。

### 方案 B

- 将 `bindPlatformRuntime` 改为新签名 `bindPlatformRuntime(runtimeDeps)`。

优点：接口更简洁；缺点：破坏现有调用，不符合“完全保持原签名”的约束。

### 方案 C

- 删除全局 runtime 变量，要求所有平台实例通过构造参数传入完整 runtime。

优点：纯依赖注入最彻底；缺点：改动面大、迁移成本高、风险高。

## 设计细节

### 1) 新增 runtime 抽象契约（core）

文件：`src/core/runtime/runtime-contracts.ts`

- `PushResultCounterRuntime`
- `RuntimeUserStore`
- `PlatformRuntimeDeps`

这些接口只描述 push-engine 与 platform 运行所需的最小能力，不绑定 Pinia 实现。

### 2) push-engine 改造

- 移除对 `@/state/*` 的直接导入。
- `bindPlatformRuntime(counter, userStore)` 参数改为契约类型。
- 保留 `pushResultCounter` / `runtimeUserStore` 导出变量，内部赋值来自抽象接口，实现外部 API 与现有引用兼容。

### 3) app 层适配器

文件：`src/app/adapters/store-adapter.ts`

- 创建 `createStoreRuntimeAdapter()`，内部调用 `usePushResultStore()` 和 `useUserStore()`。
- 返回 `PlatformRuntimeDeps`。
- 仅 app 层接触 Pinia，core 层只看契约。

### 4) PlatformFactory 依赖注入

- 新增构造函数依赖注入：`new PlatformFactory(runtimeDeps)`。
- 保留静态方法兼容：`PlatformFactory.getInstance(url, runtimeDeps?)`。
- 工厂内不再直接 import/use Pinia store。
- 当注入存在时：设置 `runtime.userStore.platformType` 并调用 `bindPlatformRuntime(runtime.counter, runtime.userStore)`。

### 5) main.ts 装配

- 在 app 启动处创建 runtime adapter。
- 调用 `PlatformFactory.getInstance(location.href, runtimeDeps)`。

## 向后兼容性

1. `bindPlatformRuntime(counter, userStore)` 签名保持不变。
2. `pushResultCounter` 与 `runtimeUserStore` 导出变量继续存在。
3. `PlatformFactory.getInstance(url)` 旧调用仍可工作；新增可选注入参数。

## 验证计划

1. 运行 `lsp_diagnostics` 检查改动文件无错误。
2. 运行 `npm run type-check`。
3. 运行 `npm run build`。

通过标准：无 LSP error、类型检查通过、构建通过。
