# E2E 测试环境修复说明

## 修复内容

已修复 Windows 环境下 Playwright E2E 测试的配置问题。

### 修改的文件

1. **playwright.config.ts**
   - 增加超时时间：120秒 → 180秒
   - 修改 `reuseExistingServer`: `true` → `!process.env.CI`
   - 添加输出捕获：`stdout: 'pipe'`, `stderr: 'pipe'`
   - 修改检测 URL：`http://127.0.0.1:4173` → `http://127.0.0.1:4173/preview.html`

2. **playwright.manual.config.ts** (新增)
   - 手动模式配置文件
   - 不包含 webServer 配置
   - 适用于手动启动服务器的场景

3. **package.json**
   - 安装 `wait-on` 依赖
   - 新增脚本：`test:e2e:manual`

---

## 使用方法

### 方案 1：自动启动服务器（推荐用于 CI）

```bash
npm run test:e2e
```

**说明**：
- Playwright 会自动启动 preview server
- 等待服务器就绪后执行测试
- 测试完成后自动关闭服务器

**注意**：
- 确保端口 4173 未被占用
- 如果超时，请使用方案 2

---

### 方案 2：手动启动服务器（推荐用于本地开发）

```bash
# 终端 1: 启动 preview server
npm run preview:test

# 终端 2: 运行 E2E 测试
npm run test:e2e:manual
```

**说明**：
- 手动启动服务器，保持运行
- 使用 `wait-on` 等待服务器就绪
- 可以多次运行测试而无需重启服务器

**优点**：
- 更快的测试迭代速度
- 更好的调试体验
- 避免 webServer 配置问题

---

## 测试结果

### 测试执行状态
✅ **环境配置成功** - 测试可以正常启动和执行

### 测试统计
- **总测试用例**: 49 个
- **测试文件**: 5 个
- **浏览器**: Chromium
- **并行 Workers**: 19

### 测试文件列表
1. `e2e/account.spec.ts` - 账户组件测试
2. `e2e/aijob.spec.ts` - AI 投递测试
3. `e2e/panel-mount.spec.ts` - 面板挂载测试
4. `e2e/panel-tabs.spec.ts` - 面板标签页测试
5. `e2e/preference.spec.ts` - 偏好设置测试

---

## 常见问题

### Q1: 端口 4173 被占用怎么办？

**Windows**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :4173

# 终止进程（替换 PID）
taskkill //F //PID <PID>
```

**Linux/Mac**:
```bash
# 查找占用端口的进程
lsof -i :4173

# 终止进程
kill -9 <PID>
```

---

### Q2: 测试超时怎么办？

1. 检查服务器是否正常启动：
   ```bash
   curl http://127.0.0.1:4173/preview.html
   ```

2. 增加超时时间（playwright.config.ts）：
   ```typescript
   webServer: {
     timeout: 300 * 1000, // 5 分钟
   }
   ```

3. 使用手动模式（方案 2）

---

### Q3: 部分测试失败怎么办？

测试失败可能是以下原因：
1. **测试代码问题** - 需要修复测试用例
2. **页面元素变化** - 需要更新选择器
3. **时序问题** - 需要添加等待逻辑

查看详细错误信息：
```bash
npm run test:e2e:ui
```

---

## 下一步

### 修复失败的测试用例
根据测试报告，部分测试用例失败。需要：
1. 查看失败原因
2. 修复测试代码或页面代码
3. 重新运行测试验证

### CI/CD 集成
在 GitHub Actions 中使用：
```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

---

**修复时间**: 2026-03-09  
**测试框架**: Playwright 1.58.2  
**Node 版本**: v20.x
