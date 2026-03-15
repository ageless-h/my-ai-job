# UI 优化实施计划（BOSS 风格）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持 BOSS 直聘扁平化模块化风格的基础上，提升用户界面的精致度和现代感

**Architecture:** 创建设计系统 CSS 文件，定义 BOSS 风格的设计变量（配色、阴影、圆角、间距），然后逐步更新核心组件样式，添加轻量级微交互。

**Tech Stack:** Vue 3, Element Plus, CSS Variables

**参考文档:** `docs/superpowers/specs/2026-03-16-ui-modernization-design.md`

---

## 文件结构

### 新建文件

- `src/styles/boss-design-system.css` - BOSS 风格设计系统变量

### 修改文件

- `src/app/main.ts` - 引入设计系统
- `src/styles/ui-migration.css` - 更新为使用设计系统变量
- `src/features/panel/components/Panel.vue` - 更新侧边栏样式
- `src/features/job-assistant/components/AiJob.vue` - 更新统计卡片样式

---

## Chunk 1: 设计系统基础

### Task 1: 创建 BOSS 风格设计系统

**Files:**

- Create: `src/styles/boss-design-system.css`
- Modify: `src/app/main.ts`

- [ ] **Step 1: 创建设计系统文件**

创建 `src/styles/boss-design-system.css`:

```css
/* AI 求职助手 - BOSS 风格设计系统 */

#ai-job {
  /* ========== 颜色系统（完全沿用 BOSS 配色） ========== */

  /* 主题色 */
  --boss-primary: #00bebd;
  --boss-primary-hover: #00a8a7;
  --boss-primary-light: #e5f8f8;

  /* 文字颜色 */
  --boss-text-primary: #333333;
  --boss-text-regular: #666666;
  --boss-text-secondary: #999999;

  /* 背景颜色 */
  --boss-bg-color: #f8f8f8;
  --boss-bg-white: #ffffff;
  --boss-bg-hover: #f5f5f5;

  /* 边框颜色 */
  --boss-border-color: #ebeef5;
  --boss-border-light: #f0f2f5;

  /* ========== 阴影系统（轻量级扁平化） ========== */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-hover: 0 4px 12px rgba(0, 190, 189, 0.08);
  --shadow-panel: 0 2px 8px rgba(0, 0, 0, 0.08);

  /* ========== 圆角系统（小圆角 - 高效专业） ========== */
  --radius-base: 4px; /* 基础圆角：按钮、输入框 */
  --radius-card: 6px; /* 卡片圆角：主卡片容器 */
  --radius-full: 9999px; /* 圆形：头像、FAB */

  /* ========== 间距系统（8px 基准） ========== */
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;

  /* ========== 字体系统 ========== */
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
}
```

- [ ] **Step 2: 在 main.ts 中引入设计系统**

在 `src/app/main.ts` 的样式导入部分添加（在 ui-migration.css 之前）:

```typescript
import '@/styles/boss-design-system.css';
```

- [ ] **Step 3: 验证变量生效**

Run: `npm run dev`
打开浏览器开发者工具，检查 `#ai-job` 元素的计算样式，确认所有 CSS 变量已定义。

- [ ] **Step 4: 提交**

```bash
git add src/styles/boss-design-system.css src/app/main.ts
git commit -m "feat: 添加 BOSS 风格设计系统基础"
```

---

### Task 2: 更新 ui-migration.css 使用设计系统变量

**Files:**

- Modify: `src/styles/ui-migration.css`

- [ ] **Step 1: 替换硬编码颜色为变量**

在 `ui-migration.css` 中，将硬编码的颜色值替换为设计系统变量。

例如：

- `#00bebd` → `var(--boss-primary)`
- `#333333` → `var(--boss-text-primary)`
- `#f8f8f8` → `var(--boss-bg-color)`

- [ ] **Step 2: 更新阴影使用变量**

将 `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)` 替换为 `var(--shadow-card)`

- [ ] **Step 3: 更新圆角使用变量**

将 `border-radius: 10px` 替换为 `var(--radius-card)` (6px)
将 `border-radius: 8px` 替换为 `var(--radius-base)` (4px)
将 `border-radius: 4px` 替换为 `var(--radius-base)` (4px)

- [ ] **Step 4: 验证样式**

Run: `npm run dev`
检查所有组件的样式是否正常显示。

- [ ] **Step 5: 提交**

```bash
git add src/styles/ui-migration.css
git commit -m "refactor: 更新 ui-migration.css 使用设计系统变量"
```

---

## Chunk 2: 核心组件样式更新

### Task 3: 更新侧边栏面板样式

**Files:**

- Modify: `src/features/panel/components/Panel.vue`

- [ ] **Step 1: 更新侧边栏容器样式**

在 `Panel.vue` 的 `<style scoped>` 中，找到 `.ai-sidebar` 样式，更新为:

```css
.ai-sidebar {
  background: var(--boss-bg-white);
  border-left: 1px solid var(--boss-border-color);
  box-shadow: var(--shadow-panel);
  border-radius: var(--radius-card) 0 0 var(--radius-card);
}
```

- [ ] **Step 2: 更新侧边栏头部样式**

找到 `.ai-sidebar-header` 样式，更新为:

```css
.ai-sidebar-header {
  position: sticky;
  top: 0;
  background: var(--boss-bg-white);
  border-bottom: 1px solid var(--boss-border-color);
  padding: var(--spacing-4);
  z-index: 10;
}
```

- [ ] **Step 3: 更新侧边栏标题样式**

找到 `.ai-sidebar-title` 样式，更新为:

```css
.ai-sidebar-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--boss-text-primary);
}
```

- [ ] **Step 4: 验证侧边栏样式**

Run: `npm run dev`
检查侧边栏的背景、边框、阴影和标题样式。

- [ ] **Step 5: 提交**

```bash
git add src/features/panel/components/Panel.vue
git commit -m "feat: 更新侧边栏面板样式（BOSS 风格）"
```

---

### Task 4: 更新导航标签样式

**Files:**

- Modify: `src/features/panel/components/Panel.vue`

- [ ] **Step 1: 更新导航标签容器样式**

在 `Panel.vue` 中找到导航标签相关样式，更新为:

```css
.ai-nav-tabs {
  display: flex;
  gap: 4px;
  padding: var(--spacing-2);
  background: var(--boss-bg-color);
  border-radius: var(--radius-base);
}
```

- [ ] **Step 2: 更新单个标签样式**

```css
.ai-nav-tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-base);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--boss-text-regular);
  cursor: pointer;
  transition: all 150ms ease;
  user-select: none;
}

.ai-nav-tab:hover {
  background: var(--boss-bg-hover);
  color: var(--boss-text-primary);
}

.ai-nav-tab.is-active {
  background: var(--boss-bg-white);
  color: var(--boss-primary);
  box-shadow: var(--shadow-card);
}
```

- [ ] **Step 3: 验证导航标签**

Run: `npm run dev`
测试标签的悬停和激活效果。

- [ ] **Step 4: 提交**

```bash
git add src/features/panel/components/Panel.vue
git commit -m "feat: 更新导航标签样式（BOSS 风格）"
```

---

### Task 5: 更新统计卡片样式

**Files:**

- Modify: `src/features/job-assistant/components/AiJob.vue`

- [ ] **Step 1: 更新统计卡片容器为 Grid 布局**

在 `AiJob.vue` 中找到统计卡片容器，更新为:

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}
```

- [ ] **Step 2: 更新单个卡片样式**

```css
.stat-card {
  background: var(--boss-bg-white);
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius-card);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-card);
  transition: all 200ms ease;
}

.stat-card:hover {
  border-color: var(--boss-primary);
  box-shadow: var(--shadow-hover);
}
```

- [ ] **Step 3: 更新卡片标签和数值样式**

```css
.stat-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--boss-text-regular);
  margin-bottom: var(--spacing-2);
}

.stat-value {
  font-size: 20px;
  font-weight: var(--font-semibold);
  color: var(--boss-text-primary);
}
```

- [ ] **Step 4: 验证统计卡片**

Run: `npm run dev`
检查卡片的 Grid 布局、边框、阴影和悬停效果。

- [ ] **Step 5: 提交**

```bash
git add src/features/job-assistant/components/AiJob.vue
git commit -m "feat: 更新统计卡片样式（BOSS 风格模块化布局）"
```

---

## Chunk 3: Element Plus 组件覆盖

### Task 6: 覆盖按钮样式

**Files:**

- Modify: `src/styles/ui-migration.css`

- [ ] **Step 1: 更新主按钮样式**

在 `ui-migration.css` 中找到 `.el-button--primary` 样式，确保使用设计系统变量:

```css
#ai-job .el-button--primary {
  background: var(--boss-primary);
  border: none;
  border-radius: var(--radius-base);
  transition: all 150ms ease;
}

#ai-job .el-button--primary:hover {
  background: var(--boss-primary-hover);
}
```

- [ ] **Step 2: 添加次要按钮样式**

```css
#ai-job .el-button--default {
  background: var(--boss-bg-color);
  border: 1px solid var(--boss-border-color);
  color: var(--boss-text-primary);
  border-radius: var(--radius-base);
  transition: all 150ms ease;
}

#ai-job .el-button--default:hover {
  background: var(--boss-bg-hover);
  border-color: var(--boss-primary);
}
```

- [ ] **Step 3: 验证按钮样式**

Run: `npm run dev`
检查按钮的样式和悬停效果。

- [ ] **Step 4: 提交**

```bash
git add src/styles/ui-migration.css
git commit -m "feat: 覆盖 Element Plus 按钮样式（BOSS 风格）"
```

---

### Task 7: 覆盖输入框样式

**Files:**

- Modify: `src/styles/ui-migration.css`

- [ ] **Step 1: 更新输入框容器样式**

在 `ui-migration.css` 中更新输入框样式:

```css
#ai-job .el-input__wrapper {
  background: var(--boss-bg-white);
  border: 1px solid var(--boss-border-color);
  border-radius: var(--radius
```
