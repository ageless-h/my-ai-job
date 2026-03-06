import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

const DEFAULT_API_BASE_URL = "https://43.138.246.37/";

const normalizeApiBaseUrl = (rawUrl: string | undefined): string => {
  const candidate = `${rawUrl || ""}`.trim();
  if (!candidate) {
    return DEFAULT_API_BASE_URL;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  return `https://${candidate}`;
};

const apiBaseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL || process.env.VITE_API_BASE_URL);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  define: {
    __API_BASE_URL__: JSON.stringify(apiBaseUrl)
  },
  plugins: [vue()]
});
