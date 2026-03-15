# AI 求职助手

BOSS 直聘求职自动化的 Tampermonkey 用户脚本。提供批量投递/收藏工作流、AI 辅助聊天回复、偏好设置控制和操作日志，基于 Vue 3 + Pinia + Element Plus 面板。

## 核心功能

- 职位列表页面批量投递和批量收藏
- 基于简历和提示词设置的 AI 助手回复
- 薪资、活跃度、公司和投递规则的偏好过滤器
- 运行日志和成功/失败计数器
- AI 配置（提供商/模型设置和调试端点）

## 技术栈

- Vue 3
- Pinia
- Element Plus
- Vite + vite-plugin-monkey
- Axios + Protobuf

## 项目结构

```text
ai-job-hunting/
├─ src/
│  ├─ app/                               # 应用启动和根组件
│  │  ├─ main.ts
│  │  └─ App.vue
│  ├─ features/                          # 功能模块（面向用户的 UI 模块）
│  │  ├─ panel/
│  │  ├─ job-assistant/
│  │  ├─ ai-config/
│  │  ├─ ai-delivery-judge/
│  │  ├─ delivery-filter/
│  │  ├─ memory-session/
│  │  ├─ conversation-cleaner/
│  │  ├─ run-record/
│  │  └─ account/
│  ├─ core/                              # 业务/运行时基础设施
│  │  ├─ ai/ auth/ http/ platform/
│  │  ├─ engine/ realtime/ protocol/
│  │  └─ AGENTS.md
│  ├─ state/                             # Pinia 状态管理
│  └─ shared/                            # 共享工具/错误/类型
├─ docs/
│  ├─ 文档索引.md
│  └─ archive/
├─ package.json
└─ vite.config.ts
```

### 分层规则

- `app` 可以依赖 `features`、`core`、`state`、`shared`
- `features` 可以依赖 `core`、`state`、`shared`
- `core` 可以依赖 `state`、`shared`，但应避免直接拥有 UI
- `shared` 应保持框架轻量化和可复用性

## 开发

### 开发模式（推荐）

使用独立开发服务器，支持热更新和完整调试：

```bash
npm install
npm run dev
```

浏览器会自动打开 http://localhost:5173，你可以：

- 实时查看 UI 修改效果（热更新）
- 使用 Vue DevTools 调试组件和状态
- 在控制台查看 MockPlatform 日志

### 生产模式

构建用户脚本：

```bash
npm run build
```

构建输出：`dist/ai-job-hunting.user.js`

## 类型检查

```bash
npm run type-check
```

## 注意事项

- 本仓库保留源代码，不要提交生成的 `dist/` 构建产物
- 用户脚本运行在 BOSS 直聘页面上，依赖页面运行时上下文
