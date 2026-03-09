import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/test-setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/app/main.ts",
        "src/app/main.preview.ts"
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 75,
        statements: 80
      }
    }
  }
});
