# BossPlatform 注释中文化与 JSDoc 补全 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不修改任何运行逻辑、类型定义和方法签名的前提下，完成 `src/core/platform/boss-platform.ts` 的中文注释整理、公共方法 JSDoc 补全以及复杂业务逻辑说明增强。

**Architecture:** 本次改动仅触及 `BossPlatform` 核心平台文件中的注释层，不改动业务分支、状态流转和 API 调用行为。注释补全将围绕类职责、运行时状态字段、职位匹配、投递执行、收藏流程、消息通道与状态管理等关键区域分段进行，并通过类型检查验证未引入语法或类型问题。

**Tech Stack:** TypeScript、Vue 3 用户脚本运行时、Vite、JSDoc、LSP 诊断、`npm run type-check`

---

### Task 1: 梳理 BossPlatform 结构与注释缺口

**Files:**
- Modify: `src/core/platform/boss-platform.ts`
- Reference: `src/core/platform/boss-api-client.ts`

**Step 1: 读取类定义和方法列表**

确认 `BossPlatform` 的公共方法、重要属性以及复杂业务逻辑集中区域（职位匹配、投递、收藏、消息通道、状态管理）。

**Step 2: 标记待补全文档区域**

明确需要补充 JSDoc 的公共方法、需要翻译的英文注释以及需要新增行内解释的复杂逻辑片段。

### Task 2: 补全类与公共接口文档

**Files:**
- Modify: `src/core/platform/boss-platform.ts`

**Step 1: 为类和关键属性补充 JSDoc**

为 `BossPlatform` 类、运行时缓存、分页状态、自动沟通安全计数器等重要属性补充中文文档。

**Step 2: 为公共方法补充标准 JSDoc**

使用 `@param`、`@returns`、`@throws`、`@deprecated` 等标准标签，为外部可调用方法补充中文说明。

### Task 3: 强化复杂业务逻辑说明

**Files:**
- Modify: `src/core/platform/boss-platform.ts`

**Step 1: 中文化现有英文注释**

将文件内现存英文注释翻译为准确中文，同时保持日志与字符串常量语义不变。

**Step 2: 增加关键行内注释**

重点补充 `matchJob` 的 AI/传统规则双通道判定流程、`doPush` 的重试与限流判定、列表滚动与无进展检测、自动消息/图片发送安全控制、收藏确认状态判断等复杂逻辑说明。

### Task 4: 验证注释改动安全性

**Files:**
- Modify: `src/core/platform/boss-platform.ts`

**Step 1: 运行 LSP 诊断**

确认目标文件没有因 JSDoc 或注释结构导致的新语法/类型诊断问题。

**Step 2: 运行类型检查**

Run: `npm run type-check`

Expected: 命令通过，无新增 TypeScript 类型错误。
