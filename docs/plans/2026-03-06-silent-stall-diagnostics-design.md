# Silent Stall Diagnostics Design

**Goal:** 删除当前临时 `ScrollDebug` 测试 Tab，改为在正式投递链路中补齐运行时诊断，定位“未主动停止但运行数分钟后静默停住、且日志不足”的真实原因。

## Background

- 已确认“滚动到真正底部”不是当前主问题，因此基于 UI 的 `ScrollDebug` 调试方案不再是正确方向。
- 当前更可信的问题是：投递主循环在某些外层分支上可能 `reject` 或长期 `pending`，但没有被现有 UI 和 `LogRecorder` 完整感知。
- 这次工作优先做“记录型诊断”，不做自动恢复，不改核心投递判定逻辑。

## Confirmed Findings

### 1. 外层运行边界缺少护栏

- `src/core/engine/push-engine.ts` 的 `startPush()` 没有统一的外层 `try/catch/finally`。
- `next()`、`hasNext()`、`acquireDataPre()` 处在单岗位处理 `catch` 之外；这些路径一旦抛错，异常可能直接逃出主循环。
- 一旦发生这种逃逸，`lastStopReason` 会在开始时被清空，却未必在异常退出时重新写回。

### 2. 调用端没有完整收尾链路

- `src/features/job-assistant/components/AiJob.vue` 调用 `platform.startPush()` 时，现状只有成功链路，没有统一的 `rejected/finally` 诊断收尾。
- 这会导致 UI 侧出现“还像在运行，但没有新日志、没有明确 stop reason”的悬空状态。

### 3. 日志系统存在分流，面板证据不完整

- 部分异常和分页判断只进入 root logger，没有同步到 `preferenceLogRecorder`。
- `RunRecord` 和投递相关面板主要依赖 `LogRecorder`，因此即使底层看到了异常，用户面板也可能像“什么都没发生”。

### 4. 推荐页分页判定对“无进展”证据不足

- `boss-platform.ts` 中推荐页 `hasNext()`、`acquireDataPre()`、空列表返回等路径缺少统一的阶段日志。
- 当前最难区分的是：到底是“真的没有下一页/没有岗位”，还是“分页度量抖动导致误判仍在继续”。

## Selected Approach

选择 `B`：删除测试 Tab，并增加“只记录、不自动恢复”的 watchdog。

这套方案分成两部分：

1. **清理临时调试面**
   - 删除 `ScrollDebugTab`、面板入口，以及 `BossPlatform` 中仅为该 Tab 服务的调试方法和类型。
   - 删除 `src/shared/utils/scroll-debug.ts` 和对应测试。

2. **补齐正式运行链路诊断**
   - 在 `startPush()` 边界增加 `run-start / run-resolved / run-rejected / run-finally` 级别的运行日志。
   - 由 `startPush()` 创建单次运行诊断上下文 `runDiagnostics`，并在 `finally` 清理；`runId`、`lastProgressAt`、`lastPhase`、`watchdogTimer` 等都归属于这份上下文，而不是散落在局部变量里。
   - 在 `next()` 增加关键 checkpoint：`beforeHasNext`、`afterHasNext`、`beforeAcquireDataPre`、`afterAcquireDataPre`、`afterWaitForNextProgress`。
   - 在推荐页分页判断和翻页前后补充镜像日志，让 `LogRecorder` 能看到“无进展 / 误判 / 空列表 / 翻页开始 / 翻页结束”；这些日志必须复用同一份 `runDiagnostics`，确保 `runId` 与阶段信息一致。
   - 增加 watchdog/heartbeat：当运行仍处于 `PUSHING` 且长时间没有进展时，仅记录状态快照，不自动停止、不自动恢复。
   - 在 `AiJob.vue` 为 `platform.startPush()` 增加 `catch/finally` 诊断记录，补齐 UI 侧因果链。

## Scope

### Files to remove or clean

- `src/features/debug-tab/components/ScrollDebugTab.vue`
- `src/shared/utils/scroll-debug.ts`
- `src/shared/utils/scroll-debug.test.ts`
- `src/features/panel/Panel.vue`
- `src/core/platform/boss-platform.ts`

### Files to instrument

- `src/core/engine/push-engine.ts`
- `src/core/platform/boss-platform.ts`
- `src/features/job-assistant/components/AiJob.vue`

### Existing infrastructure to reuse

- `src/core/engine/push-engine.ts` 中的 `LogRecorder` / `preferenceLogRecorder`
- `src/features/run-record/components/RunRecord.vue` 现有运行日志展示
- `src/state/push-result.ts` 现有成功/失败/不匹配计数

## Logging Contract

为确保日志能进入现有面板视图，诊断消息必须显式带上已有可见关键词，优先包含：`投递`、`下一页`、`推荐`、`暂停`。

建议日志族如下：

- `投递诊断`：运行开始、结束、拒绝、finally、调用端收尾
- `下一页检查点`：`next()` 内部阶段边界
- `推荐分页`：推荐页 `hasNext()` / 空列表 / 指标对比
- `投递看门狗`：长时间无进展时的快照告警

每条日志尽量包含：

- `runId`
- 当前阶段 `phase`
- 距上次进展的毫秒数
- 当前 `pushStatus`
- 关键分页度量（卡片数、尾卡、列表签名或已有 metrics）
- 是否为推荐页

建议消息模板：

- `投递诊断 run-start runId=... phase=... status=...`
- `下一页检查点 afterHasNext runId=... phase=... hasProgress=...`
- `推荐分页 no-progress-first-round runId=... metrics=...`
- `投递看门狗 stalled runId=... phase=... idleMs=...`

## Watchdog Rules

- watchdog 只做记录，不改变行为。
- watchdog 不写入冗长诊断到 `lastStopReason`；`lastStopReason` 仍只保留“明确停止原因”。
- watchdog 需要在 `startPush()` 生命周期内注册和清理，避免泄漏到下一次运行。
- watchdog 默认阈值设为 `90s`，持续无进展时每 `30s` 最多追加一条告警，避免制造噪音。

## Non-Goals

- 不新增新的调试 UI 页面。
- 不引入自动恢复、自动暂停、自动 reload。
- 不重构核心投递策略，不提前改写 `hasNext()` 的业务判定。
- 不改变现有日志存储机制。

## Validation

### Static verification

- `npm run type-check`
- `npm run build`

### Runtime verification

在真实 BOSS 页面手动观察：

- “测试”Tab 不再显示。
- 开始投递后能看到 `投递诊断`、`下一页检查点`、`推荐分页` 相关日志进入现有记录面板。
- 在推荐页让脚本持续运行超过 `90s` 且列表无实际变化时，会新增一条 `投递看门狗` 日志，但不会自动中止任务。
- 在开发态可临时让 `acquireDataPre()` 抛出一次错误以验证异常链路；此时 UI 侧应能看到明确的 `run-rejected / caller-rejected / caller-finally` 因果链，而不是静默挂住。

## Superseded Work

- `docs/plans/2026-03-06-scroll-debug-tab.md` 对应的是已过时的“滚动问题”方向。
- 本设计文档覆盖后续诊断方案；旧文档保留为历史记录，实施时不再继续扩展该方案。
