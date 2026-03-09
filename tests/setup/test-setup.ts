// -*- coding: utf-8 -*-
import { vi } from 'vitest';

// Mock Tampermonkey GM_* functions
global.GM_getValue = vi.fn((key: string, defaultValue?: any) => defaultValue);
global.GM_setValue = vi.fn();
global.GM_deleteValue = vi.fn();
global.GM_listValues = vi.fn(() => []);
global.GM_addStyle = vi.fn();
global.GM_getResourceText = vi.fn();
global.GM_getResourceURL = vi.fn();
global.GM_registerMenuCommand = vi.fn();
global.GM_unregisterMenuCommand = vi.fn();
global.GM_openInTab = vi.fn();
global.GM_xmlhttpRequest = vi.fn();
global.GM_download = vi.fn();
global.GM_getTab = vi.fn();
global.GM_saveTab = vi.fn();
global.GM_getTabs = vi.fn();
global.GM_notification = vi.fn();
global.GM_setClipboard = vi.fn();
global.GM_info = {
  script: {
    name: 'AI Job Hunting Test',
    version: '1.0.0',
  },
  scriptMetaStr: '',
  scriptWillUpdate: false,
  scriptHandler: 'Tampermonkey',
  version: '4.0',
};

// Mock localStorage if not available
if (typeof window !== 'undefined' && !window.localStorage) {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// Mock sessionStorage if not available
if (typeof window !== 'undefined' && !window.sessionStorage) {
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
}
