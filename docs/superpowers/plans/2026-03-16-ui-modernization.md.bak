# UI 现代化美化实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 求职助手的用户界面提升至商业级 SaaS 应用水准

**Architecture:** 创建独立的设计系统 CSS 文件，定义所有设计变量（颜色、阴影、圆角、间距、字体），然后逐步更新核心组件样式，最后添加微交互和动画效果。采用 CSS Variables 实现主题系统，确保样式在 Tampermonkey 脚本环境中正确隔离。

**Tech Stack:** Vue 3, Element Plus, CSS Variables, CSS Animations

**参考文档:** `docs/superpowers/specs/2026-03-16-ui-modernization-design.md`

---

## 文件结构

### 新建文件
- `src/styles/design-system.css` - 设计系统变量（颜色、阴影、圆角、间距、字体）
- `src/styles/components.css` - 组件样式覆盖（按钮、输入框、卡片等）
- `src/styles/animations.css` - 动画和过渡效果

### 修改文件
- `src/app/main.ts` - 引入新的样式文件
- `src/features/panel/components/Panel.vue` - 更新侧边栏样式
- `src/features/ai-config/components/AiConfig.vue` - 更新配置页面样式
- `src/features/job-assistant/components/AiJob.vue` - 更新工作台样式

---

## Chunk 1: 设计系统基础

### Task 1: 创建设计系统 CSS 文件

**Files:**
- Create: `src/styles/design-system.css`
- Modify: `src/app/main.ts`

- [ ] **Step 1: 创建设计系统文件**

创建 `src/styles/design-system.css` 并写入完整的设计系统变量（参考设计文档第二部分）。

- [ ] **Step 2: 在 main.ts 中引入设计系统**

在 `src/app/main.ts` 的样式导入部分添加:
```typescript
import '@/styles/design-system.css'
```

- [ ] **Step 3: 验证变量生效**

Run: `npm run dev`
检查浏览器开发者工具，确认 `#ai-job` 元素的 CSS 变量已定义。

- [ ] **Step 4: 提交**

```bash
git add src/styles/design-system.css src/app/main.ts
git commit -m "feat: 添加现代 SaaS 风格设计系统基础"
```

---

### Task 2: 创建组件样式文件

**Files:**
- Create: `src/styles/components.css`
- Modify: `src/app/main.ts`

- [ ] **Step 1: 创建组件样式文件**

创建 `src/styles/components.css` 并写入核心组件样式（参考设计文档第三部分）。

- [ ] **Step 2: 在 main.ts 中引入组件样式**

在 `src/app/main.ts` 中添加:
```typescript
import '@/styles/components.css'
```

- [ ] **Step 3: 验证组件样式**

Run: `npm run dev`
检查按钮、输入框、卡片等组件的样式是否更新。

- [ ] **Step 4: 提交**

```bash
git add src/styles/components.css src/app/main.ts
git commit -m "feat: 添加核心组件样式覆盖"
```

---

### Task 3: 创建动画样式文件

**Files:**
- Create: `src/styles/animations.css`
- Modify: `src/app/main.ts`

- [ ] **Step 1: 创建动画样式文件**

创建 `src/styles/animations.css` 并写入过渡动画和微交互（参考设计文档第四部分）。

- [ ] **Step 2: 在 main.ts 中引入动画样式**

在 `src/app/main.ts` 中添加:
```typescript
import '@/styles/animations.css'
```

- [ ] **Step 3: 验证动画效果**

Run: `npm run dev`
测试按钮悬停、卡片上浮等动画效果。

- [ ] **Step 4: 提交**

```bash
git add src/styles/animations.css src/app/main.ts
git commit -m "feat: 添加微交互和动画效果"
```

---

## Chunk 2: 核心组件样式更新

### Task 4: 更新侧边栏面板样式

**Files:**
- Modify: `src/features/panel/components/Panel.vue`

- [ ] **Step 1: 更新侧边栏容器样式**

在 `Panel.vue` 的 `<style scoped>` 中更新 `.ai-sidebar` 样式，使用设计系统变量。

- [ ] **Step 2: 添加毛玻璃效果头部**

更新 `.ai-sidebar-header` 样式，添加 `backdrop-filter` 效果。

- [ ] **Step 3: 更新侧边栏标题样式**

更新 `.ai-sidebar-title` 样式，使用新的字体变量。

- [ ] **Step 4: 验证侧边栏样式**

Run: `npm run dev`
检查侧边栏是否显示毛玻璃效果、阴影和圆角。

- [ ] **Step 5: 提交**

```bash
git add src/features/panel/components/Panel.vue
git commit -m "feat: 更新侧边栏面板样式"
```

---

### Task 5: 更新导航标签样式

**Files:**
- Modify: `src/features/panel/components/Panel.vue`

- [ ] **Step 1: 更新导航标签容器样式**

在 `Panel.vue` 中更新 `.ai-nav-tabs` 样式，使用设计系统变量。

- [ ] **Step 2: 更新单个标签样式**

更新 `.ai-nav-tab` 样式，添加悬停和激活状态。

- [ ] **Step 3: 添加按下效果**

为 `.ai-nav-tab:active` 添加 `transform: scale(0.97)` 效果。

- [ ] **Step 4: 验证导航标签**

Run: `npm run dev`
测试标签的悬停、激活和按下效果。

- [ ] **Step 5: 提交**

```bash
git add src/features/panel/components/Panel.vue
git commit -m "feat: 更新导航标签样式和微交互"
```

---

### Task 6: 更新统计卡片样式

**Files:**
- Modify: `src/features/job-assistant/components/AiJob.vue`

- [ ] **Step 1: 更新统计卡片容器为 Grid 布局**

在 `AiJob.vue` 中更新统计卡片容器样式，使用 `display: grid`。

- [ ] **Step 2: 更新单个卡片样式**

更新 `.stat-card` 样式，添加阴影和悬停效果。

- [ ] **Step 3: 更新卡片标签和数值样式**

更新 `.stat-label` 和 `.stat-value` 样式，使用新的字体变量。

- [ ] **Step 4: 验证统计卡片**

Run: `npm run dev`
检查卡片的 Grid 布局、阴影和悬停效果。

- [ ] **Step 5: 提交**

```bash
git add src/features/job-assistant/components/AiJob.vue
git commit -m "feat: 更新统计卡片样式（Bento Grid 布局）"
```

---

## Chunk 3: Element Plus 组件覆盖

### Task 7: 覆盖按钮样式

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: 覆盖主要按钮样式**

在 `components.css` 中添加 `.el-button--primary` 样式覆盖。

- [ ] **Step 2: 覆盖次要按钮样式**

添加 `.el-button--default` 样式覆盖（去边框化）。

- [ ] **Step 3: 验证按钮样式**

Run: `npm run dev`
检查按钮的样式、悬停和按下效果。

- [ ] **Step 4: 提交**

```bash
git add src/styles/components.css
git commit -m "feat: 覆盖 Element Plus 按钮样式"
```

---

### Task 8: 覆盖输入框样式

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: 覆盖输入框容器样式**

在 `components.css` 中添加 `.el-input__wrapper` 样式覆盖（去边框化）。

- [ ] **Step 2: 添加悬停和聚焦状态**

添加 `.el-input__wrapper:hover` 和 `.el-input__wrapper.is-focus` 样式。

- [ ] **Step 3: 验证输入框样式**

Run: `npm run dev`
检查输入框的背景、边框和聚焦效果。

- [ ] **Step 4: 提交**

```bash
git add src/styles/components.css
git commit -m "feat: 覆盖 Element Plus 输入框样式"
```

---

### Task 9: 覆盖卡片样式

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: 覆盖卡片容器样式**

在 `components.css` 中添加 `.boss-card` 样式覆盖。

- [ ] **Step 2: 添加卡片头部样式**

添加 `.card-header` 和 `.card-title` 样式。

- [ ] **Step 3: 验证卡片样式**

Run: `npm run dev`
检查卡片的阴影、圆角和头部样式。

- [ ] **Step 4: 提交**

```bash
git add src/styles/components.css
git commit -m "feat: 覆盖卡片组件样式"
```

---

## Chunk 4: 特殊组件优化

### Task 10: 优化 FAB 按钮样式

**Files:**
- Modify: `src/features/panel/components/Panel.vue`

- [ ] **Step 1: 更新 FAB 按钮样式**

在 `Panel.vue` 中更新 `.ai-fab` 样式，添加品牌色阴影。

- [ ] **Step 2: 添加悬停和按下效果**

添加 `.ai-fab:hover` 和 `.ai-fab:active` 样式。

- [ ] **Step 3: 验证 FAB 按钮**

Run: `npm run dev`
检查 FAB 按钮的阴影、悬停和按下效果。

- [ ] **Step 4: 提交**

```bash
git add src/features/panel/components/Panel.vue
git commit -m "feat: 优化 FAB 按钮样式"
```

---

### Task 11: 美化滚动条

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: 添加滚动条样式**

在 `components.css` 中添加 `::-webkit-scrollbar` 系列样式。

- [ ] **Step 2: 验证滚动条样式**

Run: `npm run dev`
检查滚动条的宽度、颜色和圆角。

- [ ] **Step 3: 提交**

```bash
git add src/styles/components.css
git commit -m "feat: 美化滚动条样式"
```

---

### Task 12: 添加空状态组件

**Files:**
- Create: `src/shared/components/EmptyState.vue`

- [ ] **Step 1: 创建空状态组件**

创建 `EmptyState.vue` 组件，包含图标、标题、描述和操作按钮。

- [ ] **Step 2: 添加空状态样式**

在组件中添加 `.empty-state` 系列样式。

- [ ] **Step 3: 在需要的地方使用空状态组件**

在 `AiJob.vue` 等组件中使用 `EmptyState` 组件。

- [ ] **Step 4: 验证空状态组件**

Run: `npm run dev`
检查空状态的显示效果。

- [ ] **Step 5: 提交**

```bash
git add src/shared/components/EmptyState.vue src/features/job-assistant/components/AiJob.vue
git commit -m "feat: 添加空状态组件"
```

---

## Chunk 5: 响应式适配和最终验证

### Task 13: 添加移动端响应式样式

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: 添加移动端媒体查询**

在 `components.css` 中添加 `@media (max-width: 768px)` 样式。

- [ ] **Step 2: 调整移动端布局**

更新侧边栏、统计卡片等组件的移动端样式。

- [ ] **Step 3: 验证移动端样式**

Run: `npm run dev`
使用浏览器开发者工具测试移动端布局。

- [ ] **Step 4: 提交**

```bash
git add src/styles/components.css
git commit -m "feat: 添加移动端响应式样式"
```

---

### Task 14: 最终验证和优化

**Files:**
- All modified files

- [ ] **Step 1: 运行类型检查**

Run: `npm run type-check`
确保没有类型错误。

- [ ] **Step 2: 运行构建**

Run: `npm run build`
确保构建成功。

- [ ] **Step 3: 验证所有组件样式**

Run: `npm run dev`
逐一检查所有组件的样式是否符合设计规范。

- [ ] **Step 4: 验证设计系统变量**

使用浏览器开发者工具检查所有 CSS 变量是否正确定义和使用。

- [ ] **Step 5: 验证动画性能**

使用 Chrome DevTools Performance 面板检查动画是否保持 60fps。

- [ ] **Step 6: 最终提交**

```bash
git add .
git commit -m "feat: 完成 UI 现代化美化"
```

---

## 验证清单

完成所有任务后，使用以下清单验证实施结果：

- [ ] 所有组件使用设计系统变量，无硬编码颜色值
- [ ] 所有交互都有过渡动画（150-300ms）
- [ ] 所有卡片使用多层阴影
- [ ] 所有按钮有悬停和按下状态
- [ ] 输入框聚焦时有外发光效果
- [ ] 滚动条已美化
- [ ] 移动端布局正常
- [ ] 类型检查通过
- [ ] 构建成功

---

## 注意事项

1. **样式隔离**：所有样式都应在 `#ai-job` 作用域下，避免与 BOSS 直聘页面样式冲突
2. **性能优先**：所有动画使用 `transform` 和 `opacity`，避免触发重排
3. **渐进增强**：对于不支持 `backdrop-filter` 的浏览器，使用纯色背景降级
4. **频繁提交**：每完成一个任务就提交，保持提
