import { Encryption } from './encryption';
import { LocalDB } from './local-db';
import { Logger } from '@/shared/utils/logger';
import type { AiConfig, UserPreferences, UserProfile } from './types';

const logger = Logger.rootLogger;

export class SecureLocalDB {
  static async setUserProfile(profile: UserProfile): Promise<void> {
    await LocalDB.setUserProfile({
      ...profile,
      token: await Encryption.encrypt(profile.token)
    });
  }

  static async getUserProfile(): Promise<UserProfile | undefined> {
    const profile = await LocalDB.getUserProfile();
    if (!profile) {
      return undefined;
    }

    return {
      ...profile,
      token: await Encryption.decrypt(profile.token)
    };
  }

  static async saveAiConfig(config: AiConfig): Promise<void> {
    await LocalDB.saveAiConfig({
      ...config,
      apiKey: await Encryption.encrypt(config.apiKey)
    });
  }

  static async getAiConfigs(): Promise<AiConfig[]> {
    const configs = await LocalDB.getAiConfigs();

    // 使用 allSettled 避免单条记录解密失败导致整体不可用：
    // 例如旧的 / 损坏的 / 跨环境导入的配置 apiKey 无法解密时，
    // 仍要让其余可用配置能被读取，否则 AI 投递会整体失效。
    const results = await Promise.allSettled(
      configs.map(async (config) => ({
        ...config,
        apiKey: await Encryption.decrypt(config.apiKey)
      }))
    );

    const decrypted: AiConfig[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        decrypted.push(result.value);
      } else {
        const broken = configs[index];
        logger.warn(
          `Skip AI config that failed to decrypt: id=${broken?.id} name=${broken?.name} isActive=${broken?.isActive}`,
          result.reason
        );
      }
    });
    return decrypted;
  }

  static async getActiveAiConfig(): Promise<AiConfig | undefined> {
    const configs = await this.getAiConfigs();
    return configs.find((config) => config.isActive);
  }

  static async setActiveAiConfig(id: string): Promise<void> {
    const configs = await LocalDB.getAiConfigs();

    await Promise.all(
      configs.map((config) =>
        LocalDB.saveAiConfig({
          ...config,
          isActive: config.id === id
        })
      )
    );
  }

  static async deleteAiConfig(id: string): Promise<void> {
    await LocalDB.deleteAiConfig(id);
  }

  static async savePreferences(preferences: UserPreferences): Promise<void> {
    await LocalDB.savePreferences(preferences);
  }

  static async getPreferences(): Promise<UserPreferences | undefined> {
    return await LocalDB.getPreferences();
  }

  static async exportEncryptedData(): Promise<string> {
    const data = await LocalDB.exportAllData();
    return JSON.stringify(data, null, 2);
  }

  static async importEncryptedData(jsonString: string): Promise<void> {
    try {
      const data: unknown = JSON.parse(jsonString);
      await LocalDB.importAllData(data as Parameters<typeof LocalDB.importAllData>[0]);
    } catch (error) {
      throw new Error(`Failed to import encrypted data: ${errorMessage(error)}`);
    }
  }

  static async logout(): Promise<void> {
    await LocalDB.clearUserProfile();
    Encryption.clearKey();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
