# 项目知识库

## 概述

AI 求职助手是一个用于 BOSS 直聘求职自动化的 Tampermonkey 用户脚本项目。
技术栈：Vue 3 + Pinia + Element Plus + Vite + vite-plugin-monkey。
构建输出为单个用户脚本文件：`dist/ai-job-hunting.user.js`。

## 源代码布局

```text
src/
├─ app/            # 应用启动和根组件
├─ features/       # 面向用户的功能模块（panel, ai-config, preference, job-assistant...）
├─ core/           # 运行时和业务基础设施
│  ├─ platform/    # boss-platform.ts (1894 行), boss-api-client.ts, boss-dom-adapter.ts
│  ├─ delivery/    # ai-delivery-builder.ts (投递逻辑构建)
│  ├─ ai/          # AI 能力封装
│  ├─ auth/        # 认证相关
│  ├─ http/        # HTTP 请求封装
│  ├─ engine/      # 推送引擎
│  ├─ protocol/    # 协议定义
│  └─ realtime/    # 实时通信
├─ state/          # Pinia 状态管理
├─ shared/         # 共享工具/错误/类型
│  └─ utils/       # tools.ts (234 行), salary-utils.ts, url-utils.ts, security-utils.ts, config-manager.ts
└─ styles/
```

## 关键入口点

- 应用启动：`src/app/main.ts`
- 根组件：`src/app/App.vue`
- 主面板：`src/features/panel/components/Panel.vue`
- 平台工厂：`src/core/platform/platform-factory.ts`
- 核心平台逻辑：`src/core/platform/boss-platform.ts` (1894 行)
- API 客户端：`src/core/platform/boss-api-client.ts` (6 个核心 API 方法)
- 投递构建器：`src/core/delivery/ai-delivery-builder.ts` (AI 投递逻辑)

## 依赖规则

- `app` -> `features | core | state | shared`
- `features` -> `core | state | shared`
- `core` -> `state | shared` (尽可能避免直接拥有 UI)
- `state` -> `shared`
- `shared` -> 不依赖业务层

## 构建与验证

```bash
npm run build
npm run type-check
```

## 注意事项

- 所有 `@ts-nocheck` 指令已被移除；整个代码库强制执行类型安全。
- 动态导入和用户脚本运行时行为必须在结构重构后在真实的 BOSS 直聘页面上验证。
- `tools.ts` 已被模块化为专用工具模块（salary-utils, url-utils, security-utils, config-manager）。
- API 调用已集中在 `boss-api-client.ts` 中以提高可维护性。
