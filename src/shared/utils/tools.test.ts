import { describe, it, expect } from 'vitest';

describe('tools utility', () => {
  it('应该能够导入Tools工具类', async () => {
    const { Tools } = await import('@/shared/utils/tools');
    expect(Tools).toBeDefined();
  });

  it('应该能够获取AI配置扩展', async () => {
    const { Tools } = await import('@/shared/utils/tools');
    const config = Tools.getAiConfigExt();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('应该能够构建模型通道键', async () => {
    const { Tools } = await import('@/shared/utils/tools');
    const key = Tools.buildModelChannelKey(1, 'deepseek-chat');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('应该能够保存AI配置扩展', async () => {
    const { Tools } = await import('@/shared/utils/tools');
    const config = {
      currentConfig: { provider: 1, modelName: 'test-model' },
      apiConfigs: []
    };
    
    expect(() => Tools.saveAiConfigExt(config)).not.toThrow();
  });
});
