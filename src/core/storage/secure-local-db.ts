import { Encryption } from './encryption';
import { LocalDB } from './local-db';
import type { AiConfig, UserPreferences, UserProfile } from './types';

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

    return Promise.all(
      configs.map(async (config) => ({
        ...config,
        apiKey: await Encryption.decrypt(config.apiKey)
      }))
    );
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
