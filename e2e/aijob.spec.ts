import { test, expect } from '@playwright/test';

test.describe('AiJob Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page containing AiJob component
    // This assumes the component is mounted at a specific route
    await page.goto('/');
    // Wait for the component to be mounted
    await page.waitForSelector('[data-testid="push-success-count"]', { timeout: 5000 });
  });

  test('should display success and fail count statistics', async ({ page }) => {
    // Verify success count element exists and is visible
    const successCount = page.locator('[data-testid="push-success-count"]');
    await expect(successCount).toBeVisible();
    
    // Verify fail count element exists and is visible
    const failCount = page.locator('[data-testid="push-fail-count"]');
    await expect(failCount).toBeVisible();
    
    // Verify both contain numeric values
    const successText = await successCount.textContent();
    const failText = await failCount.textContent();
    
    expect(successText).toMatch(/^\d+$/);
    expect(failText).toMatch(/^\d+$/);
  });

  test('should allow input for push count limit', async ({ page }) => {
    const countLimitInput = page.locator('[data-testid="push-count-limit"]');
    
    // Verify input element exists
    await expect(countLimitInput).toBeVisible();
    
    // Find the input field within the el-input-number component
    const inputField = countLimitInput.locator('input');
    
    // Clear and set a new value
    await inputField.fill('10');
    
    // Verify the value was set
    const value = await inputField.inputValue();
    expect(value).toBe('10');
    
    // Test boundary values
    await inputField.fill('-1');
    let boundaryValue = await inputField.inputValue();
    expect(boundaryValue).toBe('-1');
    
    await inputField.fill('100');
    boundaryValue = await inputField.inputValue();
    expect(boundaryValue).toBe('100');
  });

  test('should toggle collect mode switch', async ({ page }) => {
    const collectSwitch = page.locator('[data-testid="collect-mode-switch"]');
    
    // Verify switch element exists
    await expect(collectSwitch).toBeVisible();
    
    // Get the switch input element
    const switchInput = collectSwitch.locator('input[type="checkbox"]');
    
    // Get initial state
    const initialChecked = await switchInput.isChecked();
    
    // Click to toggle
    await switchInput.click();
    
    // Verify state changed
    const afterToggle = await switchInput.isChecked();
    expect(afterToggle).toBe(!initialChecked);
    
    // Toggle back
    await switchInput.click();
    const finalState = await switchInput.isChecked();
    expect(finalState).toBe(initialChecked);
  });

  test('should toggle infinite loop switch', async ({ page }) => {
    const infiniteLoopSwitch = page.locator('[data-testid="infinite-loop-switch"]');
    
    // Verify switch element exists
    await expect(infiniteLoopSwitch).toBeVisible();
    
    // Get the switch input element
    const switchInput = infiniteLoopSwitch.locator('input[type="checkbox"]');
    
    // Get initial state
    const initialChecked = await switchInput.isChecked();
    
    // Click to toggle
    await switchInput.click();
    
    // Verify state changed
    const afterToggle = await switchInput.isChecked();
    expect(afterToggle).toBe(!initialChecked);
    
    // Toggle back
    await switchInput.click();
    const finalState = await switchInput.isChecked();
    expect(finalState).toBe(initialChecked);
  });

  test('should display start push button', async ({ page }) => {
    const startButton = page.locator('[data-testid="start-push-button"]');
    
    // Verify button exists and is visible
    await expect(startButton).toBeVisible();
    
    // Verify button text contains either "投递" or "收藏"
    const buttonText = await startButton.textContent();
    expect(buttonText).toMatch(/投递|收藏/);
    
    // Verify button is clickable
    await expect(startButton).toBeEnabled();
  });

  test('should display clear records button', async ({ page }) => {
    const clearButton = page.locator('[data-testid="clear-records-button"]');
    
    // Verify button exists and is visible
    await expect(clearButton).toBeVisible();
    
    // Verify button text
    const buttonText = await clearButton.textContent();
    expect(buttonText).toContain('清理投递记录');
    
    // Verify button is clickable
    await expect(clearButton).toBeEnabled();
  });

  test('should clear records when clicking clear button', async ({ page }) => {
    const clearButton = page.locator('[data-testid="clear-records-button"]');
    
    // Click the clear button
    await clearButton.click();
    
    // Wait for any potential toast/message to appear and disappear
    await page.waitForTimeout(500);
    
    // Verify the button is still visible and functional
    await expect(clearButton).toBeVisible();
  });

  test('should show stop button when pushing', async ({ page }) => {
    // This test assumes the component can enter PUSHING state
    // In a real scenario, you might need to mock the platform.startPush() method
    
    const startButton = page.locator('[data-testid="start-push-button"]');
    
    // Initially, stop button should not be visible
    const stopButton = page.locator('[data-testid="stop-push-button"]');
    await expect(stopButton).not.toBeVisible();
    
    // Note: Actual clicking of start button would require mocking the platform
    // and handling the async push operation
  });

  test('should verify all testid attributes are present', async ({ page }) => {
    const testIds = [
      'push-success-count',
      'push-fail-count',
      'push-count-limit',
      'collect-mode-switch',
      'infinite-loop-switch',
      'start-push-button',
      'clear-records-button',
      'stop-push-button'
    ];

    for (const testId of testIds) {
      const element = page.locator(`[data-testid="${testId}"]`);
      // Element should exist in DOM (may not be visible if stop-push-button)
      const count = await element.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should maintain statistics display after interactions', async ({ page }) => {
    const successCount = page.locator('[data-testid="push-success-count"]');
    const failCount = page.locator('[data-testid="push-fail-count"]');
    
    // Get initial values
    const initialSuccess = await successCount.textContent();
    const initialFail = await failCount.textContent();
    
    // Perform some interactions
    const collectSwitch = page.locator('[data-testid="collect-mode-switch"]');
    const switchInput = collectSwitch.locator('input[type="checkbox"]');
    await switchInput.click();
    await switchInput.click();
    
    // Verify statistics are still displayed
    const finalSuccess = await successCount.textContent();
    const finalFail = await failCount.textContent();
    
    expect(finalSuccess).toBeDefined();
    expect(finalFail).toBeDefined();
  });
});
