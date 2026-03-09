## 背景

当前仓库已经具备一套可复用的 preview 入口：`preview.html` -> `src/app/main.preview.ts` -> `vite.preview.config.ts`。`main.preview.ts` 通过 `app.provide("$platform", previewPlatform)` 绕开了 `PlatformFactory` 的真实站点装配，非常适合作为 Playwright 的本地浏览器测试入口。

同时，生产入口 `src/app/main.ts` 会调用 `PlatformFactory.getInstance(location.href, runtimeDeps)`，`src/core/platform/boss-platform.ts` 又大量依赖 URL 分支与 BOSS DOM 选择器；这意味着直接把 Playwright 主链路绑到真实 BOSS 页面，成本和不稳定性都会很高。

当前阻塞点有三个：

1. Windows 下从 UNC 路径执行 `npm run dev:preview` 时，`CMD.EXE` 会回退到 `C:\Windows`，导致 Vite 解析 `vite.preview.config.ts` 失败。当前实际报错为 `UNC paths are not supported`，随后尝试读取 `C:\Windows\vite.preview.config.ts`。
2. 项目还没有 Playwright 脚手架，也没有稳定的 `data-testid` 测试选择器；当前 `src/features/panel/Panel.vue` 只能依赖 class 与中文文本定位，维护成本高。
3. `src/shared/utils/tampermonkey.ts` 与 `src/shared/utils/sensitive-data-consent.ts` 直接依赖 `GM_*` API；preview / Playwright 环境需要最小 shim 才能稳定验证相关 UI。

## 目标

1. 建立一个不依赖真实 BOSS 页面、可由 Playwright 稳定驱动的本地浏览器测试入口。
2. 保持生产 userscript 构建链路不变，只为测试补足最小 harness 与稳定选择器。
3. 为构建产物 `dist/ai-job-hunting.user.js` 增加 1 条本地 smoke 验证，证明脚本至少能完成挂载。
4. 将“80% 覆盖率”拆分为分层目标：Playwright 验证关键用户路径，Vitest 负责可量化的代码覆盖率。
5. 避免把测试主链路建立在真实 BOSS 页面、登录态和外部网络上。

## 方案对比

### 方案 A（采用）：preview harness + Playwright 主链路，dist smoke + Vitest 作为补充

- 使用 `preview.html` 作为主要 E2E 页面。
- 修复 `dev:preview` 的 Windows UNC 启动问题。
- 在 preview 环境补 `GM_*` shim、测试桥接 API 和稳定 `data-testid`。
- Playwright 主要覆盖面板壳层、7 个 Tab 切换、关键表单保存/恢复、基础配置流。
- 对 `dist/ai-job-hunting.user.js` 额外增加本地 fixture smoke 测试。
- 代码覆盖率数字继续由 Vitest 统计，而不是强行从 Playwright 获取浏览器端覆盖率。

优点：稳定、独立、可维护，能最大化复用现有 `main.preview.ts`；缺点：preview 只验证“本地模拟环境下的真实浏览器交互”，不是对真实 BOSS DOM 的完全替代。

### 方案 B：Playwright + 真实 BOSS 页面 + userscript 注入

- 通过浏览器上下文注入构建后的 userscript，访问真实 BOSS 页面执行测试。

优点：环境最接近真实用户；缺点：依赖登录态、外部网络、站点变更与风控策略，且存在 ToS / 稳定性风险，不适合作为主回归链路。

### 方案 C：纯静态 HTML / `file://` 页面对 userscript 做全量 E2E

- 手动构建假 DOM，并直接加载 userscript。

优点：完全离线；缺点：需要自己扮演大量 BOSS 页面结构与运行时，维护成本高，最终会退化成“手写网站模拟器”。

## 设计结论

主路径采用 **方案 A**，但在执行层面落地为 **“preview Playwright + dist smoke + Vitest coverage” 三层策略**：

1. **preview Playwright**：作为日常回归链路，负责验证 Vue 面板、交互、存储恢复、Tab 流程。
2. **dist smoke**：只验证构建后的 userscript 在本地假页面中能完成挂载和最小交互，不承担大规模场景测试。
3. **Vitest coverage**：负责覆盖率数字与纯逻辑回归，避免为了追求 80% 而让 E2E 套件变得庞大且脆弱。

## 设计细节

### 1) 修复 preview 启动的 UNC 问题

保留 `vite.preview.config.ts` 与 `preview.html`，但不再依赖 `CMD.EXE` 在 UNC 路径下的当前目录语义。`dev:preview` 改为通过 Node 以绝对路径启动 Vite，并固定：

- `root`: 仓库根目录
- `configFile`: `vite.preview.config.ts` 的绝对路径
- `host`: `127.0.0.1`
- `port`: `4173`
- `open`: `/preview.html`

这样 Playwright 的 `webServer` 也能复用同一条命令，避免“人能启动、测试不能启动”的双轨配置。

### 2) 把 preview 明确成测试 harness

`src/app/main.preview.ts` 现在已经具备最小平台 mock，但还缺少测试态控制能力。建议新增 preview 测试桥接层，职责只包含：

- 注册内存版 `GM_getValue / GM_setValue / GM_deleteValue / GM_addValueChangeListener / GM_notification / GM_xmlhttpRequest`。
- 暴露 `window.__AI_JOB_HUNTING_PREVIEW__`，提供 `reset()`、`seedLocalStorage()`、`seedGmStorage()`、`getRootState()` 之类的轻量 helper。
- 保持默认 `previewPlatform` 行为简单，不在 harness 中复制整套 BOSS 页面逻辑。

这样 Playwright 每条用例都可以在 `beforeEach` 中重置状态，而不是互相污染。

### 3) 增加稳定测试选择器

当前源码没有现成的 `data-testid`。首批只需要在关键壳层与代表性页面上补稳定选择器，避免把 Element Plus 的内部 class 或中文文案当成长期 API。

建议至少补充以下位置：

- `src/features/panel/Panel.vue`
  - `panel-root`
  - `panel-fab`
  - `panel-sidebar`
  - `panel-title`
  - `panel-tab-<key>` 或基于语义命名的 tab test id
- 7 个主 Tab 对应组件的根节点
  - `tab-job-assistant`
  - `tab-ai-config`
  - `tab-ai-delivery-judge`
  - `tab-preference`
  - `tab-memory-session`
  - `tab-run-record`
  - `tab-account`

只给测试入口和关键操作补 selector，不大面积污染业务模板。

### 4) Playwright 测试分层

测试目录建议使用：

- `playwright.config.ts`
- `tests/e2e/helpers/preview.ts`
- `tests/e2e/panel-shell.spec.ts`
- `tests/e2e/tab-navigation.spec.ts`
- `tests/e2e/persistence.spec.ts`
- `tests/e2e/userscript-dist.spec.ts`

首批 E2E 只覆盖高价值场景：

1. preview 页面能挂载面板，且不会重复挂载。
2. FAB 可展开 / 收起侧栏。
3. 7 个 Tab 可切换，并显示各自根节点。
4. 面板折叠状态和宽度能跨刷新恢复。
5. 至少 1 条 AI 配置流、1 条传统投递偏好流可成功保存并恢复。

### 5) 在 Playwright 中测试 userscript 的正确方式

不建议把 Tampermonkey 扩展 + 真实 BOSS 站点作为主链路。对构建产物的验证只做本地 smoke：

- 先执行 `npm run build`，确保生成 `dist/ai-job-hunting.user.js`。
- 创建本地 fixture 页面，例如 `tests/fixtures/web/geek/jobs/index.html`，路径里保留 `/web/geek/jobs` 片段，并提供最小挂载容器。
- 在 Playwright 里先执行 `page.addInitScript()`，注入 `GM_*` shim 与 `unsafeWindow = window`。
- 再通过 `page.addScriptTag({ content })` 或 `page.addScriptTag({ path })` 注入 `dist/ai-job-hunting.user.js`。
- 断言 `#ai-job`、面板标题、根容器与最小交互可用。

这条测试的目标是“证明构建产物可挂载”，而不是复刻完整站点行为。

### 6) 覆盖率策略

不建议把 80% 解释成“Playwright 本身产出的浏览器端行覆盖率”。对这个项目，更实际的定义是：

- **Playwright**：证明关键用户路径可操作。
- **Vitest**：提供可量化的 coverage 指标。

建议在 `vitest.config.ts` 中开启 coverage，并把新增 coverage 重点放在：

- `src/shared/utils/tampermonkey.ts`
- `src/shared/utils/sensitive-data-consent.ts`
- 新增的 preview harness helper
- 现有 `src/core/platform/boss-platform.test.ts` / `src/core/ai/ai-power.test.ts` 的扩展场景

如果后续要求“全仓库 80%”而不是“关键模块 80%”，再单独评估是否增加 jsdom / 组件级测试，而不是现在就把 E2E 套件扩大到失控。

## 验证计划

1. `npm run dev:preview` 在 Windows UNC 路径下可以正常启动，并能打开 `http://127.0.0.1:4173/preview.html`。
2. `npx playwright test tests/e2e/panel-shell.spec.ts` 通过。
3. `npx playwright test tests/e2e/tab-navigation.spec.ts` 通过。
4. `npm run build` 通过，且 `tests/e2e/userscript-dist.spec.ts` 能验证 dist 脚本挂载。
5. `npm run type-check` 通过。
6. `npm run test -- --coverage` 或等价 coverage 命令可以输出稳定的覆盖率结果。

## 暂不做的事

1. 不把真实 BOSS 页面接入日常回归链路。
2. 不在第一阶段为所有 50+ 交互元素编写 E2E。
3. 不为追求 Playwright 行覆盖率而引入额外浏览器插桩链路。
