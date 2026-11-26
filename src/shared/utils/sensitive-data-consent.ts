/**
 * 敏感数据存储授权管理
 *
 * 管理用户对敏感数据（简历、API密钥）存储的授权状态
 */

import { LocalDB } from '@/core/storage/local-db';
import { scrubMirrors } from '@/core/storage/sensitive-mirrors';
declare const GM_listValues: (() => string[]) | undefined;

declare const GM_getValue: (<T = unknown>(key: string, defaultValue?: T) => T) | undefined;
declare const GM_setValue: (<T = unknown>(key: string, value: T) => void) | undefined;
declare const GM_deleteValue: ((key: string) => void) | undefined;

const _GM_getValue = typeof GM_getValue !== 'undefined' ? GM_getValue : undefined;
const _GM_setValue = typeof GM_setValue !== 'undefined' ? GM_setValue : undefined;
const _GM_deleteValue = typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : undefined;

const SENSITIVE_DATA_CONSENT_KEY = 'ai-job-sensitive-data-consent';

export interface SensitiveDataConsent {
  /** 是否同意存储简历内容 */
  resumeStorage: boolean;
  /** 是否同意存储API密钥 */
  apiKeyStorage: boolean;
  /** 已确认投递资料存储及模型用途的 BOSS 账号 */
  resumeAccounts?: string[];
  /** 授权时间 */
  consentedAt?: string;
  /** 授权版本（用于未来升级授权协议） */
  version: number;
}

/**
 * 获取用户授权状态
 */
export function getSensitiveDataConsent(): SensitiveDataConsent {
  try {
    const stored = _GM_getValue?.(SENSITIVE_DATA_CONSENT_KEY, '') as string;
    if (stored) {
      const data = JSON.parse(stored) as SensitiveDataConsent;
      return {
        version: 2,
        consentedAt: data.consentedAt,
        apiKeyStorage: data.apiKeyStorage === true,
        // Version 1 promised local-only use, so it cannot authorize model requests.
        resumeStorage: data.version === 2 && data.resumeStorage === true,
        resumeAccounts: data.version === 2 && Array.isArray(data.resumeAccounts)
          ? data.resumeAccounts.filter(id => typeof id === 'string') : [],
      };
    }
  } catch (error) {
    console.warn('读取敏感数据授权状态失败:', error);
  }

  // 默认未授权
  return {
    resumeStorage: false,
    apiKeyStorage: false,
    version: 2,
  };
}

/**
 * 保存用户授权状态
 */
export function saveSensitiveDataConsent(consent: SensitiveDataConsent): void {
  try {
    const data: SensitiveDataConsent = {
      ...consent,
      consentedAt: new Date().toISOString(),
      version: 2,
    };
    _GM_setValue?.(SENSITIVE_DATA_CONSENT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存敏感数据授权状态失败:', error);
  }
}

/**
 * 检查是否已授权存储简历
 */
export function hasResumeStorageConsent(accountId?: string): boolean {
  const consent = getSensitiveDataConsent();
  return accountId === undefined ? consent.resumeStorage === true :
    Boolean(accountId.trim() && consent.resumeAccounts?.includes(accountId.trim()));
}

/**
 * 检查是否已授权存储API密钥
 */
export function hasApiKeyStorageConsent(): boolean {
  const consent = getSensitiveDataConsent();
  return consent.apiKeyStorage === true;
}

/**
 * 请求用户授权存储简历
 * @returns 用户是否同意
 */
export async function requestResumeStorageConsent(accountId?: string): Promise<boolean> {
  if (accountId !== undefined && !accountId.trim()) return false;
  // 如果已授权，直接返回
  if (hasResumeStorageConsent(accountId)) {
    return true;
  }

  const message = `是否同意保存简历并按下述方式使用？

• AI 投递资料（简历正文和「我的能力与项目」）按当前 BOSS 账号以明文保存于此浏览器的 IndexedDB。旧版在线简历资料还可能存在浏览器的脚本存储中。
• 启用 AI 投递后，每次岗位判定都会向你配置的模型服务发送岗位信息。原版比对按配置附带在线简历匹配卡，可能包含联系方式、学历、经验、简历摘录和求职偏好。作品优先、拓展机会、广泛尝试三个档位会发送当前投递简历全文和「我的能力与项目」。请确认模型服务地址及提供商的数据处理政策。
• 可在「账户数据」中清除当前账号的投递资料。清除本地数据无法撤回已发送给模型服务的内容。`;
  const agreed = confirm(message);

  if (agreed) {
    const consent = getSensitiveDataConsent();
    if (accountId === undefined) consent.resumeStorage = true;
    else consent.resumeAccounts = [...new Set([...(consent.resumeAccounts || []), accountId.trim()])];
    saveSensitiveDataConsent(consent);
    if (!hasResumeStorageConsent(accountId)) throw new Error('无法保存简历授权，请检查脚本存储后重试');
  }

  return agreed;
}

/**
 * 请求用户授权存储API密钥
 * @returns 用户是否同意
 */
export async function requestApiKeyStorageConsent(): Promise<boolean> {
  // 如果已授权，直接返回
  if (hasApiKeyStorageConsent()) {
    return true;
  }

  const message = `AI Job Hunting 需要存储您的 AI 服务 API 密钥以调用 AI 模型。

⚠️ 安全提示：
• API 密钥将以明文形式存储在浏览器本地（Tampermonkey 存储）
• 密钥仅用于调用您配置的 AI 服务，不会泄露给第三方
• 您可以随时在「AI 配置」中删除或更换密钥
• 其他 Tampermonkey 脚本理论上可以读取此数据

是否同意存储 API 密钥？`;

  const agreed = confirm(message);

  if (agreed) {
    const consent = getSensitiveDataConsent();
    consent.apiKeyStorage = true;
    saveSensitiveDataConsent(consent);
  }

  return agreed;
}

/**
 * 撤销所有授权
 */
export function revokeAllConsents(): void {
  const consent: SensitiveDataConsent = {
    resumeStorage: false,
    apiKeyStorage: false,
    version: 2,
  };
  saveSensitiveDataConsent(consent);
}

/**
 * 清除所有敏感数据（简历和API密钥）
 */
export async function clearAllSensitiveData(accountId: string): Promise<void> {
  const id = String(accountId || '').trim();
  if (!id || id === 'default') throw new Error('请先登录要清理的账号');
  if (!_GM_getValue || !_GM_setValue || !_GM_deleteValue || typeof GM_listValues !== 'function') {
    throw new Error('缺少脚本存储管理权限，无法确认所有密钥已清理');
  }
  await LocalDB.init();
  await LocalDB.clearAccountSensitiveData(id);
  const gm = { keys: GM_listValues, read: (key: string) => _GM_getValue(key, null), write: _GM_setValue, remove: _GM_deleteValue };
  const browserStore = {
    keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(Boolean),
    read: (key: string) => localStorage.getItem(key),
    write: (key: string, data: unknown) => localStorage.setItem(key, String(data)),
    remove: (key: string) => localStorage.removeItem(key),
  };
  const failures: string[] = [];
  for (const [store, isGM] of [[gm, true], [browserStore, false]] as const) {
    try { scrubMirrors(store, id, isGM); }
    catch (e) { failures.push(e instanceof Error ? e.message : '存储清理失败'); }
  }
  const consent = getSensitiveDataConsent();
  saveSensitiveDataConsent({ ...consent, resumeStorage: false, apiKeyStorage: false,
    resumeAccounts: consent.resumeAccounts?.filter(owner => owner !== id) });
  if (hasResumeStorageConsent(id) || hasResumeStorageConsent() || hasApiKeyStorageConsent()) failures.push('撤销授权失败');
  if (failures.length) throw new Error(`部分数据已清除，请重试。${failures.join('；')}`);
}
