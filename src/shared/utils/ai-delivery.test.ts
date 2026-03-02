import { describe, expect, it } from "vitest";
import { resolveAiDeliveryFallback } from "@/shared/utils/ai-delivery";

describe("resolveAiDeliveryFallback", () => {
  it("AI 请求失败策略为 fallback-traditional 时启用回退", () => {
    const result = resolveAiDeliveryFallback("fallback-traditional", "ai-error");

    expect(result.enabled).toBe(true);
    expect(result.parseMode).toBe("ai-error.fallback-traditional");
  });

  it("AI 请求失败策略为 reject 时不启用回退", () => {
    const result = resolveAiDeliveryFallback("reject", "ai-error");

    expect(result.enabled).toBe(false);
    expect(result.parseMode).toBe("");
  });

  it("AI 结果不可解析策略为 fallback-traditional 时使用 parseMode 后缀", () => {
    const result = resolveAiDeliveryFallback("fallback-traditional", "invalid-result", "object.match");

    expect(result.enabled).toBe(true);
    expect(result.parseMode).toBe("object.match.fallback-traditional");
  });

  it("AI 结果 parseMode 为空时回退到 invalid 前缀", () => {
    const result = resolveAiDeliveryFallback("fallback-traditional", "invalid-result", "");

    expect(result.enabled).toBe(true);
    expect(result.parseMode).toBe("invalid.fallback-traditional");
  });
});
