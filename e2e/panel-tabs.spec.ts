import { test, expect } from '@playwright/test';

test.describe('Panel - Tab切换功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview.html');
    await page.waitForLoadState('networkidle');
    
    // 展开面板
    const fab = page.getByTestId('fab-button');
    await fab.click();
    await page.waitForTimeout(500);
  });

  const tabs = [
    { name: '工作台', testId: 'tab-工作台' },
    { name: 'AI 配置', testId: 'tab-AI 配置' },
    { name: '投递判定', testId: 'tab-投递判定' },
    { name: '传统投递', testId: 'tab-传统投递' },
    { name: '对话通知', testId: 'tab-对话通知' },
    { name: '运行记录', testId: 'tab-运行记录' },
    { name: '账户', testId: 'tab-账户' }
  ];

  test('应该显示所有7个Tab按钮', async ({ page }) => {
    for (const tab of tabs) {
      const tabButton = page.getByTestId(tab.testId);
      await expect(tabButton).toBeVisible();
      await expect(tabButton).toContainText(tab.name);
    }
  });

  test('默认应该激活工作台Tab', async ({ page }) => {
    const workbenchTab = page.getByTestId('tab-工作台');
    await expect(workbenchTab).toHaveClass(/active/);
  });

  test('点击Tab应该切换到对应内容', async ({ page }) => {
    // 切换到AI配置Tab
    const aiConfigTab = page.getByTestId('tab-AI 配置');
    await aiConfigTab.click();
    await page.waitForTimeout(300);
    await expect(aiConfigTab).toHaveClass(/active/);
    
    // 验证内容已切换（检查AI配置特有的元素）
    await expect(page.getByText('提示词中心')).toBeVisible();
  });

  test('应该能够依次切换所有Tab', async ({ page }) => {
    for (const tab of tabs) {
      const tabButton = page.getByTestId(tab.testId);
      await tabButton.click();
      await page.waitForTimeout(300);
      
      // 验证Tab被激活
      await expect(tabButton).toHaveClass(/active/);
      
      // 截图记录每个Tab的状态
      await page.screenshot({ 
        path: `e2e/screenshots/tab-${tab.name}.png`,
        fullPage: false 
      });
    }
  });

  test('切换Tab后再次展开面板应该保持当前Tab', async ({ page }) => {
    // 切换到传统投递Tab
    const preferenceTab = page.getByTestId('tab-传统投递');
    await preferenceTab.click();
    await page.waitForTimeout(300);
    
    // 收起面板
    const minimizeBtn = page.getByTestId('panel-minimize');
    await minimizeBtn.click();
    await page.waitForTimeout(500);
    
    // 重新展开面板
    const fab = page.getByTestId('fab-button');
    await fab.click();
    await page.waitForTimeout(500);
    
    // 验证仍然在传统投递Tab
    await expect(preferenceTab).toHaveClass(/active/);
  });

  test('快速连续切换Tab不应该出错', async ({ page }) => {
    // 快速点击多个Tab
    for (let i = 0; i < 3; i++) {
      for (const tab of tabs.slice(0, 4)) {
        await page.getByTestId(tab.testId).click();
        await page.waitForTimeout(50); // 很短的延迟
      }
    }
    
    // 验证最后一个Tab被正确激活
    const lastTab = page.getByTestId(tabs[3].testId);
    await expect(lastTab).toHaveClass(/active/);
  });
});
