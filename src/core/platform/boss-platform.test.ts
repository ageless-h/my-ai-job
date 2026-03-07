import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushStopError } from "@/shared/errors";
import { simulateScrollToEnd } from "@/shared/utils/scroll";

const mocks = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  sleep: vi.fn(async () => undefined),
  getCookieValue: vi.fn(() => "bst-token"),
  isManualVerificationText: vi.fn((text: string | null | undefined) => `${text || ""}`.includes("验证")),
  getManualVerificationReason: vi.fn<() => string | null>(() => "检测到验证弹窗(.geetest_panel)"),
  getPreferenceValue: vi.fn((preference: Record<string, unknown>, key: string, alias?: string) => preference?.[key] ?? preference?.[alias || ""]),
  normalizePreferenceBoolean: vi.fn((value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  runtimeUserStore: {
    user: {
      preference: {}
    }
  }
}));

vi.mock("axios", () => ({
  default: {
    post: mocks.axiosPost
  }
}));

vi.mock("@/core/engine/push-engine", () => ({
  AbsPlatform: class {},
  PushResultStatus: {
    NOT_START: -1,
    SUCCESS: 0,
    FAIL: 1
  },
  PushStatus: {
    NOT_START: 0,
    PUSHING: 1,
    PAUSE: 2,
    LIMIT: 3
  },
  pushResultCounter: {},
  runtimeUserStore: mocks.runtimeUserStore
}));

vi.mock("@/shared/utils/logger", () => ({
  Logger: {
    rootLogger: mocks.logger
  }
}));

vi.mock("@/shared/utils/tools", () => ({
  Tools: {
    sleep: mocks.sleep,
    getCookieValue: mocks.getCookieValue,
    isManualVerificationText: mocks.isManualVerificationText,
    getManualVerificationReason: mocks.getManualVerificationReason,
    isBossDomainHost: vi.fn(() => true),
    getCurrentHostname: vi.fn(() => "www.zhipin.com"),
    isTrustedBossStaticUrl: vi.fn(() => true),
    window: {}
  }
}));

vi.mock("@/core/ai/ai-power", () => ({
  AiPower: class {}
}));

vi.mock("@/shared/utils/resume", () => ({
  extractResumeTextFromHtml: vi.fn()
}));

vi.mock("@/shared/utils/preference", () => ({
  getPreferenceValue: mocks.getPreferenceValue,
  normalizePreferenceBoolean: mocks.normalizePreferenceBoolean
}));

vi.mock("@/shared/utils/tampermonkey", () => ({
  TampermonkeyApi: {
    GmGetValue: vi.fn(),
    GmSetValue: vi.fn(),
    PUSH_LIMIT: "push-limit"
  }
}));

vi.mock("@/core/protocol/message", () => ({
  Message: class {
    send(): boolean {
      return true;
    }
  }
}));

vi.mock("@/shared/utils/scroll", () => ({
  simulateScrollToEnd: vi.fn()
}));

vi.mock("@/shared/utils/ai-delivery", () => ({
  buildAiDeliveryFilterJobInput: vi.fn(),
  buildAiDeliveryJudgePrompt: vi.fn(),
  buildAiDeliveryUserProfile: vi.fn(),
  buildTraditionalRuleSnapshot: vi.fn(),
  resolveAiDeliveryFallback: vi.fn()
}));

import { BossPlatform } from "@/core/platform/boss-platform";

describe("BossPlatform.doPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.getCookieValue.mockReturnValue("bst-token");
    mocks.isManualVerificationText.mockImplementation((text: string | null | undefined) => `${text || ""}`.includes("验证"));
    mocks.getManualVerificationReason.mockReturnValue("检测到验证弹窗(.geetest_panel)");
    mocks.runtimeUserStore.user.preference = {};
  });

  it("chatRemindDialog 提示人工验证时抛出 PushStopError", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    mocks.axiosPost.mockResolvedValue({
      data: {
        code: 1,
        zpData: {
          bizData: {
            chatRemindDialog: {
              content: "请完成验证后继续投递"
            }
          }
        }
      }
    });

    await expect(platform.doPush({
      securityId: "sec-1",
      encryptJobId: "job-1",
      lid: "lid-1",
      jobName: "前端工程师",
      cityName: "上海",
      areaDistrict: "浦东",
      businessDistrict: "张江"
    })).rejects.toBeInstanceOf(PushStopError);
  });

  it("普通 chatRemindDialog 失败信息保持普通失败结果", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    mocks.isManualVerificationText.mockReturnValue(false);
    mocks.getManualVerificationReason.mockReturnValue(null);
    mocks.axiosPost.mockResolvedValue({
      data: {
        code: 1,
        zpData: {
          bizData: {
            chatRemindDialog: {
              content: "沟通失败，请稍后重试"
            }
          }
        }
      }
    });

    await expect(platform.doPush({
      securityId: "sec-1",
      encryptJobId: "job-1",
      lid: "lid-1",
      jobName: "前端工程师",
      cityName: "上海",
      areaDistrict: "浦东",
      businessDistrict: "张江"
    })).resolves.toEqual({
      code: 1,
      message: "沟通失败，请稍后重试"
    });
  });

  it("jobs 页列表容器不可滚时回退到整页滚动", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    const container = {
      clientHeight: 2237,
      scrollHeight: 2237,
      get: () => 0,
      set: vi.fn(),
      dispatchEvent: vi.fn()
    };
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      get: container.get,
      set: container.set
    });
    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null)
    });

    await Reflect.get(platform, "scrollJobsListToEnd").call(platform);

    expect(simulateScrollToEnd).toHaveBeenCalledTimes(1);
  });

  it("jobs 页容器滚动后仍无法产生位移时回退到整页滚动", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    let scrollTop = 0;
    const container = {
      clientHeight: 1000,
      scrollHeight: 2000,
      dispatchEvent: vi.fn()
    };
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: () => {
        scrollTop = 0;
      }
    });
    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null)
    });

    await Reflect.get(platform, "scrollJobsListToEnd").call(platform);

    expect(simulateScrollToEnd).toHaveBeenCalledTimes(1);
  });

  it("jobs 页容器滚动正常到底时不回退到整页滚动", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    let scrollTop = 0;
    const container = {
      clientHeight: 1000,
      scrollHeight: 2000,
      dispatchEvent: vi.fn()
    };
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      }
    });
    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null)
    });

    await Reflect.get(platform, "scrollJobsListToEnd").call(platform);

    expect(scrollTop).toBe(1000);
    expect(simulateScrollToEnd).not.toHaveBeenCalled();
  });
});
