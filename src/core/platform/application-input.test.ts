import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/utils/sensitive-data-consent', () => ({hasResumeStorageConsent: () => true}));
vi.stubGlobal('window', {});
const { BossPlatform } = await import('./boss-platform');
const { runtimeUserStore } = await import('@/core/engine/push-engine');
const { AiPower } = await import('@/core/ai/ai-power');
const { Tools } = await import('@/shared/utils/tools');

describe('AI投递资料门槛', () => {
  it('缺少资料时，在拉取详情前停止，即使启用了传统规则回退', async () => {
    runtimeUserStore.user.preference = { deliveryProjects: '测试项目' };
    const detail = vi.fn();
    const platform = Object.assign(Object.create(BossPlatform.prototype), {
      shouldEnableAiDeliveryJudge: () => true, obtainBossJobDetailExt: detail,
    });
    await expect(platform.matchJob({jobName:'AIGC美术'})).rejects.toThrow('导入当前投递简历');
    expect(detail).not.toHaveBeenCalled();
  });
  it('用户取消授权时，在线匹配卡和附件模式都停在拉取岗位之前', async () => {
    const consent = await import('@/shared/utils/sensitive-data-consent');
    const permission = vi.spyOn(consent, 'hasResumeStorageConsent').mockReturnValue(false);
    const detail = vi.fn();
    try {
      for (const deliveryStrategy of ['legacy', 'portfolio']) {
        runtimeUserStore.user.preference = { deliveryStrategy, deliveryResume: {source:'local', name:'demo.txt', text:'示例'}, deliveryProjects:'项目' };
        const platform = Object.assign(Object.create(BossPlatform.prototype), { shouldEnableAiDeliveryJudge: () => true, obtainBossJobDetailExt: detail });
        await expect(platform.matchJob({jobName:'测试'})).rejects.toThrow('授权');
      }
      expect(detail).not.toHaveBeenCalled();
    } finally { vi.restoreAllMocks(); }
  });
  for (const legacy of [true, false]) {
  it(legacy ? '旧模式调用在线简历匹配卡，可在未导入本地简历时运行' : '新策略使用附件经历及项目', async () => {
    const pref = { deliveryResume: {name:'测试.pdf',source:'local',text:'合成简历'.repeat(300)+'末页独立交付短片'}, deliveryProjects:'负责分镜与剪辑',deliveryStrategy:'expand' };
    runtimeUserStore.user.preference = legacy ? {deliveryStrategy:'legacy'} : pref;
    runtimeUserStore.user.importedResume = { resumeText: '在线简历独有经历'.repeat(20) };
    const answer = vi.spyOn(AiPower, 'filter').mockResolvedValue({data:{code:200,data:'{"match":true,"reason":"[MATCH] 游戏广告需要的分镜与剪辑可由短片经历迁移"}'}});
    vi.spyOn(AiPower,'getFilterTimeoutMs').mockResolvedValue(30000);
    vi.spyOn(AiPower,'getFilterPath').mockResolvedValue('direct');
    vi.spyOn(Tools,'getAiDeliveryJudgeConfig').mockReturnValue({enabled:true,prompt:'',excludeKeywords:[],focusSkills:[],includeUserProfile:true,extraPrompt:'',onAiError:'reject',onInvalidResult:'reject'});
    try {
      const platform = Object.assign(Object.create(BossPlatform.prototype), {
        obtainBossJobDetailExt: async () => ({postDescription:'游戏广告分镜及成片制作'}), markJobProcessed: () => {}, preferenceLogRecorder:{info:vi.fn(),warn:vi.fn()},
      });
      expect(await platform.matchJob({jobName:'游戏广告创意'})).toBe(true);
      if (legacy) {
        expect(answer.mock.calls[0][0]).toContain('[候选人匹配卡]');
        expect(answer.mock.calls[0][0]).toContain('在线简历独有经历');
        expect(answer.mock.calls[0][2]).not.toContain('[候选资料]');
      } else {
        expect(answer.mock.calls[0][0]).toContain('拓展机会');
        expect(answer.mock.calls[0][2]).toContain('末页独立交付短片');
        expect(answer.mock.calls[0][2]).toContain('负责分镜与剪辑');
      }
    } finally { vi.restoreAllMocks(); }
  });
  }
});
