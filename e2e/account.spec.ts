import { test, expect } from '@playwright/test';

test.describe('Account Component', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到包含Account组件的页面
    // 注意：实际URL需要根据项目配置调整
    await page.goto('/');
  });

  test('应该能够输入手机号码', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    
    // 验证输入框存在
    await expect(phoneInput).toBeVisible();
    
    // 输入手机号码
    await phoneInput.fill('13800138000');
    
    // 验证输入值
    const value = await phoneInput.inputValue();
    expect(value).toBe('13800138000');
  });

  test('应该能够输入邮箱地址', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 验证输入框存在
    await expect(emailInput).toBeVisible();
    
    // 输入邮箱
    await emailInput.fill('test@example.com');
    
    // 验证输入值
    const value = await emailInput.inputValue();
    expect(value).toBe('test@example.com');
  });

  test('应该能够点击导入简历按钮', async ({ page }) => {
    const importResumeButton = page.locator('[data-testid="import-resume-button"]');
    
    // 验证按钮存在
    await expect(importResumeButton).toBeVisible();
    
    // 验证按钮文本
    await expect(importResumeButton).toContainText('直接从 BOSS 导入');
    
    // 验证按钮可点击
    await expect(importResumeButton).toBeEnabled();
  });

  test('应该能够点击导出配置按钮', async ({ page }) => {
    const exportConfigButton = page.locator('[data-testid="export-config-button"]');
    
    // 验证按钮存在
    await expect(exportConfigButton).toBeVisible();
    
    // 验证按钮文本
    await expect(exportConfigButton).toContainText('导出所有配置文件');
    
    // 验证按钮可点击
    await expect(exportConfigButton).toBeEnabled();
  });

  test('应该能够点击导入配置按钮', async ({ page }) => {
    const importConfigButton = page.locator('[data-testid="import-config-button"]');
    
    // 验证按钮存在
    await expect(importConfigButton).toBeVisible();
    
    // 验证按钮文本
    await expect(importConfigButton).toContainText('导入外部设置');
    
    // 验证按钮可点击
    await expect(importConfigButton).toBeEnabled();
  });

  test('应该能够同时输入手机号和邮箱', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 输入手机号
    await phoneInput.fill('13800138000');
    
    // 输入邮箱
    await emailInput.fill('user@example.com');
    
    // 验证两个输入框的值
    expect(await phoneInput.inputValue()).toBe('13800138000');
    expect(await emailInput.inputValue()).toBe('user@example.com');
  });

  test('应该能够清空手机号输入框', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    
    // 输入值
    await phoneInput.fill('13800138000');
    expect(await phoneInput.inputValue()).toBe('13800138000');
    
    // 清空值
    await phoneInput.clear();
    expect(await phoneInput.inputValue()).toBe('');
  });

  test('应该能够清空邮箱输入框', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 输入值
    await emailInput.fill('test@example.com');
    expect(await emailInput.inputValue()).toBe('test@example.com');
    
    // 清空值
    await emailInput.clear();
    expect(await emailInput.inputValue()).toBe('');
  });

  test('应该能够验证导入简历按钮的样式', async ({ page }) => {
    const importResumeButton = page.locator('[data-testid="import-resume-button"]');
    
    // 验证按钮类型
    const type = await importResumeButton.getAttribute('type');
    expect(type).toBe('primary');
  });

  test('应该能够验证导出配置按钮的样式', async ({ page }) => {
    const exportConfigButton = page.locator('[data-testid="export-config-button"]');
    
    // 验证按钮类名
    const classes = await exportConfigButton.getAttribute('class');
    expect(classes).toContain('shadow-sm');
  });

  test('应该能够验证导入配置按钮的样式', async ({ page }) => {
    const importConfigButton = page.locator('[data-testid="import-config-button"]');
    
    // 验证按钮类名
    const classes = await importConfigButton.getAttribute('class');
    expect(classes).toContain('shadow-sm');
  });

  test('应该能够验证所有必需的测试ID存在', async ({ page }) => {
    const testIds = [
      'phone-input',
      'email-input',
      'import-resume-button',
      'export-config-button',
      'import-config-button'
    ];
    
    for (const testId of testIds) {
      const element = page.locator(`[data-testid="${testId}"]`);
      await expect(element).toBeVisible();
    }
  });

  test('应该能够验证手机号输入框的占位符', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    
    // 验证占位符
    const placeholder = await phoneInput.getAttribute('placeholder');
    expect(placeholder).toContain('异常通知短信提醒');
  });

  test('应该能够验证邮箱输入框的占位符', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 验证占位符
    const placeholder = await emailInput.getAttribute('placeholder');
    expect(placeholder).toContain('每日总结及高意向提醒');
  });

  test('应该能够验证配置按钮的布局', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-config-button"]');
    const importButton = page.locator('[data-testid="import-config-button"]');
    
    // 验证两个按钮都存在
    await expect(exportButton).toBeVisible();
    await expect(importButton).toBeVisible();
    
    // 验证按钮的相对位置（导出按钮应该在导入按钮之前）
    const exportBox = await exportButton.boundingBox();
    const importBox = await importButton.boundingBox();
    
    if (exportBox && importBox) {
      // 在同一行的情况下，导出按钮的x坐标应该小于导入按钮
      expect(exportBox.x).toBeLessThanOrEqual(importBox.x);
    }
  });

  test('应该能够验证手机号输入框的类型', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    
    // 验证输入框类型
    const type = await phoneInput.getAttribute('type');
    expect(type).toBe('text');
  });

  test('应该能够验证邮箱输入框的类型', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 验证输入框类型
    const type = await emailInput.getAttribute('type');
    expect(type).toBe('text');
  });

  test('应该能够输入特殊字符到手机号输入框', async ({ page }) => {
    const phoneInput = page.locator('[data-testid="phone-input"]');
    
    // 输入包含特殊字符的值
    await phoneInput.fill('+86-138-0013-8000');
    
    // 验证输入值
    const value = await phoneInput.inputValue();
    expect(value).toBe('+86-138-0013-8000');
  });

  test('应该能够输入特殊字符到邮箱输入框', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    
    // 输入包含特殊字符的邮箱
    await emailInput.fill('user+tag@example.co.uk');
    
    // 验证输入值
    const value = await emailInput.inputValue();
    expect(value).toBe('user+tag@example.co.uk');
  });
});
