/**
 * BOSS 直聘 DOM 选择器注册表
 *
 * 集中管理所有 DOM 选择器，便于维护和适配 BOSS 网站改版
 * 每个选择器组包含主选择器和降级选择器（fallback）
 */

/**
 * 页面挂载点选择器
 */
export const MOUNT_POINT_SELECTORS = {
  /** 聊天页面挂载点 */
  chat: ['.chat-conversation', '.chat-container', '.geek-chat'],
  /** 推荐页挂载点 */
  recommend: ['.recommend-search-inner', '.recommend-container', '.job-recommend'],
  /** 职位列表挂载点 */
  jobList: ['.job-recommend-result', '.job-result', '.jobs-container'],
  /** 职位详情页挂载点 */
  jobDetail: ['.page-job-inner', '.job-page', '.job-container'],
  /** 海外页面挂载点 */
  overseas: ['.mod-header', '.header', '.page-header'],
} as const;

/**
 * 职位卡片选择器
 */
export const JOB_CARD_SELECTORS = {
  /** 职位卡片包装器 */
  wrapper: [
    '.job-list-container .job-card-wrap',
    '.job-list .job-card-wrap',
    '.rec-job-list .job-card-wrap',
    '.job-card-wrap',
  ],
  /** 海外版职位卡片 */
  overseasCard: ['.job-card-box'],
  /** 旧版职位卡片 */
  legacyCard: ['.job-card-wrapper'],
  /** 职位卡片查找（通用） */
  anyCard: ['.job-card-wrapper', '.job-card-wrap', '.job-card-box'],
  /** 卡片链接 */
  link: ['a.job-card-left', 'a.job-name', 'a', "[class*='job-card-left']"],
  /** 职位名称 */
  jobName: ['.job-name', '.job-title', '.job-info .job-name'],
  /** 公司名称 */
  companyName: ['.boss-info', '.company-name', '.brand-name'],
  /** 工作地点 */
  location: ['.company-location', '.job-area'],
} as const;

/**
 * 列表容器选择器
 */
export const LIST_CONTAINER_SELECTORS = {
  /** 职位列表容器 */
  jobList: ['.job-list-container', '.job-list', '.jobs-list'],
  /** 海外列表容器 */
  overseasList: ['.job-list'],
} as const;

/**
 * 分页导航选择器
 */
export const PAGINATION_SELECTORS = {
  /** 下一页按钮 */
  nextPage: ['.ui-icon-arrow-right'],
} as const;

/**
 * 职位详情选择器
 */
export const JOB_DETAIL_SELECTORS = {
  /** 详情容器 */
  container: ['.job-detail-box', '.job-detail', '.job-detail-container'],
} as const;

/**
 * 收藏按钮选择器
 */
export const FAVORITE_BUTTON_SELECTORS = {
  /** 收藏按钮候选 */
  button: [
    'button',
    'a',
    "[role='button']",
    "[class*='collect']",
    "[class*='favorite']",
    "[class*='star']",
  ],
} as const;

/**
 * 滚动容器选择器
 */
export const SCROLL_CONTAINER_SELECTORS = {
  /** 推荐页滚动容器 */
  recommend: ['.job-list-container', '.job-list', '.recommend-job-list', '.recommend-search-inner'],
} as const;

/**
 * 脚本检测选择器
 */
export const SCRIPT_DETECTION_SELECTORS = {
  /** 检查脚本是否已加载 */
  scriptTag: (src: string) => `script[src="${src}"]`,
} as const;

/**
 * FAB（浮动操作按钮）相关选择器
 */
export const FAB_SELECTORS = {
  /** FAB 碰撞检测选择器 */
  collision: [
    '.zp-side-entry-jobs',
    '.zp-side-entry-question',
    '.side-entry.side-entry-jobs',
    '.side-entry.side-entry-question',
    '.c-job-tools.job-tools',
    '.vip-guide.sider-box',
    '.job-tools-banners',
    '.banner-item.template-banner',
  ],
  /** FAB 锚点选择器 */
  anchor: [
    '.zp-side-entry-jobs',
    '.zp-side-entry-question',
    '.side-entry.side-entry-jobs',
    '.side-entry.side-entry-question',
  ],
} as const;

/**
 * 表单清理选择器
 */
export const FORM_SELECTORS = {
  /** 需要清理 nbsp 的表单标签 */
  labelCleanup: ['.form-preference .el-form-item__label', '.ai-config .el-form-item__label'],
} as const;

/**
 * 所有选择器的类型定义
 */
export type BossSelectorCategory =
  | typeof MOUNT_POINT_SELECTORS
  | typeof JOB_CARD_SELECTORS
  | typeof LIST_CONTAINER_SELECTORS
  | typeof PAGINATION_SELECTORS
  | typeof JOB_DETAIL_SELECTORS
  | typeof FAVORITE_BUTTON_SELECTORS
  | typeof SCROLL_CONTAINER_SELECTORS
  | typeof FAB_SELECTORS
  | typeof FORM_SELECTORS;
