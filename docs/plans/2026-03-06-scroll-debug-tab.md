# Scroll Debug Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增一个常驻“测试”Tab，用临时调试能力定位开始投递时未滚动到真正底部的原因。

**Architecture:** 方案分成三层：`shared` 提供可复用的滚动诊断数据结构与判定函数，`core/platform` 暴露 BOSS 页面当前列表的诊断快照与一次性调试动作，`features` 新增测试页并接入面板 Tab。正式投递主流程保持不变，只增加只读快照与手动触发型调试入口。

**Tech Stack:** Vue 3、Element Plus、TypeScript、Vitest、Tampermonkey runtime

**Safety Guardrails:**
- 默认不修改 `src/core/engine/push-engine.ts`，除非最终接线被证明只能做最小暴露改动。
- 调试动作不能污染正式投递流程依赖的分页基线状态；如需复用平台能力，应提供隔离的调试路径或在执行后恢复状态。
- 当正式投递进行中时，测试 Tab 中会触发页面动作的按钮必须禁用或直接提示不可用。
- 在非 `jobs` / `job-recommend` 列表页，测试 Tab 只展示 unsupported 状态，不触发页面副作用。

---

### Task 1: 建立可测试的滚动诊断辅助函数

**Files:**
- Create: `src/shared/utils/scroll-debug.ts`
- Test: `src/shared/utils/scroll-debug.test.ts`

**Step 1: Write the failing test**

为以下行为先写失败测试：
- 当 `scrollTop + clientHeight < scrollHeight` 时，状态应判定为未到底
- 当剩余滚动距离在容差内时，状态应判定为已到底
- 当卡片数、尾卡 key、列表签名都未变化时，返回“无明显进展”

**Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/utils/scroll-debug.test.ts`
Expected: FAIL，因为诊断辅助函数尚不存在

**Step 3: Write minimal implementation**

实现最小辅助函数，至少包含：
- 滚动容器快照类型
- 是否到底判定函数
- 基于高度/卡片数/尾卡 key 的进展摘要函数

**Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/utils/scroll-debug.test.ts`
Expected: PASS

### Task 2: 在 BOSS 平台暴露临时调试入口

**Files:**
- Modify: `src/core/platform/boss-platform.ts`
- Possibly modify: `src/core/engine/push-engine.ts`
- Reuse: `src/shared/utils/scroll.ts`
- Reuse: `src/shared/utils/scroll-debug.ts`

**Step 1: Write the failing test**

如果可以保持纯函数测试，则补一个针对调试摘要格式化的失败测试；若平台层无法稳定单测，则保持本任务无新增测试，仅依赖 Task 1 的可测切面。

**Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/utils/scroll-debug.test.ts`
Expected: FAIL（仅当本任务新增了纯函数测试）

**Step 3: Write minimal implementation**

在 `BossPlatform` 中新增仅供调试 UI 调用的方法，至少包括：
- 读取当前 jobs/recommend 列表容器与页面滚动快照
- 返回卡片数量、尾卡 key、列表签名、当前 URL、推荐/职位页类型
- 手动执行一次“滚到当前列表底部”
- 手动执行一次“下一页预加载前置动作”

要求：
- 不改变 `startPush()` 正常逻辑
- 复用现有 `scrollJobsListToEnd()` / `acquireDataPre()` 能力
- 复用时必须隔离或恢复 `lastHeight`、`lastJobCardCount`、`lastJobsTailKey`、`lastJobsListSignature`、`lastRecommendCardCount`、`lastRecommendTailKey`、`lastRecommendListSignature`、`recommendNoProgressRounds` 等正式流程基线状态
- 日志里增加足够的滚动前后指标，便于实时记录与测试页对照

**Step 4: Run focused verification**

Run: `npm run type-check`
Expected: 变更文件无新增类型问题

### Task 3: 新增常驻测试 Tab 和调试面板

**Files:**
- Modify: `src/features/panel/Panel.vue`
- Create: `src/features/debug-tab/components/ScrollDebugTab.vue`
- Reuse: `src/features/job-assistant/components/AiJob.vue`

**Step 1: Write the failing test**

如果当前仓库缺少稳定的 Vue 组件测试基线，则不新增脆弱组件测试，改为通过 Task 1 的纯函数测试 + 最终类型检查与构建验证保证可靠性。

**Step 2: Run test to verify it fails**

跳过，原因同上。

**Step 3: Write minimal implementation**

新增一个始终显示的“测试”Tab，页面至少包含：
- 当前页面/列表类型说明
- 当前滚动容器与 window 的关键数值
- 卡片数、尾卡 key、列表签名、是否判定到底
- “刷新快照”“滚到列表底部”“执行一次预加载前置动作”按钮
- 最近一次动作前后对比结果和状态提示

UI 原则：
- 保持和现有面板一致的卡片式布局
- 明确区分只读快照与会触发页面动作的按钮
- 文案中标注“临时测试功能”
- 正式投递进行中时，触发页面动作的按钮禁用并给出明确提示

**Step 4: Run focused verification**

Run: `npm run type-check`
Expected: PASS

### Task 4: 端到端验证

**Files:**
- Verify: `src/features/panel/Panel.vue`
- Verify: `src/features/debug-tab/components/ScrollDebugTab.vue`
- Verify: `src/core/platform/boss-platform.ts`
- Verify: `src/shared/utils/scroll-debug.ts`

**Step 1: Run targeted tests**

Run: `npm test -- src/shared/utils/scroll-debug.test.ts`
Expected: PASS

**Step 2: Run type check**

Run: `npm run type-check`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS，并生成最新 userscript

**Step 4: Manual verification notes**

在 BOSS `jobs`/`job-recommend` 页面打开“测试”Tab，依次点击“刷新快照”“滚到列表底部”“执行一次预加载前置动作”，观察：
- 实际命中的容器 selector 是什么，而不只是默认假设 `.job-list-container`
- 到底判定是否与页面肉眼状态一致
- 执行预加载前后卡片数/尾卡 key/列表签名是否发生变化
- 多次执行调试动作后立即开始正式投递，首轮分页与继续加载行为仍然正常
- 正式投递进行中时，测试 Tab 中的动作按钮不可执行
