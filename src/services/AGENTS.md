# SERVICES KNOWLEDGE BASE

## OVERVIEW

8 个服务模块：HTTP 客户端、认证、AI 能力、BOSS 平台交互、推送引擎、SSE 流。静态类 + 抽象继承模式。

## SERVICE MAP

| Service | Lines | Role | Pattern |
|---------|-------|------|---------|
| request.ts | 150 | Axios 实例 + 拦截器 | 单例导出 |
| auth.ts | 199 | 静默登录 + 简历导入 + 用户加载 | 导出函数 |
| ai-power.ts | 38 | AI 问答 + 过滤 | 静态类 |
| boss-platform.ts | 1030 | 岗位匹配/投递/收藏/消息 | 继承 AbsPlatform |
| boss-option.ts | 429 | AI 代聊消息处理 | 静态类 |
| push-engine.ts | 339 | 推送引擎抽象基类 + LogRecorder | 抽象类 |
| sse-client.ts | 53 | Server-Sent Events 客户端 | 类 |
| platform-factory.ts | 27 | 平台工厂（当前仅 BOSS） | 工厂函数 |

## ARCHITECTURE

```
platform-factory.ts → BossPlatform (boss-platform.ts)
                          ↑ extends
                      AbsPlatform (push-engine.ts)
                          ↓ uses
                      AiPower (ai-power.ts)
                      BossOption (boss-option.ts)
                      Message (protocol/message.ts)
                      request (request.ts)
```

## KEY PATTERNS

### HTTP 请求
- 统一使用 `request` 实例（`import { request } from "@/services/request"`）
- Authorization 从 `localStorage.getItem("Authorization")` 自动注入
- BOSS 直聘 API 使用 `fetchWithGM_request`（Tampermonkey GM_xmlhttpRequest）绕过跨域

### 平台抽象
- `AbsPlatform` 定义 `getJobList()` → `matchJob()` → `doPush()`/`doCollect()` 流程
- `BossPlatform` 实现具体逻辑：DOM 解析岗位列表、多条件过滤、API 调用投递
- `LogRecorder` 记录操作日志，每 10s 通过 `GM_setValue` 持久化

### AI 代聊
- `BossOption.handleBossMessage()` 接收 HR 消息 → `AiPower.ask()` → `sendMsg()` 回复
- 消息通过 Protobuf 编码 → WebSocket 发送（`Message.send()`）
- 支持自动发送简历、交换联系方式

## EDITING RULES

- 新增 API 调用统一使用 `request` 实例
- BOSS 直聘 API 需要 `Zp_token` cookie（从 `Tools.getCookie()` 获取）
- 超时时间跟随 `form.value.timeout`（默认 60s）
