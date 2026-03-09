# 测试脚本

本目录包含测试环境的安装和配置脚本。

## 脚本说明

### install-playwright-browsers.cmd
**用途**: 安装Playwright浏览器

**使用方法**:
```bash
scripts\install-playwright-browsers.cmd
```

**功能**:
- 检查Node.js和npm
- 验证@playwright/test是否已安装
- 安装Chromium浏览器

---

### setup-playwright-python.cmd
**用途**: 创建Python虚拟环境并安装Python版本的Playwright（备选）

**使用方法**:
```bash
scripts\setup-playwright-python.cmd
```

**功能**:
- 检查Python版本
- 创建Python虚拟环境
- 安装playwright和pytest-playwright
- 安装Chromium浏览器

---

### test-playwright-python.py
**用途**: Python版本的Playwright测试示例脚本

**使用方法**:
```bash
# 1. 激活虚拟环境
venv\Scripts\activate

# 2. 确保preview服务器正在运行
npm run preview:test

# 3. 运行测试脚本
python scripts\test-playwright-python.py
```

**功能**:
- 测试面板挂载和Tab切换
- 测试AiJob组件交互
- 自动截图保存到screenshots/目录

---

## 推荐工作流程

### 首次设置

```bash
# 安装Playwright浏览器
scripts\install-playwright-browsers.cmd
```

### 运行测试

```bash
# 运行单元测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行E2E测试（需要先启动preview server）
# 终端1:
npm run preview:test

# 终端2:
npm run test:e2e
```

---

## 故障排查

### 问题: 浏览器下载失败

**解决方案**:
1. 检查网络连接
2. 使用代理: `set HTTPS_PROXY=http://proxy:port`
3. 手动下载: `npx playwright install chromium --with-deps`

### 问题: Python虚拟环境激活失败

**解决方案**:
```bash
# Windows PowerShell
venv\Scripts\Activate.ps1

# Windows CMD
venv\Scripts\activate.bat

# Git Bash
source venv/Scripts/activate
```

---

## 相关文档

- [测试覆盖率报告](../docs/test-coverage-final-report.md)
- [测试问题清单](../docs/test-issues.md)

---

**更新时间**: 2026-03-09
