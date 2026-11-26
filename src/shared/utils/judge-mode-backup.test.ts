import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDeliveryFilterExportData, importDeliveryFilterConfig } from './config-manager';
import { selectJudgeMode, normalizeDeliveryStrategy } from './delivery-strategy';

describe('独立的在线简历配置', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { getItem: () => null }));
  afterEach(() => vi.unstubAllGlobals());

  it('切换到在线简历、导出并重新导入后仍使用原版，并能恢复本账号的附件档位', () => {
    const pref: Record<string, unknown> = { deliveryStrategy: 'broad', legacyIncludeUserProfile: false };
    selectJudgeMode(pref, 'online');
    const backup = buildDeliveryFilterExportData(pref);
    expect(backup.aiFilter.strategy).toBe('legacy');
    const recovered = importDeliveryFilterConfig(JSON.parse(JSON.stringify(backup)), {}).preference;
    expect(recovered.deliveryStrategy).toBe('legacy');
    expect(recovered.legacyIncludeUserProfile).toBe(false);
    selectJudgeMode(recovered, 'attachment');
    expect(recovered.deliveryStrategy).toBe('broad');
  });

  it('识别没有策略字段的原版投递过滤备份，并保留其 AI 开关', () => {
    const backup = buildDeliveryFilterExportData({});
    backup.version = 1;
    delete backup.aiFilter.strategy;
    backup.aiFilter.enabled = true;
    const imported = importDeliveryFilterConfig(backup, {});
    expect(imported.preference.deliveryStrategy).toBe('legacy');
    expect(imported.aiConfig.enabled).toBe(true);
    expect(normalizeDeliveryStrategy(undefined)).toBe('expand');
  });

  it('保留已有明确档位的 v1 备份', () => {
    const backup = buildDeliveryFilterExportData({ deliveryStrategy: 'portfolio' });
    backup.version = 1;
    expect(importDeliveryFilterConfig(backup, {}).preference.deliveryStrategy).toBe('portfolio');
  });
});
