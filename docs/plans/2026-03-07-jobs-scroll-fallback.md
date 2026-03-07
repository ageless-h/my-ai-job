# Jobs Scroll Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 `/web/geek/jobs` 页面在 `.job-list-container` 存在但实际不可滚时错误地滚动容器而不是整页，避免“当前筛选条件下岗位均已投递 → 无下一页数据”的误停。

**Architecture:** 保持修复最小化，只改 `src/core/platform/boss-platform.ts` 的滚动原语，不改 UI，不扩大到全局引擎语义。先用测试复现“容器存在但 `scrollHeight <= clientHeight` 时必须回退到整页滚动”的行为，再补最小实现，并跑针对性验证与构建验证。

**Tech Stack:** TypeScript、Vitest、Vue 3 userscript runtime、BOSS DOM 选择器。

---

### Task 1: 用测试锁定不可滚容器回退行为

**Files:**
- Modify: `src/core/platform/boss-platform.test.ts`
- Verify: `src/core/platform/boss-platform.ts:308`

**Step 1: Write the failing test**

```ts
beforeEach(() => {
  document.body.innerHTML = "";
});

it("jobs 页列表容器不可滚时回退到整页滚动", async () => {
  const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
  const simulateScrollToEnd = (await import("@/shared/utils/scroll")).simulateScrollToEnd as ReturnType<typeof vi.fn>;
  const container = document.createElement("div");
  container.className = "job-list-container";

  Object.defineProperty(container, "clientHeight", { value: 2237, configurable: true });
  Object.defineProperty(container, "scrollHeight", { value: 2237, configurable: true });
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => 0,
    set: vi.fn()
  });

  document.body.appendChild(container);

  await (platform as any).scrollJobsListToEnd();

  expect(simulateScrollToEnd).toHaveBeenCalledTimes(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/platform/boss-platform.test.ts`

Expected: 新增用例失败，表现为 `simulateScrollToEnd` 未被调用。

**Step 3: Write minimal implementation**

```ts
private async scrollJobsListToEnd(): Promise<void> {
  const listContainer = document.querySelector(".job-list-container") as HTMLElement | null;
  if (!listContainer || listContainer.clientHeight <= 0) {
    await simulateScrollToEnd();
    return;
  }

  const nonScrollable = listContainer.scrollHeight <= listContainer.clientHeight + 4;
  if (nonScrollable) {
    await simulateScrollToEnd();
    return;
  }

  // 保留现有容器滚动逻辑
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/platform/boss-platform.test.ts`

Expected: 新增用例通过，原有 `doPush` 回归测试继续通过。

**Step 5: Commit**

仅在用户明确要求时执行 git 提交；本次默认不提交。

### Task 2: 为浏览器实证补第二道护栏

**Files:**
- Modify: `src/core/platform/boss-platform.test.ts`
- Modify: `src/core/platform/boss-platform.ts:308`

**Step 1: Write the failing test**

```ts
it("jobs 页容器滚动后仍无法产生位移时回退到整页滚动", async () => {
  const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
  const simulateScrollToEnd = (await import("@/shared/utils/scroll")).simulateScrollToEnd as ReturnType<typeof vi.fn>;
  const container = document.createElement("div");
  container.className = "job-list-container";

  let scrollTop = 0;
  Object.defineProperty(container, "clientHeight", { value: 1000, configurable: true });
  Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: () => {
      scrollTop = 0;
    }
  });

  document.body.appendChild(container);

  await (platform as any).scrollJobsListToEnd();

  expect(simulateScrollToEnd).toHaveBeenCalledTimes(1);
});
```

测试前继续复用 `beforeEach(() => { document.body.innerHTML = ""; })`，避免前一个用例残留的 `.job-list-container` 干扰 `querySelector()` 命中结果。

**Step 2: Run test to verify it fails**

Run: `npm test -- src/core/platform/boss-platform.test.ts`

Expected: 新增用例失败，表现为代码仍停留在容器滚动路径，没有切回整页滚动。

**Step 3: Write minimal implementation**

```ts
const beforeTop = listContainer.scrollTop;
listContainer.scrollTop = targetTop;
listContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
await Tools.sleep(220);

const movedDistance = Math.abs(listContainer.scrollTop - beforeTop);
const reachedTarget = Math.abs(listContainer.scrollTop - targetTop) <= 2;
if (!reachedTarget || movedDistance <= 2) {
  await simulateScrollToEnd();
  return;
}
```

只在确认容器未达到目标位置或几乎没有产生有效位移时加这道护栏；不要改动 `next()`、`hasNext()` 或推荐页逻辑。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/core/platform/boss-platform.test.ts`

Expected: 两个新增滚动回退用例和原有回归用例全部通过。

**Step 5: Commit**

仅在用户明确要求时执行 git 提交；本次默认不提交。

### Task 3: 完成静态与构建验证

**Files:**
- Verify: `src/core/platform/boss-platform.ts`
- Verify: `src/core/platform/boss-platform.test.ts`

**Step 1: Run targeted test suite**

Run: `npm test -- src/core/platform/boss-platform.test.ts`

Expected: PASS。

**Step 2: Run type-check**

Run: `npm run type-check`

Expected: PASS。

**Step 3: Run build**

Run: `npm run build`

Expected: PASS。

**Step 4: Record browser-grounded rationale**

在最终说明中明确引用浏览器实证：`/web/geek/jobs` 页面中 `.job-list-container` 在故障现场 `scrollHeight == clientHeight`，继续滚动整页后 `ul.rec-job-list` 从 `15` 增长到 `30`。

**Step 5: Commit**

仅在用户明确要求时执行 git 提交；本次默认不提交。
