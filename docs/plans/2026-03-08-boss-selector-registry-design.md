# BOSS Selector Registry Design

**Goal:** 将 `boss-platform.ts` 与 `Panel.vue` 中所有 BOSS 相关 DOM 选择器集中到 `src/core/platform/boss-selectors.ts`，以消除硬编码、保持现有功能与降级逻辑不变，并为后续 BOSS 页面结构调整提供统一维护入口。

## Background

- 当前 `src/core/platform/boss-platform.ts` 在职位列表、推荐列表、卡片字段提取等路径内直接写死了多组 BOSS DOM 选择器。
- `src/features/panel/Panel.vue` 中 FAB 避让与锚点逻辑也依赖多组 BOSS 页面侧边栏选择器。
- 这些选择器分散在多个文件里，未来 BOSS 页面改版时需要到处查找与同步修改，容易漏改，且不利于回归验证。

## Confirmed Constraints

- 选择器字符串本身必须保持原样，不做语义改写。
- 现有降级逻辑必须原样保留，例如：`cardList.length > 0 ? cardList : fallbackCardList`。
- 不修改业务逻辑，不新增 `@ts-ignore`、`any` 规避。
- `Panel.vue` 中所有 BOSS 相关选择器也要统一进入注册表，而不是只处理 `boss-platform.ts`。

## Approaches Considered

### A. 仅提取你给出的最小示例集合

- 优点：改动最小，落地快。
- 缺点：`Panel.vue` 仍会残留部分硬编码选择器，无法真正达到“集中化管理”；后续维护仍需跨文件排查。

### B. 建立完整 BOSS 选择器注册表，并按语义分组导出（推荐）

- 优点：`boss-platform.ts` 与 `Panel.vue` 的 BOSS 选择器全部进入统一模块；命名清晰；后续改版只需维护一个文件。
- 缺点：首次梳理时需要补全分组与引用替换，改动面略大于最小方案。

### C. 建立注册表，但仍在调用处局部拼接字符串数组

- 优点：对现有代码结构影响较小。
- 缺点：虽然常量集中，但语义边界不清晰，`Panel.vue` 仍可能继续组装“匿名数组”，长期会再次回到分散状态。

## Selected Approach

选择 **B**：建立完整的 BOSS 选择器注册表，按语义分组导出，并让 `boss-platform.ts`、`Panel.vue` 都只从该注册表取值。

## Selector Registry Design

新增文件：`src/core/platform/boss-selectors.ts`

导出核心结构：

- `jobList`：职位列表容器与卡片容器相关选择器
- `jobCard`：岗位卡片字段提取选择器
- `page`：页面级节点选择器
- `sideEntry`：右侧入口、锚点与侧边挂件选择器
- `banners`：Banner 类块级选择器
- `panel`：仅供 `Panel.vue` 使用的 BOSS 页面碰撞/锚点选择器组合

其中：

- 保留你提供的基础对象结构与字段值。
- 在此基础上补充 `Panel.vue` 当前仍使用、但示例中未出现的 3 个选择器：
  - `.side-entry.side-entry-question`
  - `.c-job-tools.job-tools`
  - `.vip-guide.sider-box`
- `panel` 分组将提供语义化数组常量，例如：
  - `fabCollision`
  - `fabAnchors`

这样 `Panel.vue` 不再维护本地硬编码数组，只消费注册表暴露的只读集合。

## boss-platform.ts Refactor Plan

### 1. 导入注册表

- 从 `@/core/platform/boss-selectors` 导入 `BOSS_SELECTORS`。

### 2. 替换岗位卡片字段提取选择器

以下位置改为注册表引用，但保留原有查询与文本清洗逻辑：

- 卡片链接：`a.job-card-left,a.job-name,a`
- 岗位名：`.job-name,.job-title,.job-info .job-name`
- 公司名：`.boss-info,.company-name,.brand-name`
- 地点：`.company-location,.job-area`

### 3. 替换列表查询选择器

以下位置改为注册表引用：

- `.job-list-container`
- `.job-list-container .job-card-wrap`
- `.rec-job-list .job-card-wrap`
- `.job-card-wrap`
- `.job-card-box`
- `.job-card-wrapper`

### 4. 保持现有降级逻辑不变

只替换选择器来源，不改原有选择与回退顺序，例如：

- Jobs 页仍保持“优先容器内 `.job-card-wrap`，否则回退到 `.rec-job-list .job-card-wrap`”
- Recommend 页仍保持“优先 `.job-list-container .job-card-wrap`，否则回退到全局 `.job-card-wrap`”

## Panel.vue Refactor Plan

### 1. 导入注册表

- 从 `@/core/platform/boss-selectors` 导入 `BOSS_SELECTORS`。

### 2. 移除本地硬编码 BOSS 选择器数组

- 删除本地 `FAB_COLLISION_SELECTORS`
- 删除本地 `FAB_ANCHOR_SELECTORS`

### 3. 改为消费注册表中的数组常量

- FAB 碰撞检测改为使用 `BOSS_SELECTORS.panel.fabCollision`
- FAB 锚点定位改为使用 `BOSS_SELECTORS.panel.fabAnchors`

### 4. 非 BOSS 内部组件选择器不纳入本次注册表

例如 `.form-preference .el-form-item__label, .ai-config .el-form-item__label` 属于脚本自身 UI 结构，不属于 BOSS 页面 DOM 兼容面，本次不迁入 `boss-selectors.ts`。

## Type and Dependency Considerations

- `boss-selectors.ts` 使用 `as const` 保持字面量类型与只读语义。
- `Panel.vue` 读取数组常量时继续兼容当前 `getRectsBySelectors(selectors: readonly string[])` 签名。
- 依赖方向保持合法：`features/panel` 依赖 `core/platform`，符合现有分层规则。

## Non-Goals

- 不改 BOSS 选择器内容。
- 不合并或重写现有 DOM 查询逻辑。
- 不抽象业务判断流程。
- 不处理非 BOSS 页面的内部组件选择器集中化问题。

## Validation

### Static verification

- `npm run type-check`
- `npm run build`
- `lsp_diagnostics` 检查变更文件无错误

### Runtime verification

- Jobs 页岗位列表仍可正常识别与分页判断
- Recommend 页仍可按原逻辑读取卡片并分页
- Panel FAB 仍能按原逻辑避让 BOSS 侧边入口与 Banner
- 不出现因选择器来源替换导致的功能退化
