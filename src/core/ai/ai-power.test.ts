import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestPostMock,
  directAiCallMock,
  getActiveDirectConfigMock,
  directAskMock
} = vi.hoisted(() => ({
  requestPostMock: vi.fn(),
  directAiCallMock: vi.fn(),
  getActiveDirectConfigMock: vi.fn(),
  directAskMock: vi.fn()
}));

vi.mock("@/core/http/request", () => ({
  request: {
    post: requestPostMock
  }
}));

vi.mock("@/core/ai/direct-ai-client", () => ({
  getActiveDirectConfig: getActiveDirectConfigMock,
  directAsk: directAskMock,
  directAiCall: directAiCallMock
}));

vi.mock("@/shared/utils/tools", () => ({
  Tools: {
    getAiConfigExt: () => ({ promptPresetStore: { global: [], personal: {} } }),
    getCurrentAiModelChannelKey: () => ""
  }
}));

import { AiPower } from "@/core/ai/ai-power";

describe("AiPower.filter", () => {
  beforeEach(() => {
    requestPostMock.mockReset();
    directAiCallMock.mockReset();
    getActiveDirectConfigMock.mockReset();
  });

  it("无直连配置时禁用过滤并抛出明确错误", async () => {
    getActiveDirectConfigMock.mockReturnValue(null);

    await expect(AiPower.filter("prompt", "base", "ext")).rejects.toThrow(
      "AI投递过滤仅支持直连模式，请先在AI配置中启用并激活直连模型"
    );
    expect(AiPower.getFilterPath()).toBe("disabled");
    expect(requestPostMock).not.toHaveBeenCalled();
  });

  it("有直连配置时仅走直连调用并包装返回", async () => {
    getActiveDirectConfigMock.mockReturnValue({ apiKey: "k" });
    directAiCallMock.mockResolvedValue({ match: true, reason: "[MATCH] ok" });

    const result = await AiPower.filter("系统提示", "基础信息", "扩展信息", 6_000);

    expect(AiPower.getFilterPath()).toBe("direct");
    expect(directAiCallMock).toHaveBeenCalledTimes(1);
    expect(directAiCallMock.mock.calls[0][0]).toMatchObject({ timeout: 6 });
    expect(requestPostMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: {
        code: 200,
        data: { match: true, reason: "[MATCH] ok" }
      }
    });
  });
});
