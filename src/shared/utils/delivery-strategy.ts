export const DELIVERY_STRATEGIES = {
  legacy: { label: '原版在线简历匹配', detail: '使用在线简历匹配卡，综合比对职能、行业、技能、经验、学历和城市。' },
  portfolio: { label: '作品优先', detail: '做过相同或相近的交付，就值得争取。' },
  expand: { label: '拓展机会', detail: '已有经历可迁移到岗位主要任务，就值得争取。' },
  broad: { label: '广泛尝试', detail: '工作内容与已有经历有一项具体交集，就值得沟通。' },
} as const;

export type DeliveryStrategy = keyof typeof DELIVERY_STRATEGIES;

export function normalizeDeliveryStrategy(value: unknown): DeliveryStrategy {
  return value === 'legacy' || value === 'portfolio' || value === 'broad' ? value : 'expand';
}

export type AttachmentStrategy = Exclude<DeliveryStrategy, 'legacy'>;
export function attachmentStrategy(pref: Record<string, unknown>): AttachmentStrategy {
  const selected = normalizeDeliveryStrategy(pref.deliveryStrategy === 'legacy' ? pref.lastAttachmentStrategy : pref.deliveryStrategy);
  return selected === 'legacy' ? 'expand' : selected;
}

export function selectJudgeMode(pref: Record<string, unknown>, mode: 'online' | 'attachment'): void {
  const last = attachmentStrategy(pref);
  pref.lastAttachmentStrategy = last;
  pref.deliveryStrategy = mode === 'online' ? 'legacy' : last;
}

export function deliveryProfileIssue(preference: Record<string, any>): string {
  const resume = preference.deliveryResume;
  if (!resume || !['boss', 'local'].includes(resume.source) || typeof resume.text !== 'string' || !resume.text.trim()) {
    return '请在「账户数据」导入当前投递简历并确认正文';
  }
  if (typeof preference.deliveryProjects !== 'string' || !preference.deliveryProjects.trim()) {
    return '请在「账户数据」填写并保存「我的能力与项目」';
  }
  return '';
}
