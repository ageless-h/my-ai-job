# 侧边栏 6 Tab 美术优化执行版任务卡

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于截图评审结果，完成 6 个 Tab 的视觉一致性与长期使用舒适度优化，确保窄侧栏下信息层级清晰、密度合理、主次明确。

**Architecture:** 采用“全局规范先行 + 逐 Tab 精修”的两阶段方案：先统一颜色/字阶/间距/图标语言，再按页面信息结构落地。每个任务卡给出目标、变更范围、验收截图点位与 DoD，便于设计与开发协作执行。

**Tech Stack:** Vue 3、Element Plus、Scoped CSS、Chrome DevTools 截图验收

---

## Chunk 1: 全局视觉规范（P0）

### Task 1: 主色使用纪律（One Accent Rule）

**Files:**

- Modify: `src/styles/ui-migration.css`
- Modify: `src/features/panel/components/Panel.vue`
- Modify: `src/features/*/components/*.vue`（仅涉及主色滥用页面）

- [ ] **Step 1: 标记主色可用场景**
  - 仅允许主色用于：当前激活导航、主CTA、开关/勾选激活态。
  - 非主流程按钮、说明文字、装饰线去主色。

- [ ] **Step 2: 页面级主色清点并收敛**
  - 逐页减少“同时出现多个主色强调点”的情况。

- [ ] **Step 3: 验收截图**
  - 工作台、AI 能力、运行日志三页首屏。
  - 标准：单屏强强调点 ≤ 3 个。

**DoD:**

- 主色语义唯一，视觉焦点稳定，不再“满屏高亮”。

---

### Task 2: 统一字阶与灰阶对比（Type Ladder）

**Files:**

- Modify: `src/styles/boss-design-system.css`
- Modify: `src/features/*/components/*.vue`（标题/说明文本）

- [ ] **Step 1: 统一字阶 token**
  - 页面标题 / 区块标题 / 正文 / 辅助说明固定到 4 级。

- [ ] **Step 2: 灰阶对比修正**
  - 辅助文案由过浅灰升级为可读灰，确保长时间阅读舒适。

- [ ] **Step 3: 验收截图**
  - AI 能力、账户数据、消息管理。
  - 标准：4 层层级肉眼可辨，无“标题同级化”。

**DoD:**

- 所有 Tab 的标题体系一致，说明文案可读性明显提升。

---

### Task 3: 统一间距栅格（8pt Rhythm）

**Files:**

- Modify: `src/features/*/components/*.vue`

- [ ] **Step 1: 统一卡片内边距**
  - 卡片内边距统一基线（建议 16）。

- [ ] **Step 2: 统一卡片间与组间距**
  - 卡片间距、组间距、控件间距统一到 8pt 系统。

- [ ] **Step 3: 验收截图**
  - 投递过滤、消息管理、运行日志。
  - 标准：无明显“某块很挤、某块很空”。

**DoD:**

- 页面垂直节奏稳定，阅读路径连续。

---

## Chunk 2: 逐 Tab 执行任务卡

### Task 4: 工作台（P0/P1）

**Files:**

- Modify: `src/features/job-assistant/components/AiJob.vue`

- [ ] **Step 1: 强化统计焦点（P0）**
  - 今日成功/失败数字增强体量与字重，标题降一级避免抢焦点。

- [ ] **Step 2: 去盒中盒（P1）**
  - 去除多余内层描边，改为留白 + 轻分割线。

- [ ] **Step 3: 设置区重排（P1）**
  - 窄侧栏中避免横向拉扯，优先纵向或 2 列紧凑网格。

**验收截图点位:**

- `ui-tab-gongzuotai.jpg` 对照前后

**DoD:**

- 首屏 3 秒内可识别“统计区 → 设置区 → 主操作”。

---

### Task 5: AI 能力（P0/P1/P2）

**Files:**

- Modify: `src/features/ai-config/components/AiConfig.vue`

- [ ] **Step 1: 标题层级重建（P0）**
  - 页面级、区块级、卡片级标题梯度明显。

- [ ] **Step 2: 色彩降噪（P0）**
  - 新增保留主色，编辑/调试/辅助操作降为中性色。

- [ ] **Step 3: 卡片内结构分层（P1）**
  - 说明区与操作区纵向分离，防止“信息带拥堵”。

- [ ] **Step 4: 长文案收敛（P2）**
  - 说明文案行高与行数控制，必要时截断+展开。

**验收截图点位:**

- `ui-tab-ainengli.jpg`

**DoD:**

- 卡片内容“可扫读、不挤压、不过度彩色”。

---

### Task 6: 投递过滤（P0/P1）

**Files:**

- Modify: `src/features/delivery-filter/components/DeliveryFilter.vue`

- [ ] **Step 1: 横向空间回收（P0）**
  - 缩减无效左右 padding，把空间还给文本。

- [ ] **Step 2: 节奏紧凑化（P1）**
  - 压缩卡片间距和控件行高，降低滚动负担。

- [ ] **Step 3: 语义纠偏（P1）**
  - “启用XXX”降级为控件标签语义，不抢区块标题权重。

**验收截图点位:**

- `ui-tab-toudiguolv.jpg`

**DoD:**

- 同屏规则展示量上升，长文本换行显著减少。

---

### Task 7: 消息管理（P0/P1/P2）

**Files:**

- Modify: `src/features/memory-session/components/MemorySession.vue`

- [ ] **Step 1: 统一模块栅格（P0）**
  - 卡片与卡片内部间距统一到 8pt 体系。

- [ ] **Step 2: 拆解拥挤单行（P1）**
  - 复选框+输入+单位拆分行，避免窄栏横向拥堵。

- [ ] **Step 3: 文本输入区优化（P1）**
  - textarea 的行高、内边距、上下分组更稳定。

- [ ] **Step 4: 强调色减负（P2）**
  - 说明文案不再频繁使用主色高亮。

**验收截图点位:**

- `ui-tab-xiaoxiguanli.jpg`

**DoD:**

- 表单密度高但不压迫，阅读/编辑节奏顺畅。

---

### Task 8: 运行日志（P0/P1/P2）

**Files:**

- Modify: `src/features/run-record/components/RunRecord.vue`

- [ ] **Step 1: 按钮权重重排（P0）**
  - “清空”降级为危险次级动作，“显示配置”作为中性次级操作。

- [ ] **Step 2: 空状态与高度策略（P1）**
  - 数据少时不强撑巨大空白；分页与表格距离更合理。

- [ ] **Step 3: 表头可读性增强（P2）**
  - 表头/正文字重与灰阶对比拉开，级别语义更直观。

**验收截图点位:**

- `ui-tab-yunxingrizhi.jpg`

**DoD:**

- 低数据量场景不空洞，扫读效率明显提升。

---

### Task 9: 账户数据（P0/P1）

**Files:**

- Modify: `src/features/account/components/Account.vue`

- [ ] **Step 1: 表单单列化（P0）**
  - 窄侧栏中手机号/邮箱等输入区禁止并排。

- [ ] **Step 2: 标题层级梳理（P1）**
  - 去掉“全同级加粗”，建立页级/分组/字段层级。

- [ ] **Step 3: 文案与按钮解耦（P1）**
  - 说明文案与操作按钮增加距离，减轻压迫感。

**验收截图点位:**

- `ui-tab-zhanghushuju.jpg`

**DoD:**

- 输入区不变形，说明区可读，操作区清晰。

---

## Chunk 3: 交付与验收

### Task 10: 视觉回归检查（全局）

**Files:**

- Create: `docs/测试/UI美术回归清单-v1.md`

- [ ] **Step 1: 首屏对照回归**
  - 6 个 Tab 全量“前后对照图”归档。

- [ ] **Step 2: 窄宽度回归**
  - 至少 3 个面板宽度档位检查（窄/中/宽）。

- [ ] **Step 3: 长时间阅读回归**
  - 5 分钟连续浏览，记录刺眼、拥挤、跳读点是否消失。

**DoD:**

- 满足以下硬条件：
  - 主色强强调点 ≤ 3/屏
  - 4 级字阶可辨
  - 8pt 间距一致
  - 图标线性语言一致

---

## 建议执行节奏（2 周）

### Week 1（P0）

- Task 1,2,3,4,8,9
- 目标：先把“主次、可读、窄栏稳定”打牢。

### Week 2（P1/P2）

- Task 5,6,7,10
- 目标：打磨阅读舒适度与细节一致性。

---

## 风险与回退

- 风险 1：过度降噪导致“重点不明显”
  - 回退策略：保留主色在主按钮 + 当前路径，不再额外增加。
- 风险 2：紧凑化过度导致可点区域不友好
  - 回退策略：交互控件保持最小点击热区，优先压缩留白而非控件本体。
- 风险 3：跨页统一后个别页面业务信息显得“太平”
  - 回退策略：允许业务级局部强调，但必须遵循 One Accent Rule。

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-17-ui-art-direction-execution-cards.md`. Ready to execute?**
