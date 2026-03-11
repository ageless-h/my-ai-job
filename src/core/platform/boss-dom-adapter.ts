/**
 * BOSS 直聘 DOM 适配器
 *
 * 封装 DOM 查询逻辑，提供选择器降级机制
 * 使用集中化的选择器注册表，便于维护和适配网站改版
 */

import {
  MOUNT_POINT_SELECTORS,
  JOB_CARD_SELECTORS,
  LIST_CONTAINER_SELECTORS,
  PAGINATION_SELECTORS,
  JOB_DETAIL_SELECTORS,
  FAVORITE_BUTTON_SELECTORS,
  SCROLL_CONTAINER_SELECTORS,
  SCRIPT_DETECTION_SELECTORS,
} from '@/shared/selectors/boss-selectors';
import { Logger } from '@/shared/utils/logger';

const logger = Logger.rootLogger;

/**
 * 使用选择器数组查询单个元素（带降级机制）
 */
export function querySelectorWithFallback(
  selectors: readonly string[],
  context: Document | Element = document
): Element | null {
  for (const selector of selectors) {
    try {
      const element = context.querySelector(selector);
      if (element) {
        return element;
      }
    } catch (error) {
      logger.warn(`选择器 "${selector}" 查询失败:`, error);
    }
  }
  return null;
}

/**
 * 使用选择器数组查询多个元素（带降级机制）
 */
export function querySelectorAllWithFallback(
  selectors: readonly string[],
  context: Document | Element = document
): Element[] {
  for (const selector of selectors) {
    try {
      const elements = Array.from(context.querySelectorAll(selector));
      if (elements.length > 0) {
        return elements;
      }
    } catch (error) {
      logger.warn(`选择器 "${selector}" 查询失败:`, error);
    }
  }
  return [];
}

/**
 * BOSS DOM 适配器类
 * 提供高级 DOM 查询方法
 */
export class BossDomAdapter {
  /**
   * 获取页面挂载点
   */
  getMountPoint(pageType: keyof typeof MOUNT_POINT_SELECTORS): Element | null {
    return querySelectorWithFallback(MOUNT_POINT_SELECTORS[pageType]);
  }

  /**
   * 获取职位卡片列表
   */
  getJobCards(): Element[] {
    return querySelectorAllWithFallback(JOB_CARD_SELECTORS.wrapper);
  }

  /**
   * 获取海外版职位卡片
   */
  getOverseasJobCards(): Element[] {
    return querySelectorAllWithFallback(JOB_CARD_SELECTORS.overseasCard);
  }

  /**
   * 获取任意类型的职位卡片
   */
  getAnyJobCard(): Element | null {
    return querySelectorWithFallback(JOB_CARD_SELECTORS.anyCard);
  }

  /**
   * 获取职位卡片中的链接
   */
  getJobCardLink(card: Element): Element | null {
    return querySelectorWithFallback(JOB_CARD_SELECTORS.link, card);
  }

  /**
   * 获取职位名称元素
   */
  getJobNameElement(card: Element): Element | null {
    return querySelectorWithFallback(JOB_CARD_SELECTORS.jobName, card);
  }

  /**
   * 获取公司名称元素
   */
  getCompanyNameElement(card: Element): Element | null {
    return querySelectorWithFallback(JOB_CARD_SELECTORS.companyName, card);
  }

  /**
   * 获取工作地点元素
   */
  getLocationElement(card: Element): Element | null {
    return querySelectorWithFallback(JOB_CARD_SELECTORS.location, card);
  }

  /**
   * 获取职位列表容器
   */
  getJobListContainer(): Element | null {
    return querySelectorWithFallback(LIST_CONTAINER_SELECTORS.jobList);
  }

  /**
   * 获取下一页按钮
   */
  getNextPageButton(): Element | null {
    return querySelectorWithFallback(PAGINATION_SELECTORS.nextPage);
  }

  /**
   * 获取职位详情容器
   */
  getJobDetailContainer(): Element | null {
    return querySelectorWithFallback(JOB_DETAIL_SELECTORS.container);
  }

  /**
   * 获取收藏按钮
   */
  getFavoriteButton(context: Element = document.body): Element | null {
    return querySelectorWithFallback(FAVORITE_BUTTON_SELECTORS.button, context);
  }

  /**
   * 获取推荐页滚动容器
   */
  getRecommendScrollContainer(): Element | null {
    return querySelectorWithFallback(SCROLL_CONTAINER_SELECTORS.recommend);
  }

  /**
   * 检查脚本是否已加载
   */
  isScriptLoaded(src: string): boolean {
    const selector = SCRIPT_DETECTION_SELECTORS.scriptTag(src);
    return document.querySelector(selector) !== null;
  }
}

/**
 * 默认导出单例实例
 */
export const bossDomAdapter = new BossDomAdapter();
