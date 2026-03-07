# Silent Stall Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 删除临时滚动测试 Tab，并在正式投递链路里补齐最小安全的运行时诊断与只记录型 watchdog，用来定位静默停滞与未翻页导致的异常结束。

**Architecture:** 方案保持现有投递流程不变，只在运行边界、分页边界和调用边界增加三态日志（开始 / 结束 / 异常）与心跳式观测。UI 不新增新面板，直接复用现有 `LogRecorder` 与运行记录视图。

**Tech Stack:** Vue 3、Pinia、Element Plus、TypeScript、Vite、Tampermonkey runtime

---

### Task 1: 清理过时的 ScrollDebug 调试入口

**Files:**
- Modify: `src/features/panel/Panel.vue`
- Modify: `src/core/platform/boss-platform.ts`
- Delete: `src/features/debug-tab/components/ScrollDebugTab.vue`
- Delete: `src/shared/utils/scroll-debug.ts`
- Delete: `src/shared/utils/scroll-debug.test.ts`

**Step 1: Confirm the removal boundary**

Run: `rg "ScrollDebug|getScrollDebugSnapshot|runScrollDebugAction" src`

Expected: 以 `Panel.vue`、`boss-platform.ts`、`ScrollDebugTab.vue` 这组临时调试入口为主；若命中待删除的 `scroll-debug.ts` / `scroll-debug.test.ts` 也属于正常结果。

**Step 2: Remove the panel entry and feature component**

- 删除 `src/features/panel/Panel.vue` 中测试 Tab 的 import 与 tab 注册项。
- 删除 `src/features/debug-tab/components/ScrollDebugTab.vue`。

**Step 3: Remove platform-side debug surface**

- 删除 `src/core/platform/boss-platform.ts` 中仅供测试 Tab 使用的 `ScrollDebug*` 类型、`getScrollDebugSnapshot()`、`runScrollDebugAction()` 及其私有辅助方法。
- 确认不影响正式投递链路的方法与状态。

**Step 4: Remove obsolete helper files**

- 删除 `src/shared/utils/scroll-debug.ts`。
- 删除 `src/shared/utils/scroll-debug.test.ts`。

**Step 5: Run a focused type check**

Run: `npm run type-check`

Expected: PASS，且不存在 `ScrollDebug` 残留引用。

### Task 2: 在投递引擎补齐运行边界日志与只记录型 watchdog

**Files:**
- Modify: `src/core/engine/push-engine.ts`

**Step 1: Inspect the current boundaries before editing**

确认以下位置会被埋点：
- `startPush()` 运行开始与结束
- `next()` 阶段边界
- root logger 异常分流点

**Step 2: Add run-level diagnostic fields**

新增单次运行诊断上下文，例如 `runDiagnostics`，由 `startPush()` 创建、在 `finally` 清理，至少包含：
- `runId`
- `lastProgressAt`
- `lastPhase`
- `watchdogTimer`

要求：
- 不把长诊断文本塞进 `lastStopReason`
- 生命周期跟随单次 `startPush()`，在 `finally` 清理
- `next()` 与 `boss-platform.ts` 只能通过同一份共享运行态访问这些字段，不能依赖 `startPush()` 内部无法共享的局部变量

**Step 3: Wrap `startPush()` with enter/rejected/finally instrumentation**

补齐统一的运行边界日志：
- `投递诊断` run-start
- `投递诊断` run-resolved
- `投递诊断` run-rejected
- `投递诊断` run-finally

要求：
- 外层异常要同步进入 `preferenceLogRecorder`
- 如果运行被异常终止，只写简洁明确的停止原因
- `finally` 必须负责清理 watchdog / heartbeat 资源

**Step 4: Add a record-only watchdog**

增加定时检查：
- 当仍处于 `PUSHING` 且距离 `lastProgressAt` 超过阈值时，写一条 `投递看门狗` 日志
- 日志要包含 `runId`、`lastPhase`、`pushStatus`、距上次进展毫秒数、关键计数快照
- watchdog 只记录，不调用暂停、不调用恢复、不改业务判定

默认建议：
- 首次告警阈值：`90s`
- 持续停滞追加告警间隔：`30s`

**Step 5: Mirror hidden error branches into `preferenceLogRecorder`**

把现有只写 root logger 的关键异常分支，同步补到 `preferenceLogRecorder`，保证运行记录面板能看到引擎已知异常。

### Task 3: 在 `next()` 与分页链路补阶段检查点

**Files:**
- Modify: `src/core/engine/push-engine.ts`
- Modify: `src/core/platform/boss-platform.ts`

**Step 1: Add five checkpoints to `next()`**

在 `next()` 内增加以下阶段日志：
- `下一页检查点 beforeHasNext`
- `下一页检查点 afterHasNext`
- `下一页检查点 beforeAcquireDataPre`
- `下一页检查点 afterAcquireDataPre`
- `下一页检查点 afterWaitForNextProgress`

每条至少带：
- `runId`
- 当前 `phase`
- 是否有进展
- 推荐页 / 普通列表页标记

**Step 2: Add recommendation-page diagnostics**

在 `src/core/platform/boss-platform.ts` 的推荐页相关路径补镜像日志：
- 第一次无进展但仍返回继续时
- 真正判定“无下一页”时
- 空列表直接返回前
- `acquireDataPre()` 开始与结束时

要求：
- 日志文本带 `推荐` 或 `下一页` 关键词，确保进入现有投递相关视图
- 尽量复用现有 metrics，不引入新状态机
- 平台侧日志与引擎侧日志必须复用同一份 `runDiagnostics`，保证 `runId`、`lastPhase`、`lastProgressAt` 一致

**Step 3: Mark real progress updates**

在确认分页或列表有实际进展的时机更新 `lastProgressAt` / `lastPhase`，确保 watchdog 基于真实推进而不是基于任意日志写入。

**Step 4: Run a focused type check**

Run: `npm run type-check`

Expected: PASS，变更文件无新增类型错误。

### Task 4: 给调用端补 rejected/finally 收尾日志

**Files:**
- Modify: `src/features/job-assistant/components/AiJob.vue`

**Step 1: Inspect current `platform.startPush()` settlement flow**

确认当前只有成功链路，并定位推荐页自动恢复相关分支。

**Step 2: Add caller-side rejection instrumentation**

为 `platform.startPush()` 增加最小收尾补点：
- `投递诊断` caller-rejected
- `投递诊断` caller-finally

要求：
- 保持当前成功链路行为不变
- 只补齐异常可见性与收尾诊断，不额外加入自动恢复

**Step 3: Log recommend-loop branch decisions**

在推荐页自动恢复相关路径追加简洁日志，标明：
- 是否进入自动恢复判断
- 是否因为冷却期或条件不满足而跳过

要求：
- 文案必须保留 `推荐` 关键词
- 不重构现有恢复逻辑
- 本步骤仅给现有推荐页自动恢复分支补日志，不新增、不修改任何自动恢复条件、冷却期或动作

### Task 5: 全量验证与手动观察

**Files:**
- Verify: `src/core/engine/push-engine.ts`
- Verify: `src/core/platform/boss-platform.ts`
- Verify: `src/features/job-assistant/components/AiJob.vue`
- Verify: `src/features/panel/Panel.vue`

**Step 1: Run type check**

Run: `npm run type-check`

Expected: PASS

**Step 2: Run production build**

Run: `npm run build`

Expected: PASS，并生成最新 userscript 构建产物。

**Step 3: Manual verification on BOSS pages**

手动验证以下场景：
- 在真实 BOSS 推荐页启动投递后，运行记录中先出现 `投递诊断 run-start`
- 触发翻页检查时，运行记录中依次出现 `下一页检查点 beforeHasNext` / `afterHasNext`
- 在列表连续 `90s` 无实际变化或无翻页成功时，只追加一条 `投递看门狗` 告警，任务仍保持 `PUSHING`
- 让推荐页持续运行到“无下一页”场景时，能看到 `推荐分页` 与 `下一页检查点`，并可区分“无下一页”与“仍在运行但无进展”
- 开发态临时在 `src/core/platform/boss-platform.ts` 的 `acquireDataPre()` 首行插入一次性 `throw new Error("manual outer reject")`，重新构建并运行一次；此时运行记录中应同时看到 `投递诊断 run-rejected`、`投递诊断 caller-rejected`、`投递诊断 caller-finally`，验证后移除该临时 throw

**Step 4: Review log noise before merge**

检查新增日志是否满足：
- 关键阶段可追踪
- 不淹没正常运行日志
- `lastStopReason` 仍保持“停止原因”语义，不被诊断文本污染

Commit step intentionally omitted because the user has not requested a git commit in this session.
