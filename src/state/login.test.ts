import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLoginStore } from './login';

describe('LoginStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('应该正确初始化', () => {
    const store = useLoginStore();
    expect(store.login).toBeUndefined();
    expect(store.loginFailStatus).toBeUndefined();
  });

  it('loginSuccess应该设置登录成功状态', () => {
    const store = useLoginStore();
    store.loginSuccess();

    expect(store.login).toBe(true);
    expect(store.loginFailStatus).toBe(false);
  });

  it('loginFail应该设置登录失败状态', () => {
    const store = useLoginStore();
    store.loginFail();

    expect(store.login).toBe(false);
    expect(store.loginFailStatus).toBe(true);
  });

  it('应该能够多次切换登录状态', () => {
    const store = useLoginStore();

    store.loginSuccess();
    expect(store.login).toBe(true);

    store.loginFail();
    expect(store.login).toBe(false);

    store.loginSuccess();
    expect(store.login).toBe(true);
  });
});
