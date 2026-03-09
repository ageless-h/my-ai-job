import { test, expect } from '@playwright/test';

test.describe('Panel - 面板挂载和FAB交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview.html');
    await page.waitForLoadState('networkidle');
  });

  test('应该成功挂载面板到页面', async ({ page }) => {
    // 验证面板容器存在
    const panel = page.getByTestId('panel-container');
    await expect(panel).toBeAttached();
    
    // 验证FAB按钮存在
    const fab = page.getByTestId('fab-button');
    await expect(fab).toBeVisible();
  });

  test('FAB按钮应该可以展开和收起面板', async ({ page }) => {
    const fab = page.getByTestId('fab-button');
    const panel = page.getByTestId('panel-container');
    
    // 初始状态：面板应该是收起的
    await expect(panel).toHaveClass(/collapsed/);
    
    // 点击FAB展开面板
    await fab.click();
    await page.waitForTimeout(500); // 等待动画完成
    await expect(panel).not.toHaveClass(/collapsed/);
    
    // 再次点击FAB收起面板
    await fab.click();
    await page.waitForTimeout(500);
    await expect(panel).toHaveClass(/collapsed/);
  });

  test('面板收起按钮应该可以收起面板', async ({ page }) => {
    const fab = page.getByTestId('fab-button');
    const panel = page.getByTestId('panel-container');
    const minimizeBtn = page.getByTestId('panel-minimize');
    
    // 先展开面板
    await fab.click();
    await page.waitForTimeout(500);
    await expect(panel).not.toHaveClass(/collapsed/);
    
    // 点击收起按钮
    await minimizeBtn.click();
    await page.waitForTimeout(500);
    await expect(panel).toHaveClass(/collapsed/);
  });

  test('面板宽度应该可以调整', async ({ page }) => {
    const fab = page.getByTestId('fab-button');
    const panel = page.getByTestId('panel-container');
    const resizeHandle = page.getByTestId('panel-resize-handle');
    
    // 展开面板
    await fab.click();
    await page.waitForTimeout(500);
    
    // 获取初始宽度
    const initialBox = await panel.boundingBox();
    const initialWidth = initialBox?.width || 0;
    
    // 拖动调整手柄
    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x - 100, initialBox!.y + 100);
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    // 验证宽度已改变
    const newBox = await panel.boundingBox();
    const newWidth = newBox?.width || 0;
    expect(Math.abs(newWidth - initialWidth)).toBeGreaterThan(50);
  });

  test('面板状态应该持久化到localStorage', async ({ page }) => {
    const fab = page.getByTestId('fab-button');
    
    // 展开面板
    await fab.click();
    await page.waitForTimeout(500);
    
    // 检查localStorage
    const collapsed = await page.evaluate(() => {
      return localStorage.getItem('ai-job-panel-collapsed');
    });
    expect(collapsed).toBe('false');
    
    // 收起面板
    await fab.click();
    await page.waitForTimeout(500);
    
    const collapsedAgain = await page.evaluate(() => {
      return localStorage.getItem('ai-job-panel-collapsed');
    });
    expect(collapsedAgain).toBe('true');
  });
});
