import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from './user';
import { getLocalUser } from './user';

// Mock Tools
vi.mock('@/shared/utils/tools', () => ({
  Tools: {
    getStoredUserProfileRaw: vi.fn(
      () => '{"phone":"13800138000","email":"test@example.com","preference":{},"preferenceMap":{}}'
    ),
    setStoredUserProfileRaw: vi.fn(),
  },
}));

// Mock Logger
vi.mock('@/shared/utils/logger', () => ({
  Logger: {
    rootLogger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// Mock preference migration
vi.mock('@/shared/utils/preference', () => ({
  migratePreferenceKeys: vi.fn(),
}));

describe('UserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('应该正确初始化', () => {
    const store = useUserStore();
    expect(store.user).toBeDefined();
    expect(store.user.preference).toBeDefined();
  });

  it('应该从本地存储加载用户数据', () => {
    const user = getLocalUser();
    expect(user.phone).toBe('13800138000');
    expect(user.email).toBe('test@example.com');
  });

  it('应该能够更新用户偏好设置', () => {
    const store = useUserStore();
    const newPreference = { pushInterval: 5000, pushLimit: 20 };

    store.user.preference = newPreference;
    expect(store.user.preference.pushInterval).toBe(5000);
    expect(store.user.preference.pushLimit).toBe(20);
  });

  it('应该能够更新用户手机号', () => {
    const store = useUserStore();
    store.user.phone = '13900139000';
    expect(store.user.phone).toBe('13900139000');
  });

  it('应该能够更新用户邮箱', () => {
    const store = useUserStore();
    store.user.email = 'new@example.com';
    expect(store.user.email).toBe('new@example.com');
  });
});
