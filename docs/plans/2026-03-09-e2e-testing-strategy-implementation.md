# Userscript E2E 测试分层落地 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为项目建立稳定的本地 preview + Playwright E2E + Vitest coverage 分层测试体系，避免依赖真实 BOSS 页面，并为 80% 自动化覆盖目标提供可执行路径。  
**Architecture:** 以 `preview.html` / `main.preview.ts` 作为主要浏览器测试入口；通过最小 `GM_*` shim、测试桥接 API 和稳定 `data-testid` 让 Playwright 在本地固定端口跑关键流程；额外补 1 条基于本地 fixture 的 dist userscript smoke；覆盖率数字继续由 Vitest 负责。  
**Tech Stack:** TypeScript, Vue 3, Pinia, Vite 6, vite-plugin-monkey, Vitest, Playwright

---

### Task 1: 修复 `dev:preview` 的 Windows UNC 启动问题

**Files:**
- Modify: `package.json`
- Create: `scripts/dev-preview.mjs`

**Step 1: 先复现当前失败行为**

Run: `npm run dev:preview`  
Expected: FAIL，并出现 `UNC paths are not supported` 或 `failed to load config from C:\Windows\vite.preview.config.ts`。

**Step 2: 新建基于 Vite Node API 的启动脚本**

```js
import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const server = await createServer({
  root,
  configFile: resolve(root, "vite.preview.config.ts"),
  server: {
    host: "127.0.0.1",
    port: 4173,
    open: "/preview.html"
  }
});

await server.listen();
server.printUrls();
```

**Step 3: 修改 `package.json` 的 `dev:preview`，通过绝对路径加载脚本**

```json
{
  "scripts": {
    "dev:preview": "node -e \"const { dirname, join } = require('node:path'); const { pathToFileURL } = require('node:url'); const root = dirname(process.env.npm_package_json); import(pathToFileURL(join(root, 'scripts/dev-preview.mjs')).href);\""
  }
}
```

**Step 4: 重新运行 preview 启动命令**

Run: `npm run dev:preview`  
Expected: PASS，终端打印 `127.0.0.1:4173`，浏览器可访问 `/preview.html`。

### Task 2: 搭建 Playwright 基础脚手架

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `playwright.config.ts`
- Create: `tests/e2e/helpers/preview.ts`

**Step 1: 安装 Playwright 依赖**

Run: `npm install -D @playwright/test`  
Expected: PASS，`package.json` 出现 `@playwright/test`。

**Step 2: 添加 E2E 脚本与忽略项**

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:dist": "npm run build && playwright test tests/e2e/userscript-dist.spec.ts"
  }
}
```

```gitignore
playwright-report/
test-results/
```

**Step 3: 创建 Playwright 配置，复用 preview 服务器**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev:preview",
    url: "http://127.0.0.1:4173/preview.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
```

**Step 4: 创建最小 preview helper**

```ts
import { Page } from "@playwright/test";

export async function openPreview(page: Page) {
  await page.goto("/preview.html");
}
```

**Step 5: 安装 Chromium 浏览器**

Run: `npx playwright install chromium`  
Expected: PASS。

### Task 3: 为 preview 环境补齐 `GM_*` shim 与测试桥接 API

**Files:**
- Modify: `src/app/main.preview.ts`
- Create: `src/app/preview/gm-shim.ts`
- Create: `src/app/preview/testing-bridge.ts`
- Test: `src/app/preview/gm-shim.test.ts`

**Step 1: 先写 preview GM shim 的失败测试**

```ts
import { describe, expect, it } from "vitest";
import { createPreviewGmStore } from "@/app/preview/gm-shim";

describe("preview gm shim", () => {
  it("支持 set/get/delete", () => {
    const gm = createPreviewGmStore();
    gm.setValue("foo", "bar");
    expect(gm.getValue("foo", "")).toBe("bar");
    gm.deleteValue("foo");
    expect(gm.getValue("foo", "fallback")).toBe("fallback");
  });
});
```

**Step 2: 运行单测确认失败**

Run: `npm run test -- src/app/preview/gm-shim.test.ts`  
Expected: FAIL，提示模块不存在。

**Step 3: 实现最小 GM shim 与测试桥接**

```ts
export function installPreviewGmShim(target: Window) {
  const store = new Map<string, unknown>();
  target.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
  target.GM_setValue = (key, value) => { store.set(key, value); };
  target.GM_deleteValue = (key) => { store.delete(key); };
  target.unsafeWindow = target;
}
```

```ts
export function installPreviewTestingBridge(target: Window) {
  target.__AI_JOB_HUNTING_PREVIEW__ = {
    reset() { localStorage.clear(); },
    seedLocalStorage(entries) { Object.entries(entries).forEach(([k, v]) => localStorage.setItem(k, String(v))); }
  };
}
```

**Step 4: 在 `main.preview.ts` 中先安装 shim，再创建应用**

```ts
installPreviewGmShim(window);
installPreviewTestingBridge(window);
```

**Step 5: 重新运行单测**

Run: `npm run test -- src/app/preview/gm-shim.test.ts`  
Expected: PASS。

### Task 4: 给面板壳层和 7 个主 Tab 补稳定 `data-testid`

**Files:**
- Modify: `src/features/panel/Panel.vue`
- Modify: `src/features/job-assistant/components/AiJob.vue`
- Modify: `src/features/ai-config/components/AiConfig.vue`
- Modify: `src/features/ai-delivery-judge/components/AiDeliveryJudge.vue`
- Modify: `src/features/preference/components/Preference.vue`
- Modify: `src/features/memory-session/components/MemorySession.vue`
- Modify: `src/features/run-record/components/RunRecord.vue`
- Modify: `src/features/account/components/Account.vue`

**Step 1: 先写面板壳层 smoke 用例**

```ts
test("preview 页面挂载面板", async ({ page }) => {
  await page.goto("/preview.html");
  await expect(page.getByTestId("panel-root")).toBeVisible();
  await expect(page.getByTestId("panel-title")).toContainText("AI 工作猎手");
});
```

**Step 2: 运行用例确认失败**

Run: `npx playwright test tests/e2e/panel-shell.spec.ts -g "挂载面板"`  
Expected: FAIL，提示找不到 `data-testid="panel-root"`。

**Step 3: 在 `Panel.vue` 上补壳层 test id**

```vue
<div class="ai-job-root" data-testid="panel-root">
  <div class="ai-fab" data-testid="panel-fab" />
  <div class="ai-sidebar" data-testid="panel-sidebar">
    <div class="ai-sidebar-title" data-testid="panel-title">AI 工作猎手</div>
    <div class="ai-nav-tab" :data-testid="`panel-tab-${tab.key}`" />
  </div>
</div>
```

**Step 4: 在每个主 Tab 根节点补 test id**

```vue
<div data-testid="tab-ai-config">
  <!-- 原内容 -->
</div>
```

**Step 5: 重新运行 smoke 用例**

Run: `npx playwright test tests/e2e/panel-shell.spec.ts -g "挂载面板"`  
Expected: PASS。

### Task 5: 编写面板壳层与 Tab 切换 E2E

**Files:**
- Create: `tests/e2e/panel-shell.spec.ts`
- Create: `tests/e2e/tab-navigation.spec.ts`
- Modify: `tests/e2e/helpers/preview.ts`

**Step 1: 先写 FAB 展开 / 收起的失败用例**

```ts
test("FAB 可以展开与收起面板", async ({ page }) => {
  await page.goto("/preview.html");
  await page.getByTestId("panel-fab").click();
  await expect(page.getByTestId("panel-sidebar")).toHaveClass(/is-collapsed/);
  await page.getByTestId("panel-fab").click();
  await expect(page.getByTestId("panel-sidebar")).not.toHaveClass(/is-collapsed/);
});
```

**Step 2: 运行用例确认失败或暴露选择器问题**

Run: `npx playwright test tests/e2e/panel-shell.spec.ts -g "展开与收起"`  
Expected: FAIL，直到交互选择器与断言稳定为止。

**Step 3: 最小修正断言与 helper，不改业务行为**

```ts
export async function resetPreviewState(page: Page) {
  await page.goto("/preview.html");
  await page.evaluate(() => window.__AI_JOB_HUNTING_PREVIEW__?.reset());
  await page.reload();
}
```

**Step 4: 写 Tab 切换用例**

```ts
test("7 个主 Tab 可以切换", async ({ page }) => {
  await page.goto("/preview.html");
  await page.getByTestId("panel-tab-2").click();
  await expect(page.getByTestId("tab-ai-config")).toBeVisible();
});
```

**Step 5: 运行壳层与 Tab 测试**

Run: `npx playwright test tests/e2e/panel-shell.spec.ts tests/e2e/tab-navigation.spec.ts`  
Expected: PASS。

### Task 6: 编写本地存储恢复与代表性配置流 E2E

**Files:**
- Create: `tests/e2e/persistence.spec.ts`
- Modify: `src/features/panel/Panel.vue`
- Modify: `src/features/ai-config/components/AiConfig.vue`
- Modify: `src/features/preference/components/Preference.vue`

**Step 1: 先写折叠状态恢复的失败用例**

```ts
test("折叠状态刷新后保留", async ({ page }) => {
  await page.goto("/preview.html");
  await page.getByTestId("panel-fab").click();
  await page.reload();
  await expect(page.getByTestId("panel-sidebar")).toHaveClass(/is-collapsed/);
});
```

**Step 2: 运行该用例确认当前行为**

Run: `npx playwright test tests/e2e/persistence.spec.ts -g "折叠状态刷新后保留"`  
Expected: 如果选择器或恢复逻辑不可观测则 FAIL。

**Step 3: 给关键保存 / 重置按钮补 test id（只补首批流程）**

```vue
<el-button data-testid="ai-config-save">保存</el-button>
<el-button data-testid="preference-save">保存</el-button>
```

**Step 4: 增加 1 条 AI 配置流和 1 条传统偏好流断言**

```ts
await page.getByTestId("panel-tab-2").click();
await page.getByTestId("ai-config-save").click();
```

**Step 5: 运行持久化测试**

Run: `npx playwright test tests/e2e/persistence.spec.ts`  
Expected: PASS。

### Task 7: 为构建产物增加本地 userscript smoke 测试

**Files:**
- Create: `tests/fixtures/web/geek/jobs/index.html`
- Create: `tests/e2e/userscript-dist.spec.ts`
- Modify: `package.json`

**Step 1: 创建本地 fixture 页面**

```html
<!doctype html>
<html lang="zh-CN">
  <body>
    <div class="job-recommend-result"></div>
  </body>
</html>
```

**Step 2: 先写 dist smoke 用例**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("dist userscript 可以挂载到本地 fixture", async ({ page }) => {
  await page.goto("/tests/fixtures/web/geek/jobs/index.html");
  await page.addInitScript(() => {
    const store = new Map();
    window.GM_getValue = (key, fallback) => store.has(key) ? store.get(key) : fallback;
    window.GM_setValue = (key, value) => store.set(key, value);
    window.GM_deleteValue = (key) => store.delete(key);
    window.unsafeWindow = window;
  });
  const script = readFileSync(resolve("dist/ai-job-hunting.user.js"), "utf8");
  await page.addScriptTag({ content: script });
  await expect(page.locator("#ai-job")).toBeVisible();
});
```

**Step 3: 运行用例确认先因缺少构建产物而失败**

Run: `npx playwright test tests/e2e/userscript-dist.spec.ts`  
Expected: FAIL，提示找不到 `dist/ai-job-hunting.user.js` 或页面未挂载。

**Step 4: 先构建，再运行 smoke 测试**

Run: `npm run build && npx playwright test tests/e2e/userscript-dist.spec.ts`  
Expected: PASS。

### Task 8: 开启 Vitest coverage 并补首批高性价比覆盖

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Create: `src/shared/utils/tampermonkey.test.ts`
- Create: `src/shared/utils/sensitive-data-consent.test.ts`
- Modify: `src/core/platform/boss-platform.test.ts`
- Modify: `src/core/ai/ai-power.test.ts`
- Test: `src/app/preview/gm-shim.test.ts`

**Step 1: 安装 coverage provider**

Run: `npm install -D @vitest/coverage-v8`  
Expected: PASS。

**Step 2: 在 `vitest.config.ts` 中打开 coverage**

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  include: ["src/**/*.{ts,vue}"],
  exclude: ["src/**/*.d.ts", "src/app/main.ts", "src/app/main.preview.ts"]
}
```

**Step 3: 给 `tampermonkey.ts` 和 `sensitive-data-consent.ts` 先写失败测试**

```ts
it("GMXmlHttpRequest 在缺失实现时抛错", () => {
  expect(() => TampermonkeyApi.GMXmlHttpRequest({ url: "https://example.com" })).toThrow();
});
```

```ts
it("未授权时返回默认 consent", () => {
  expect(getSensitiveDataConsent()).toEqual({ resumeStorage: false, apiKeyStorage: false, version: 1 });
});
```

**Step 4: 运行 unit test + coverage 并补最小实现/断言**

Run: `npm run test -- --coverage`  
Expected: PASS，输出 text report。

**Step 5: 记录当前 coverage 基线并补足缺口**

Run: `npm run test -- --coverage`  
Expected: 输出可读的模块覆盖率；如果尚未接近 80%，优先继续补 `shared` / `core` / 新 preview helper 的测试，而不是盲目扩大 E2E。

### Task 9: 全量校验与收尾

**Files:**
- Check: `package.json`
- Check: `playwright.config.ts`
- Check: `vitest.config.ts`
- Check: `src/app/main.preview.ts`
- Check: `src/app/preview/gm-shim.ts`
- Check: `src/app/preview/testing-bridge.ts`
- Check: `src/features/panel/Panel.vue`
- Check: `tests/e2e/*.spec.ts`
- Check: `tests/fixtures/web/geek/jobs/index.html`

**Step 1: 类型检查**

Run: `npm run type-check`  
Expected: PASS。

**Step 2: 构建检查**

Run: `npm run build`  
Expected: PASS，生成 `dist/ai-job-hunting.user.js`。

**Step 3: 单元测试与覆盖率**

Run: `npm run test -- --coverage`  
Expected: PASS，并输出 coverage 报告。

**Step 4: E2E 回归**

Run: `npx playwright test`  
Expected: PASS。

**Step 5: 小步提交**

```bash
git add package.json .gitignore vitest.config.ts playwright.config.ts src/app/main.preview.ts src/app/preview src/features/panel tests/e2e tests/fixtures docs/plans
git commit -m "test: add preview-based e2e harness"
```
