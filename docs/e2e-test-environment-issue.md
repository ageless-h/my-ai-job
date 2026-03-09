# E2E 测试环境配置问题

## 问题描述

项目已编写 32 个 E2E 测试用例（Playwright），但因 Windows 环境配置问题无法执行。

## 当前状态

### 已完成
- ✅ 5 个 E2E 测试文件已编写
- ✅ 32 个测试用例覆盖核心用户流程
- ✅ Playwright 配置文件已创建
- ✅ Chromium 浏览器已安装

### 测试文件列表
| 测试文件 | 测试用例数 | 覆盖功能 |
|----------|-----------|----------|
| `e2e/panel-mount.spec.ts` | 5 | 面板挂载、FAB 切换、最小化、调整大小 |
| `e2e/panel-tabs.spec.ts` | 6 | 7个标签页切换、持久化 |
| `e2e/aijob.spec.ts` | 11 | 统计数据、设置、开关、按钮 |
| `e2e/preference.spec.ts` | 5 | 表单输入、过滤器、保存功能 |
| `e2e/account.spec.ts` | 5 | 账户信息、简历导入、配置导入导出 |
| **总计** | **32** | **核心用户流程** |

---

## 问题详情

### 错误现象
Windows 环境下 Playwright webServer 配置存在问题：
- `npm run preview:test` 命令在 webServer 中超时
- 需要手动启动 preview server 后执行测试

### 相关配置

**playwright.config.ts**:
```typescript
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run preview:test',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
});
```

**package.json**:
```json
{
  "scripts": {
    "preview:test": "vite --config vite.preview.config.ts --host 127.0.0.1 --port 4173"
  }
}
```

---

## 临时解决方案

### 手动执行方法
```bash
# 终端 1: 启动 preview server
npm run preview:test

# 终端 2: 运行 E2E 测试
npm run test:e2e
```

这种方式可以成功运行测试，但不够自动化。

---

## 可能的原因

1. **Windows 路径问题**: Windows 下路径分隔符可能导致命令执行失败
2. **进程管理问题**: Windows 下子进程管理与 Unix 系统不同
3. **超时配置不足**: 120秒可能不够 Vite 启动完成
4. **端口占用检测**: webServer 可能无法正确检测端口是否就绪

---

## 建议解决方案

### 方案 1: 调整 webServer 配置

```typescript
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run preview:test',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 增加到 3 分钟
    stdout: 'pipe', // 捕获输出以便调试
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
});
```

### 方案 2: 使用 cross-env 确保跨平台兼容

```bash
npm install --save-dev cross-env
```

```json
{
  "scripts": {
    "preview:test": "cross-env NODE_ENV=test vite --config vite.preview.config.ts --host 127.0.0.1 --port 4173"
  }
}
```

### 方案 3: 使用 wait-on 等待服务器就绪

```bash
npm install --save-dev wait-on
```

```json
{
  "scripts": {
    "preview:test": "vite --config vite.preview.config.ts --host 127.0.0.1 --port 4173",
    "test:e2e": "wait-on http://127.0.0.1:4173 && playwright test"
  }
}
```

### 方案 4: 使用 start-server-and-test

```bash
npm install --save-dev start-server-and-test
```

```json
{
  "scripts": {
    "preview:test": "vite --config vite.preview.config.ts --host 127.0.0.1 --port 4173",
    "test:e2e": "start-server-and-test preview:test http://127.0.0.1:4173 'playwright test'"
  }
}
```

---

## 验证步骤

1. 应用上述某个解决方案
2. 运行 `npm run test:e2e`
3. 确认 webServer 自动启动
4. 确认 32 个测试用例全部执行
5. 生成测试报告

---

## 预期影响

修复此问题后：
- E2E 测试可以自动化执行
- CI/CD 流程可以集成 E2E 测试
- 测试覆盖率报告将包含 E2E 测试结果
- Vue 组件的功能测试得到验证

---

## 优先级

**高优先级** - 此问题阻碍了 32 个已编写的 E2E 测试用例的执行，影响了测试覆盖率的完整性。

---

**报告时间**: 2026-03-09  
**影响范围**: E2E 测试执行  
**相关文件**: `playwright.config.ts`, `package.json`
