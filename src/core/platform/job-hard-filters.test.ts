import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('window', {});
const consent = await import('@/shared/utils/sensitive-data-consent');
const { BossPlatform } = await import('./boss-platform');
const { runtimeUserStore } = await import('@/core/engine/push-engine');
const { AiPower } = await import('@/core/ai/ai-power');
const { Tools } = await import('@/shared/utils/tools');

function setup(ai: boolean, activeTimeDesc = '刚刚活跃', postDescription = '制作短片') {
  vi.spyOn(consent, 'hasResumeStorageConsent').mockReturnValue(true);
  runtimeUserStore.user.preference = {
    deliveryResume: { name: 'test.txt', source: 'local', text: '短片制作' }, deliveryProjects: '分镜制作',
    traditionalDeliveryE: true, acE: true, acW: true, acM: false, acY: false,
  };
  vi.spyOn(Tools, 'getAiDeliveryJudgeConfig').mockReturnValue({ enabled: ai, includeUserProfile: true,
    prompt: '', extraPrompt: '', focusSkills: [], excludeKeywords: ['外包'],
    onAiError: 'fallback-traditional', onInvalidResult: 'fallback-traditional' });
  vi.spyOn(AiPower, 'getFilterPath').mockResolvedValue('direct');
  vi.spyOn(AiPower, 'getFilterTimeoutMs').mockResolvedValue(1000);
  const model = vi.spyOn(AiPower, 'filter').mockResolvedValue({data:{code:200,data:{match:true, reason:'[MATCH] 相关'}}});
  const platform = Object.assign(Object.create(BossPlatform.prototype), {
    obtainBossJobDetailExt: async () => ({activeTimeDesc, postDescription}),
    markJobProcessed: () => {}, preferenceLogRecorder: {info: vi.fn(), warn: vi.fn()},
  });
  const match = (job: Record<string, unknown> = {}) => platform.matchJob({jobName:'短片制作', skills:['分镜'], ...job});
  return { match, model };
}

afterEach(() => vi.restoreAllMocks());
describe('matchJob 硬性过滤', () => {
  it('否定说明进入模型，跨字段肯定标签仍触发硬过滤', async () => {
    const { match, model } = setup(true, '今日活跃', '自研产品，不是外包岗位');
    expect(await match()).toBe(true);
    await expect(match({ jobLabels:['项目制','外包'] })).rejects.toThrow('命中绝对排除关键词');
    expect(model).toHaveBeenCalledTimes(1);
  });
  it('同一描述中每个命中按其上下文判断', async () => {
    const { match, model } = setup(true, '今日活跃', '本公司非外包，具体岗位为外包驻场');
    await expect(match()).rejects.toThrow('命中绝对排除关键词');
    expect(model).not.toHaveBeenCalled();
  });
  for (const mode of [true, false]) {
    for (const [active, allow] of [['本周活跃',true], ['本月活跃',false], ['半年前活跃',false], ['刚刚活跃',true]] as const) {
      it(`${mode ? 'AI' : '传统'}模式 ${active} ${allow ? '通过' : '拒绝'}`, async () => {
        const { match, model } = setup(mode, active);
        if (allow) expect(await match()).toBe(true);
        else await expect(match()).rejects.toThrow('不满足活跃度检查');
        expect(model).toHaveBeenCalledTimes(mode && allow ? 1 : 0);
      });
    }
  }
  it('符合勾选范围后遇到无效 AI 结果，可按传统规则回退', async () => {
    const {match, model} = setup(true, '本周活跃');
    runtimeUserStore.user.preference.traditionalDeliveryE = false;
    model.mockResolvedValue({data:{code:200,data:null}});
    expect(await match()).toBe(true);
    expect(model).toHaveBeenCalledTimes(1);
  });
  it('关闭活跃度过滤时，未勾选维度仍通过', async () => {
    const { match } = setup(false, '半年前活跃');
    runtimeUserStore.user.preference.acE = false;
    expect(await match()).toBe(true);
  });
});
