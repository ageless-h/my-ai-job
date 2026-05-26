import { LocalDB, SecureLocalDB } from '@/core/storage';
import type { UserProfile } from '@/core/storage';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.rootLogger;
const AUTH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  success: boolean;
  userId?: string;
  token?: string;
  error?: string;
}

type BossPageContext = {
  token?: unknown;
  uid?: unknown;
};

export class LocalAuthService {
  static extractBossToken(): string | null {
    const token = getBossPageContext().token;
    return typeof token === 'string' && token.trim() ? token : null;
  }

  static extractBossUserId(): string | null {
    const uid = getBossPageContext().uid;
    if (typeof uid === 'string' && uid.trim()) {
      return uid;
    }
    if (typeof uid === 'number' && Number.isFinite(uid)) {
      return String(uid);
    }
    return null;
  }

  static isBossLoggedIn(): boolean {
    return this.extractBossToken() !== null;
  }

  static async authenticate(): Promise<AuthResult> {
    try {
      const token = this.extractBossToken();
      const userId = this.extractBossUserId();

      if (!token) {
        return { success: false, error: '未检测到 BOSS 登录状态，请先登录 BOSS 直聘' };
      }
      if (!userId) {
        return { success: false, error: '未获取到用户 ID，请刷新页面重试' };
      }

      await LocalDB.init();
      const profile: UserProfile = {
        id: userId,
        token,
        authenticatedAt: Date.now()
      };
      await SecureLocalDB.setUserProfile(profile);

      logger.info('Local authentication successful for user:', userId);
      return { success: true, userId, token };
    } catch (error) {
      logger.error('Authentication failed:', error);
      return { success: false, error: error instanceof Error ? error.message : '认证失败' };
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      await LocalDB.init();
      const profile = await SecureLocalDB.getUserProfile();
      if (!profile) {
        return false;
      }

      if (Date.now() - profile.authenticatedAt > AUTH_MAX_AGE_MS) {
        logger.info('Token expired, clearing local authentication');
        await SecureLocalDB.logout();
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check authentication status:', error);
      return false;
    }
  }

  static async getCurrentUser(): Promise<{ userId: string; token: string } | null> {
    if (!(await this.isAuthenticated())) {
      return null;
    }

    const profile = await SecureLocalDB.getUserProfile();
    if (!profile) {
      return null;
    }

    return { userId: profile.id, token: profile.token };
  }

  static async logout(): Promise<void> {
    await LocalDB.init();
    await SecureLocalDB.logout();
    logger.info('User logged out');
  }

  static async refresh(): Promise<AuthResult> {
    await this.logout();
    return this.authenticate();
  }
}

function getBossPageContext(): BossPageContext {
  const root = globalThis as typeof globalThis & {
    unsafeWindow?: { _PAGE?: unknown };
    window?: { _PAGE?: unknown };
  };
  const page = root.unsafeWindow?._PAGE ?? root.window?._PAGE;
  return page && typeof page === 'object' ? (page as BossPageContext) : {};
}
