import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/utils/logger', () => ({
  Logger: {
    rootLogger: mocks.logger,
  },
}));

import {
  querySelectorWithFallback,
  querySelectorAllWithFallback,
  BossDomAdapter,
  bossDomAdapter,
} from '@/core/platform/boss-dom-adapter';

describe('querySelectorWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('应该返回第一个匹配的元素', () => {
    const mockElement = { className: 'job-card' };
    vi.stubGlobal('document', {
      querySelector: vi.fn((selector: string) => {
        if (selector === '.job-card-wrap') return mockElement;
        return null;
      }),
    });

    const result = querySelectorWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toBe(mockElement);
  });

  it('应该在第一个选择器失败时尝试第二个选择器', () => {
    const mockElement = { className: 'job-card' };
    vi.stubGlobal('document', {
      querySelector: vi.fn((selector: string) => {
        if (selector === '.job-card') return mockElement;
        return null;
      }),
    });

    const result = querySelectorWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toBe(mockElement);
  });

  it('当所有选择器都失败时应该返回 null', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
    });

    const result = querySelectorWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toBeNull();
  });

  it('当选择器抛出异常时应该记录警告并继续尝试下一个', () => {
    const mockElement = { className: 'job-card' };
    vi.stubGlobal('document', {
      querySelector: vi.fn((selector: string) => {
        if (selector === '.job-card-wrap') {
          throw new Error('Invalid selector');
        }
        if (selector === '.job-card') return mockElement;
        return null;
      }),
    });

    const result = querySelectorWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toBe(mockElement);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('选择器 ".job-card-wrap" 查询失败'),
      expect.any(Error)
    );
  });

  it('应该支持自定义上下文元素', () => {
    const mockElement = { className: 'job-name' };
    const mockContext = {
      querySelector: vi.fn((selector: string) => {
        if (selector === '.job-name') return mockElement;
        return null;
      }),
    };

    const result = querySelectorWithFallback(['.job-name'], mockContext as any);
    expect(result).toBe(mockElement);
    expect(mockContext.querySelector).toHaveBeenCalledWith('.job-name');
  });

  it('当选择器数组为空时应该返回 null', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(),
    });

    const result = querySelectorWithFallback([]);
    expect(result).toBeNull();
  });

  it('当所有选择器都抛出异常时应该返回 null', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => {
        throw new Error('Invalid selector');
      }),
    });

    const result = querySelectorWithFallback(['.invalid-1', '.invalid-2']);
    expect(result).toBeNull();
    expect(mocks.logger.warn).toHaveBeenCalledTimes(2);
  });
});

describe('querySelectorAllWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('应该返回第一个匹配的元素数组', () => {
    const mockElements = [{ className: 'job-card' }, { className: 'job-card' }];
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn((selector: string) => {
        if (selector === '.job-card-wrap') return mockElements;
        return [];
      }),
    });

    const result = querySelectorAllWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toEqual(mockElements);
  });

  it('当第一个选择器返回空数组时应该尝试第二个选择器', () => {
    const mockElements = [{ className: 'job-card' }];
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn((selector: string) => {
        if (selector === '.job-card') return mockElements;
        return [];
      }),
    });

    const result = querySelectorAllWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toEqual(mockElements);
  });

  it('当所有选择器都返回空数组时应该返回空数组', () => {
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn(() => []),
    });

    const result = querySelectorAllWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toEqual([]);
  });

  it('当选择器抛出异常时应该记录警告并继续尝试下一个', () => {
    const mockElements = [{ className: 'job-card' }];
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn((selector: string) => {
        if (selector === '.job-card-wrap') {
          throw new Error('Invalid selector');
        }
        if (selector === '.job-card') return mockElements;
        return [];
      }),
    });

    const result = querySelectorAllWithFallback(['.job-card-wrap', '.job-card']);
    expect(result).toEqual(mockElements);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('选择器 ".job-card-wrap" 查询失败'),
      expect.any(Error)
    );
  });

  it('应该支持自定义上下文元素', () => {
    const mockElements = [{ className: 'job-name' }];
    const mockContext = {
      querySelectorAll: vi.fn((selector: string) => {
        if (selector === '.job-name') return mockElements;
        return [];
      }),
    };

    const result = querySelectorAllWithFallback(['.job-name'], mockContext as any);
    expect(result).toEqual(mockElements);
    expect(mockContext.querySelectorAll).toHaveBeenCalledWith('.job-name');
  });

  it('当选择器数组为空时应该返回空数组', () => {
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn(),
    });

    const result = querySelectorAllWithFallback([]);
    expect(result).toEqual([]);
  });

  it('当所有选择器都抛出异常时应该返回空数组', () => {
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn(() => {
        throw new Error('Invalid selector');
      }),
    });

    const result = querySelectorAllWithFallback(['.invalid-1', '.invalid-2']);
    expect(result).toEqual([]);
    expect(mocks.logger.warn).toHaveBeenCalledTimes(2);
  });
});

describe('BossDomAdapter', () => {
  let adapter: BossDomAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    adapter = new BossDomAdapter();
  });

  describe('getMountPoint', () => {
    it('应该返回聊天页面挂载点', () => {
      const mockElement = { className: 'chat-conversation' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.chat-conversation') return mockElement;
          return null;
        }),
      });

      const result = adapter.getMountPoint('chat');
      expect(result).toBe(mockElement);
    });

    it('应该返回推荐页挂载点', () => {
      const mockElement = { className: 'recommend-search-inner' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.recommend-search-inner') return mockElement;
          return null;
        }),
      });

      const result = adapter.getMountPoint('recommend');
      expect(result).toBe(mockElement);
    });

    it('当挂载点不存在时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getMountPoint('chat');
      expect(result).toBeNull();
    });
  });

  describe('getJobCards', () => {
    it('应该返回职位卡片列表', () => {
      const mockCards = [{ className: 'job-card-wrap' }, { className: 'job-card-wrap' }];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn((selector: string) => {
          if (selector === '.job-list-container .job-card-wrap') return mockCards;
          return [];
        }),
      });

      const result = adapter.getJobCards();
      expect(result).toEqual(mockCards);
    });

    it('当没有职位卡片时应该返回空数组', () => {
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn(() => []),
      });

      const result = adapter.getJobCards();
      expect(result).toEqual([]);
    });
  });

  describe('getOverseasJobCards', () => {
    it('应该返回海外版职位卡片列表', () => {
      const mockCards = [{ className: 'job-card-box' }];
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn((selector: string) => {
          if (selector === '.job-card-box') return mockCards;
          return [];
        }),
      });

      const result = adapter.getOverseasJobCards();
      expect(result).toEqual(mockCards);
    });

    it('当没有海外版卡片时应该返回空数组', () => {
      vi.stubGlobal('document', {
        querySelectorAll: vi.fn(() => []),
      });

      const result = adapter.getOverseasJobCards();
      expect(result).toEqual([]);
    });
  });

  describe('getAnyJobCard', () => {
    it('应该返回任意类型的职位卡片', () => {
      const mockElement = { className: 'job-card-wrapper' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.job-card-wrapper') return mockElement;
          return null;
        }),
      });

      const result = adapter.getAnyJobCard();
      expect(result).toBe(mockElement);
    });

    it('当没有任何职位卡片时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getAnyJobCard();
      expect(result).toBeNull();
    });
  });

  describe('getJobCardLink', () => {
    it('应该返回职位卡片中的链接', () => {
      const mockLink = { href: '/job/123' };
      const mockCard = {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'a.job-card-left') return mockLink;
          return null;
        }),
      };

      const result = adapter.getJobCardLink(mockCard as any);
      expect(result).toBe(mockLink);
    });

    it('当卡片中没有链接时应该返回 null', () => {
      const mockCard = {
        querySelector: vi.fn(() => null),
      };

      const result = adapter.getJobCardLink(mockCard as any);
      expect(result).toBeNull();
    });
  });

  describe('getJobNameElement', () => {
    it('应该返回职位名称元素', () => {
      const mockElement = { textContent: '前端工程师' };
      const mockCard = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.job-name') return mockElement;
          return null;
        }),
      };

      const result = adapter.getJobNameElement(mockCard as any);
      expect(result).toBe(mockElement);
    });

    it('当卡片中没有职位名称时应该返回 null', () => {
      const mockCard = {
        querySelector: vi.fn(() => null),
      };

      const result = adapter.getJobNameElement(mockCard as any);
      expect(result).toBeNull();
    });
  });

  describe('getCompanyNameElement', () => {
    it('应该返回公司名称元素', () => {
      const mockElement = { textContent: '字节跳动' };
      const mockCard = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.boss-info') return mockElement;
          return null;
        }),
      };

      const result = adapter.getCompanyNameElement(mockCard as any);
      expect(result).toBe(mockElement);
    });

    it('当卡片中没有公司名称时应该返回 null', () => {
      const mockCard = {
        querySelector: vi.fn(() => null),
      };

      const result = adapter.getCompanyNameElement(mockCard as any);
      expect(result).toBeNull();
    });
  });

  describe('getLocationElement', () => {
    it('应该返回工作地点元素', () => {
      const mockElement = { textContent: '上海' };
      const mockCard = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.company-location') return mockElement;
          return null;
        }),
      };

      const result = adapter.getLocationElement(mockCard as any);
      expect(result).toBe(mockElement);
    });

    it('当卡片中没有工作地点时应该返回 null', () => {
      const mockCard = {
        querySelector: vi.fn(() => null),
      };

      const result = adapter.getLocationElement(mockCard as any);
      expect(result).toBeNull();
    });
  });

  describe('getJobListContainer', () => {
    it('应该返回职位列表容器', () => {
      const mockContainer = { className: 'job-list-container' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.job-list-container') return mockContainer;
          return null;
        }),
      });

      const result = adapter.getJobListContainer();
      expect(result).toBe(mockContainer);
    });

    it('当列表容器不存在时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getJobListContainer();
      expect(result).toBeNull();
    });
  });

  describe('getNextPageButton', () => {
    it('应该返回下一页按钮', () => {
      const mockButton = { className: 'ui-icon-arrow-right' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.ui-icon-arrow-right') return mockButton;
          return null;
        }),
      });

      const result = adapter.getNextPageButton();
      expect(result).toBe(mockButton);
    });

    it('当下一页按钮不存在时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getNextPageButton();
      expect(result).toBeNull();
    });
  });

  describe('getJobDetailContainer', () => {
    it('应该返回职位详情容器', () => {
      const mockContainer = { className: 'job-detail-box' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.job-detail-box') return mockContainer;
          return null;
        }),
      });

      const result = adapter.getJobDetailContainer();
      expect(result).toBe(mockContainer);
    });

    it('当详情容器不存在时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getJobDetailContainer();
      expect(result).toBeNull();
    });
  });

  describe('getFavoriteButton', () => {
    it('应该返回收藏按钮', () => {
      const mockButton = { className: 'favorite-btn' };
      const mockContext = {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'button') return mockButton;
          return null;
        }),
      };

      const result = adapter.getFavoriteButton(mockContext as any);
      expect(result).toBe(mockButton);
    });

    it('当没有指定上下文时应该使用 document.body', () => {
      const mockButton = { className: 'favorite-btn' };
      vi.stubGlobal('document', {
        body: {
          querySelector: vi.fn((selector: string) => {
            if (selector === 'button') return mockButton;
            return null;
          }),
        },
      });

      const result = adapter.getFavoriteButton();
      expect(result).toBe(mockButton);
    });

    it('当收藏按钮不存在时应该返回 null', () => {
      const mockContext = {
        querySelector: vi.fn(() => null),
      };

      const result = adapter.getFavoriteButton(mockContext as any);
      expect(result).toBeNull();
    });
  });

  describe('getRecommendScrollContainer', () => {
    it('应该返回推荐页滚动容器', () => {
      const mockContainer = { className: 'job-list-container' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === '.job-list-container') return mockContainer;
          return null;
        }),
      });

      const result = adapter.getRecommendScrollContainer();
      expect(result).toBe(mockContainer);
    });

    it('当滚动容器不存在时应该返回 null', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.getRecommendScrollContainer();
      expect(result).toBeNull();
    });
  });

  describe('isScriptLoaded', () => {
    it('应该返回 true 当脚本已加载', () => {
      const mockScript = { src: 'https://example.com/script.js' };
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'script[src="https://example.com/script.js"]') {
            return mockScript;
          }
          return null;
        }),
      });

      const result = adapter.isScriptLoaded('https://example.com/script.js');
      expect(result).toBe(true);
    });

    it('应该返回 false 当脚本未加载', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn(() => null),
      });

      const result = adapter.isScriptLoaded('https://example.com/script.js');
      expect(result).toBe(false);
    });

    it('应该正确处理特殊字符的脚本 URL', () => {
      vi.stubGlobal('document', {
        querySelector: vi.fn((selector: string) => {
          if (selector === 'script[src="https://example.com/script?v=1&t=2"]') {
            return { src: 'https://example.com/script?v=1&t=2' };
          }
          return null;
        }),
      });

      const result = adapter.isScriptLoaded('https://example.com/script?v=1&t=2');
      expect(result).toBe(true);
    });
  });
});

describe('bossDomAdapter singleton', () => {
  it('应该导出 BossDomAdapter 的单例实例', () => {
    expect(bossDomAdapter).toBeInstanceOf(BossDomAdapter);
  });

  it('单例实例应该有所有公共方法', () => {
    expect(typeof bossDomAdapter.getMountPoint).toBe('function');
    expect(typeof bossDomAdapter.getJobCards).toBe('function');
    expect(typeof bossDomAdapter.getOverseasJobCards).toBe('function');
    expect(typeof bossDomAdapter.getAnyJobCard).toBe('function');
    expect(typeof bossDomAdapter.getJobCardLink).toBe('function');
    expect(typeof bossDomAdapter.getJobNameElement).toBe('function');
    expect(typeof bossDomAdapter.getCompanyNameElement).toBe('function');
    expect(typeof bossDomAdapter.getLocationElement).toBe('function');
    expect(typeof bossDomAdapter.getJobListContainer).toBe('function');
    expect(typeof bossDomAdapter.getNextPageButton).toBe('function');
    expect(typeof bossDomAdapter.getJobDetailContainer).toBe('function');
    expect(typeof bossDomAdapter.getFavoriteButton).toBe('function');
    expect(typeof bossDomAdapter.getRecommendScrollContainer).toBe('function');
    expect(typeof bossDomAdapter.isScriptLoaded).toBe('function');
  });
});
