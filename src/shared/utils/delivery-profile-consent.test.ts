import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
vi.stubGlobal('GM_getValue', (key: string, fallback: string) => storage.get(key) ?? fallback);
vi.stubGlobal('GM_setValue', (key: string, value: string) => storage.set(key, value));
const { getSensitiveDataConsent, hasResumeStorageConsent, requestResumeStorageConsent, revokeAllConsents } = await import('./sensitive-data-consent');
const key = 'ai-job-sensitive-data-consent';

beforeEach(() => storage.clear());

describe('投递资料保存授权', () => {
  it('升级旧的本地存储说明时保留 API 授权，取消后不改写旧记录', async () => {
    const old = JSON.stringify({ version: 1, resumeStorage: true, apiKeyStorage: true });
    storage.set(key, old);
    const prompt = vi.fn(() => false);
    vi.stubGlobal('confirm', prompt);
    expect(hasResumeStorageConsent('account-a')).toBe(false);
    expect(await requestResumeStorageConsent('account-a')).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(storage.get(key)).toBe(old);
    expect(getSensitiveDataConsent().apiKeyStorage).toBe(true);
  });

  it('按当前账号记录确认，切换账号需再次确认，并支持全部撤销', async () => {
    const prompt = vi.fn(() => true);
    vi.stubGlobal('confirm', prompt);
    expect(await requestResumeStorageConsent('account-a')).toBe(true);
    expect(await requestResumeStorageConsent('account-a')).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(prompt.mock.calls[0][0]).toContain('IndexedDB');
    expect(prompt.mock.calls[0][0]).toContain('每次岗位判定');
    expect(prompt.mock.calls[0][0]).toContain('在线简历匹配卡');
    expect(prompt.mock.calls[0][0]).toContain('当前投递简历全文');
    expect(hasResumeStorageConsent('account-b')).toBe(false);
    expect(await requestResumeStorageConsent('account-b')).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(2);
    revokeAllConsents();
    expect(hasResumeStorageConsent('account-a')).toBe(false);
    expect(hasResumeStorageConsent('account-b')).toBe(false);
  });

  it('不将无账号的在线简历授权用于投递，也不会向空账号授予权限', async () => {
    vi.stubGlobal('confirm', () => true);
    expect(await requestResumeStorageConsent()).toBe(true);
    expect(hasResumeStorageConsent('account-a')).toBe(false);
    expect(await requestResumeStorageConsent('  ')).toBe(false);
  });
});
