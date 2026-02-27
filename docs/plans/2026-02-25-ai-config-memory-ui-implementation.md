# AI 配置记忆隔离与四页重排 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有插件中实现“渠道+模型记忆隔离 + 提示词预设库（全局+个人覆盖）+ 四页面两栏仪表板式重排”，并保持现有功能兼容。

**Architecture:** 采用渐进增强方案：保持当前接口不变，在现有 `ai-job-hunting.user.js` 内扩展 `ModelChannelKey`、`ext` 配置结构和 UI 组织层；会话键由 `jobKey` 扩展为 `jobKey@provider:model` 以隔离记忆；预设库使用“内置模板 + 用户覆盖”合并策略，最终提示词可预览。

**Tech Stack:** Tampermonkey userscript、Vue 3（编译后单文件）、Element Plus、Axios

---

### Task 1: 建立模型渠道主键与扩展配置骨架

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（行为基线）**

记录当前行为（手工）：切换模型后同岗位会话串话。

**Step 2: 验证基线可复现**

Run: 浏览器中切换模型并在同一岗位连续调试
Expected: 历史上下文未隔离（现状）

**Step 3: 最小实现**

在 `Tools` 或同级工具区新增：

```js
static buildModelChannelKey(provider, modelName) {
  return `${provider || 0}:${modelName || ""}`;
}
```

为 AI 配置扩展 `ext` 默认结构：

```js
{
  memoryProfiles: {},
  promptPresetStore: {},
  uiLayout: { style: "dashboard-2col" }
}
```

**Step 4: 验证通过**

Run: `node --check ai-job-hunting.user.js`
Expected: PASS

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: add model-channel key and ext config scaffold"
```

---

### Task 2: 会话记忆按渠道+模型隔离

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（行为）**

定义期望：同岗位在 `provider/model` 变化后应是新会话。

**Step 2: 验证失败**

Run: 浏览器手工验证
Expected: 切换模型仍复用历史（FAIL）

**Step 3: 最小实现**

将现有 `jobKey` 扩展为：

```js
const sessionKey = `${jobKey}@${modelChannelKey}`;
```

覆盖点：
- `AiPower.ask(...)` 调用前
- `AiPower.updateAskStatus(...)`
- `AiConfig` 调试对话 `jobKey` 生成逻辑

**Step 4: 验证通过**

Run: 切换模型后重新调试同岗位
Expected: 历史不串；切回原模型历史恢复

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: isolate AI session memory by provider and model"
```

---

### Task 3: 提示词预设库数据层（全局+个人覆盖）

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（行为）**

定义期望：同名 personal preset 覆盖 global preset。

**Step 2: 验证失败**

Run: 在当前实现中尝试覆盖
Expected: 无预设机制（FAIL）

**Step 3: 最小实现**

新增结构与合并函数：

```js
mergePresets(globalCatalog, personalMap, modelChannelKey)
buildFinalPrompt({global, channel, model, userPrompt})
```

新增默认全局模板（只读）2~4 条。

**Step 4: 验证通过**

Run: 在页面内创建同名 personal preset
Expected: 最终预览使用 personal 内容

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: add prompt preset store with global-personal override"
```

---

### Task 4: AI 配置页功能增强（预设库 + 最终提示词预览）

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（行为）**

定义期望：可在 `AI 配置` 页创建、编辑、启用预设，并看到最终拼装提示词。

**Step 2: 验证失败**

Run: 当前页面
Expected: 无预设库入口（FAIL）

**Step 3: 最小实现**

在 `AiConfig` 组件新增：
- 预设列表区（标签、启用、编辑）
- 预设编辑弹窗（name/tags/content/scope）
- 最终提示词预览面板（只读）

复用当前 `debug` 对话能力验证拼装效果。

**Step 4: 验证通过**

Run: 手工创建预设并调试
Expected: 预览与调试响应按预设变化

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: add preset library and final prompt preview in AI config"
```

---

### Task 5: AI 配置页记忆策略面板（按模型渠道）

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（行为）**

定义期望：不同 `provider/model` 可配置不同记忆策略。

**Step 2: 验证失败**

Run: 切换模型
Expected: 策略不可区分（FAIL）

**Step 3: 最小实现**

新增记忆策略表单字段：
- `enabled`
- `scope`
- `maxTurns`
- `summaryThreshold`

切换模型时自动加载对应 profile。

**Step 4: 验证通过**

Run: 切换模型前后保存策略
Expected: 各模型策略独立保持

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: add per-model-channel memory profile settings"
```

---

### Task 6: 四页面两栏仪表板 UI 重排

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（UI目标）**

定义目标布局：
- 左栏（配置/控制）
- 右栏（结果/日志/预览）

**Step 2: 验证现状不满足**

Run: 打开 4 个页面
Expected: 布局分散，信息密度不均（FAIL）

**Step 3: 最小实现**

在现有页面容器新增统一 class：
- `.dashboard-2col`
- `.panel-left`
- `.panel-right`
- 响应式断点 `<1280` 自动单列

页面改造范围：
- `AiJob`
- `Preference`
- `RunRecord`
- `AiConfig`

**Step 4: 验证通过**

Run: 手工检查 1920/1440/1280
Expected: 四页布局统一、无遮挡、主操作可见

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "feat: apply two-column dashboard layout across 4 pages"
```

---

### Task 7: 兼容迁移与回归验证

**Files:**
- Modify: `ai-job/ai-job-hunting.user.js`
- Test: `ai-job/ai-job-hunting.user.js`

**Step 1: 写失败用例（兼容）**

定义期望：旧配置无 `ext` 时不报错，自动补默认。

**Step 2: 验证失败**

Run: 清空部分新字段后加载页面
Expected: 可能出现 undefined 访问（FAIL）

**Step 3: 最小实现**

新增迁移函数：

```js
normalizeAiConfigExt(config)
```

在 `fetchConfig`、`save`、`temp/save` 前后统一调用。

**Step 4: 验证通过**

Run:
- `node --check ai-job-hunting.user.js`
- 关键流程手测：批量投递、收藏、AI坐席回复、偏好保存

Expected: 全部可用，无新异常弹窗

**Step 5: Commit**

```bash
git add ai-job-hunting.user.js
git commit -m "refactor: add config ext migration and compatibility guards"
```

---

## 执行备注

1. 该仓库为编译后单文件，改动必须保持最小侵入
2. 不在本轮引入新后端必填字段，仅使用可选扩展字段
3. 每个任务完成后都执行：

```bash
node --check ai-job-hunting.user.js
```

并在最终执行：

```bash
rg -n "ModelChannelKey|memoryProfiles|promptPresetStore|dashboard-2col" ai-job-hunting.user.js
```

确保关键特性已落地
