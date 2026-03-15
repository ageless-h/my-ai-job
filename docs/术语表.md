# AI Job Hunting 名词定义与统一规范

> 创建日期：2026-03-03

本文档梳理项目中所有不一致的命名，明确每个名词的**统一标准名**以及对应的**操作（保留/修改/删除）**。

---

## 一、业务概念命名统一

### 1.1 "投递" 操作

项目中同一概念使用了 4 种不同名称：

| 当前名称 | 出现位置 | 操作 | 统一为 |
|----------|----------|------|--------|
| `push` | `push-engine.ts`, `PushStatus`, `PushResultStatus`, `doPush()`, `pushAfterHandler()` | **保留** | `push` 作为代码层统一术语 |
| `deliver` / `delivery` | `ai-delivery-judge`, `AiDeliveryJudge`, `ai-delivery.ts` | **保留** | `delivery` 用于 AI 判定功能的命名空间 |
| `publish` | `PublishStopExp`, `PublishLimitExp` | **🔴 修改** → | `PushStopError`, `PushLimitError` |
| `投递` | 日志文本、UI 文案 | **保留** | 中文 UI 文案统一用「投递」 |

> **规则**: 代码标识符用 `push`，AI 判定子系统用 `delivery`，UI 文案用「投递」。`publish` 彻底淘汰。

### 1.2 "收藏" 操作

| 当前名称 | 出现位置 | 操作 | 统一为 |
|----------|----------|------|--------|
| `collect` | `_collectMode`, `CollectReqException`, Panel UI | **🔴 修改** → | `favorite` |
| `favorite` | `buildFavoriteApiRequests()`, `isFavoriteSuccess()`, `isFavoriteDoneByHint()` | **保留** | `favorite` 作为代码层统一术语 |
| `收藏` | 日志文本、UI 文案 | **保留** | 中文 UI 文案统一用「收藏」 |

> **规则**: 代码标识符统一用 `favorite`。`collect` 改为 `favorite`。

### 1.3 "匹配/过滤" 操作

| 当前名称 | 出现位置 | 操作 | 统一为 |
|----------|----------|------|--------|
| `match` / `matchJob` | `boss-platform.ts` | **保留** | `match` 用于偏好匹配判定 |
| `filter` | `AiPower.filter()`, `ai-delivery.ts` | **保留** | `filter` 用于 AI 过滤调用 |
| `NotMatchException` | `shared/errors/index.ts` | **保留** | — |

> **规则**: `match` = 本地偏好匹配，`filter` = AI 远程过滤。两者为不同阶段，保持区分。

---

## 二、Error/Exception 命名统一

当前错误类命名混用了 `Exception`、`Exp`、`Error` 三种后缀：

| 当前名称 | 操作 | 统一为 |
|----------|------|--------|
| `AIJobHuntingError` | **保留** | — (基类) |
| `PlatformError` | **保留** | — |
| `PushException` | **🔴 修改** → | `PushError` |
| `NotMatchException` | **🔴 修改** → | `NotMatchError` |
| `PushReqException` | **🔴 修改** → | `PushRequestError` |
| `CollectReqException` | **🔴 修改** → | `FavoriteRequestError` (同时统一 collect→favorite) |
| `FetchJobBossFailExp` | **🔴 修改** → | `FetchJobDetailError` |
| `PublishStopExp` | **🔴 修改** → | `PushStopError` (同时统一 publish→push) |
| `PublishLimitExp` | **🔴 修改** → | `PushLimitError` (同时统一 publish→push) |

> **规则**: 统一使用 `Error` 后缀，与 JavaScript `Error` 基类保持一致。淘汰 `Exception` 和 `Exp` 后缀。

---

## 三、变量命名统一

### 3.1 带数字后缀的全局变量

这些是反编译/混淆风格残留，严重影响可读性：

| 当前名称 | 出现位置 | 操作 | 统一为 |
|----------|----------|------|--------|
| `logger$1` | `auth.ts`, `push-engine.ts`, `request.ts`, `boss-platform.ts`, `boss-option.ts` | **🔴 修改** → | `logger` |
| `logRecorder$1` | `auth.ts` (L216) | **🔴 修改** → | `preferenceLogRecorder` |
| `logRecorder$2` | `auth.ts` (L16) | **🔴 修改** → | `loginLogRecorder` |
| `userStore$1` | `boss-option.ts` | **🔴 修改** → | `userStore` |
| `userStore$2` | `push-engine.ts`, `boss-platform.ts` | **🔴 修改** → | `runtimeUserStore` 或注入替代 |
| `pushResultCounter` (全局 let) | `push-engine.ts` | **🔴 修改** → | 改为依赖注入或模块级 singleton |

> **规则**: 禁止在标识符中使用 `$数字` 后缀。每个变量应有语义化名称。

### 3.2 `ElMessage` 重导出冲突

| 当前名称 | 出现位置 | 操作 | 统一为 |
|----------|----------|------|--------|
| `ElMessage` (原始) | `element-plus` 导入 → `boss-option.ts` | — | — |
| `ElMessage$1` (别名) | `request.ts` 导入原始 | **保留** | — |
| `ElMessage` (自定义包装) | `request.ts` 导出 | **🔴 修改** → | `showAppMessage` |

> **规则**: 自定义消息包装函数不应与组件库同名，避免歧义。

---

## 四、Pinia Store 命名统一

| 当前名称 | store id | 命名风格 | 操作 | 统一为 |
|----------|----------|----------|------|--------|
| `UserStore` | `"ai-user"` | PascalCase | **保留** | — |
| `LoginStore` | `"LoginStore"` | PascalCase | **🟡 修改** id → | `"ai-login"` (与其他 store 保持前缀一致) |
| `pushResultCount` | `"pushResultCount"` | camelCase | **🔴 修改** → | `usePushResultStore` / id 改为 `"ai-push-result"` |

> **规则**: Store 函数名用 `use[Name]Store` 模式，store id 用 `ai-` 前缀 + kebab-case。

| 统一后名称 | store id |
|----------|----------|
| `useUserStore` | `"ai-user"` |
| `useLoginStore` | `"ai-login"` |
| `usePushResultStore` | `"ai-push-result"` |

---

## 五、偏好设置 Key 命名统一

用户偏好使用不透明的缩写 key，严重影响可读性和可维护性：

| 当前 Key | 含义 | 操作 | 建议统一为 |
|----------|------|------|-----------|
| `pi` | 投递间隔(秒) | **🔴 修改** → | `pushIntervalSec` |
| `cg` | 自定义打招呼语 | **🔴 修改** → | `customGreeting` |
| `cgE` | 自定义打招呼开关 | **🔴 修改** → | `customGreetingEnabled` |
| `cI` | 自定义图片集 | **🔴 修改** → | `customImageSet` |
| `cIE` | 自定义图片开关 | **🔴 修改** → | `customImageEnabled` |
| `dr` | 对话回复延迟(秒) | **🔴 修改** → | `dialogReplyDelaySec` |
| `drE` | 对话回复延迟开关 | **🔴 修改** → | `dialogReplyDelayEnabled` |
| `aiDeliverJudgeE` | AI 投递判定开关 | **🔴 修改** → | `aiDeliveryJudgeEnabled` (修正拼写错误 `Deliver` → `Delivery`) |
| `aiDeliverJudgePrompt` | AI 判定提示语 | **🔴 修改** → | `aiDeliveryJudgePrompt` |
| `aiSeatStatus` | AI 对话开关 | **保留** | — |
| `resumeId` | 简历 ID | **保留** | — |

> **注意**: 修改偏好 key 需要同时处理**数据迁移**（旧 key → 新 key），确保现有用户数据不丢失。建议在 `userRemoteLoad()` 中添加迁移逻辑。

---

## 六、重复定义清理

| 问题 | 文件 | 操作 |
|------|------|------|
| `simulateScrollToEnd` 重复定义 | `shared/utils/tools.ts` (L873) 与 `shared/utils/scroll.ts` (L3) | **🔴 删除** `tools.ts` 中的副本，保留 `scroll.ts` |
| `LogRecorder` 重复实例化 | `push-engine.ts` (AbsPlatform 内) 和 `boss-option.ts` (静态字段) 和 `auth.ts` (2 个实例) | **🔴 合并**为统一实例或按模块拆分 |
| `toNumberOr` 内联重复定义 | `boss-platform.ts` `getAutoContactSafetyConfig()` 和 `push-engine.ts` `getSafetyConfig()` 和 `boss-option.ts` `getAutoReplySafetyConfig()` | **🔴 提取**到 `shared/utils/` |
| `isInSafetyTimeWindow` 重复实现 | `AbsPlatform.isInSafetyTimeWindow()` 和 `BossOption.isInSafetyTimeWindow()` | **🔴 提取**到共享安全模块 |

---

## 七、文件/目录命名统一

| 当前名称 | 问题 | 操作 | 统一为 |
|----------|------|------|--------|
| `features/product/` | README 中列出但目录不存在 | **🔴 删除** README 中的引用，或创建模块 |
| `boss-option.ts` | 名称不够明确 | **🟡 修改** → | `boss-chat-handler.ts` |
| 各 feature 子目录结构不一致 | 有的有 `components/` 有的没有 | **🟡 修改** → | 统一为 `components/` + `services/` + `composables/` |

---

## 八、API 路径命名统一

| 当前路径 | 操作 | 说明 |
|----------|------|------|
| `/api/job/seeker/cloned/ask` | **保留** | 后端 API，非前端可控 |
| `api/job/filter/one` | **🟡 注意** | 缺少前导 `/`，与其他路径不一致 |
| `/api/job/seeker/cloned/change/session/status` | **保留** | — |
| `/api/user/ai/config` | **保留** | — |

---

## 变更执行顺序建议

1. **第一批（低风险）**: 清理重复定义 → `simulateScrollToEnd`、`toNumberOr`
2. **第二批（中风险）**: Error 类统一后缀 → `Exp`/`Exception` → `Error`
3. **第三批（中风险）**: 全局变量去 `$` 后缀 → `logger$1` → `logger`
4. **第四批（高风险）**: Store 改名 → 需确保所有引用更新
5. **第五批（高风险）**: 偏好 key 改名 → 需数据迁移逻辑
6. **第六批（中风险）**: `collect` → `favorite` 统一
7. **第七批（中风险）**: 中文 UI 文案统一（见第九节）

---

## 九、中文 UI 文案不统一

### 9.1 Tab 命名 vs 实际内容

Panel.vue 中 7 个 tab 的命名与各 tab 内部的标题/按钮存在矛盾：

| Tab Key | Tab 名称 | 组件 | 内部标题/按钮 | 问题 |
|---------|----------|------|---------------|------|
| 1 | 工作台 | `AiJob.vue` | 「投递统计」「投递设置」「操作」+ **「会话清理」** | 「会话清理」不属于"工作台"，已在「记忆与会话」tab 重复出现 |
| 2 | AI中心 | `AiConfig.vue` | 「提示词中心」「AI投递提示词」「自有API配置」 | "AI中心" 偏模糊，内容实际是提示词+API管理 |
| 3 | AI投递策略 | `AiDeliveryJudge.vue` | 「AI投递判断（岗位级）」「AI投递总开关」 | **「AI投递策略」** vs **「AI投递判断」** — 同一功能两种称呼 |
| 4 | 传统投递 | `Preference.vue` | 「投递设置」、按钮「保存**偏好设置**」「清除**偏好设置**」 | tab 叫"传统投递"，按钮/CSS 都叫"偏好设置"，标题叫"投递设置" |
| 5 | 记忆与会话 | `MemorySession.vue` | 「AI对话」「交互设置」「高意向设置」「邮件通知」「记忆策略」「会话清理」 | 内容远超"记忆与会话"——AI对话开关、邮件通知等不属于"记忆" |
| 6 | 运行记录 | `RunRecord.vue` | 「清空日志」 | ✅ 一致 |
| 7 | 账户 | `Account.vue` | 「账号信息」「简历管理」「**偏好数据**」 | 「偏好数据」中的导入/导出按钮叫「导出**偏好设置**」 |

### 9.2 同一功能多种称呼

| 功能 | 出现的不同名称 | 出现位置 | 建议统一名称 |
|------|---------------|----------|-------------|
| AI 投递判定 | 「AI投递策略」「AI投递判断」「AI投递判断（岗位级）」「AI投递提示词」「AI投递判断设置」 | Panel.vue tab、AiDeliveryJudge、AiConfig.vue | **「AI投递判定」** |
| 偏好设置 / 传统投递 | 「传统投递」「投递设置」「偏好设置」「传统投递设置」「传统投递总开关」 | Panel.vue tab、Preference.vue、Panel.vue CSS 注释、AiJob.vue tooltip | **「传统投递」**（tab名）/ **「传统投递规则」**（功能描述） |
| AI 对话 | 「AI对话」「AI对话开关」「AI对话自动回复」「AI 对话」（带空格）「AI 对话开关保存失败」 | MemorySession.vue、boss-option.ts、日志消息 | **「AI 对话」**（统一带空格） |
| 记忆 | 「记忆与会话」「记忆策略」「模型记忆策略」 | Panel.vue、MemorySession.vue | **「记忆策略」**（功能）/ **「对话与记忆」**（tab名建议） |

### 9.3 保存按钮文案不统一

| 位置 | 当前文案 | 建议统一为 |
|------|----------|-----------|
| Preference.vue | 「保存偏好设置」 | 「保存传统投递设置」 |
| Preference.vue | 「清除偏好设置」 | 「重置传统投递设置」 |
| AiDeliveryJudge.vue | 「保存设置」 | 「保存 AI 投递判定设置」 |
| AiConfig.vue | 「保存」 / 「保存AI投递提示词」 | 「保存提示词预设」 / 「保存 AI 投递提示词」 |
| MemorySession.vue | 「保存记忆策略」 / 「保存设置」 | 「保存记忆策略」 / 「保存对话设置」 |
| Account.vue | 「保存账户信息」 | ✅ 保留 |

### 9.4 跨 Tab 功能重复

| 功能 | Tab 1 出现 | Tab 2 出现 | 建议 |
|------|-----------|-----------|------|
| 会话清理 (`ConversationCleaner`) | 工作台 (AiJob.vue L688) | 记忆与会话 (MemorySession.vue L143) | **🔴 删除** AiJob.vue 中的「会话清理」，仅保留在「记忆与会话」tab |
| 投递设置（单次处理限制/MOCK/推荐无限循环） | 工作台 (AiJob.vue) | — | ✅ 保留在工作台 |
| AI 对话开关 | — | 记忆与会话 (MemorySession.vue L8) | ✅ 保留 |

### 9.5 Tooltip / 提示文案引用错误

| 位置 | 当前文案 | 问题 | 建议 |
|------|----------|------|------|
| AiJob.vue L618 | `在【偏好设置-投递设置】中选择` | **不存在**名为「偏好设置」的 tab | 改为 `在【传统投递】tab 中设置` |
| AiDeliveryJudge.vue L47 | `需要在「传统投递」中启用规则过滤` | ✅ 正确引用了 tab 名 | 保留 |
| AiDeliveryJudge.vue L57 | `此处配置与「AI投递策略」页共享同一份数据` | ✅ 正确 | 保留 |
| AiConfig.vue L694 | `判断开关与策略请在「AI投递策略」中设置` | ✅ 正确 | 保留 |
| Preference.vue L11 | `请前往顶部【搜索】按钮所在页面保存偏好设置` | 「偏好设置」应改为一致的名称 | 改为 `...保存传统投递设置` |

### 9.6 CSS 注释中遗留的旧名称

Panel.vue 的 `<style>` 中多处注释引用旧名称：

| 行 | 当前注释 | 问题 | 建议 |
|----|----------|------|------|
| L464 | `/* Form/div: 偏好设置/运行记录/AI配置 */` | 「偏好设置」已更名为「传统投递」 | 更新注释 |
| L600 | `/* ===== 偏好设置 Tab: Form layout ===== */` | 同上 | 更新为 `传统投递 Tab` |
| L616 | `/* ===== 偏好设置 Tab: Top-label layout ===== */` | 同上 | 同上 |
| L720 | `/* ===== 偏好设置: 投递间隔/翻页间隔排版 ===== */` | 同上 | 同上 |
| L735 | `/* ===== 偏好设置: 图片简历按钮UI统一 ===== */` | 同上 | 同上 |

### 9.7 建议的统一 Tab 命名方案

| Key | 当前 | 建议 | 理由 |
|-----|------|------|------|
| 1 | 工作台 | **工作台** | ✅ 保留，去掉「会话清理」 |
| 2 | AI中心 | **AI 配置** | 更准确描述内容（提示词+API） |
| 3 | AI投递策略 | **AI 投递判定** | 与组件内标题统一 |
| 4 | 传统投递 | **传统投递** | ✅ 保留，内部按钮/标题同步改 |
| 5 | 记忆与会话 | **对话与通知** | 更准确覆盖 AI 对话开关、邮件通知、高意向 |
| 6 | 运行记录 | **运行记录** | ✅ 保留 |
| 7 | 账户 | **账户** | ✅ 保留 |

### 9.8 日志/消息中的混用

| 当前 | 出现位置 | 建议 |
|------|----------|------|
| `"偏好设置保存成功"` | Preference.vue L311 | → `"传统投递设置保存成功"` |
| `"偏好设置加载中"` / `"偏好加载失败"` | AiJob.vue L391/L411 | → `"投递设置加载中"` / `"投递设置加载失败"` |
| `"偏好设置已复制到剪贴板"` | Account.vue L687 | → `"投递设置已复制到剪贴板"` |
| `"偏好设置已导入"` | Account.vue L706 | → `"投递设置已导入"` |
| `"设置保存成功"` | MemorySession.vue L263 | → `"对话与通知设置保存成功"` |
| `"AI投递判断设置已保存"` | AiDeliveryJudge.vue L158 | → `"AI 投递判定设置已保存"` |
| `"AI投递提示词已保存"` | AiConfig.vue L447 | ✅ 保留 |
| `"模型记忆策略已保存"` | MemorySession.vue L237 | ✅ 保留 |
| `"加载用户偏好配置"` | auth.ts L219 | → `"加载用户投递设置"` |
| `"加载用户偏好配置成功/失败"` | auth.ts L288/L297 | → 同上 |
