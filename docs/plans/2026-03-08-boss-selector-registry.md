# BOSS Selector Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增集中化的 BOSS DOM 选择器注册表，并让 `boss-platform.ts` 与 `Panel.vue` 全部改为消费该注册表，在不改变选择器字符串、降级逻辑与业务逻辑的前提下完成重构。

**Architecture:** 在 `src/core/platform/boss-selectors.ts` 中集中维护所有 BOSS 相关 DOM 选择器，并按 `jobList / jobCard / page / sideEntry / banners / panel` 分组导出。`boss-platform.ts` 与 `Panel.vue` 仅替换选择器来源，不改查询顺序、过滤逻辑、回退策略与运行行为。

**Tech Stack:** TypeScript, Vue 3 SFC, Vite, Pinia, Element Plus, userscript runtime

---

### Task 1: 建立 BOSS 选择器注册表

**Files:**
- Create: `src/core/platform/boss-selectors.ts`
- Reference: `docs/plans/2026-03-08-boss-selector-registry-design.md`

**Step 1: 汇总选择器清单**

从以下文件提取所有 BOSS 相关选择器，确认字符串逐字一致：

- `src/core/platform/boss-platform.ts`
- `src/features/panel/Panel.vue`

重点覆盖：

- 职位列表与卡片：`.job-list-container`、`.job-card-wrap`、`.rec-job-list .job-card-wrap`、`.job-card-box`、`.job-card-wrapper`
- 卡片字段：`a.job-card-left,a.job-name,a`、`.job-name,.job-title,.job-info .job-name`、`.boss-info,.company-name,.brand-name`、`.company-location,.job-area`
- 页面节点：`.chat-conversation`、`.recommend-search-inner`、`.job-recommend-result`、`.page-job-inner`、`.mod-header`
- 侧边入口与碰撞节点：`.zp-side-entry-jobs`、`.zp-side-entry-question`、`.side-entry.side-entry-jobs`、`.side-entry.side-entry-question`、`.c-job-tools.job-tools`、`.vip-guide.sider-box`
- Banner：`.job-tools-banners`、`.banner-item.template-banner`

**Step 2: 创建注册表文件**

在 `src/core/platform/boss-selectors.ts` 写入最小实现骨架：

```ts
export const BOSS_SELECTORS = {
  jobList: {
    container: ".job-list-container",
    cardWrap: ".job-card-wrap",
    fallbackCardWrap: ".rec-job-list .job-card-wrap",
    cardBox: ".job-card-box",
    cardWrapper: ".job-card-wrapper"
  },
  jobCard: {
    link: "a.job-card-left,a.job-name,a",
    jobName: ".job-name,.job-title,.job-info .job-name",
    companyName: ".boss-info,.company-name,.brand-name",
    location: ".company-location,.job-area"
  },
  page: {
    chatConversation: ".chat-conversation",
    recommendSearchInner: ".recommend-search-inner",
    jobRecommendResult: ".job-recommend-result",
    pageJobInner: ".page-job-inner",
    modHeader: ".mod-header"
  },
  sideEntry: {
    jobs: ".zp-side-entry-jobs",
    question: ".zp-side-entry-question",
    sideEntryJobs: ".side-entry.side-entry-jobs",
    sideEntryQuestion: ".side-entry.side-entry-question",
    jobTools: ".c-job-tools.job-tools",
    vipGuide: ".vip-guide.sider-box"
  },
  banners: {
    jobToolsBanners: ".job-tools-banners",
    templateBanner: ".banner-item.template-banner"
  },
  panel: {
    fabCollision: [
      ".zp-side-entry-jobs",
      ".zp-side-entry-question",
      ".side-entry.side-entry-jobs",
      ".side-entry.side-entry-question",
      ".c-job-tools.job-tools",
      ".vip-guide.sider-box",
      ".job-tools-banners",
      ".banner-item.template-banner"
    ],
    fabAnchors: [
      ".zp-side-entry-jobs",
      ".zp-side-entry-question",
      ".side-entry.side-entry-jobs",
      ".side-entry.side-entry-question"
    ]
  }
} as const;
```

**Step 3: 自检类型与命名**

确认：

- 文件仅导出 `BOSS_SELECTORS`
- 使用 `as const`
- 不引入 `any` 或 `@ts-ignore`
- 数组可被 `readonly string[]` 场景直接消费

**Step 4: Commit**

```bash
git add src/core/platform/boss-selectors.ts
git commit -m "refactor: add boss selector registry"
```

### Task 2: 重构 boss-platform.ts 使用注册表

**Files:**
- Modify: `src/core/platform/boss-platform.ts`

**Step 1: 添加导入**

在文件顶部导入：

```ts
import { BOSS_SELECTORS } from "@/core/platform/boss-selectors";
```

**Step 2: 替换岗位卡片字段提取选择器**

将以下代码中的字符串替换为注册表引用：

```ts
cardElement?.querySelector("a.job-card-left,a.job-name,a")
cardElement?.querySelector(".job-name,.job-title,.job-info .job-name")
cardElement?.querySelector(".boss-info,.company-name,.brand-name")
cardElement?.querySelector(".company-location,.job-area")
```

替换后保持原逻辑：

```ts
cardElement?.querySelector(BOSS_SELECTORS.jobCard.link)
cardElement?.querySelector(BOSS_SELECTORS.jobCard.jobName)
cardElement?.querySelector(BOSS_SELECTORS.jobCard.companyName)
cardElement?.querySelector(BOSS_SELECTORS.jobCard.location)
```

**Step 3: 替换列表与容器选择器**

逐一替换：

- `document.querySelector(".job-list-container")`
- `document.querySelectorAll(".job-list-container .job-card-wrap")`
- `document.querySelectorAll(".rec-job-list .job-card-wrap")`
- `document.querySelectorAll(".job-card-wrap")`
- `document.querySelectorAll(".job-card-box")`
- `document.querySelectorAll(".job-card-wrapper")`

允许在局部拼接字符串，但必须保证逻辑不变，例如：

```ts
document.querySelector(BOSS_SELECTORS.jobList.container)
document.querySelectorAll(`${BOSS_SELECTORS.jobList.container} ${BOSS_SELECTORS.jobList.cardWrap}`)
document.querySelectorAll(BOSS_SELECTORS.jobList.fallbackCardWrap)
document.querySelectorAll(BOSS_SELECTORS.jobList.cardWrap)
document.querySelectorAll(BOSS_SELECTORS.jobList.cardBox)
document.querySelectorAll(BOSS_SELECTORS.jobList.cardWrapper)
```

**Step 4: 保持降级顺序不变**

确认以下逻辑完全保留：

```ts
const fallbackCardList = cardList.length > 0
  ? cardList
  : Array.from(document.querySelectorAll(BOSS_SELECTORS.jobList.fallbackCardWrap));
```

以及：

```ts
const cardList = scopedCards.length > 0
  ? scopedCards
  : Array.from(document.querySelectorAll(BOSS_SELECTORS.jobList.cardWrap));
```

**Step 5: 运行静态检查**

Run: `npm run type-check`

Expected: 无 TypeScript 报错

**Step 6: Commit**

```bash
git add src/core/platform/boss-platform.ts src/core/platform/boss-selectors.ts
git commit -m "refactor: centralize boss platform selectors"
```

### Task 3: 重构 Panel.vue 使用注册表

**Files:**
- Modify: `src/features/panel/Panel.vue`

**Step 1: 添加导入**

在 `<script setup lang="ts">` 顶部增加：

```ts
import { BOSS_SELECTORS } from "@/core/platform/boss-selectors";
```

**Step 2: 删除本地硬编码数组**

删除：

```ts
const FAB_COLLISION_SELECTORS = [ ... ] as const;
const FAB_ANCHOR_SELECTORS = [ ... ] as const;
```

**Step 3: 改为引用注册表数组**

将：

```ts
getRectsBySelectors(FAB_COLLISION_SELECTORS)
getRectsBySelectors(FAB_ANCHOR_SELECTORS)
```

替换为：

```ts
getRectsBySelectors(BOSS_SELECTORS.panel.fabCollision)
getRectsBySelectors(BOSS_SELECTORS.panel.fabAnchors)
```

**Step 4: 保持其他逻辑不变**

确认以下内容不变：

- FAB 避让顺序
- 锚点优先级
- 侧边入口优先定位逻辑
- `cleanupPreference()` 中的内部 UI 选择器（它们不是 BOSS 页面兼容选择器）

**Step 5: 运行静态检查**

Run: `npm run type-check`

Expected: `Panel.vue` 无类型错误

**Step 6: Commit**

```bash
git add src/features/panel/Panel.vue src/core/platform/boss-selectors.ts
git commit -m "refactor: use boss selector registry in panel"
```

### Task 4: 全量验证与诊断清理

**Files:**
- Modify if needed: `src/core/platform/boss-selectors.ts`
- Modify if needed: `src/core/platform/boss-platform.ts`
- Modify if needed: `src/features/panel/Panel.vue`

**Step 1: 运行 LSP 诊断**

检查：

- `src/core/platform/boss-selectors.ts`
- `src/core/platform/boss-platform.ts`
- `src/features/panel/Panel.vue`

Expected: `lsp_diagnostics` 返回 clean

**Step 2: 运行类型检查**

Run: `npm run type-check`

Expected: 成功退出

**Step 3: 运行构建**

Run: `npm run build`

Expected: 构建成功，生成 userscript bundle，无新增错误

**Step 4: 人工代码复核**

检查点：

- `boss-platform.ts` 中不再残留 BOSS 相关硬编码选择器
- `Panel.vue` 中 FAB 相关 BOSS 选择器已全部改走注册表
- 注册表中的字符串与改造前逐字一致
- 未改动回退逻辑与业务逻辑

**Step 5: 最终 Commit**

```bash
git add src/core/platform/boss-selectors.ts src/core/platform/boss-platform.ts src/features/panel/Panel.vue
git commit -m "refactor: centralize boss dom selectors"
```
