# 文档索引

本目录包含项目的所有文档，按类别组织。

## 📁 目录结构

```
docs/
├── README.md                          # 本文件
├── refactoring/                       # 重构相关文档
│   ├── REFACTORING-REPORT.md         # 架构重构详细报告
│   └── FUTURE-REFACTORING-PLAN.md    # 未来重构计划 (P0-5 到 P0-8)
├── testing/                           # 测试相关文档
│   ├── TEST-REPORT.md                # 测试结果报告
│   ├── TESTING-GUIDE.md              # 真实环境测试指南
│   └── UI-FIX-TEST-GUIDE.md          # UI 修复测试指南
├── plans/                             # 计划和方案
│   └── ...                           # 历史计划文档
├── architecture-review.md             # 架构评审文档
├── ai-delivery-regression-checklist.md # AI 投递回归检查清单
├── security-ban-risk-analysis.md      # 安全封禁风险分析
├── 无效会话清理逻辑与参数汇报.md       # 会话清理策略与参数档位
├── 链接.md                             # 供应商邀请链接清单
├── terminology.md                     # 术语表
└── test-coverage-completion-report.md # 测试覆盖率完成报告
```

## 📚 文档分类

### 重构文档 (refactoring/)

#### REFACTORING-REPORT.md

**架构重构详细报告**

记录了 2026-03-11 完成的架构重构工作：

- Phase 1: 测试基础设施移除
- Phase 2: 前端 UI 优化
- Phase 3: 架构重构 (P0-P2 任务)
- Phase 4: 测试和部署

**关键成果**:

- tools.ts 减少 77%
- 架构评分从 6.5/10 提升到 8/10
- 移除所有 @ts-nocheck
- 创建 5 个专用模块

#### FUTURE-REFACTORING-PLAN.md

**未来重构计划 (P0-5 到 P0-8)**

详细分析了被推迟的高风险重构任务：

- P0-5: 提取职位匹配引擎
- P0-6: 提取投递引擎
- P0-7: 重构 BossPlatform 为协调器
- P0-8: 验证 Boss Platform 重构

包含收益分析、难度评估、风险评估和执行路径。

**决策**: 推迟执行，等待前置条件（单元测试覆盖率 60%+）

### 测试文档 (testing/)

#### TEST-REPORT.md

**测试结果报告**

记录了 2026-03-11 的真实环境测试结果：

- ✅ 所有功能测试通过
- ✅ 性能表现良好
- ✅ 无错误和异常
- ✅ 架构重构验证成功

**结论**: 可以安全部署到生产环境

#### TESTING-GUIDE.md

**真实环境测试指南**

详细的测试步骤和检查点：

- 基础功能测试
- 职位投递和收藏测试
- AI 判断和过滤测试
- 性能测试
- 错误监控

包含测试报告模板和回滚方案。

#### UI-FIX-TEST-GUIDE.md

**UI 修复测试指南**

记录了 Phase 2 的 UI 修复工作：

- 修复 13 个关键 UI 问题
- 涉及 7 个 Vue 组件
- 测试步骤和验证方法

### 架构文档

#### architecture-review.md

**架构评审文档**

项目架构的全面评审：

- 文件结构分析
- 依赖关系分析
- 架构问题识别
- 改进建议

#### terminology.md

**术语表**

项目中使用的术语和概念定义：

- 业务术语
- 技术术语
- 缩写说明

### 安全文档

#### security-ban-risk-analysis.md

**安全封禁风险分析**

分析使用自动化脚本的风险：

- 封禁风险评估
- 安全措施建议
- 最佳实践

#### 无效会话清理逻辑与参数汇报.md

**无效会话清理策略与参数汇报**

覆盖会话清理功能的调用链、节奏参数、风险边界与参数档位：

- 高吞吐安全档（2 小时窗口）
- 风控即停与重试边界
- 扫描分层与预算闸门

### 运营与链接文档

#### 链接.md

**模型供应商邀请链接清单**

维护可替换的供应商注册链接：

- 邀请链接来源记录
- 便于同步到模型目录配置
- 后续替换为个人专属链接

### 测试覆盖文档

#### test-coverage-completion-report.md

**测试覆盖率完成报告**

测试覆盖率的历史记录和改进计划。

#### ai-delivery-regression-checklist.md

**AI 投递回归检查清单**

AI 投递功能的回归测试清单。

## 🔍 快速查找

### 我想了解...

**架构重构的成果**
→ 查看 `refactoring/REFACTORING-REPORT.md`

**未来的重构计划**
→ 查看 `refactoring/FUTURE-REFACTORING-PLAN.md`

**测试结果**
→ 查看 `testing/TEST-REPORT.md`

**如何测试**
→ 查看 `testing/TESTING-GUIDE.md`

**UI 修复的内容**
→ 查看 `testing/UI-FIX-TEST-GUIDE.md`

**项目架构**
→ 查看 `architecture-review.md`

**术语定义**
→ 查看 `terminology.md`

**安全风险**
→ 查看 `security-ban-risk-analysis.md`

**会话清理参数与风控策略**
→ 查看 `无效会话清理逻辑与参数汇报.md`

**供应商邀请链接清单**
→ 查看 `链接.md`

## 📝 文档维护

### 添加新文档

1. 确定文档类别（重构/测试/架构/安全等）
2. 放入对应的目录
3. 更新本 README.md 的索引
4. 在 Git commit 中说明

### 文档命名规范

- 使用大写字母和连字符：`MY-DOCUMENT.md`
- 使用描述性名称
- 避免使用日期（Git 历史已记录）

### 文档格式规范

- 使用 Markdown 格式
- 包含清晰的标题层级
- 添加目录（如果文档较长）
- 使用表格、列表等提高可读性
- 添加代码示例（如果需要）

## 🔄 最近更新

**2026-03-11**:

- ✅ 创建 `refactoring/` 目录
- ✅ 创建 `testing/` 目录
- ✅ 移动重构相关文档到 `refactoring/`
- ✅ 移动测试相关文档到 `testing/`
- ✅ 创建 `FUTURE-REFACTORING-PLAN.md`
- ✅ 更新本 README.md

**2026-03-15**:

- ✅ 新增 `无效会话清理逻辑与参数汇报.md`
- ✅ 新增 `链接.md`
- ✅ 补充会话清理与链接文档索引入口

## 📧 联系方式

如有文档相关问题，请在 GitHub 提交 Issue:
https://github.com/ageless-h/my-ai-job/issues
