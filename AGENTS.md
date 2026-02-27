# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-27
**Commit:** 37fb190
**Branch:** main

## OVERVIEW

Tampermonkey 油猴脚本 — BOSS直聘 AI 求职助手。Vue 3 + Pinia + Element Plus + Vite + vite-plugin-monkey。自动投递/收藏岗位、AI 代聊、简历发送、批量消息。构建产物为单文件 userscript（`dist/ai-job-hunting.user.js`）。

## STRUCTURE

```
ai-job-hunting/
├── src/
│   ├── main.ts              # 入口：动态创建 DOM 挂载 Vue 应用
│   ├── App.vue              # 根组件，仅引入 Panel
│   ├── components/          # 7 个 Vue 组件（compiled render functions）
│   ├── services/            # 8 个服务（HTTP、平台、AI、推送引擎）
│   ├── stores/              # 4 个 Pinia store（composition API）
│   ├── protocol/            # Protobuf + MQTT 消息协议
│   ├── utils/               # 工具函数（GM_* 封装、日志、缓存）
│   ├── errors/              # 自定义异常类
│   └── types/               # 类型声明
├── vite.config.ts           # CDN externals + Tampermonkey userscript 配置
└── package.json             # v0.0.23-beta
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| UI 布局/侧边栏 | `components/Panel.vue` | 主容器，KeepAlive 切换子组件 |
| AI 配置/提示词/API Key | `components/AiConfig.vue` | 1667 行，最复杂组件 |
| 投递/收藏逻辑 | `services/boss-platform.ts` | 继承 AbsPlatform，DOM 交互 |
| AI 问答/过滤 | `services/ai-power.ts` | 静态类，调用后端 AI API |
| 消息协议 | `protocol/message.ts` + `mqtt.ts` | Protobuf 编码发送 |
| 用户偏好 | `components/Preference.vue` | 1142 行，30+ 表单字段 |
| 数据持久化 | `utils/tools.ts` | `getAiConfigExt()` / `saveAiConfigExt()` → localStorage |
| GM_* API | `utils/tampermonkey.ts` | Tampermonkey API 封装 |
| HTTP 客户端 | `services/request.ts` | Axios 实例，拦截器注入 Authorization |
| 认证流程 | `services/auth.ts` | 静默登录，简历导入 |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `BossPlatform` | class | services/boss-platform.ts | 岗位匹配/投递/收藏，继承 AbsPlatform |
| `AbsPlatform` | abstract class | services/push-engine.ts | 推送引擎抽象基类 |
| `AiPower` | static class | services/ai-power.ts | AI 问答 + 过滤 |
| `BossOption` | class | services/boss-option.ts | AI 代聊消息处理 |
| `SSEClient` | class | services/sse-client.ts | Server-Sent Events |
| `Message` | class | protocol/message.ts | Protobuf 消息编码/发送 |
| `Tools` | static class | utils/tools.ts | 工具集（薪资解析、配置读写、URL 解析） |
| `LogRecorder` | class | services/push-engine.ts | 日志记录，GM_setValue 持久化 |
| `UserStore` | Pinia store | stores/user.ts | 用户信息 + 偏好 |
| `LoginStore` | Pinia store | stores/login.ts | 登录状态 |
| `pushResultCount` | Pinia store | stores/push-result.ts | 投递成功/失败计数 |

## CONVENTIONS

### 组件编写（关键 — 非标准）
- 所有 `.vue` 组件使用 **compiled render functions**（`createVNode`/`createElementVNode`），不是标准 SFC template
- 组件顶部 `@ts-nocheck` 禁用 TypeScript 检查
- Vue API 从 `Vue as any` 解构，Element Plus 从 `ElementPlus as any` 解构
- CSS 必须用 `:deep()` 穿透 scoped 样式到 Element Plus 组件

### 状态管理
- Pinia store 使用 composition API 风格（`defineStore("name", () => { ... })`）
- localStorage 手动持久化（无插件）
- AI 扩展配置存储在 `localStorage["ai-job-ai-config-ext"]`，通过 `Tools.getAiConfigExt()` 读写

### 服务层
- 服务为静态工具类（`AiPower.ask()`、`AiPower.filter()`）
- HTTP 请求统一使用 `request` 实例（`@/services/request`）
- `ElMessage` 被封装，自动添加 `[AI助理]` 前缀

### 构建
- 依赖通过 CDN externals 加载（Vue、Pinia、Element Plus、protobufjs）
- 构建命令：`npm run build` → `dist/ai-job-hunting.user.js`
- 无 ESLint / Prettier 配置

## ANTI-PATTERNS (THIS PROJECT)

- **禁止** 在组件中使用标准 `<template>` 语法 — 必须使用 compiled render functions
- **禁止** 修改 `_cache` 索引 — render 函数中的 `_cache[N]` 索引是固定的
- **禁止** 在组件中引入新的外部依赖 — 所有依赖通过 CDN externals 加载
- **禁止** 直接修改其他组件文件 — 改动范围必须最小化
- **注意** `@ts-nocheck` — 组件内无 TypeScript 类型检查，手动确保类型安全
- **注意** 后端 API 基础 URL 硬编码在 `request.ts` 中

## API ENDPOINTS

| Endpoint | Method | Service |
|----------|--------|---------|
| `/api/user/silently/login` | POST | auth.ts |
| `/api/user/userinfo` | POST | auth.ts |
| `/api/user/import/resume` | POST | auth.ts |
| `/api/user/ai/config/current` | GET | AiConfig.vue |
| `/api/user/ai/config/save` | POST | AiConfig.vue |
| `/api/user/ai/config/temp/save` | POST | AiConfig.vue |
| `/api/user/ai/config/test` | POST | AiConfig.vue |
| `/api/user/ai/config/debug` | POST | AiConfig.vue |
| `/api/user/ai/config/all/provider` | GET | AiConfig.vue |
| `/api/job/seeker/cloned/ask` | POST | ai-power.ts |
| `/api/job/filter/one` | POST | ai-power.ts |
| `zhipin.com/wapi/zpgeek/friend/add.json` | POST | boss-platform.ts |
| `zhipin.com/wapi/zpgeek/job/card.json` | GET | boss-platform.ts |
| `zhipin.com/wapi/zpchat/geek/getBossData` | POST | boss-option.ts |

## DATA PERSISTENCE

| Key | Storage | Content |
|-----|---------|---------|
| `Authorization` | localStorage | JWT token |
| `ai-job-user` | localStorage | 用户偏好 JSON |
| `ai-job-ai-config-ext` | localStorage | AI 配置扩展（API keys、预设、记忆、UI 布局） |
| `pushSuccessCount:{date}` | GM_setValue | 每日投递成功数 |
| `pushFailCount:{date}` | GM_setValue | 每日投递失败数 |
| `logs_data` | GM_setValue | 操作日志（每 10s 持久化） |

## COMMANDS

```bash
npm run dev          # 开发服务器（需手动运行）
npm run build        # 构建 → dist/ai-job-hunting.user.js
npm run type-check   # TypeScript 类型检查（vue-tsc）
```

## NOTES

- 组件行数极大（AiConfig 1667 行、Preference 1142 行）— 全部是 render function 代码
- 无测试文件、无 CI/CD 配置
- BOSS直聘 API 调用需要 `Zp_token` cookie 和页面上下文（`_PAGE.token`）
- 消息发送使用 Protobuf 编码 → WebSocket/MQTT 传输
- CSS 变量定义在 `Panel.vue` 的 `.ai-job-root` 中（`--ai-primary` 等）
