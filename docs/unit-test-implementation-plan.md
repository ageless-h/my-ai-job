# 补充核心模块单元测试

## 概述

为提升测试覆盖率从 8.74% 到 80%，需要为以下核心模块补充单元测试。

## 第一优先级：纯函数模块（预期 +15-20% 覆盖率）

### 1. ai-delivery.ts (940行，当前覆盖率 10.92%)

**预期提升**: +8% 覆盖率  
**工作量**: 2-3天  
**难度**: 低（全是纯函数）

**需要测试的函数**:
- `buildTraditionalRuleSnapshot` - 传统规则快照构建
- `buildAiDeliveryUserProfile` - 用户画像构建
- `buildResumeIdentitySnapshot` - 简历身份快照
- `buildResumeNarrativeText` - 简历叙述文本
- `buildImportedResumeSnippet` - 导入简历片段
- `buildAiDeliveryJudgePrompt` - AI判定Prompt构建
- `buildAiDeliveryFilterJobInput` - 职位过滤输入构建
- `buildAiDeliveryJobBaseInfoText` - 职位基础信息文本
- `buildAiDeliveryJobExtInfoText` - 职位扩展信息文本
- `buildAiDeliveryUserProfileText` - 用户画像文本
- `buildCandidateEvidenceText` - 候选人证据文本
- `buildJobDescriptionEvidenceText` - 职位描述证据文本
- `buildProfileCompleteness` - 画像完整性构建
- `buildTraditionalRuleSnapshotText` - 传统规则快照文本
- `formatResumeIdentityText` - 简历身份格式化
- `normalizeKeywordList` - 关键词列表规范化

**测试策略**:
- 所有函数都是纯函数，无需 mock
- 每个函数至少 3-5 个测试用例
- 测试场景：正常输入、空值、undefined、null、边界条件、类型转换

**现有测试**: 仅 4 个测试用例，只覆盖 `resolveAiDeliveryFallback`

---

### 2. errors/index.ts (60行，当前覆盖率 46.66%)

**预期提升**: +1% 覆盖率  
**工作量**: 0.5天  
**难度**: 低

**需要测试的错误类**:
- `PushLimitError` - 投递限制错误
- `PushStopError` - 投递停止错误
- `NotMatchError` - 不匹配错误
- `ManualVerificationError` - 手动验证错误
- `NetworkError` - 网络错误
- `AuthError` - 认证错误

**测试策略**:
- 测试错误类实例化
- 测试错误消息
- 测试错误继承关系
- 测试错误属性

---

### 3. tampermonkey.ts (99行，当前覆盖率 60.31%)

**预期提升**: +2% 覆盖率  
**工作量**: 1天  
**难度**: 低（已有 GM mock）

**需要测试的函数**:
- `GM_getValue` 封装
- `GM_setValue` 封装
- `GM_deleteValue` 封装
- `GM_listValues` 封装
- `GM_notification` 封装
- `GM_xmlhttpRequest` 封装

**测试策略**:
- 使用 test-setup.ts 中的 GM mock
- 测试正常调用
- 测试错误处理
- 测试默认值

---

### 4. tools.ts 纯函数部分 (约400行，当前覆盖率 22.17%)

**预期提升**: +4% 覆盖率  
**工作量**: 1-2天  
**难度**: 低

**需要测试的纯函数**:
- `fuzzyMatch` - 模糊匹配
- `isRangeOverlap` - 范围重叠判断
- `parseURL` - URL 解析
- `resolvePromptVariables` - Prompt 变量解析
- `buildModelChannelKey` - 模型通道键构建
- `formatSalary` - 薪资格式化
- `parseSalaryRange` - 薪资范围解析

**测试策略**:
- 纯函数，无需 mock
- 测试各种输入组合
- 测试边界条件
- 测试错误输入

---

## 第二优先级：中等难度模块（预期 +15-20% 覆盖率）

### 5. request.ts (189行，当前覆盖率 24.12%)

**预期提升**: +3% 覆盖率  
**工作量**: 1天  
**难度**: 中（需要 HTTP mock）

**需要测试的功能**:
- Axios 拦截器
- 请求重试逻辑
- 错误处理
- 超时处理
- 请求取消

**测试策略**:
- 使用 vi.mock('axios')
- Mock HTTP 请求和响应
- 测试各种错误场景

---

### 6. auth.ts (310行，当前覆盖率 4.58%)

**预期提升**: +5% 覆盖率  
**工作量**: 2天  
**难度**: 中（需要 API mock）

**需要测试的功能**:
- 登录流程
- Token 管理
- 认证状态检查
- 登出流程
- Token 刷新

**测试策略**:
- Mock HTTP 请求
- Mock localStorage
- 测试完整认证流程

---

### 7. tools.ts 副作用部分 (约300行)

**预期提升**: +3% 覆盖率  
**工作量**: 1天  
**难度**: 中（需要 storage mock）

**需要测试的函数**:
- `getAiConfigExt` - 读取 AI 配置
- `saveAiConfigExt` - 保存 AI 配置
- `getStoredUserProfileRaw` - 读取用户画像
- `getCurrentHostname` - 获取当前主机名

**测试策略**:
- Mock GM storage
- Mock localStorage
- Mock window.location

---

### 8. push-engine.ts (690行，当前覆盖率 13.2%)

**预期提升**: +5% 覆盖率  
**工作量**: 2-3天  
**难度**: 中（状态机逻辑）

**需要测试的功能**:
- 投递引擎状态机
- 投递流程控制
- 错误处理
- 日志记录
- 结果统计

**测试策略**:
- Mock 平台适配器
- Mock 日志记录器
- 测试完整状态转换
- 测试各种错误场景

---

## 第三优先级：高难度模块（预期 +20-30% 覆盖率）

### 9. boss-platform.ts (2013行，当前覆盖率 14.35%)

**预期提升**: +15% 覆盖率  
**工作量**: 3-5天  
**难度**: 高（大量 DOM 操作）

**建议**: 优先使用 E2E 测试覆盖，而非单元测试

---

### 10. Vue 组件 (8000+行，当前覆盖率 0%)

**预期提升**: +15% 覆盖率  
**工作量**: 5-7天  
**难度**: 高

**建议**: 修复 E2E 测试环境后执行 E2E 测试

---

## 实施计划

### 第一周
- [ ] `ai-delivery.ts` 完整测试
- [ ] `errors/index.ts` 完整测试
- [ ] `tampermonkey.ts` 完整测试

**预期覆盖率**: 8.74% → 20-22%

### 第二周
- [ ] `tools.ts` 纯函数部分测试
- [ ] `request.ts` 完整测试
- [ ] `auth.ts` 完整测试

**预期覆盖率**: 20-22% → 35-40%

### 第三周
- [ ] `tools.ts` 副作用部分测试
- [ ] `push-engine.ts` 完整测试
- [ ] 修复 E2E 测试环境

**预期覆盖率**: 35-40% → 45-50%

### 第四周
- [ ] 执行 E2E 测试
- [ ] 补充遗漏的测试
- [ ] 优化测试覆盖率

**预期覆盖率**: 45-50% → 60-80%

---

## 测试编写规范

### 文件命名
- 测试文件与源文件同名，后缀 `.test.ts`
- 例如：`ai-delivery.ts` → `ai-delivery.test.ts`

### 测试结构
```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '@/path/to/module';

describe('functionName', () => {
  it('should handle normal input', () => {
    // 正常场景测试
  });

  it('should handle empty input', () => {
    // 空值测试
  });

  it('should handle edge cases', () => {
    // 边界条件测试
  });

  it('should handle errors', () => {
    // 错误处理测试
  });
});
```

### Mock 模式
```typescript
// 使用 vi.hoisted 提升 mock
const mocks = vi.hoisted(() => ({
  mockFunction: vi.fn()
}));

vi.mock('@/module', () => ({
  function: mocks.mockFunction
}));
```

---

## 验证标准

每个模块测试完成后需要：
1. ✅ 所有测试用例通过
2. ✅ 模块覆盖率达到 90%+
3. ✅ 无 TypeScript 错误
4. ✅ 无 ESLint 警告

---

**创建时间**: 2026-03-09  
**预期完成时间**: 4周  
**预期覆盖率提升**: 8.74% → 60-80%
