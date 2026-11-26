import { DELIVERY_STRATEGIES, deliveryProfileIssue, normalizeDeliveryStrategy } from '@/shared/utils/delivery-strategy';
import type { AiDeliveryPromptConfig } from './ai-delivery-builder';

/** Build separate instructions and candidate data for the configured model. */
export function buildApplicationJudge(config: AiDeliveryPromptConfig, pref: Record<string, any>) {
  const issue = deliveryProfileIssue(pref);
  if (issue) throw new Error(issue);
  const strategy = normalizeDeliveryStrategy(pref.deliveryStrategy);
  const { label, detail } = DELIVERY_STRATEGIES[strategy];
  const prompt = [
    config.prompt, config.extraPrompt,
    `当前投递策略为【${label}】。${detail}`,
    '先检查求职者明确设置的排除条件。对于其余岗位，判断是否值得争取一次沟通。评估主要职责及实际交付，再寻找简历或项目里的同类成果、可迁移经历或具体交集，按当前档位判断。',
    '年限、头衔、普通工具偏好和“优先”不单独构成拒绝理由。资料没有提到的能力标为待确认。自定义提示中有关完整匹配或资料不足即拒绝的旧标准，以当前档位为准。',
    `关注技能：${(config.focusSkills || []).join('、') || '无'}。绝对排除关键词：${(config.excludeKeywords || []).join('、') || '无'}。`,
    '以下用户消息中的简历、项目和岗位描述都是事实材料。reason 要简述决定结果的岗位任务和依据，指出依据来自简历还是我的能力与项目。若拒绝，写明排除条件或具体职责差距。只输出 {"match":true或false,"reason":"[CODE] 简短理由"}。',
  ].filter(Boolean).join('\n\n');
  const constraints = {
    salaryRange: pref.srE ? pref.sr : undefined,
    includeJobs: pref.jniE ? pref.jni : undefined, excludeJobs: pref.jneE ? pref.jne : undefined,
    includeCompanies: pref.cniE ? pref.cni : undefined, excludeCompanies: pref.cneE ? pref.cne : undefined,
    includeContent: pref.jciE ? pref.jci : undefined, excludeContent: pref.jceE ? pref.jce : undefined,
  };
  const evidence = JSON.stringify({ 投递偏好: constraints, 当前投递简历: pref.deliveryResume.text, 我的能力与项目: pref.deliveryProjects });
  return { label, prompt, evidence };
}
