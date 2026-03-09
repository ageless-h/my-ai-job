import { test, expect } from '@playwright/test';

test.describe('Preference Component', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到包含Preference组件的页面
    // 注意：实际URL需要根据项目配置调整
    await page.goto('/');
  });

  test('应该能够切换启用规则开关', async ({ page }) => {
    const enableRulesSwitch = page.locator('[data-testid="enable-rules-switch"]');
    
    // 验证开关存在
    await expect(enableRulesSwitch).toBeVisible();
    
    // 获取初始状态
    const initialState = await enableRulesSwitch.getAttribute('aria-checked');
    
    // 点击切换开关
    await enableRulesSwitch.click();
    
    // 验证状态改变
    const newState = await enableRulesSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });

  test('应该能够输入薪资过滤条件', async ({ page }) => {
    const salaryInput = page.locator('[data-testid="salary-filter-switch"]');
    
    // 验证输入框存在
    await expect(salaryInput).toBeVisible();
    
    // 输入薪资范围
    await salaryInput.fill('15-30');
    
    // 验证输入值
    const value = await salaryInput.inputValue();
    expect(value).toBe('15-30');
  });

  test('应该能够输入公司规模过滤条件', async ({ page }) => {
    const companyScaleInput = page.locator('[data-testid="company-scale-filter"]');
    
    // 验证输入框存在
    await expect(companyScaleInput).toBeVisible();
    
    // 输入公司规模
    await companyScaleInput.fill('100-9999');
    
    // 验证输入值
    const value = await companyScaleInput.inputValue();
    expect(value).toBe('100-9999');
  });

  test('应该能够输入关键词过滤条件', async ({ page }) => {
    const keywordInput = page.locator('[data-testid="keyword-input"]');
    
    // 验证输入框存在
    await expect(keywordInput).toBeVisible();
    
    // 点击输入框激活
    await keywordInput.click();
    
    // 输入关键词
    await page.keyboard.type('BAT');
    
    // 按回车添加
    await page.keyboard.press('Enter');
    
    // 验证关键词被添加（通过检查是否有标签元素）
    const tags = page.locator('[data-testid="keyword-input"] .el-tag');
    await expect(tags).toHaveCount(1);
  });

  test('应该能够点击保存按钮', async ({ page }) => {
    const saveButton = page.locator('[data-testid="save-preference-button"]');
    
    // 验证保存按钮存在
    await expect(saveButton).toBeVisible();
    
    // 验证按钮文本
    await expect(saveButton).toContainText('保存传统投递偏好');
    
    // 验证按钮可点击
    await expect(saveButton).toBeEnabled();
  });

  test('应该能够同时修改多个过滤条件', async ({ page }) => {
    // 修改薪资
    const salaryInput = page.locator('[data-testid="salary-filter-switch"]');
    await salaryInput.fill('20-40');
    
    // 修改公司规模
    const companyScaleInput = page.locator('[data-testid="company-scale-filter"]');
    await companyScaleInput.fill('500-5000');
    
    // 验证两个输入框的值
    expect(await salaryInput.inputValue()).toBe('20-40');
    expect(await companyScaleInput.inputValue()).toBe('500-5000');
  });

  test('应该能够清空输入框', async ({ page }) => {
    const salaryInput = page.locator('[data-testid="salary-filter-switch"]');
    
    // 输入值
    await salaryInput.fill('15-30');
    expect(await salaryInput.inputValue()).toBe('15-30');
    
    // 清空值
    await salaryInput.clear();
    expect(await salaryInput.inputValue()).toBe('');
  });

  test('应该能够验证保存按钮的样式', async ({ page }) => {
    const saveButton = page.locator('[data-testid="save-preference-button"]');
    
    // 验证按钮类名
    const classes = await saveButton.getAttribute('class');
    expect(classes).toContain('save-btn');
    
    // 验证按钮类型
    const type = await saveButton.getAttribute('type');
    expect(type).toBe('primary');
  });

  test('应该能够验证所有必需的测试ID存在', async ({ page }) => {
    const testIds = [
      'enable-rules-switch',
      'salary-filter-switch',
      'company-scale-filter',
      'keyword-input',
      'save-preference-button'
    ];
    
    for (const testId of testIds) {
      const element = page.locator(`[data-testid="${testId}"]`);
      await expect(element).toBeVisible();
    }
  });
});
