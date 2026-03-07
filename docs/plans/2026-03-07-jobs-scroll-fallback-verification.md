# Jobs Scroll Fallback Verification Record

**Goal:** 记录 `/web/geek/jobs` 页面滚动过早停止问题的根因、修复内容与验证证据，作为本次修复的交付记录。

## Problem Summary

- 故障现场会出现：`当前筛选条件下岗位均已投递`、`未检测到下一页进展，执行兜底滚动重试`、`无下一页数据`、`结束投递`。
- 真实页面中虽然存在 `.job-list-container`，但它在该场景下并不是实际驱动懒加载的滚动容器。
- 脚本错误地优先滚动这个容器，导致推荐列表没有继续加载新岗位，最终过早判定“无下一页”。

## Browser-Grounded Findings

- 观察页面：`https://www.zhipin.com/web/geek/jobs?salary=406`
- `.job-list-container.scrollTop = 0`
- `.job-list-container.scrollHeight == .job-list-container.clientHeight`
- 继续滚动整页后，`ul.rec-job-list.childElementCount` 从 `15` 增长到 `30`

结论：该页面在故障场景下依赖整页滚动触发后续岗位加载，不能只依赖 `.job-list-container` 的容器滚动。

## Implemented Changes

### 1. Non-scrollable container fallback

在 `src/core/platform/boss-platform.ts` 的 `scrollJobsListToEnd()` 中增加护栏：

- 当列表容器不存在或不可见时，继续走整页滚动。
- 当 `scrollHeight <= clientHeight + 4`，说明容器实际不可滚，直接回退到 `simulateScrollToEnd()`。

### 2. Failed container movement fallback

为“容器理论可滚，但设置目标位置后没有产生有效位移”的场景补第二道护栏：

- 记录 `pendingDistance`
- 记录 `movedDistance`
- 记录 `reachedTarget`
- 仅在 `pendingDistance > 2` 且“未到达目标位置或几乎没有位移”时回退整页滚动

### 3. Avoid false fallback at bottom

保留“正常滚到底”的路径，不把已到达目标位置的正常情况误判成失败回退，避免引入新的抖动或重复滚动。

## Tests Added

在 `src/core/platform/boss-platform.test.ts` 中补了 3 个针对性用例：

- `jobs 页列表容器不可滚时回退到整页滚动`
- `jobs 页容器滚动后仍无法产生位移时回退到整页滚动`
- `jobs 页容器滚动正常到底时不回退到整页滚动`

测试继续复用最小 DOM stub，并清理容器残留，避免不同用例之间的 `querySelector()` 互相污染。

## Verification

- `npm test -- src/core/platform/boss-platform.test.ts`
- `npm run type-check`
- `npm run build`

结果：全部通过。

## Scope Notes

- 本次修复只收敛在 `BossPlatform` 的滚动原语。
- 未改动 `next()`、`hasNext()` 或推荐页业务判定。
- 未新增 UI，也未调整引擎级状态机语义。

## Follow-up Focus

虽然本次滚动问题已修复，但后续仍需在真实浏览器中优先巡检以下链路，确认没有被滚动回退时序影响：

- jobs 页连续滚动多屏是否稳定
- `collect` 是否始终命中当前正确岗位卡片
- `push` 是否会在滚动后命中错误岗位或无响应
- preference 开关是否真实影响运行分支
- 日志是否能准确区分滚动、回退、采集、投递四类动作
