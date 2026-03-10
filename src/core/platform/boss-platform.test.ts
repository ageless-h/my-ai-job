import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotMatchError, PushLimitError, PushStopError } from "@/shared/errors";
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

  it("命中当日沟通上限提示时抛出 PushLimitError", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    mocks.isManualVerificationText.mockReturnValue(false);
    mocks.getManualVerificationReason.mockReturnValue(null);
    mocks.axiosPost.mockResolvedValue({
      data: {
        code: 1,
        zpData: {
          bizData: {
            chatRemindDialog: {
              content: "您今天已与150位BOSS沟通"
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
    })).rejects.toBeInstanceOf(PushLimitError);
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

describe("BossPlatform.getJobList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("jobs 页忽略缺失 __vue__.data 的卡片", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    const cards = [
      {},
      {
        __vue__: {
          data: {
            encryptJobId: "job-2",
            jobName: "后端工程师",
            cityName: "深圳",
            areaDistrict: "南山",
            businessDistrict: "科技园"
          }
        }
      }
    ];

    vi.stubGlobal("document", {
      querySelectorAll: vi.fn((selector: string) => selector === ".job-card-wrap" ? cards : [])
    });

    const jobList = platform.getJobList();
    expect(jobList).toHaveLength(1);
    expect(jobList[0].encryptJobId).toBe("job-2");
  });

  it("jobs 页过滤已处理的岗位", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    const cards = [
      {
        __vue__: {
          data: {
            encryptJobId: "job-1",
            jobName: "前端工程师",
            processed: true
          }
        }
      },
      {
        __vue__: {
          data: {
            encryptJobId: "job-2",
            jobName: "后端工程师"
          }
        }
      }
    ];

    vi.stubGlobal("document", {
      querySelectorAll: vi.fn((selector: string) => selector === ".job-card-wrap" ? cards : [])
    });

    const jobList = platform.getJobList();
    expect(jobList).toHaveLength(1);
    expect(jobList[0].encryptJobId).toBe("job-2");
  });

  it("job-recommend 页过滤已沟通的岗位", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/job-recommend");
    const cards = [
      {
        __vue__: {
          data: {
            encryptJobId: "job-1",
            jobName: "前端工程师",
            contact: true
          }
        }
      },
      {
        __vue__: {
          data: {
            encryptJobId: "job-2",
            jobName: "后端工程师",
            contact: false
          }
        }
      }
    ];

    vi.stubGlobal("document", {
      querySelectorAll: vi.fn((selector: string) => selector === ".job-card-wrap" ? cards : [])
    });

    const jobList = platform.getJobList();
    expect(jobList).toHaveLength(1);
    expect(jobList[0].encryptJobId).toBe("job-2");
  });
});

describe("BossPlatform.matchJob processed 标记时机", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("瞬时异常时不提前标记 processed", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.shouldEnableAiDeliveryJudge = vi.fn(() => false);
    platform.isTraditionalDeliveryEnabled = vi.fn(() => false);
    platform.obtainBossJobDetailExt = vi.fn(async () => {
      throw new Error("timeout");
    });

    const jobDetail: any = {
      encryptJobId: "job-3",
      jobName: "测试工程师",
      cityName: "深圳",
      areaDistrict: "南山",
      businessDistrict: "科技园",
      contact: false
    };

    await expect(platform.matchJob(jobDetail)).rejects.toThrow("timeout");
    expect(jobDetail.processed).not.toBe(true);
  });

  it("明确不匹配时标记 processed 防止重复扫描", async () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    const jobDetail: any = {
      encryptJobId: "job-4",
      jobName: "测试工程师",
      cityName: "深圳",
      areaDistrict: "南山",
      businessDistrict: "科技园",
      contact: true
    };

    await expect(platform.matchJob(jobDetail)).rejects.toBeInstanceOf(NotMatchError);
    expect(jobDetail.processed).toBe(true);
  });
});

describe("BossPlatform.hasNext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("jobs 页初始状态有卡片时返回 true", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    const container = { scrollHeight: 2000 };
    const cards = [{ textContent: "job1" }, { textContent: "job2" }];

    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null),
      querySelectorAll: vi.fn((selector: string) => selector.includes(".job-card-wrap") ? cards : [])
    });

    expect(platform.hasNext()).toBe(true);
  });

  it("jobs 页卡片数量增加时返回 true", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.lastJobCardCount = 5;
    platform.lastHeight = 2000;

    const container = { scrollHeight: 2000 };
    const cards = Array(10).fill({ textContent: "job" });

    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null),
      querySelectorAll: vi.fn((selector: string) => selector.includes(".job-card-wrap") ? cards : [])
    });

    expect(platform.hasNext()).toBe(true);
  });

  it("jobs 页无变化时返回 false", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.lastJobCardCount = 5;
    platform.lastHeight = 2000;
    
    const cards = Array(5).fill(null).map((_, i) => ({
      textContent: "job",
      __vue__: { data: { encryptJobId: `job-${i}` } }
    }));
    
    const tailCard = cards[cards.length - 1];
    const tailKey = `encrypt:job-${cards.length - 1}`;
    platform.lastJobsTailKey = tailKey;
    
    const firstKeys = cards.slice(0, 3).map((_, i) => `encrypt:job-${i}`);
    const lastKeys = cards.slice(-3).map((_, i) => `encrypt:job-${i + 2}`);
    platform.lastJobsListSignature = [...firstKeys, ...lastKeys].join("||");

    const container = { scrollHeight: 2000 };

    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list-container" ? container : null),
      querySelectorAll: vi.fn((selector: string) => selector.includes(".job-card-wrap") ? cards : [])
    });

    const result = platform.hasNext();
    expect(result).toBe(false);
  });

  it("overseas 页高度变化时返回 true", () => {
    const platform = new BossPlatform("https://www.zhipin.com/overseas") as any;
    platform.lastHeight = 1000;

    vi.stubGlobal("document", {
      querySelector: vi.fn((selector: string) => selector === ".job-list" ? { scrollHeight: 2000 } : null)
    });

    expect(platform.hasNext()).toBe(true);
  });
});

describe("BossPlatform.startPreHandler", () => {
  it("重置所有状态变量", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.lastHeight = 1000;
    platform.lastJobCardCount = 10;
    platform.sessionAutoMessageCount = 5;
    platform.sessionProcessedJobKeys.set("key1", Date.now());

    platform.startPreHandler();

    expect(platform.lastHeight).toBe(0);
    expect(platform.lastJobCardCount).toBe(0);
    expect(platform.sessionAutoMessageCount).toBe(0);
    expect(platform.sessionProcessedJobKeys.size).toBe(0);
  });
});

describe("BossPlatform.enforceAutoContactSafety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.runtimeUserStore.user.preference = {};
  });

  it("触发过快时抛出错误", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.lastAutoContactTs = Date.now();

    expect(() => {
      platform.enforceAutoContactSafety("message");
    }).toThrow("自动发消息触发过快");
  });

  it("消息数量达到上限时抛出错误", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.sessionAutoMessageCount = 30;
    platform.lastAutoContactTs = 0;

    expect(() => {
      platform.enforceAutoContactSafety("message");
    }).toThrow("自动消息达到会话上限");
  });

  it("图片简历数量达到上限时抛出错误", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.sessionAutoResumeCount = 18;
    platform.lastAutoContactTs = 0;

    expect(() => {
      platform.enforceAutoContactSafety("image");
    }).toThrow("自动图片简历达到会话上限");
  });

  it("正常情况下更新计数器", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.sessionAutoMessageCount = 0;
    platform.lastAutoContactTs = 0;

    platform.enforceAutoContactSafety("message");

    expect(platform.sessionAutoMessageCount).toBe(1);
    expect(platform.lastAutoContactTs).toBeGreaterThan(0);
  });
});

describe("BossPlatform.getStableJobRuntimeKey", () => {
  it("优先使用 encryptJobId", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    const jobDetail = {
      encryptJobId: "enc-123",
      jobId: "job-456",
      lid: "lid-789"
    };

    const key = platform.getStableJobRuntimeKey(jobDetail);
    expect(key).toBe("encrypt:enc-123");
  });

  it("encryptJobId 不存在时使用 jobId", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    const jobDetail = {
      jobId: "job-456",
      lid: "lid-789"
    };

    const key = platform.getStableJobRuntimeKey(jobDetail);
    expect(key).toBe("job:job-456");
  });

  it("jobId 不存在时使用 lid", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    const jobDetail = {
      lid: "lid-789"
    };

    const key = platform.getStableJobRuntimeKey(jobDetail);
    expect(key).toBe("lid:lid-789");
  });

  it("所有标识符都不存在时回退到 getJobKey", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.getJobKey = vi.fn(() => "fallback-key");
    const jobDetail = {};

    const key = platform.getStableJobRuntimeKey(jobDetail);
    expect(key).toBe("fallback-key");
    expect(platform.getJobKey).toHaveBeenCalledWith(jobDetail);
  });
});

describe("BossPlatform.markJobProcessed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("标记岗位为已处理并记录到 sessionProcessedJobKeys", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    const jobDetail: any = { encryptJobId: "job-1" };

    platform.markJobProcessed(jobDetail);

    expect(jobDetail.processed).toBe(true);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-1")).toBe(true);
  });

  it("超过 MAX_PROCESSED_JOBS 时执行 LRU 清理", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs") as any;
    platform.MAX_PROCESSED_JOBS = 3;

    for (let i = 1; i <= 5; i++) {
      const jobDetail: any = { encryptJobId: `job-${i}` };
      platform.markJobProcessed(jobDetail);
      if (i < 5) {
        vi.advanceTimersByTime(1000);
      }
    }

    expect(platform.sessionProcessedJobKeys.size).toBe(3);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-1")).toBe(false);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-2")).toBe(false);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-3")).toBe(true);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-4")).toBe(true);
    expect(platform.sessionProcessedJobKeys.has("encrypt:job-5")).toBe(true);
  });
});

describe("BossPlatform.getPlatformType", () => {
  it("返回平台类型 0", () => {
    const platform = new BossPlatform("https://www.zhipin.com/web/geek/jobs");
    expect(platform.getPlatformType()).toBe(0);
  });
});
