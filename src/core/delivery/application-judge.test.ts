import { describe, expect, it } from 'vitest';
import { buildApplicationJudge } from './application-judge';
import { deliveryProfileIssue } from '@/shared/utils/delivery-strategy';

const config = { prompt: '', includeUserProfile: true, excludeKeywords: ['外包'] };
const tail = '独立交付三集 AI 漫剧成片';
const pref = { deliveryResume: { name: 'mock.pdf', source: 'local', text: '正文'.repeat(500) + tail }, deliveryProjects: '主导角色一致性和分镜' };
describe('AI 投递输入', () => {
  it('只使用选定简历全文、项目和投递偏好', () => {
    const { evidence, label, prompt } = buildApplicationJudge(config, { ...pref, importedResume: '旧在线正文', srE: true, sr: '15-30' });
    expect(label).toBe('拓展机会');
    expect(evidence).toContain(tail);
    expect(evidence).toContain(pref.deliveryProjects);
    expect(evidence).toContain('15-30');
    expect(evidence).not.toContain('旧在线正文');
    expect(prompt).toContain('外包');
  });
  it('切换档位改变判断规则', () => {
    for (const [strategy, label] of [['portfolio','作品优先'],['expand','拓展机会'],['broad','广泛尝试']]) {
      const judge = buildApplicationJudge(config, { ...pref, deliveryStrategy: strategy });
      expect(judge.label).toBe(label);
      expect(judge.prompt).toContain(label);
    }
  });
  it('缺少简历或项目时停止判断', () => {
    expect(deliveryProfileIssue({importedResume:{resumeText:'online'}})).toContain('简历');
    expect(() => buildApplicationJudge(config, { ...pref, deliveryProjects:' ' })).toThrow('我的能力与项目');
  });
});
