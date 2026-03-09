import { describe, expect, it } from "vitest";
import {
  resolveAiDeliveryFallback,
  buildTraditionalRuleSnapshot,
  buildAiDeliveryUserProfile,
  buildAiDeliveryUserProfileText,
  buildTraditionalRuleSnapshotText,
  buildAiDeliveryJudgePrompt,
  buildAiDeliveryJobBaseInfoText,
  buildAiDeliveryJobExtInfoText,
  buildAiDeliveryFilterJobInput
} from "@/shared/utils/ai-delivery";

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

  it("策略为 null/undefined 时不启用回退", () => {
    expect(resolveAiDeliveryFallback(null, "ai-error").enabled).toBe(false);
    expect(resolveAiDeliveryFallback(undefined, "ai-error").enabled).toBe(false);
  });

  it("策略为空字符串时不启用回退", () => {
    const result = resolveAiDeliveryFallback("", "ai-error");
    expect(result.enabled).toBe(false);
    expect(result.parseMode).toBe("");
  });
});

describe("buildTraditionalRuleSnapshot", () => {
  it("空对象返回默认值", () => {
    const result = buildTraditionalRuleSnapshot({});

    expect(result.companyInclude).toEqual([]);
    expect(result.companyExclude).toEqual([]);
    expect(result.jobInclude).toEqual([]);
    expect(result.jobExclude).toEqual([]);
    expect(result.contentInclude).toEqual([]);
    expect(result.contentExclude).toEqual([]);
    expect(result.salaryRange).toBe("");
    expect(result.salaryType).toBe("");
    expect(result.companyScaleRange).toBe("");
    expect(result.filterHunter).toBe(false);
    expect(result.onlyBossOnline).toBe(false);
  });

  it("启用公司包含规则时返回公司列表", () => {
    const result = buildTraditionalRuleSnapshot({
      cniE: true,
      cni: ["阿里", "腾讯", "字节"]
    });

    expect(result.companyInclude).toEqual(["阿里", "腾讯", "字节"]);
  });

  it("禁用公司包含规则时返回空数组", () => {
    const result = buildTraditionalRuleSnapshot({
      cniE: false,
      cni: ["阿里", "腾讯"]
    });

    expect(result.companyInclude).toEqual([]);
  });

  it("启用薪资范围时返回薪资信息", () => {
    const result = buildTraditionalRuleSnapshot({
      srE: true,
      sr: "15k-25k",
      srT: "2"
    });

    expect(result.salaryRange).toBe("15k-25k");
    expect(result.salaryType).toBe("2");
  });

  it("禁用薪资范围时返回空字符串", () => {
    const result = buildTraditionalRuleSnapshot({
      srE: false,
      sr: "15k-25k",
      srT: "2"
    });

    expect(result.salaryRange).toBe("");
    expect(result.salaryType).toBe("");
  });

  it("活跃度过滤配置正确传递", () => {
    const result = buildTraditionalRuleSnapshot({
      acE: true,
      acW: false,
      acM: true,
      acY: false
    });

    expect(result.activeFilter.enabled).toBe(true);
    expect(result.activeFilter.week).toBe(false);
    expect(result.activeFilter.month).toBe(true);
    expect(result.activeFilter.year).toBe(false);
  });

  it("null/undefined 输入返回默认值", () => {
    expect(buildTraditionalRuleSnapshot(null)).toBeDefined();
    expect(buildTraditionalRuleSnapshot(undefined)).toBeDefined();
  });

  it("非对象输入返回默认值", () => {
    const result = buildTraditionalRuleSnapshot("invalid" as any);
    expect(result.companyInclude).toEqual([]);
  });

  it("多个规则同时启用", () => {
    const result = buildTraditionalRuleSnapshot({
      cniE: true,
      cni: ["阿里"],
      jniE: true,
      jni: ["工程师"],
      jceE: true,
      jce: ["外包"],
      filterHunter: true,
      fhE: true
    });

    expect(result.companyInclude).toEqual(["阿里"]);
    expect(result.jobInclude).toEqual(["工程师"]);
    expect(result.contentExclude).toEqual(["外包"]);
    expect(result.filterHunter).toBe(true);
  });
});

describe("buildAiDeliveryUserProfile", () => {
  it("空输入返回基础结构", () => {
    const result = buildAiDeliveryUserProfile({}, {});

    expect(result.phone).toBe("");
    expect(result.email).toBe("");
    expect(result.resumeId).toBe("");
    expect(result.hasImportedResume).toBe(false);
    expect(result.hasImageResume).toBe(false);
    expect(Array.isArray(result.expectedJobInclude)).toBe(true);
    expect(Array.isArray(result.expectedCompanyInclude)).toBe(true);
  });

  it("用户基本信息正确提取", () => {
    const result = buildAiDeliveryUserProfile(
      {
        phone: "13800138000",
        email: "test@example.com",
        resumeId: "resume123"
      },
      {}
    );

    expect(result.phone).toBe("13800138000");
    expect(result.email).toBe("test@example.com");
    expect(result.resumeId).toBe("resume123");
  });

  it("期望岗位关键词正确规范化", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jni: ["Java工程师", "  Python  ", "Java工程师"]
      }
    );

    expect(result.expectedJobInclude).toContain("Java工程师");
    expect(result.expectedJobInclude).toContain("Python");
    expect(result.expectedJobInclude.length).toBeLessThanOrEqual(12);
  });

  it("冲突关键词检测", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jni: ["Java", "Python"],
        jne: ["Java"]
      }
    );

    expect(result.conflictJobKeywords).toContain("Java");
    expect(result.expectedJobInclude).not.toContain("Java");
    expect(result.expectedJobInclude).toContain("Python");
  });

  it("简历身份快照包含在结果中", () => {
    const result = buildAiDeliveryUserProfile(
      {
        fullName: "张三",
        age: "28"
      },
      {}
    );

    expect(result.resumeIdentity).toBeDefined();
    expect(typeof result.resumeIdentity).toBe("object");
  });

  it("简历叙述文本生成", () => {
    const result = buildAiDeliveryUserProfile(
      {
        fullName: "张三",
        age: "28",
        workYears: "5年"
      },
      {}
    );

    expect(typeof result.resumeNarrative).toBe("string");
  });

  it("导入简历片段处理", () => {
    const result = buildAiDeliveryUserProfile(
      {
        importedResume: {
          resumeText: "这是一份简历内容"
        }
      },
      {}
    );

    expect(result.hasImportedResume).toBe(true);
  });

  it("规则冲突标记", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jni: ["Java"],
        jne: ["Java"],
        cni: ["阿里"],
        cne: ["阿里"]
      }
    );

    expect(result.hasRuleConflict).toBe(true);
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildAiDeliveryUserProfile(null as any, null as any)).not.toThrow();
    expect(() => buildAiDeliveryUserProfile(undefined, undefined)).not.toThrow();
  });
});

describe("buildAiDeliveryUserProfileText", () => {
  it("空输入返回基础文本", () => {
    const result = buildAiDeliveryUserProfileText({});

    expect(result).toContain("[候选人匹配卡]");
    expect(result).toContain("联系方式");
  });

  it("包含所有关键信息部分", () => {
    const result = buildAiDeliveryUserProfileText({
      phone: "13800138000",
      email: "test@example.com",
      hasImportedResume: true,
      hasImageResume: false,
      resumeIdentity: {
        fullName: "张三"
      }
    });

    expect(result).toContain("13800138000");
    expect(result).toContain("test@example.com");
    expect(result).toContain("是否已导入个人页简历");
    expect(result).toContain("简历身份补充");
  });

  it("关键词列表格式化", () => {
    const result = buildAiDeliveryUserProfileText({
      expectedJobInclude: ["Java", "Python"],
      expectedCompanyInclude: ["阿里", "腾讯"],
      expectedContentInclude: ["分布式"]
    });

    expect(result).toContain("Java");
    expect(result).toContain("Python");
    expect(result).toContain("阿里");
  });

  it("规则冲突显示", () => {
    const result = buildAiDeliveryUserProfileText({
      conflictJobKeywords: ["Java"],
      conflictCompanyKeywords: ["阿里"],
      hasRuleConflict: true
    });

    expect(result).toContain("规则冲突标记");
    expect(result).toContain("Java");
  });

  it("资料完整度计算", () => {
    const result = buildAiDeliveryUserProfileText({
      resumeIdentity: {
        workYears: "5年",
        education: "本科",
        expectedJob: "工程师",
        expectedCity: "北京",
        resumeTextSnippet: "简历内容"
      }
    });

    expect(result).toContain("资料完整度");
    expect(result).toContain("5/5");
  });

  it("缺失字段标记", () => {
    const result = buildAiDeliveryUserProfileText({
      resumeIdentity: {
        workYears: "5年"
      }
    });

    expect(result).toContain("缺失关键字段");
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildAiDeliveryUserProfileText(null as any)).not.toThrow();
    expect(() => buildAiDeliveryUserProfileText(undefined)).not.toThrow();
  });
});

describe("buildTraditionalRuleSnapshotText", () => {
  it("空输入返回基础文本", () => {
    const result = buildTraditionalRuleSnapshotText({});

    expect(result).toContain("公司名包含");
    expect(result).toContain("岗位名包含");
    expect(result).toContain("薪资范围");
  });

  it("包含所有规则信息", () => {
    const result = buildTraditionalRuleSnapshotText({
      companyInclude: ["阿里", "腾讯"],
      companyExclude: ["小公司"],
      jobInclude: ["工程师"],
      jobExclude: ["实习"],
      contentInclude: ["分布式"],
      contentExclude: ["外包"],
      salaryRange: "15k-25k",
      salaryType: "2",
      companyScaleRange: "大型",
      filterHunter: true,
      onlyBossOnline: false
    });

    expect(result).toContain("阿里");
    expect(result).toContain("小公司");
    expect(result).toContain("工程师");
    expect(result).toContain("15k-25k");
    expect(result).toContain("过滤猎头");
  });

  it("活跃度过滤配置显示", () => {
    const result = buildTraditionalRuleSnapshotText({
      activeFilter: {
        enabled: true,
        week: true,
        month: false,
        year: true
      }
    });

    expect(result).toContain("活跃度过滤");
    expect(result).toContain("启用=是");
  });

  it("空列表显示为无", () => {
    const result = buildTraditionalRuleSnapshotText({
      companyInclude: [],
      jobInclude: []
    });

    expect(result).toContain("无");
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildTraditionalRuleSnapshotText(null as any)).not.toThrow();
    expect(() => buildTraditionalRuleSnapshotText(undefined)).not.toThrow();
  });
});

describe("buildAiDeliveryJudgePrompt", () => {
  it("基础 prompt 包含在输出中", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "请判断这个岗位是否匹配",
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("请判断这个岗位是否匹配");
    expect(result).toContain("[输出约束]");
  });

  it("附加指令包含在输出中", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        extraPrompt: "这是附加指令",
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("[附加指令]");
    expect(result).toContain("这是附加指令");
  });

  it("重点过滤规则包含", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        focusSkills: ["Java", "Python"],
        excludeKeywords: ["外包", "996"],
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("[重点过滤规则]");
    expect(result).toContain("Java");
    expect(result).toContain("外包");
  });

  it("用户信息包含在输出中", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        includeUserProfile: true,
        includeTraditionalSnapshot: false
      },
      {
        phone: "13800138000",
        email: "test@example.com"
      },
      {}
    );

    expect(result).toContain("[求职者个人信息]");
    expect(result).toContain("13800138000");
  });

  it("传统规则摘要包含在输出中", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        includeUserProfile: false,
        includeTraditionalSnapshot: true
      },
      {},
      {
        companyInclude: ["阿里"]
      }
    );

    expect(result).toContain("[传统规则摘要");
    expect(result).toContain("阿里");
  });

  it("输出约束始终包含", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("[输出约束]");
    expect(result).toContain("仅输出一行JSON");
  });

  it("空 prompt 处理", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "",
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("[输出约束]");
  });

  it("null/undefined 输入处理", () => {
    expect(() =>
      buildAiDeliveryJudgePrompt(
        {
          prompt: "test",
          includeUserProfile: false,
          includeTraditionalSnapshot: false
        },
        null as any,
        null as any
      )
    ).not.toThrow();
  });
});

describe("buildAiDeliveryJobBaseInfoText", () => {
  it("空输入返回基础结构", () => {
    const result = buildAiDeliveryJobBaseInfoText({});

    expect(result).toContain("[岗位匹配卡]");
    expect(result).toContain("岗位职能");
    expect(result).toContain("行业领域");
  });

  it("包含所有岗位信息", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: "Java工程师",
      brandIndustry: "互联网",
      jobExperience: "3-5年",
      jobDegree: "本科",
      skills: ["Java", "Spring"],
      cityName: "北京",
      areaDistrict: "朝阳区",
      businessDistrict: "望京",
      salaryDesc: "15k-25k",
      jobLabels: ["远程", "五险一金"],
      brandName: "阿里巴巴",
      brandStageName: "上市公司",
      brandScaleName: "10000人以上",
      welfareList: ["五险一金", "年终奖"]
    });

    expect(result).toContain("Java工程师");
    expect(result).toContain("互联网");
    expect(result).toContain("北京");
    expect(result).toContain("15k-25k");
    expect(result).toContain("阿里巴巴");
  });

  it("地点信息正确组合", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      cityName: "北京",
      areaDistrict: "朝阳区",
      businessDistrict: "望京"
    });

    expect(result).toContain("北京 / 朝阳区 / 望京");
  });

  it("公司信息正确组合", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      brandName: "阿里巴巴",
      brandIndustry: "互联网"
    });

    expect(result).toContain("阿里巴巴 | 互联网");
  });

  it("技能列表格式化", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      skills: ["Java", "Python", "Go"]
    });

    expect(result).toContain("Java");
    expect(result).toContain("Python");
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildAiDeliveryJobBaseInfoText(null as any)).not.toThrow();
    expect(() => buildAiDeliveryJobBaseInfoText(undefined)).not.toThrow();
  });
});

describe("buildAiDeliveryJobExtInfoText", () => {
  it("空输入返回基础结构", () => {
    const result = buildAiDeliveryJobExtInfoText({});

    expect(result).toContain("[岗位扩展证据]");
    expect(result).toContain("Boss活跃度");
    expect(result).toContain("工作地址");
  });

  it("包含 Boss 活跃度信息", () => {
    const result = buildAiDeliveryJobExtInfoText({
      activeTimeDesc: "最近一周活跃"
    });

    expect(result).toContain("最近一周活跃");
  });

  it("包含工作地址", () => {
    const result = buildAiDeliveryJobExtInfoText({
      address: "北京市朝阳区望京SOHO"
    });

    expect(result).toContain("北京市朝阳区望京SOHO");
  });

  it("岗位描述提取关键信息", () => {
    const result = buildAiDeliveryJobExtInfoText({
      postDescription: "1. 负责系统架构设计\n2. 参与技术方案评审\n3. 指导团队成员"
    });

    expect(result).toContain("岗位描述关键证据");
    expect(result).toContain("系统架构设计");
  });

  it("多行岗位描述处理", () => {
    const result = buildAiDeliveryJobExtInfoText({
      postDescription: "- 要求1\n- 要求2\n- 要求3\n- 要求4"
    });

    expect(result).toContain("要求");
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildAiDeliveryJobExtInfoText(null as any)).not.toThrow();
    expect(() => buildAiDeliveryJobExtInfoText(undefined)).not.toThrow();
  });
});

describe("buildAiDeliveryFilterJobInput", () => {
  it("返回正确的结构", () => {
    const result = buildAiDeliveryFilterJobInput({}, {});

    expect(result).toHaveProperty("jobBaseInfo");
    expect(result).toHaveProperty("jobExtInfo");
    expect(typeof result.jobBaseInfo).toBe("string");
    expect(typeof result.jobExtInfo).toBe("string");
  });

  it("基础信息和扩展信息都包含", () => {
    const result = buildAiDeliveryFilterJobInput(
      {
        jobName: "Java工程师",
        brandName: "阿里"
      },
      {
        activeTimeDesc: "最近活跃",
        address: "北京"
      }
    );

    expect(result.jobBaseInfo).toContain("Java工程师");
    expect(result.jobExtInfo).toContain("最近活跃");
  });

  it("基础信息包含岗位匹配卡标记", () => {
    const result = buildAiDeliveryFilterJobInput({}, {});

    expect(result.jobBaseInfo).toContain("[岗位匹配卡]");
  });

  it("扩展信息包含岗位扩展证据标记", () => {
    const result = buildAiDeliveryFilterJobInput({}, {});

    expect(result.jobExtInfo).toContain("[岗位扩展证据]");
  });

  it("null/undefined 输入处理", () => {
    expect(() => buildAiDeliveryFilterJobInput(null as any, null as any)).not.toThrow();
    expect(() => buildAiDeliveryFilterJobInput(undefined, undefined)).not.toThrow();
  });

  it("复杂输入完整处理", () => {
    const result = buildAiDeliveryFilterJobInput(
      {
        jobName: "高级工程师",
        brandName: "腾讯",
        skills: ["Java", "Kotlin"],
        salaryDesc: "30k-50k"
      },
      {
        activeTimeDesc: "今天活跃",
        address: "深圳南山",
        postDescription: "负责核心系统开发"
      }
    );

    expect(result.jobBaseInfo).toContain("高级工程师");
    expect(result.jobBaseInfo).toContain("30k-50k");
    expect(result.jobExtInfo).toContain("今天活跃");
    expect(result.jobExtInfo).toContain("深圳南山");
  });
});

describe("buildResumeIdentitySnapshot", () => {
  it("空输入返回基础结构", () => {
    const result = buildAiDeliveryUserProfile({}, {});
    expect(result.resumeIdentity).toBeDefined();
    expect(typeof result.resumeIdentity).toBe("object");
  });

  it("提取简历身份字段", () => {
    const result = buildAiDeliveryUserProfile(
      {
        fullName: "张三",
        gender: "男",
        age: "28",
        workYears: "5年",
        education: "本科",
        school: "清华大学",
        major: "计算机科学"
      },
      {}
    );

    expect(result.resumeIdentity.fullName).toBe("张三");
    expect(result.resumeIdentity.gender).toBe("男");
    expect(result.resumeIdentity.age).toBe("28");
  });

  it("处理缺失字段", () => {
    const result = buildAiDeliveryUserProfile(
      {
        fullName: "张三"
      },
      {}
    );

    expect(result.resumeIdentity.fullName).toBe("张三");
    expect(result.resumeIdentity.missingFields).toBeDefined();
  });

  it("处理空简历输入", () => {
    const result = buildAiDeliveryUserProfile({}, {});
    expect(result.resumeIdentity).toBeDefined();
  });
});

describe("buildResumeNarrativeText", () => {
  it("空输入返回默认文本", () => {
    const result = buildAiDeliveryUserProfile({}, {});
    expect(result.resumeNarrative).toContain("未读取到");
  });

  it("包含候选人概况", () => {
    const result = buildAiDeliveryUserProfile(
      {
        fullName: "张三",
        age: "28",
        workYears: "5年"
      },
      {}
    );

    expect(result.resumeNarrative).toContain("候选人概况");
  });

  it("包含求职意向", () => {
    const result = buildAiDeliveryUserProfile(
      {
        expectedJob: "工程师",
        expectedCity: "北京"
      },
      {}
    );

    expect(result.resumeNarrative).toContain("求职意向");
  });

  it("包含近期经历", () => {
    const result = buildAiDeliveryUserProfile(
      {
        currentCompany: "阿里",
        currentPosition: "高级工程师"
      },
      {}
    );

    expect(result.resumeNarrative).toContain("近期经历");
  });
});

describe("buildImportedResumeSnippet", () => {
  it("无导入简历返回空", () => {
    const result = buildAiDeliveryUserProfile({}, {});
    expect(result.importedResumeTextSnippet).toBe("");
  });

  it("有导入简历返回文本", () => {
    const result = buildAiDeliveryUserProfile(
      {
        importedResume: {
          resumeText: "这是一份简历内容，包含工作经历和技能"
        }
      },
      {}
    );

    expect(result.importedResumeTextSnippet).toBeTruthy();
    expect(result.hasImportedResume).toBe(true);
  });

  it("简历文本截断处理", () => {
    const longText = "a".repeat(1000);
    const result = buildAiDeliveryUserProfile(
      {
        importedResume: {
          resumeText: longText
        }
      },
      {}
    );

    expect(result.importedResumeTextSnippet.length).toBeLessThanOrEqual(900);
  });
});

describe("buildAiDeliveryJudgePrompt - 高级场景", () => {
  it("所有选项都启用", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "请判断岗位匹配度",
        extraPrompt: "重点关注技术栈",
        focusSkills: ["Java", "Spring"],
        excludeKeywords: ["外包"],
        includeUserProfile: true,
        includeTraditionalSnapshot: true
      },
      {
        phone: "13800138000",
        email: "test@example.com"
      },
      {
        companyInclude: ["阿里"]
      }
    );

    expect(result).toContain("请判断岗位匹配度");
    expect(result).toContain("[附加指令]");
    expect(result).toContain("[重点过滤规则]");
    expect(result).toContain("[求职者个人信息]");
    expect(result).toContain("[传统规则摘要");
    expect(result).toContain("[输出约束]");
  });

  it("仅包含基础 prompt", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("基础prompt");
    expect(result).not.toContain("[求职者个人信息]");
    expect(result).not.toContain("[传统规则摘要");
  });

  it("处理空 focusSkills 和 excludeKeywords", () => {
    const result = buildAiDeliveryJudgePrompt(
      {
        prompt: "基础prompt",
        focusSkills: [],
        excludeKeywords: [],
        includeUserProfile: false,
        includeTraditionalSnapshot: false
      },
      {},
      {}
    );

    expect(result).toContain("[输出约束]");
  });
});

describe("buildAiDeliveryUserProfile - 关键词冲突", () => {
  it("检测岗位关键词冲突", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jni: ["Java", "Python", "Go"],
        jne: ["Java"]
      }
    );

    expect(result.conflictJobKeywords).toContain("Java");
    expect(result.expectedJobInclude).not.toContain("Java");
    expect(result.expectedJobInclude).toContain("Python");
  });

  it("检测公司关键词冲突", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        cni: ["阿里", "腾讯"],
        cne: ["阿里"]
      }
    );

    expect(result.conflictCompanyKeywords).toContain("阿里");
    expect(result.expectedCompanyInclude).not.toContain("阿里");
  });

  it("检测内容关键词冲突", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jci: ["分布式", "微服务"],
        jce: ["分布式"]
      }
    );

    expect(result.conflictContentKeywords).toContain("分布式");
    expect(result.expectedContentInclude).not.toContain("分布式");
  });

  it("多个冲突标记", () => {
    const result = buildAiDeliveryUserProfile(
      {},
      {
        jni: ["Java"],
        jne: ["Java"],
        cni: ["阿里"],
        cne: ["阿里"]
      }
    );

    expect(result.hasRuleConflict).toBe(true);
  });
});

describe("buildTraditionalRuleSnapshotText - 详细格式", () => {
  it("完整规则显示", () => {
    const result = buildTraditionalRuleSnapshotText({
      companyInclude: ["阿里", "腾讯"],
      companyExclude: ["小公司"],
      jobInclude: ["工程师"],
      jobExclude: ["实习"],
      contentInclude: ["分布式"],
      contentExclude: ["外包"],
      salaryRange: "15k-25k",
      salaryType: "2",
      companyScaleRange: "大型",
      filterHunter: true,
      onlyBossOnline: false,
      activeFilter: {
        enabled: true,
        week: true,
        month: false,
        year: true
      }
    });

    expect(result).toContain("公司名包含");
    expect(result).toContain("阿里");
    expect(result).toContain("小公司");
    expect(result).toContain("工程师");
    expect(result).toContain("实习");
    expect(result).toContain("分布式");
    expect(result).toContain("外包");
    expect(result).toContain("15k-25k");
    expect(result).toContain("活跃度过滤");
  });

  it("空规则显示为无", () => {
    const result = buildTraditionalRuleSnapshotText({
      companyInclude: [],
      jobInclude: [],
      contentInclude: []
    });

    expect(result).toContain("无");
  });
});

describe("buildAiDeliveryUserProfileText - 完整卡片", () => {
  it("包含所有必要部分", () => {
    const result = buildAiDeliveryUserProfileText({
      phone: "13800138000",
      email: "test@example.com",
      hasImportedResume: true,
      hasImageResume: false,
      importedResumeTextSource: "user.importedResume",
      resumeIdentity: {
        fullName: "张三",
        workYears: "5年",
        education: "本科",
        expectedJob: "工程师",
        expectedCity: "北京",
        resumeTextSnippet: "简历内容"
      },
      expectedJobInclude: ["Java"],
      expectedCompanyInclude: ["阿里"],
      expectedContentInclude: ["分布式"],
      excludedJob: [],
      excludedCompany: [],
      excludedContent: [],
      conflictJobKeywords: [],
      conflictCompanyKeywords: [],
      conflictContentKeywords: [],
      hasRuleConflict: false,
      resolvedConstraints: {}
    });

    expect(result).toContain("[候选人匹配卡]");
    expect(result).toContain("13800138000");
    expect(result).toContain("test@example.com");
    expect(result).toContain("资料完整度");
    expect(result).toContain("核心简历证据");
    expect(result).toContain("简历身份补充");
  });

  it("处理缺失信息", () => {
    const result = buildAiDeliveryUserProfileText({
      resumeIdentity: {
        fullName: "张三"
      }
    });

    expect(result).toContain("[候选人匹配卡]");
    expect(result).toContain("缺失关键字段");
  });
});

describe("buildAiDeliveryJobBaseInfoText - 岗位信息", () => {
  it("完整岗位信息", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: "Java工程师",
      brandIndustry: "互联网",
      jobExperience: "3-5年",
      jobDegree: "本科",
      skills: ["Java", "Spring", "MySQL"],
      cityName: "北京",
      areaDistrict: "朝阳区",
      businessDistrict: "望京",
      salaryDesc: "15k-25k",
      jobLabels: ["远程", "五险一金"],
      brandName: "阿里巴巴",
      brandStageName: "上市公司",
      brandScaleName: "10000人以上",
      welfareList: ["五险一金", "年终奖", "股票期权"]
    });

    expect(result).toContain("[岗位匹配卡]");
    expect(result).toContain("Java工程师");
    expect(result).toContain("互联网");
    expect(result).toContain("3-5年");
    expect(result).toContain("本科");
    expect(result).toContain("Java");
    expect(result).toContain("北京");
    expect(result).toContain("朝阳区");
    expect(result).toContain("望京");
    expect(result).toContain("15k-25k");
    expect(result).toContain("远程");
    expect(result).toContain("阿里巴巴");
  });

  it("部分信息缺失", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: "工程师"
    });

    expect(result).toContain("[岗位匹配卡]");
    expect(result).toContain("工程师");
  });

  it("地点信息组合", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      cityName: "北京",
      areaDistrict: "朝阳区"
    });

    expect(result).toContain("北京 / 朝阳区");
  });
});

describe("buildAiDeliveryJobExtInfoText - 岗位扩展", () => {
  it("完整扩展信息", () => {
    const result = buildAiDeliveryJobExtInfoText({
      activeTimeDesc: "最近一周活跃",
      address: "北京市朝阳区望京SOHO",
      postDescription: "1. 负责系统架构设计\n2. 参与技术方案评审\n3. 指导团队成员"
    });

    expect(result).toContain("[岗位扩展证据]");
    expect(result).toContain("最近一周活跃");
    expect(result).toContain("北京市朝阳区望京SOHO");
    expect(result).toContain("系统架构设计");
  });

  it("处理多行岗位描述", () => {
    const result = buildAiDeliveryJobExtInfoText({
      postDescription: "- 要求1\n- 要求2\n- 要求3\n- 要求4\n- 要求5"
    });

    expect(result).toContain("岗位描述关键证据");
    expect(result).toContain("要求");
  });

  it("处理空岗位描述", () => {
    const result = buildAiDeliveryJobExtInfoText({
      postDescription: ""
    });

    expect(result).toContain("[岗位扩展证据]");
    expect(result).toContain("未提供可用岗位描述");
  });
});

describe("边界条件测试", () => {
  it("超长字符串处理", () => {
    const longString = "a".repeat(500);
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: longString
    });

    expect(result).toContain("[岗位匹配卡]");
  });

  it("特殊字符处理", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: "Java/Kotlin工程师 (高级)",
      brandName: "阿里巴巴&蚂蚁集团"
    });

    expect(result).toContain("Java/Kotlin工程师");
  });

  it("数组为空处理", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      skills: [],
      jobLabels: [],
      welfareList: []
    });

    expect(result).toContain("[岗位匹配卡]");
  });

  it("数组包含空字符串", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      skills: ["", "Java", "", "Python"],
      jobLabels: ["", "远程"]
    });

    expect(result).toContain("Java");
  });

  it("混合类型输入", () => {
    const result = buildAiDeliveryJobBaseInfoText({
      jobName: 123 as any,
      brandName: true as any,
      skills: ["Java", 123 as any, null as any]
    });

    expect(result).toContain("[岗位匹配卡]");
  });
});
