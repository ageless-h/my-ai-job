# 修复 E2E 测试用例失败问题

## 问题描述

E2E 测试环境已修复，但部分测试用例失败，原因是页面元素缺少 `data-testid` 属性。

## 失败的测试用例

### Account Component (e2e/account.spec.ts)

| 测试用例 | 缺少的 testid | 组件位置 |
|---------|--------------|---------|
| 应该能够点击导入简历按钮 | `import-resume-button` | Account.vue |
| 应该能够输入邮箱地址 | `email-input` | Account.vue |
| 应该能够输入手机号码 | `phone-input` | Account.vue |
| 应该能够点击导出配置按钮 | `export-config-button` | Account.vue |
| 应该能够点击导入配置按钮 | `import-config-button` | Account.vue |

---

## 解决方案

### 方案 1：添加 data-testid 属性（推荐）

在 Vue 组件中添加 `data-testid` 属性：

**src/features/account/components/Account.vue**:
```vue
<template>
  <!-- 手机号输入框 -->
  <el-input
    v-model="phone"
    data-testid="phone-input"
    placeholder="请输入手机号"
  />

  <!-- 邮箱输入框 -->
  <el-input
    v-model="email"
    data-testid="email-input"
    placeholder="请输入邮箱"
  />

  <!-- 导入简历按钮 -->
  <el-button
    data-testid="import-resume-button"
    @click="handleImportResume"
  >
    直接从 BOSS 导入
  </el-button>

  <!-- 导出配置按钮 -->
  <el-button
    data-testid="export-config-button"
    @click="handleExportConfig"
  >
    导出配置
  </el-button>

  <!-- 导入配置按钮 -->
  <el-button
    data-testid="import-config-button"
    @click="handleImportConfig"
  >
    导入配置
  </el-button>
</template>
```

---

### 方案 2：修改测试选择器

如果不想修改组件代码，可以修改测试用例使用其他选择器：

**e2e/account.spec.ts**:
```typescript
// 使用文本选择器
const importResumeButton = page.getByRole('button', { name: '直接从 BOSS 导入' });

// 使用 placeholder 选择器
const phoneInput = page.getByPlaceholder('请输入手机号');
const emailInput = page.getByPlaceholder('请输入邮箱');

// 使用 CSS 选择器
const exportButton = page.locator('button:has-text("导出配置")');
```

---

## 需要修复的组件

### 高优先级
1. 🔲 `src/features/account/components/Account.vue`
   - 添加 `phone-input`
   - 添加 `email-input`
   - 添加 `import-resume-button`
   - 添加 `export-config-button`
   - 添加 `import-config-button`

### 中优先级
2. 🔲 检查其他组件是否也缺少 testid
3. 🔲 建立 testid 命名规范
4. 🔲 更新测试编写指南

---

## 验证步骤

修复后需要验证：

```bash
# 1. 启动 preview server
npm run preview:test

# 2. 运行 E2E 测试
npm run test:e2e:manual

# 3. 验证所有测试通过
# 预期结果：49/49 测试通过
```

---

## testid 命名规范（建议）

### 命名格式
```
{component}-{element}-{type}
```

### 示例
- `account-phone-input` - 账户组件的手机号输入框
- `account-email-input` - 账户组件的邮箱输入框
- `account-import-resume-button` - 账户组件的导入简历按钮
- `panel-close-button` - 面板的关闭按钮
- `aijob-start-button` - AI投递的开始按钮

### 规则
1. 使用小写字母和连字符
2. 保持简洁但具有描述性
3. 避免使用动态值
4. 在整个项目中保持一致

---

## 预期影响

修复后：
- ✅ 所有 E2E 测试通过
- ✅ 测试覆盖率报告完整
- ✅ CI/CD 流程可以集成 E2E 测试
- ✅ 提高代码质量和可维护性

---

**创建时间**: 2026-03-09  
**优先级**: 高  
**预计工作量**: 1-2 小时
