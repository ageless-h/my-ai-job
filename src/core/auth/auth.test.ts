import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/http/request', () => ({
  request: {
    get: vi.fn(),
    post: vi.fn()
  },
  showAppMessage: vi.fn()
}));

vi.mock('@/core/auth/auth-session', () => ({
  setAuthorizationToken: vi.fn()
}));

vi.mock('@/state/login', () => ({
  useLoginStore: vi.fn(() => ({
    isLogin: false,
    setLogin: vi.fn()
  }))
}));

vi.mock('@/state/user', () => ({
  useUserStore: vi.fn(() => ({
    user: {},
    setUser: vi.fn()
  }))
}));

describe('auth module', () => {
  it('应该能够导入fetchWithGM_request', async () => {
    const { fetchWithGM_request } = await import('@/core/auth/auth');
    expect(typeof fetchWithGM_request).toBe('function');
  });
});
