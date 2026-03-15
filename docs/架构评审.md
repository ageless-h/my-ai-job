# AI Job Hunting 架构审查与优化建议

> 审查日期：2026-03-03

## 项目概览

| 维度 | 现状 |
|------|------|
| **类型** | Tampermonkey 油猴脚本（注入 BOSS 直聘页面） |
| **技术栈** | Vue 3 + Pinia + Element Plus + Vite + vite-plugin-monkey |
| **源码规模** | 49 个文件，约 7,800 行代码 |
| **分层** | `app` → `features` → `core` → `shared` / `state` |

---

## 一、前端 (UI / Feature 层)

### 🔴 问题 1：`Panel.vue` 是 1009 行的 God Component

面板组件承担了**所有 tab 切换逻辑 + 全部 CSS 样式**（约 800 行 `<style>`），且用了 `defineComponent` + `render function` 混合 `<script setup>` 的反模式。

**优化建议：**
- 将 `<style>` 拆分为独立 CSS 文件（如 `panel.css` 或按模块拆分）
- 抽取 tab-switching / collapse / resize 逻辑到 composable（`usePanelLayout.ts`）
- 每个 tab 的渲染逻辑考虑 lazy-load（`defineAsyncComponent`），减少首次执行体积

### 🔴 问题 2：Features 模块缺少 service 分离

大部分 feature 组件（`AiJob.vue`、`Preference.vue`、`AiConfig.vue`）是**纯 Vue 文件，可能混合了 UI 和业务逻辑**。仅 `conversation-cleaner` 做了 `services/` 分层。

**优化建议：**
- 每个 feature 统一结构 → `components/` + `services/` + `composables/`
- 举例：`features/job-assistant/composables/useJobAssistant.ts` 负责与 `core/ai`、`core/engine` 交互
- 组件只管渲染和事件绑定，业务逻辑下沉到 composable/service

### 🟡 问题 3：组件内 `@ts-nocheck` 与运行时类型断言

`Panel.vue` 里大量使用 `Vue as any`、`ElementPlus as any`，且 `boss-option.ts` 文件头部有 `@ts-nocheck`。

**优化建议：**
- 移除 `@ts-nocheck`，逐步给 `BossOption` 类添加完整类型声明
- `Panel.vue` 的 `defineComponent + render` 可考虑重构为标准 `<script setup>` + `<template>`

---

## 二、后端 / Core 层

### 🔴 问题 4：`boss-platform.ts` — 1753 行 God Class (78 个方法)

这是**全项目最大的风险点**。`BossPlatform` 承担了：页面挂载、职位列表获取与解析、偏好匹配、投递/收藏/发消息/发简历、AI 投递判定、自动联系安全限制、WebSocket 聊天初始化、推荐模式处理。

**优化建议——按职责拆分为 5~6 个模块：**

| 新模块 | 职责 | 来源方法 |
|--------|------|----------|
| `boss-dom.ts` | DOM 挂载、页面滚动、元素查找 | `getMountEle`, `scrollJobsListToEnd`, `findJobCardByJobDetail` |
| `boss-job-list.ts` | 职位列表获取、解析、分页 | `getJobList`, `hasNext`, `acquireDataPre`, `getJobsPageMetrics` |
| `boss-matcher.ts` | 偏好匹配 & AI 投递判定 | `matchJob`, `unpackBaseInfo`, `unpackExtInfo` |
| `boss-push.ts` | 投递/收藏执行 | `doPush`, `buildFavoriteApiRequests`, `isFavoriteSuccess` |
| `boss-chat.ts` | 消息发送 & WebSocket | `setChatWebsocket`, 消息相关方法 |
| `boss-safety.ts` | 安全限流 & 人机验证检测 | `enforceAutoContactSafety`, `isManualVerificationText` |

`BossPlatform` 保留为 **Facade 角色**，组合上述模块。

### 🔴 问题 5：`push-engine.ts` 职责混杂

一个文件同时包含：`LogRecorder` 类（日志持久化）、`AbsPlatform` 基类（推送引擎 + 安全策略 + 生命周期）、全局可变状态 `pushResultCounter` / `userStore$2`（`let` 声明 + `bindPlatformRuntime`）。

**优化建议：**
- `LogRecorder` → 独立至 `core/logging/log-recorder.ts`
- `AbsPlatform` → 保留在 `core/engine/`，精简接口
- 全局绑定改用**依赖注入**（`provide/inject`），消除可变全局变量

### 🟡 问题 6：`boss-option.ts` — 另一个大型静态类 (559 行)

`BossOption` 与 `BossPlatform` 存在功能重叠（`LogRecorder` 实例重复创建、安全配置逻辑重复）。

**优化建议：**
- 合并安全策略到统一的 `boss-safety.ts`
- 聊天相关逻辑合入 `boss-chat.ts`

### 🟡 问题 7：SSE Client 直接读 `localStorage`

`sse-client.ts` 内使用 `localStorage.getItem("Authorization")` 读取 token，而项目已有 `auth-session.ts` 负责 auth 管理。

**优化建议：** 改用 `getAuthorizationToken()` 统一获取 token。

---

## 三、Shared / 基础设施层

### 🔴 问题 8：`tools.ts` — 920 行万能工具类 (63 个方法)

`Tools` 是一个**静态方法的大杂烩**，混合了薪资解析、Cookie 读取、URL 解析、AI 配置读写、DOM 操作、偏好判定、Tampermonkey API 等完全不相关的职责。

**优化建议——按领域拆分：**

| 新文件 | 方法 |
|--------|------|
| `shared/utils/salary.ts` | `getSalaryType`, `isSalaryRangeMatched`, `convertSalaryHourToDayRange` |
| `shared/utils/ai-config-storage.ts` | `getAiConfigExt`, `saveAiConfigExt`, `getCurrentAiModelChannelKey` |
| `shared/utils/url.ts` | `parseURL`, `getCookieValue`, `getCurrentHostname` |
| `shared/utils/dom.ts` | DOM 操作相关方法 |
| `shared/utils/security.ts` | `isManualVerificationPresent`, `ensureBossDomainOrThrow` |
| `shared/utils/tools.ts` | 保留通用工具：`sleep`, `getRandomNumber`, `fuzzyMatch` |

### 🟡 问题 9：Pinia Store 设计偏扁平

大量状态散落在 `Tools` 的 `GM_getValue/GM_setValue` 调用中，而非 Pinia store。

**优化建议：** 新增 `state/ai-config.ts`、`state/preference.ts`、`state/push-progress.ts`。

### 🟡 问题 10：缺少测试覆盖

仅发现 `shared/utils/ai-delivery.test.ts` 一个测试文件。

---

## 四、优化优先级建议

| 优先级 | 项目 | 类型 | 风险 | 收益 |
|--------|------|------|------|------|
| **P0** | 拆分 `boss-platform.ts` | 后端 | 高 | 可维护性大幅提升 |
| **P0** | 拆分 `tools.ts` | 共享 | 中 | 依赖链清晰、可测试 |
| **P1** | `Panel.vue` 样式外提 + composable | 前端 | 中 | 减小构建体积 |
| **P1** | 移除 `@ts-nocheck` + 类型安全 | 后端 | 高 | 运行时稳定性 |
| **P1** | 统一 auth token 读取 | 后端 | 低 | 消除 token 不一致 |
| **P2** | Features service 分层 | 前端 | 低 | 可测试性 |
| **P2** | Pinia store 重组 | 状态 | 低 | 消除全局可变状态 |
| **P2** | 补充单元测试 | 全局 | 中 | 重构安全网 |
| **P3** | `push-engine.ts` 职责分离 | 后端 | 中 | 引擎逻辑更清晰 |
| **P3** | `boss-option.ts` 去重 | 后端 | 低 | 减少重复代码 |

---

## 五、建议的目标目录结构

```text
src/
├── app/
│   ├── main.ts
│   └── App.vue
├── features/
│   ├── panel/
│   │   ├── Panel.vue
│   │   ├── panel.css                      # [NEW]
│   │   └── composables/usePanelLayout.ts  # [NEW]
│   ├── job-assistant/
│   │   ├── components/AiJob.vue
│   │   ├── composables/useJobAssistant.ts # [NEW]
│   │   └── services/                      # [NEW]
│   └── ... (每个 feature 同理)
├── core/
│   ├── ai/
│   ├── auth/
│   ├── engine/
│   │   ├── push-engine.ts                 # 精简后，仅 AbsPlatform
│   │   └── push-safety.ts                # [NEW]
│   ├── http/
│   ├── logging/
│   │   └── log-recorder.ts               # [NEW]
│   ├── platform/
│   │   ├── boss-platform.ts              # Facade, ~200 行
│   │   ├── boss-dom.ts                   # [NEW]
│   │   ├── boss-job-list.ts              # [NEW]
│   │   ├── boss-matcher.ts               # [NEW]
│   │   ├── boss-push.ts                  # [NEW]
│   │   ├── boss-chat.ts                  # [NEW]
│   │   ├── boss-safety.ts               # [NEW]
│   │   └── platform-factory.ts
│   ├── protocol/
│   └── realtime/
├── state/
│   ├── login.ts
│   ├── user.ts
│   ├── push-result.ts
│   ├── ai-config.ts                      # [NEW]
│   └── preference.ts                     # [NEW]
└── shared/
    ├── errors/
    ├── types/
    └── utils/
        ├── tools.ts                      # 精简为通用工具
        ├── salary.ts                     # [NEW]
        ├── ai-config-storage.ts          # [NEW]
        ├── url.ts                        # [NEW]
        ├── dom.ts                        # [NEW]
        ├── security.ts                   # [NEW]
        └── ... (现有文件保留)
```

> **注意**: 所有拆分建议均应**渐进式执行**，每轮拆分后运行 `npm run build` + `npm run type-check` 验证。
