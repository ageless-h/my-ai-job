/**
 * 敏感数据存储授权管理
 *
 * 管理用户对敏感数据（简历、API密钥）存储的授权状态
 */

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
      return JSON.parse(stored) as SensitiveDataConsent;
    }
  } catch (error) {
    console.warn('读取敏感数据授权状态失败:', error);
  }

  // 默认未授权
  return {
    resumeStorage: false,
    apiKeyStorage: false,
    version: 1,
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
      version: 1,
    };
    _GM_setValue?.(SENSITIVE_DATA_CONSENT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存敏感数据授权状态失败:', error);
  }
}

/**
 * 检查是否已授权存储简历
 */
export function hasResumeStorageConsent(): boolean {
  const consent = getSensitiveDataConsent();
  return consent.resumeStorage === true;
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
export async function requestResumeStorageConsent(): Promise<boolean> {
  // 如果已授权，直接返回
  if (hasResumeStorageConsent()) {
    return true;
  }

  const message = `AI Job Hunting 需要存储您的简历内容以实现 AI 投递判断功能。

⚠️ 隐私提示：
• 简历将以明文形式存储在浏览器本地（Tampermonkey 存储）
• 仅用于 AI 投递判断，不会上传到第三方服务器
• 您可以随时在「账户与数据」中清除简历数据
• 其他 Tampermonkey 脚本理论上可以读取此数据

是否同意存储简历内容？`;

  const agreed = confirm(message);

  if (agreed) {
    const consent = getSensitiveDataConsent();
    consent.resumeStorage = true;
    saveSensitiveDataConsent(consent);
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
    version: 1,
  };
  saveSensitiveDataConsent(consent);
}

/**
 * 清除所有敏感数据（简历和API密钥）
 */
export function clearAllSensitiveData(): void {
  try {
    // 清除简历数据
    const userProfile = _GM_getValue?.('ai-job-user', '') as string;
    if (userProfile) {
      const user = JSON.parse(userProfile);
      if (user.importedResume) {
        delete user.importedResume.resumeText;
        delete user.importedResume.resumeTextSource;
        _GM_setValue?.('ai-job-user', JSON.stringify(user));
      }
    }

    // 清除所有API密钥
    const aiConfigExt = _GM_getValue?.('ai-job-ai-config-ext', '') as string;
    if (aiConfigExt) {
      const config = JSON.parse(aiConfigExt);
      if (Array.isArray(config.apiConfigs)) {
        config.apiConfigs.forEach((item: any) => {
          const id = item?.id;
          if (id) {
            _GM_deleteValue?.(`ai-job-ai-config-key:${id}`);
          }
        });
      }
    }

    // 撤销授权
    revokeAllConsents();

    console.log('已清除所有敏感数据');
  } catch (error) {
    console.error('清除敏感数据失败:', error);
    throw error;
  }
}
