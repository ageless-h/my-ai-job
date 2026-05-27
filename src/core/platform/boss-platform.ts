import { AiPower } from '@/core/ai/ai-power';
import {
  AbsPlatform,
  PushResultStatus,
  PushStatus,
  pushResultCounter,
  runtimeUserStore,
} from '@/core/engine/push-engine';
import { Logger } from '@/shared/utils/logger';
import { Tools } from '@/shared/utils/tools';
import { extractResumeTextFromHtml } from '@/shared/utils/resume';
import { getPreferenceValue, normalizePreferenceBoolean } from '@/shared/utils/preference';
import {
  buildAiDeliveryFilterJobInput,
  buildAiDeliveryJudgePrompt,
  buildAiDeliveryUserProfile,
  buildTraditionalRuleSnapshot,
  resolveAiDeliveryFallback,
} from '@/core/delivery/ai-delivery-builder';
import { TampermonkeyApi } from '@/shared/utils/tampermonkey';
import {
  NotMatchError,
  PushRequestError,
  FavoriteRequestError,
  FetchJobDetailError,
  PushLimitError,
  PushStopError,
} from '@/shared/errors';
import { Message } from '@/core/protocol/message';
import { simulateScrollToEnd } from '@/shared/utils/scroll';
import {
  querySelectorWithFallback,
  querySelectorAllWithFallback,
} from '@/core/platform/boss-dom-adapter';
import { BossApiClient } from '@/core/platform/boss-api-client';

const logger$1 = Logger.rootLogger;
const AI_DELIVERY_JUDGE_DEFAULT_TIMEOUT_MS = 30_000;
const RUNTIME_RESUME_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const toText = (value: unknown, maxLength = 500): string => {
  const text = `${value || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

async function setChatWebsocket(): Promise<void> {
  logger$1.info('check ChatWebsocket runtime channels');
  if (!Tools.isBossDomainHost(Tools.getCurrentHostname())) {
    logger$1.warn('当前域名不受信任，跳过消息通道初始化');
    return;
  }

  const runtimeWindow = Tools.window as Window & {
    ChatWebsocket?: unknown;
    ChatWebsocketImage?: unknown;
  };
  if (!runtimeWindow.ChatWebsocketImage && runtimeWindow.ChatWebsocket) {
    runtimeWindow.ChatWebsocketImage = runtimeWindow.ChatWebsocket;
    logger$1.info('复用 ChatWebsocket 作为图片消息通道');
    return;
  }

  if (runtimeWindow.ChatWebsocketImage) {
    logger$1.info('图片消息通道已就绪');
    return;
  }

  const scriptCandidates = [
    'https://www.zhipin.com/web/common/security-js/socket.js',
    'https://static.zhipin.com/web/common/security-js/socket.js',
  ];

  const loadScript = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!Tools.isTrustedBossStaticUrl(src)) {
        resolve(false);
        return;
      }

      const existing = document.querySelector(`script[src=\"${src}\"]`) as HTMLScriptElement | null;
      if (existing) {
        if (runtimeWindow.ChatWebsocketImage || runtimeWindow.ChatWebsocket) {
          resolve(true);
          return;
        }

        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        window.setTimeout(
          () => resolve(!!(runtimeWindow.ChatWebsocketImage || runtimeWindow.ChatWebsocket)),
          1800
        );
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => resolve(true), { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      document.head.appendChild(script);
      window.setTimeout(
        () => resolve(!!(runtimeWindow.ChatWebsocketImage || runtimeWindow.ChatWebsocket)),
        2500
      );
    });
  };

  for (const scriptSrc of scriptCandidates) {
    const loaded = await loadScript(scriptSrc);
    if (!loaded) {
      continue;
    }

    if (!runtimeWindow.ChatWebsocketImage && runtimeWindow.ChatWebsocket) {
      runtimeWindow.ChatWebsocketImage = runtimeWindow.ChatWebsocket;
    }

    if (runtimeWindow.ChatWebsocketImage) {
      logger$1.info('图片消息通道已通过 socket.js 初始化');
      return;
    }
  }

  logger$1.warn('未发现可用消息通道，自动图片消息将跳过');
}

/**
 * 收藏动作在不同执行通道下的统一返回结构。
 */
type FavoriteResp = {
  success: boolean;
  verified?: boolean;
  channel?: string;
  message: string;
};

/**
 * BOSS 直聘平台核心适配器。
 *
 * 负责岗位列表采集、分页滚动、职位匹配、投递与收藏执行、
 * 消息通道初始化、简历运行时补全以及相关状态管理。
 */
export class BossPlatform extends AbsPlatform {
  /** 当前页面地址，用于识别所处页面场景。 */
  curUrl: string;
  /** 平台名称。 */
  name = 'Boss';
  /** 平台匹配所使用的 URL 关键字。 */
  urlList = ['/web/geek', 'overseas'];
  /** 最近一次翻页前记录的列表滚动高度。 */
  lastHeight = 0;
  /** BOSS 详情缓存，按最近使用时间维护淘汰顺序。 */
  bossDataCache = new Map<string, { data: any; timestamp: number }>();
  /** BOSS 详情缓存允许保留的最大条目数。 */
  private readonly MAX_BOSS_CACHE = 100;
  /** 最近一次自动沟通动作的时间戳，用于节流。 */
  lastAutoContactTs = 0;
  /** 职位列表页上一次记录的岗位卡片数量。 */
  private lastJobCardCount = 0;
  /** 职位列表页上一次记录的尾部岗位稳定键。 */
  private lastJobsTailKey = '';
  /** 推荐列表页上一次记录的岗位卡片数量。 */
  private lastRecommendCardCount = 0;
  /** 推荐列表页上一次记录的尾部岗位稳定键。 */
  private lastRecommendTailKey = '';
  /** 职位列表页上一次记录的首尾岗位签名。 */
  private lastJobsListSignature = '';
  /** 推荐列表页上一次记录的首尾岗位签名。 */
  private lastRecommendListSignature = '';
  /** 推荐页连续未检测到增量数据的轮次计数。 */
  private recommendNoProgressRounds = 0;
  /** 当前会话内已处理岗位的稳定键集合，用于去重。 */
  private sessionProcessedJobKeys = new Map<string, number>();
  /** 已处理岗位去重集合允许保留的最大条目数。 */
  private readonly MAX_PROCESSED_JOBS = 500;
  /** 最近一次尝试刷新运行时简历文本的时间戳。 */
  private lastRuntimeResumeRefreshTs = 0;
  /** 正在进行中的运行时简历文本刷新任务。 */
  private runtimeResumeRefreshPromise: Promise<void> | null = null;
  /** BOSS 平台接口客户端。 */
  private apiClient: BossApiClient;

  /**
   * 创建 BOSS 平台适配器实例。
   *
   * @param curUrl 当前页面地址。
   */
  constructor(curUrl: string) {
    super();
    this.curUrl = curUrl;
    this.apiClient = new BossApiClient();
  }

  /**
   * 获取平台类型编号。
   *
   * @returns 固定返回 BOSS 平台对应的类型编号。
   */
  getPlatformType(): number {
    return 0;
  }

  /**
   * 获取面板挂载元素以及插入位置。
   *
   * 会根据当前 URL 场景选择最合适的挂载节点；如果多次轮询仍未命中，
   * 则回退到 `body` 或根节点，确保面板仍可渲染。
   *
   * @returns 包含挂载元素和插入位置的异步结果。
   */
  getMountEle(): Promise<{ el: Element; p: string }> {
    return new Promise((resolve) => {
      let count = 0;
      const interval = setInterval(() => {
        let element: Element | null = null;
        let p = '';

        if (this.curUrl.includes('www.zhipin.com/web/geek/chat')) {
          element = querySelectorWithFallback([
            '.chat-conversation',
            '.chat-container',
            '.geek-chat',
          ]);
        }

        if (this.curUrl.includes('www.zhipin.com/web/geek/job-recommend')) {
          element = querySelectorWithFallback([
            '.recommend-search-inner',
            '.recommend-container',
            '.job-recommend',
          ]);
          p = 'end';
        }

        if (this.curUrl.includes('www.zhipin.com/web/geek/jobs')) {
          element = querySelectorWithFallback([
            '.job-recommend-result',
            '.job-result',
            '.jobs-container',
          ]);
        } else if (this.curUrl.includes('www.zhipin.com/web/geek/job')) {
          element = querySelectorWithFallback(['.page-job-inner', '.job-page', '.job-container']);
        }

        if (this.curUrl.includes('www.zhipin.com/web/geek/resume')) {
          element = document.body;
          p = 'end';
        }

        if (this.curUrl.includes('overseas')) {
          element = querySelectorWithFallback(['.mod-header', '.header', '.page-header']);
        }

        if (element !== null) {
          clearInterval(interval);
          resolve({ el: element, p });
          return;
        }

        if (count >= 3) {
          clearInterval(interval);
          logger$1.error(0, '获取平台挂载元素失败，回退挂载到 body');
          resolve({ el: document.body || document.documentElement, p: 'end' });
          return;
        }

        count++;
      }, 300);
    });
  }

  /**
   * 重置一轮批量执行前的运行时状态。
   *
   * @returns 无返回值。
   */
  startPreHandler(): void {
    this.lastHeight = 0;
    this.lastJobCardCount = 0;
    this.lastJobsTailKey = '';
    this.lastRecommendCardCount = 0;
    this.lastRecommendTailKey = '';
    this.lastJobsListSignature = '';
    this.lastRecommendListSignature = '';
    this.recommendNoProgressRounds = 0;
    this.sessionProcessedJobKeys.clear();
    this.lastAutoContactTs = 0;
  }

  private getStableJobRuntimeKey(jobDetail: any): string {
    const encryptJobId = `${jobDetail?.encryptJobId || ''}`.trim();
    if (encryptJobId) {
      return `encrypt:${encryptJobId}`;
    }

    const jobId = `${jobDetail?.jobId || ''}`.trim();
    if (jobId) {
      return `job:${jobId}`;
    }

    const lid = `${jobDetail?.lid || ''}`.trim();
    if (lid) {
      return `lid:${lid}`;
    }

    const securityId = `${jobDetail?.securityId || ''}`.trim();
    if (securityId) {
      return `sec:${securityId}`;
    }

    return this.getJobKey(jobDetail);
  }

  private getCardRuntimeKey(cardElement: any): string {
    const vueData = this.getCardVueData(cardElement) || {};
    const vueKey = this.getStableJobRuntimeKey(vueData);
    if (vueKey && !vueKey.startsWith('undefined:')) {
      return vueKey;
    }

    const href =
      `${cardElement?.querySelector('a.job-card-left,a.job-name,a')?.getAttribute('href') || ''}`.trim();
    const jobName =
      `${cardElement?.querySelector('.job-name,.job-title,.job-info .job-name')?.textContent || ''}`
        .replace(/\s+/g, ' ')
        .trim();
    const companyName =
      `${cardElement?.querySelector('.boss-info,.company-name,.brand-name')?.textContent || ''}`
        .replace(/\s+/g, ' ')
        .trim();
    const location =
      `${cardElement?.querySelector('.company-location,.job-area')?.textContent || ''}`
        .replace(/\s+/g, ' ')
        .trim();

    const keyParts = [href, jobName, companyName, location].filter(Boolean);
    if (keyParts.length > 0) {
      return keyParts.join('|');
    }

    return `${cardElement?.textContent || ''}`.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  private getCardVueData(cardElement: any): any | null {
    return cardElement?.__vue__?.data || null;
  }

  private markJobProcessed(jobDetail: any): void {
    if (!jobDetail || typeof jobDetail !== 'object') {
      return;
    }
    jobDetail.processed = true;
    const key = this.getStableJobRuntimeKey(jobDetail);
    this.sessionProcessedJobKeys.set(key, Date.now());

    // LRU清理：超过阈值时删除最早的记录
    if (this.sessionProcessedJobKeys.size > this.MAX_PROCESSED_JOBS) {
      const sortedEntries = Array.from(this.sessionProcessedJobKeys.entries()).sort(
        (a, b) => a[1] - b[1]
      );
      const toDelete = sortedEntries.slice(
        0,
        this.sessionProcessedJobKeys.size - this.MAX_PROCESSED_JOBS
      );
      toDelete.forEach(([key]) => this.sessionProcessedJobKeys.delete(key));
    }
  }

  private buildListSignature(cardList: any[]): string {
    if (!cardList.length) {
      return '';
    }

    const first = cardList.slice(0, 3).map((card) => this.getCardRuntimeKey(card));
    const last = cardList
      .slice(Math.max(cardList.length - 3, 0))
      .map((card) => this.getCardRuntimeKey(card));
    return [...first, ...last].join('||');
  }

  private getJobsPageMetrics(): {
    scrollHeight: number;
    cardCount: number;
    tailKey: string;
    listSignature: string;
  } {
    const listContainer = querySelectorWithFallback([
      '.job-list-container',
      '.job-list',
      '.jobs-list',
    ]) as HTMLElement | null;
    const cardList = querySelectorAllWithFallback([
      '.job-list-container .job-card-wrap',
      '.job-list .job-card-wrap',
      '.rec-job-list .job-card-wrap',
      '.job-card-wrap',
    ]) as any[];
    const tailCard = cardList[cardList.length - 1] as any;
    const tailKey = this.getCardRuntimeKey(tailCard);

    return {
      scrollHeight: listContainer?.scrollHeight || 0,
      cardCount: cardList.length,
      tailKey,
      listSignature: this.buildListSignature(cardList),
    };
  }

  private getRecommendPageMetrics(): {
    scrollHeight: number;
    cardCount: number;
    tailKey: string;
    listSignature: string;
  } {
    const cardList = querySelectorAllWithFallback([
      '.job-list-container .job-card-wrap',
      '.job-list .job-card-wrap',
      '.job-card-wrap',
    ]) as any[];
    const tailCard = cardList[cardList.length - 1] as any;
    const tailKey = this.getCardRuntimeKey(tailCard);

    return {
      scrollHeight: this.getRecommendPageScrollHeight(),
      cardCount: cardList.length,
      tailKey,
      listSignature: this.buildListSignature(cardList),
    };
  }

  private async scrollJobsListToEnd(): Promise<void> {
    const listContainer = querySelectorWithFallback([
      '.job-list-container',
      '.job-list',
      '.jobs-list',
    ]) as HTMLElement | null;
    if (!listContainer || listContainer.clientHeight <= 0) {
      await simulateScrollToEnd();
      return;
    }

    if (listContainer.scrollHeight <= listContainer.clientHeight + 4) {
      await simulateScrollToEnd();
      return;
    }

    let stableRounds = 0;
    let guard = 0;
    while (guard < 45) {
      const beforeHeight = listContainer.scrollHeight;
      const targetTop = Math.max(0, beforeHeight - listContainer.clientHeight);
      const beforeTop = listContainer.scrollTop;

      // 优先把容器滚到理论底部，触发页面内部的懒加载逻辑。
      listContainer.scrollTop = targetTop;
      listContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
      await Tools.sleep(220);

      const pendingDistance = Math.abs(targetTop - beforeTop);
      const movedDistance = Math.abs(listContainer.scrollTop - beforeTop);
      const reachedTarget = Math.abs(listContainer.scrollTop - targetTop) <= 2;
      if (pendingDistance > 2 && (!reachedTarget || movedDistance <= 2)) {
        // 若容器滚动未生效，则回退到通用整页滚动，兼容页面结构差异。
        await simulateScrollToEnd();
        return;
      }

      const afterHeight = listContainer.scrollHeight;
      const afterTargetTop = Math.max(0, afterHeight - listContainer.clientHeight);
      if (Math.abs(listContainer.scrollTop - afterTargetTop) > 2) {
        // 列表高度在滚动后发生变化时，再次对齐到新的底部，确保继续触发增量加载。
        listContainer.scrollTop = afterTargetTop;
        listContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
        await Tools.sleep(160);
      }

      const atBottom =
        listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 4;
      const heightStable = Math.abs(afterHeight - beforeHeight) <= 2;
      if (atBottom && heightStable) {
        // 连续多轮“到底且高度稳定”才视为真正无更多数据，避免误判瞬时抖动。
        stableRounds++;
        if (stableRounds >= 3) {
          break;
        }
      } else {
        stableRounds = 0;
      }

      guard++;
    }
  }

  /**
   * 执行自动沟通安全校验，限制发送频率。
   *
   * @param _kind 本次自动沟通的类型，区分文本消息和图片简历。
   * @returns 无返回值。
   * @throws {Error} 当发送过快时抛出。
   */
  private enforceAutoContactSafety(_kind: 'message' | 'image'): void {
    const safety = this.getAutoContactSafetyConfig();
    const now = Date.now();
    const elapsedSec = (now - this.lastAutoContactTs) / 1000;
    if (this.lastAutoContactTs > 0 && elapsedSec < safety.minIntervalSec) {
      throw new Error(
        `自动${_kind === 'image' ? '发图' : '发消息'}触发过快，需间隔至少${safety.minIntervalSec}秒`
      );
    }

    this.lastAutoContactTs = now;
  }

  /**
   * 读取自动沟通的安全配置。
   *
   * @returns 自动消息/图片发送的最小间隔。
   */
  private getAutoContactSafetyConfig(): {
    minIntervalSec: number;
  } {
    const preference = runtimeUserStore?.user?.preference || {};
    const toNumberOr = (value: unknown, fallback: number): number => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      minIntervalSec: Math.max(5, toNumberOr(preference.autoContactMinIntervalSec, 10)),
    };
  }

  private isManualVerificationText(text: string | null | undefined): boolean {
    return Tools.isManualVerificationText(text);
  }

  /**
   * 获取当前页面或运行时环境中识别到的人工验证原因。
   *
   * @returns 人工验证原因；若无法识别则返回 `null`。
   */
  protected getManualVerificationReason(): string | null {
    return Tools.getManualVerificationReason();
  }

  /**
   * 读取当前页面中的岗位列表数据。
   *
   * 会根据页面类型筛选不同的岗位卡片，并过滤掉当前会话已处理或已沟通的岗位，
   * 以避免重复投递或重复收藏。
   *
   * @returns 当前页面可供处理的岗位数据数组。
   */
  getJobList(): any[] {
    if (this.curUrl.includes('jobs')) {
      const elementNodeList2 = document.querySelectorAll('.job-card-wrap');
      const allJobs = Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job);
      const jobList = allJobs.filter((job: any) => {
        if (job?.processed) {
          return false;
        }
        const runtimeKey = this.getStableJobRuntimeKey(job);
        return !this.sessionProcessedJobKeys.has(runtimeKey);
      });

      if (elementNodeList2.length !== 0 && allJobs.length === 0) {
        this.preferenceLogRecorder.warn('当前岗位卡片未提取到可用数据，已跳过无效卡片');
      }

      if (elementNodeList2.length !== 0 && jobList.length === 0) {
        this.preferenceLogRecorder.info('当前筛选条件下岗位均已投递');
      }

      return jobList;
    }

    if (this.curUrl.includes('job-recommend')) {
      const elementNodeList2 = document.querySelectorAll('.job-card-wrap');
      return Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job)
        .filter((job: any) => !job.contact);
    }

    if (this.curUrl.includes('overseas')) {
      const elementNodeList2 = document.querySelectorAll('.job-card-box');
      return Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job)
        .filter((job: any) => !job.contact);
    }

    const elementNodeList = document.querySelectorAll('.job-card-wrapper');
    return Array.from(elementNodeList)
      .map((item: any) => this.getCardVueData(item))
      .filter((job: any) => !!job);
  }

  /**
   * 判断当前页面是否还可能存在下一批可获取的岗位数据。
   *
   * 职位列表页与推荐页会结合卡片数量、尾部稳定键、首尾签名及滚动高度等多个指标，
   * 尽量降低由于虚拟列表、懒加载或局部刷新造成的误判。
   *
   * @returns 若仍有机会获取到更多岗位则返回 `true`，否则返回 `false`。
   */
  hasNext(): boolean {
    logger$1.debug('hasNext');

    if (this.curUrl.includes('jobs')) {
      const metrics = this.getJobsPageMetrics();
      if (this.lastHeight <= 0 && this.lastJobCardCount <= 0) {
        return metrics.cardCount > 0 || metrics.scrollHeight > 0;
      }

      // 优先看列表是否有新增卡片，这是最直接的“有新岗位”信号。
      if (metrics.cardCount > this.lastJobCardCount) {
        return true;
      }

      // 卡片数量不变时，再看尾部岗位是否变化，以兼容虚拟列表复用 DOM 的情况。
      if (metrics.tailKey && metrics.tailKey !== this.lastJobsTailKey) {
        return true;
      }

      // 进一步通过首尾签名识别列表内容整体是否发生替换。
      if (metrics.listSignature && metrics.listSignature !== this.lastJobsListSignature) {
        return true;
      }

      // 最后再回退到滚动高度变化判断，覆盖仅高度变化但卡片复用的页面实现。
      return metrics.scrollHeight > this.lastHeight + 120;
    }

    if (this.curUrl.includes('overseas')) {
      return this.lastHeight !== document.querySelector('.job-list')?.scrollHeight;
    }

    if (this.curUrl.includes('job-recommend')) {
      const metrics = this.getRecommendPageMetrics();
      if (this.lastHeight <= 0 && this.lastRecommendCardCount <= 0) {
        return metrics.cardCount > 0 || metrics.scrollHeight > 0;
      }

      // 推荐页会综合多种增量信号，防止某个单一指标失效时过早停止。
      const hasProgress =
        metrics.cardCount > this.lastRecommendCardCount ||
        (!!metrics.tailKey && metrics.tailKey !== this.lastRecommendTailKey) ||
        (!!metrics.listSignature && metrics.listSignature !== this.lastRecommendListSignature) ||
        (metrics.scrollHeight > this.lastHeight + 120 && metrics.cardCount > 0);

      if (hasProgress) {
        this.recommendNoProgressRounds = 0;
        return true;
      }

      // 推荐页允许短暂的“无进展重试”，避免网络抖动或懒加载延迟导致遗漏岗位。
      this.recommendNoProgressRounds += 1;
      if (this.recommendNoProgressRounds < 2) {
        logger$1.info(
          `推荐页未检测到新岗位，进行第${this.recommendNoProgressRounds}次重试滚动 ` +
            `count=${metrics.cardCount}/${this.lastRecommendCardCount} ` +
            `tail=${metrics.tailKey === this.lastRecommendTailKey ? 'same' : 'changed'} ` +
            `signature=${metrics.listSignature === this.lastRecommendListSignature ? 'same' : 'changed'} ` +
            `height=${metrics.scrollHeight}/${this.lastHeight}`
        );
        return true;
      }

      return false;
    }

    const nextPageBtn = document.querySelector('.ui-icon-arrow-right');
    if (nextPageBtn === null) {
      return false;
    }

    return (nextPageBtn.parentElement as HTMLElement).className !== 'disabled';
  }

  /**
   * 在拉取下一批岗位前记录分页状态，并触发对应页面的滚动或翻页动作。
   *
   * @returns 无返回值。
   */
  async acquireDataPre(): Promise<void> {
    if (this.pushStatus === PushStatus.PAUSE) {
      return;
    }

    if (this.curUrl.includes('jobs')) {
      const metrics = this.getJobsPageMetrics();

      // 先记录翻页前的基线指标，供 hasNext 在滚动后判断是否真正拿到了新数据。
      this.lastHeight = metrics.scrollHeight;
      this.lastJobCardCount = metrics.cardCount;
      this.lastJobsTailKey = metrics.tailKey;
      this.lastJobsListSignature = metrics.listSignature;
      try {
        await this.scrollJobsListToEnd();
        logger$1.info('获取下一页成功');
      } catch (e) {
        this.preferenceLogRecorder.warn('获取下一页失败', e);
      }
      return;
    }

    if (this.curUrl.includes('job-recommend')) {
      const metrics = this.getRecommendPageMetrics();

      // 推荐页同样要保存滚动前快照，以便后续结合多指标判断是否还有新岗位。
      this.lastHeight = metrics.scrollHeight;
      this.lastRecommendCardCount = metrics.cardCount;
      this.lastRecommendTailKey = metrics.tailKey;
      this.lastRecommendListSignature = metrics.listSignature;
      try {
        await this.scrollJobsListToEnd();
        logger$1.info('获取下一页成功');
      } catch (e) {
        this.preferenceLogRecorder.warn('获取下一页失败', e);
      }
      return;
    }

    if (this.curUrl.includes('overseas')) {
      this.lastHeight = document.querySelector('.job-list')?.scrollHeight || 0;
      try {
        await simulateScrollToEnd();
        logger$1.info('获取下一页成功');
      } catch (e) {
        this.preferenceLogRecorder.warn('获取下一页失败', e);
      }
      return;
    }

    (document.querySelector('.ui-icon-arrow-right') as HTMLElement).click();
  }

  /**
   * 判断岗位是否满足当前投递条件。
   *
   * 该方法会串联通用硬性约束、传统规则过滤、岗位详情扩展拉取、
   * AI 投递判定与回退策略，并在成功或明确不匹配后记录岗位处理状态。
   *
   * @param jobDetail 当前待匹配的岗位详情对象。
   * @returns 匹配通过时返回 `true`。
   * @throws {NotMatchError} 当岗位已沟通、不满足传统规则、AI 判定不通过或 AI 回退失败时抛出。
   */
  async matchJob(jobDetail: any): Promise<boolean> {
    const jobTitle = this.getJobKey(jobDetail);

    try {
      if (jobDetail.contact) {
        throw new NotMatchError(jobTitle, jobDetail.contact, '已经沟通过');
      }

      const aiFilterModeEnabled = this.shouldEnableAiDeliveryJudge();
      const traditionalDeliveryEnabled = this.isTraditionalDeliveryEnabled();

      // 硬性约束始终执行，不受 AI/传统模式影响，这是投递的底线规则。
      this.applyCommonHardConstraints(jobDetail, jobTitle);

      // 传统模式下再追加白名单等软性规则；AI 模式交由模型综合判断。
      if (!aiFilterModeEnabled && traditionalDeliveryEnabled) {
        this.applyTraditionalSoftFilters(jobDetail, jobTitle);
      }

      // 扩展详情包含活跃度、职位描述等列表页没有的关键信息，是后续过滤的重要输入。
      const jobDetailExt = await this.obtainBossJobDetailExt(jobDetail);
      logger$1.debug(
        `获取工作【${jobTitle}】详情扩展信息用于${aiFilterModeEnabled ? 'AI过滤' : '常规过滤'} `,
        jobDetail
      );

      if (!aiFilterModeEnabled && traditionalDeliveryEnabled) {
        this.applyTraditionalExtChecks(jobDetailExt, jobTitle);
      }

      // 详情接口也可能返回“已沟通”状态，因此需要二次兜底判断。
      if (this.isCommunication(jobDetailExt)) {
        throw new NotMatchError(jobTitle, jobDetailExt.friendStatus, '已经沟通过');
      }

      if (aiFilterModeEnabled) {
        const aiConfig = Tools.getAiDeliveryJudgeConfig(runtimeUserStore?.user?.preference || {});
        const user = runtimeUserStore?.user || {};

        // AI 过滤依赖候选人画像，因此在请求前尽量补全运行时简历叙述文本。
        await this.ensureRuntimeResumeNarrative(user);
        const preference = user.preference || {};
        const userProfile = buildAiDeliveryUserProfile(user, preference);
        const prompt = buildAiDeliveryJudgePrompt(aiConfig, userProfile);
        const baseInfo = this.unpackBaseInfo(jobDetail);
        const extInfo = this.unpackExtInfo(jobDetailExt);
        const filterInput = buildAiDeliveryFilterJobInput(baseInfo, extInfo);
        let judgeResult!: { match: boolean; reason: string; valid: boolean; parseMode: string };
        const judgeTraceId = this.buildAiJudgeTraceId();
        const filterPath = await AiPower.getFilterPath();
        const aiDeliveryJudgeTimeoutMs = await AiPower.getFilterTimeoutMs(
          AI_DELIVERY_JUDGE_DEFAULT_TIMEOUT_MS
        );
        const aiJudgeStartedAt = Date.now();
        const maskedUserProfile = this.maskAiDeliveryUserProfile(userProfile);

        this.preferenceLogRecorder.info(
          `工作【${jobTitle}】开始AI投递判断 trace=${judgeTraceId} path=${filterPath} timeoutMs=${aiDeliveryJudgeTimeoutMs} onAiError=${aiConfig.onAiError} onInvalidResult=${aiConfig.onInvalidResult}`
        );
        this.preferenceLogRecorder.info(
          `工作【${jobTitle}】AI输入摘要 trace=${judgeTraceId} promptChars=${prompt.length} baseInfoChars=${filterInput.jobBaseInfo.length} extInfoChars=${filterInput.jobExtInfo.length} includeUserProfile=${aiConfig.includeUserProfile} userProfile=${JSON.stringify(maskedUserProfile)} baseKeys=${Object.keys(baseInfo).join(',')} extKeys=${Object.keys(extInfo).join(',')}`
        );

        // AI 判定采用有限次重试，缓解短暂网络抖动或模型服务瞬时失败。
        const MAX_AI_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt++) {
          try {
            const filterStartedAt = Date.now();
            const filterResp = await AiPower.filter(
              prompt,
              filterInput.jobBaseInfo,
              filterInput.jobExtInfo,
              aiDeliveryJudgeTimeoutMs
            );
            const filterElapsed = Date.now() - filterStartedAt;

            // 将模型输出解析成统一结构，方便后续执行业务分支与日志记录。
            const parseStartedAt = Date.now();
            judgeResult = this.parseAiDeliveryJudgeResult(filterResp);
            const parseElapsed = Date.now() - parseStartedAt;
            const aiJudgeElapsed = Date.now() - aiJudgeStartedAt;
            const aiJudgeElapsedSec = (aiJudgeElapsed / 1000).toFixed(2);
            const retryInfo = attempt > 1 ? ` (重试${attempt - 1}次后成功)` : '';
            this.preferenceLogRecorder.info(
              `工作【${jobTitle}】AI投递判断完成${retryInfo} trace=${judgeTraceId} path=${filterPath} total=${aiJudgeElapsed}ms (${aiJudgeElapsedSec}s) filter=${filterElapsed}ms parse=${parseElapsed}ms parseMode=${judgeResult.parseMode} match=${judgeResult.match} reason=${judgeResult.reason}`
            );
            break;
          } catch (error: any) {
            if (attempt < MAX_AI_RETRIES) {
              const retryDelay = 1000 * attempt;
              this.preferenceLogRecorder.warn(
                `工作【${jobTitle}】AI投递判断失败 (尝试${attempt}/${MAX_AI_RETRIES}) trace=${judgeTraceId} 原因：${error?.message || 'AI请求失败'}，${retryDelay}ms后重试`
              );
              await Tools.sleep(retryDelay);
            } else {
              // 所有 AI 重试都失败时，根据用户配置决定是否退回传统规则继续判断。
              const aiJudgeElapsed = Date.now() - aiJudgeStartedAt;
              const aiJudgeElapsedSec = (aiJudgeElapsed / 1000).toFixed(2);
              const aiErrorMessage = `${error?.message || 'AI请求失败'}`;
              this.preferenceLogRecorder.warn(
                `工作【${jobTitle}】AI投递判断失败 (已重试${MAX_AI_RETRIES}次) trace=${judgeTraceId} path=${filterPath} total=${aiJudgeElapsed}ms (${aiJudgeElapsedSec}s) onAiError=${aiConfig.onAiError} 原因：${aiErrorMessage}`
              );
              const aiErrorFallback = resolveAiDeliveryFallback(aiConfig.onAiError, 'ai-error');
              if (aiErrorFallback.enabled) {
                const fallbackReason = this.normalizeAiJudgeReason(
                  `[FALLBACK_TRADITIONAL] AI请求失败，回退传统规则：${aiErrorMessage}`,
                  '[FALLBACK_TRADITIONAL] AI请求失败，回退传统规则'
                );
                this.preferenceLogRecorder.warn(
                  `工作【${jobTitle}】AI失败触发传统规则回退 trace=${judgeTraceId} reason=${fallbackReason}`
                );
                this.applyTraditionalFallbackChecks(
                  traditionalDeliveryEnabled,
                  jobDetail,
                  jobDetailExt,
                  jobTitle,
                  fallbackReason
                );
                jobDetail.aiDeliveryJudge = {
                  traceId: judgeTraceId,
                  path: filterPath,
                  match: true,
                  reason: fallbackReason,
                  valid: true,
                  parseMode: aiErrorFallback.parseMode,
                  judgedAt: new Date().toISOString(),
                };
                this.preferenceLogRecorder.info(
                  `工作【${jobTitle}】传统规则回退通过 trace=${judgeTraceId} reason=${fallbackReason}`
                );
                return true;
              }
              throw new NotMatchError(jobTitle, aiErrorMessage, 'AI投递判断异常');
            }
          }
        }

        // 无论最终是否命中，都将 AI 判定原始结果挂载到岗位对象，便于后续日志和面板展示。
        jobDetail.aiDeliveryJudge = {
          traceId: judgeTraceId,
          path: filterPath,
          match: judgeResult.match,
          reason: judgeResult.reason,
          valid: judgeResult.valid,
          parseMode: judgeResult.parseMode,
          judgedAt: new Date().toISOString(),
        };

        if (!judgeResult.valid) {
          // 当模型结果不可解析时，仍可按配置退回传统规则，避免单次格式异常导致完全跳过岗位。
          const invalidResultFallback = resolveAiDeliveryFallback(
            aiConfig.onInvalidResult,
            'invalid-result',
            judgeResult.parseMode
          );
          if (invalidResultFallback.enabled) {
            const fallbackReason = this.normalizeAiJudgeReason(
              `[FALLBACK_TRADITIONAL] AI结果不可解析，回退传统规则：${judgeResult.reason}`,
              '[FALLBACK_TRADITIONAL] AI结果不可解析，回退传统规则'
            );
            this.preferenceLogRecorder.warn(
              `工作【${jobTitle}】AI结果不可解析触发传统规则回退 trace=${judgeTraceId} path=${filterPath} parseMode=${judgeResult.parseMode} reason=${fallbackReason}`
            );
            this.applyTraditionalFallbackChecks(
              traditionalDeliveryEnabled,
              jobDetail,
              jobDetailExt,
              jobTitle,
              fallbackReason
            );
            jobDetail.aiDeliveryJudge = {
              traceId: judgeTraceId,
              path: filterPath,
              match: true,
              reason: fallbackReason,
              valid: true,
              parseMode: invalidResultFallback.parseMode,
              judgedAt: new Date().toISOString(),
            };
            this.preferenceLogRecorder.info(
              `工作【${jobTitle}】传统规则回退通过 trace=${judgeTraceId} reason=${fallbackReason}`
            );
            return true;
          }
          this.preferenceLogRecorder.warn(
            `工作【${jobTitle}】AI判定结果不可解析 trace=${judgeTraceId} path=${filterPath} parseMode=${judgeResult.parseMode} onInvalidResult=${aiConfig.onInvalidResult} reason=${judgeResult.reason}`
          );
          throw new NotMatchError(
            jobTitle,
            judgeResult.reason,
            `AI投递判断结果不可解析：${judgeResult.reason}`
          );
        }

        if (!judgeResult.match) {
          this.preferenceLogRecorder.info(
            `工作【${jobTitle}】AI投递判断不通过 trace=${judgeTraceId} reason=${judgeResult.reason}`
          );
          throw new NotMatchError(
            jobTitle,
            judgeResult.reason,
            `AI投递判断不通过：${judgeResult.reason}`
          );
        }

        this.preferenceLogRecorder.info(
          `工作【${jobTitle}】AI投递判断通过 trace=${judgeTraceId} reason=${judgeResult.reason}`
        );
      }

      // 只有在“明确已处理”时才记录岗位，避免未知异常导致永久跳过该岗位。
      this.markJobProcessed(jobDetail);
      return true;
    } catch (error: any) {
      if (error instanceof NotMatchError) {
        // 不匹配也视为已完成判定，避免同一轮再次反复处理。
        this.markJobProcessed(jobDetail);
      }
      throw error;
    }
  }

  /**
   * 提取岗位基础信息，供 AI 判定和日志输出复用。
   *
   * @param jobDetail 原始岗位详情对象。
   * @returns 仅包含基础字段的扁平对象。
   */
  unpackBaseInfo(jobDetail: any): Record<string, unknown> {
    // 验证关键字段是否存在，记录缺失字段以便排查
    const missingFields: string[] = [];
    if (!jobDetail.jobName) missingFields.push('jobName');
    if (!jobDetail.skills || (Array.isArray(jobDetail.skills) && jobDetail.skills.length === 0)) {
      missingFields.push('skills');
    }

    if (missingFields.length > 0) {
      logger$1.warn(
        `岗位【${jobDetail.jobName || '未知'}】基础信息缺少关键字段: ${missingFields.join(', ')}，可能影响 AI 判断准确性`
      );
    }

    return {
      jobName: jobDetail.jobName || '未知岗位',
      salaryDesc: jobDetail.salaryDesc || '薪资面议',
      jobLabels: jobDetail.jobLabels || [],
      skills: jobDetail.skills || [],
      jobExperience: jobDetail.jobExperience || '经验不限',
      jobDegree: jobDetail.jobDegree || '学历不限',
      cityName: jobDetail.cityName || '未知城市',
      areaDistrict: jobDetail.areaDistrict || '',
      businessDistrict: jobDetail.businessDistrict || '',
      brandName: jobDetail.brandName || '未知公司',
      brandStageName: jobDetail.brandStageName || '',
      brandIndustry: jobDetail.brandIndustry || '',
      brandScaleName: jobDetail.brandScaleName || '',
      welfareList: jobDetail.welfareList || [],
    };
  }

  /**
   * 提取岗位扩展信息，供 AI 判定和传统扩展规则复用。
   *
   * @param jobDetailExt 岗位详情扩展对象。
   * @returns 扩展字段组成的扁平对象。
   */
  unpackExtInfo(jobDetailExt: any): Record<string, unknown> {
    // 验证关键字段是否存在，职位描述是 AI 判断的核心依据
    const missingFields: string[] = [];
    if (!jobDetailExt.postDescription || `${jobDetailExt.postDescription}`.trim().length === 0) {
      missingFields.push('postDescription');
    }

    if (missingFields.length > 0) {
      logger$1.warn(
        `岗位详情扩展信息缺少关键字段: ${missingFields.join(', ')}，可能影响 AI 判断准确性`
      );
    }

    return {
      postDescription: jobDetailExt.postDescription || '未提供岗位描述',
      address: jobDetailExt.address || '未知地址',
      activeTimeDesc: jobDetailExt.activeTimeDesc || '活跃度未知',
    };
  }

  /**
   * 暂停当前批量投递流程。
   *
   * @returns 无返回值。
   */
  pausePush(): void {
    this.pushStatus = PushStatus.PAUSE;
  }

  /**
   * 构造用于日志和异常提示的岗位标识。
   *
   * @param jobDetail 岗位详情对象。
   * @returns 由岗位名称与地区信息拼接而成的可读字符串。
   */
  getJobKey(jobDetail: any): string {
    return (
      jobDetail.jobName +
      '-' +
      jobDetail.cityName +
      jobDetail.areaDistrict +
      jobDetail.businessDistrict
    );
  }

  /**
   * 判断当前是否命中了投递总量限制。
   *
   * @param _jobDetail 当前岗位详情；该参数当前仅用于兼容统一接口签名。
   * @returns 是否受限及对应提示信息。
   */
  isLimit(_jobDetail: any): { limit: boolean; msg: string } {
    return {
      limit: TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_LIMIT, false),
      msg: 'Boss投递限制每天150次',
    };
  }

  /**
   * 执行单个岗位的投递请求。
   *
   * 方法会先遵守用户配置的投递间隔，再调用平台 API 完成投递；当发生网络错误时会有限次重试，
   * 同时识别人工验证和当日沟通上限等平台级阻断信号。
   *
   * @param jobDetail 待投递的岗位详情对象。
   * @param errorMsg 上一次失败时保留的错误信息。
   * @param retries 允许的剩余重试次数。
   * @returns 投递接口返回的结果对象。
   * @throws {PushRequestError} 当投递请求在多次重试后仍失败时抛出。
   * @throws {PushStopError} 当平台要求人工验证时抛出。
   * @throws {PushLimitError} 当识别到当日沟通人数已达上限时抛出。
   */
  async doPush(jobDetail: any, errorMsg = '', retries = 3): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new PushRequestError(jobTitle, errorMsg || '投递重试多次失败');
    }

    logger$1.debug('正在投递：' + jobTitle);

    // 无论前一条岗位是否成功，都要遵守用户配置的投递节奏，降低平台风控概率。
    const preference = runtimeUserStore?.user?.preference || {};
    const pushIntervalSec = Number(getPreferenceValue(preference, 'pushIntervalSec', 'pi')) || 3;
    await Tools.sleep(pushIntervalSec * 1000);

    let pushResp: any = { code: PushResultStatus.NOT_START, message: '' };
    try {
      // 统一由当前方法控制重试节奏，底层客户端只负责单次 HTTP 请求。
      pushResp = await this.apiClient.doPush(jobDetail, 1);
    } catch (error: any) {
      const latestError = `${error?.message || '投递请求失败'}`;

      // 仅对网络层失败进行递归重试，业务性失败由上层直接感知并处理。
      if (this.isNetworkError(error) && retries > 1) {
        const retryDelay = (4 - retries) * 1000;
        logger$1.debug(
          `工作【${jobTitle}】投递失败 (尝试${4 - retries}/3); 正在等待重试; 原因：${latestError}`
        );
        await Tools.sleep(retryDelay);
        return await this.doPush(jobDetail, latestError, retries - 1);
      }
      logger$1.debug(`工作【${jobTitle}】投递失败; 原因：${latestError}`);
      throw error;
    }

    // 某些失败会通过提醒弹窗文本返回，需要在这里识别出人工验证和每日上限等特殊状态。
    if (
      pushResp.code === PushResultStatus.FAIL &&
      pushResp?.zpData?.bizData?.chatRemindDialog?.content
    ) {
      const remindContent = `${pushResp?.zpData?.bizData?.chatRemindDialog?.content || ''}`;
      if (this.isManualVerificationText(remindContent)) {
        throw new PushStopError(this.getManualVerificationReason() || remindContent);
      }

      const reachedDailyLimitMatch = remindContent.match(/您今天已与(\d+)位BOSS沟通/);
      if (reachedDailyLimitMatch) {
        const reachedDailyLimit = reachedDailyLimitMatch[1];
        throw new PushLimitError(`今日沟通人数已达上限(已与${reachedDailyLimit}位BOSS沟通)`);
      }

      // 其余提醒内容统一回传给上层，由上层决定如何展示或记录。
      return {
        code: 1,
        message: pushResp?.zpData?.bizData?.chatRemindDialog?.content,
      };
    }

    await Tools.sleep(800);
    return pushResp;
  }

  /**
   * 根据岗位详情定位页面中的岗位卡片元素。
   *
   * 会优先使用岗位 ID、加密 ID 等稳定字段匹配，若页面结构不完整则回退到链接包含关系判断。
   *
   * @param jobDetail 目标岗位详情对象。
   * @returns 匹配到的岗位卡片元素；未找到时返回 `null`。
   */
  findJobCardByJobDetail(jobDetail: any): any {
    const cardSelectors = ['.job-card-wrapper', '.job-card-wrap', '.job-card-box'];
    for (const selector of cardSelectors) {
      const cards = Array.from(document.querySelectorAll(selector));
      const targetCard = cards.find((card: any) => {
        const cardData = card?.__vue__?.data;
        const detailEncryptJobId = `${jobDetail.encryptJobId || ''}`;
        const detailJobId = `${jobDetail.jobId || ''}`;
        const cardEncryptJobId = `${cardData?.encryptJobId || ''}`;
        const cardJobId = `${cardData?.jobId || ''}`;

        if (detailEncryptJobId && cardEncryptJobId === detailEncryptJobId) {
          return true;
        }

        if (detailJobId && cardJobId === detailJobId) {
          return true;
        }

        if (detailEncryptJobId && cardJobId === detailEncryptJobId) {
          return true;
        }

        const href =
          card.querySelector('a.job-card-left,a.job-name')?.getAttribute('href')?.toString() || '';
        if (!href) {
          return false;
        }

        if (detailEncryptJobId && href.includes(detailEncryptJobId)) {
          return true;
        }

        const detailLid = `${jobDetail.lid || ''}`;
        return !!(detailLid && href.includes(detailLid));
      });

      if (targetCard) {
        return targetCard;
      }
    }

    return null;
  }

  /**
   * 提取元素上可用于识别“收藏”语义的文本提示。
   *
   * @param element 目标 DOM 元素。
   * @returns 由文本内容和常见属性拼接得到的提示字符串。
   */
  getFavoriteHint(element: any): string {
    const attrs = [
      element?.textContent,
      element?.getAttribute('title'),
      element?.getAttribute('aria-label'),
      element?.getAttribute('data-title'),
      element?.getAttribute('ka'),
      element?.className,
    ].filter(Boolean);

    return attrs.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * 判断提示文本是否表示当前岗位已处于收藏状态。
   *
   * @param hint 候选提示文本。
   * @returns 若已收藏或可见取消收藏语义则返回 `true`。
   */
  isFavoriteDoneByHint(hint: string): boolean {
    const text = (hint || '').replace(/\s+/g, '');
    return text.includes('已收藏') || text.includes('取消收藏') || text.includes('已感兴趣');
  }

  /**
   * 获取岗位当前的收藏态快照。
   *
   * @param jobDetail 目标岗位详情对象。
   * @returns 包含岗位卡片区域与详情区域文本的快照对象。
   */
  getFavoriteStateSnapshot(jobDetail: any): { cardText: string; detailText: string } {
    const card = this.findJobCardByJobDetail(jobDetail);
    const detailScopes = this.findRelatedDetailScopes(jobDetail);
    return {
      cardText: (card?.textContent || '').replace(/\s+/g, ''),
      detailText: detailScopes
        .map((scope: any) => (scope.textContent || '').replace(/\s+/g, ''))
        .join(' '),
    };
  }

  /**
   * 根据收藏态快照判断收藏是否已经生效。
   *
   * @param snapshot 收藏态快照。
   * @returns 任一观察区域出现“已收藏”语义时返回 `true`。
   */
  isFavoriteConfirmedBySnapshot(snapshot: { cardText: string; detailText: string }): boolean {
    return (
      this.isFavoriteDoneByHint(snapshot.cardText) || this.isFavoriteDoneByHint(snapshot.detailText)
    );
  }

  /**
   * 等待页面出现明确的收藏成功状态。
   *
   * @param jobDetail 目标岗位详情对象。
   * @param waitMs 最长等待时间，单位毫秒。
   * @returns 是否确认收藏成功及对应时刻的快照。
   */
  async waitFavoriteConfirmed(
    jobDetail: any,
    waitMs = 1200
  ): Promise<{ confirmed: boolean; snapshot: { cardText: string; detailText: string } }> {
    const startTs = Date.now();
    let snapshot = this.getFavoriteStateSnapshot(jobDetail);
    if (this.isFavoriteConfirmedBySnapshot(snapshot)) {
      return { confirmed: true, snapshot };
    }

    while (Date.now() - startTs < waitMs) {
      await Tools.sleep(200);
      snapshot = this.getFavoriteStateSnapshot(jobDetail);
      if (this.isFavoriteConfirmedBySnapshot(snapshot)) {
        return { confirmed: true, snapshot };
      }
    }

    return { confirmed: false, snapshot };
  }

  /**
   * 判断提示文本是否像一个可执行的收藏动作入口。
   *
   * @param hint 候选提示文本。
   * @returns 若文本更像“收藏”而非“沟通/投递”按钮则返回 `true`。
   */
  isFavoriteActionByHint(hint: string): boolean {
    const text = (hint || '').replace(/\s+/g, '');
    const lowerText = text.toLowerCase();
    if (text.includes('沟通') || text.includes('投递') || text.includes('简历')) {
      return false;
    }

    return (
      text.includes('收藏') ||
      text.includes('感兴趣') ||
      lowerText.includes('collect') ||
      lowerText.includes('favorite') ||
      lowerText.includes('star')
    );
  }

  /**
   * 判断候选收藏元素是否可见且可交互。
   *
   * @param element 候选 DOM 元素。
   * @returns 可见且未禁用时返回 `true`。
   */
  isVisibleFavoriteElement(element: any): boolean {
    if (!(element instanceof HTMLElement)) {
      return true;
    }

    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * 查找与当前岗位详情对应的详情区域容器。
   *
   * @param jobDetail 目标岗位详情对象。
   * @returns 与岗位名称或公司名称匹配的详情区域列表。
   */
  findRelatedDetailScopes(jobDetail: any): any[] {
    const scopes = [
      document.querySelector('.job-detail-box'),
      document.querySelector('.job-detail'),
      document.querySelector('.job-detail-container'),
    ].filter(Boolean);

    if (scopes.length === 0) {
      return [];
    }

    const normalize = (text: string) => (text || '').replace(/\s+/g, '');
    const jobName = normalize(jobDetail.jobName);
    const brandName = normalize(jobDetail.brandName);
    const matchedScopes = scopes.filter((scope: any) => {
      const text = normalize(scope.textContent);
      if (!text) {
        return false;
      }

      const byJobName = jobName && text.includes(jobName);
      const byBrandName = brandName && text.includes(brandName);
      return !!(byJobName || byBrandName);
    });

    return matchedScopes;
  }

  /**
   * 等待与岗位对应的详情区域渲染完成。
   *
   * @param jobDetail 目标岗位详情对象。
   * @param waitMs 最长等待时间，单位毫秒。
   * @returns 已找到的详情区域列表；超时则返回当前结果。
   */
  async waitRelatedDetailScopes(jobDetail: any, waitMs = 1200): Promise<any[]> {
    const startTs = Date.now();
    let scopes = this.findRelatedDetailScopes(jobDetail);
    while (scopes.length === 0 && Date.now() - startTs < waitMs) {
      await Tools.sleep(120);
      scopes = this.findRelatedDetailScopes(jobDetail);
    }

    return scopes;
  }

  /**
   * 在给定作用域内查找收藏按钮或已收藏标记。
   *
   * @param scope 待搜索的 DOM 作用域。
   * @param sampleHints 用于调试记录的候选提示文本数组。
   * @returns 是否已处于收藏态以及可点击的收藏按钮。
   */
  findFavoriteButtonInScope(scope: Element, sampleHints: string[]): { done: boolean; button: any } {
    const candidateSelector =
      "button,a,[role='button'],[class*='collect'],[class*='favorite'],[class*='star']";
    const candidates = Array.from(new Set(Array.from(scope.querySelectorAll(candidateSelector))));
    let favoriteButton: any = null;

    for (const element of candidates) {
      if (!this.isVisibleFavoriteElement(element)) {
        continue;
      }

      const hint = this.getFavoriteHint(element);
      if (!hint) {
        continue;
      }

      if (
        (this.isFavoriteActionByHint(hint) || this.isFavoriteDoneByHint(hint)) &&
        sampleHints.length < 8
      ) {
        sampleHints.push(hint.slice(0, 80));
      }

      if (this.isFavoriteDoneByHint(hint)) {
        return { done: true, button: element };
      }

      if (!favoriteButton && this.isFavoriteActionByHint(hint)) {
        favoriteButton = element;
      }
    }

    return { done: false, button: favoriteButton };
  }

  /**
   * 通过 DOM 交互触发岗位收藏。
   *
   * 该方法会先尝试打开岗位详情，再在卡片与详情区域中定位收藏入口，
   * 最终通过状态快照确认收藏是否真正生效。
   *
   * @param jobDetail 目标岗位详情对象。
   * @returns 收藏执行结果及校验信息。
   */
  async triggerFavoriteByDom(jobDetail: any): Promise<FavoriteResp> {
    const card = this.findJobCardByJobDetail(jobDetail);
    if (!card) {
      return { success: false, message: '未定位到岗位卡片' };
    }

    const beforeCheck = await this.waitFavoriteConfirmed(jobDetail, 120);
    if (beforeCheck.confirmed) {
      return { success: true, verified: true, channel: 'dom-already', message: 'Success' };
    }

    const sampleHints: string[] = [];
    const hoverEvents = ['mouseenter', 'mouseover', 'mousemove'];

    // 先触发悬浮事件，尽可能唤起卡片级操作栏，兼容鼠标悬停后才显示收藏按钮的页面实现。
    hoverEvents.forEach((eventName) => {
      card.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
    });

    const cardClickable = card.querySelector("a.job-card-left,a.job-name,[class*='job-card-left']");
    const clickTarget = cardClickable || card;
    clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await Tools.sleep(300);

    // 同时在卡片区和详情区查找收藏入口，覆盖不同页面布局下按钮位置差异。
    const detailScopes = await this.waitRelatedDetailScopes(jobDetail, 1500);
    const scopeList = [card, ...detailScopes].filter(Boolean);
    const uniqueScopeList = Array.from(new Set(scopeList));
    let favoriteBtn: any = null;

    for (const scope of uniqueScopeList) {
      const result = this.findFavoriteButtonInScope(scope as Element, sampleHints);
      if (result.done) {
        return { success: true, verified: true, channel: 'dom-done-mark', message: 'Success' };
      }

      if (result.button) {
        favoriteBtn = result.button;
        break;
      }
    }

    if (!favoriteBtn) {
      const detailText = detailScopes
        .map((scope: any) => (scope.textContent || '').replace(/\s+/g, ''))
        .join(' ');
      if (detailText.includes('已收藏') || detailText.includes('取消收藏')) {
        return { success: true, verified: true, channel: 'dom-detail-mark', message: 'Success' };
      }

      const debugHint = sampleHints.length > 0 ? `;候选:${sampleHints.join(' | ')}` : '';
      return { success: false, message: `未找到收藏按钮${debugHint}` };
    }

    if (typeof favoriteBtn.click === 'function') {
      favoriteBtn.click();
    } else {
      favoriteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    await Tools.sleep(250);
    const afterCheck = await this.waitFavoriteConfirmed(jobDetail, 1800);
    const btnHintAfterClick = this.getFavoriteHint(favoriteBtn);

    // 按钮提示与页面文本任一出现收藏态，都视为本次 DOM 操作成功。
    if (afterCheck.confirmed || this.isFavoriteDoneByHint(btnHintAfterClick)) {
      return { success: true, verified: true, channel: 'dom-click', message: 'Success' };
    }

    const afterHint = `button=${btnHintAfterClick.slice(0, 60)};card=${(afterCheck.snapshot.cardText || '').slice(0, 60)};detail=${(afterCheck.snapshot.detailText || '').slice(0, 60)}`;
    return { success: false, verified: false, message: `点击收藏后未观察到收藏态;${afterHint}` };
  }

  /**
   * 执行岗位收藏。
   *
   * 优先使用 DOM 通道触发收藏并进行页面态校验，必要时再回退到接口调用，
   * 并在失败时按剩余次数递归重试。
   *
   * @param jobDetail 待收藏的岗位详情对象。
   * @param errorMsg 上一次失败时记录的错误信息。
   * @param retries 允许的剩余重试次数。
   * @returns 收藏结果对象。
   * @throws {FavoriteRequestError} 当收藏在多次重试后仍失败时抛出。
   */
  async doCollect(jobDetail: any, errorMsg = '', retries = 2): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FavoriteRequestError(jobTitle, errorMsg || '收藏重试多次失败');
    }

    let latestError = errorMsg;
    try {
      // 先检查页面是否已处于收藏态，避免重复点击或重复请求。
      const beforeState = await this.waitFavoriteConfirmed(jobDetail, 120);
      if (beforeState.confirmed) {
        return {
          code: 0,
          message: 'Success',
          verified: true,
          channel: 'already',
        };
      }

      // 优先尝试 DOM 通道，因为它能与页面真实状态保持同步。
      const domResult = await this.triggerFavoriteByDom(jobDetail);
      if (domResult.success && domResult.verified !== false) {
        return {
          code: 0,
          message: 'Success',
          verified: true,
          channel: domResult.channel || 'dom',
        };
      }

      latestError = domResult.message || latestError;
      if (this._collectMode) {
        await Tools.sleep(400);
        return await this.doCollect(jobDetail, latestError, retries - 1);
      }

      const preference = runtimeUserStore?.user?.preference || {};
      const pushIntervalSec = Number(getPreferenceValue(preference, 'pushIntervalSec', 'pi')) || 3;
      await Tools.sleep(Math.max(500, pushIntervalSec * 600));

      try {
        // DOM 通道失败后再回退到接口调用，并通过页面状态再次确认收藏是否真正成功。
        const apiResp = await this.apiClient.doCollect(jobDetail, retries);
        if (this.apiClient.isFavoriteSuccess(apiResp)) {
          const confirmCheck = await this.waitFavoriteConfirmed(jobDetail, 1000);
          if (confirmCheck.confirmed) {
            return {
              code: 0,
              message: 'Success',
              verified: true,
              channel: 'api',
            };
          }
          latestError = '接口返回成功但未观察到收藏态';
        } else {
          latestError = `${(apiResp?.message || `收藏接口异常(${apiResp?.code || 'unknown'})`).toString()}`;
        }
      } catch (error: any) {
        latestError = error?.message || '收藏接口请求失败';
      }
    } catch (error: any) {
      latestError = error?.message || latestError;
    }

    logger$1.debug(`工作【${jobTitle}】收藏失败; 正在等待重试; 原因：${latestError}`);
    await Tools.sleep(600);
    return await this.doCollect(jobDetail, latestError, retries - 1);
  }

  /**
   * 获取 BOSS 会话数据，并在本地缓存中复用结果。
   *
   * @param jobDetail 当前岗位详情对象。
   * @returns BOSS 数据接口返回结果。
   * @throws {FetchJobDetailError} 当底层请求在多次重试后仍失败时抛出。
   */
  async requestBossDataByCache(jobDetail: any): Promise<any> {
    const cacheKey = `${jobDetail.encryptBossId}-${jobDetail.securityId}`;

    if (this.bossDataCache.has(cacheKey)) {
      const cached = this.bossDataCache.get(cacheKey)!;

      // 命中缓存后刷新访问时间，保持最近访问的数据更不容易被淘汰。
      this.bossDataCache.delete(cacheKey);
      this.bossDataCache.set(cacheKey, { ...cached, timestamp: Date.now() });
      return cached.data;
    }

    const result = await this.requestBossData(jobDetail);
    this.bossDataCache.set(cacheKey, { data: result, timestamp: Date.now() });

    // 超出容量时移除最久未使用的数据，控制会话缓存体积。
    if (this.bossDataCache.size > this.MAX_BOSS_CACHE) {
      const sortedEntries = Array.from(this.bossDataCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toDelete = sortedEntries.slice(0, this.bossDataCache.size - this.MAX_BOSS_CACHE);
      toDelete.forEach(([key]) => this.bossDataCache.delete(key));
    }

    return result;
  }

  /**
   * 请求岗位对应的 BOSS 数据。
   *
   * @param jobDetail 当前岗位详情对象。
   * @param errorMsg 上一次失败时记录的错误信息。
   * @param retries 允许的剩余重试次数。
   * @returns BOSS 数据接口返回结果。
   * @throws {FetchJobDetailError} 当请求在多次重试后仍失败时抛出。
   */
  async requestBossData(jobDetail: any, errorMsg = '', retries = 3): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FetchJobDetailError(jobTitle, errorMsg || '获取boss数据重试多次失败');
    }

    try {
      return await this.apiClient.requestBossData(jobDetail);
    } catch (e: any) {
      return this.requestBossData(jobDetail, e.message, retries - 1);
    }
  }

  /**
   * 判断通用消息通道对象是否已连接。
   *
   * @param channel 运行时消息通道对象。
   * @returns 通道存在且可发送时返回 `true`。
   */
  isSendChannelConnected(channel: any): boolean {
    if (!channel) {
      return false;
    }

    if (channel.client && typeof channel.client.isConnected === 'function') {
      try {
        return channel.client.isConnected();
      } catch (_e) {
        return false;
      }
    }

    return typeof channel.send === 'function';
  }

  /**
   * 判断 GeekChatCore 通道是否已连接。
   *
   * @param geekCore GeekChatCore 运行时实例。
   * @returns 通道存在且连接正常时返回 `true`。
   */
  isGeekChannelConnected(geekCore: any): boolean {
    if (!geekCore || typeof geekCore.getInstance !== 'function') {
      return false;
    }

    try {
      const instance = geekCore.getInstance?.();
      const clientWrapper = instance?.getClient?.();
      const client = clientWrapper?.client;
      if (!client || typeof client.send !== 'function') {
        return false;
      }

      if (typeof client.isConnected === 'function') {
        return !!client.isConnected();
      }

      if (typeof client.connected === 'boolean') {
        return client.connected;
      }

      if (typeof client.readyState === 'number') {
        return client.readyState === 1;
      }

      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * 汇总当前页面所有可用消息通道的存在性与连接状态。
   *
   * @returns 图片、文本和 Geek 通道的状态快照。
   */
  getSendChannelState(): {
    imageExists: boolean;
    imageConnected: boolean;
    textExists: boolean;
    textConnected: boolean;
    geekExists: boolean;
    geekConnected: boolean;
  } {
    const geekCore = Tools.window.GeekChatCore;
    return {
      imageExists: !!Tools.window.ChatWebsocketImage,
      imageConnected: this.isSendChannelConnected(Tools.window.ChatWebsocketImage),
      textExists: !!Tools.window.ChatWebsocket,
      textConnected: this.isSendChannelConnected(Tools.window.ChatWebsocket),
      geekExists: !!geekCore,
      geekConnected: this.isGeekChannelConnected(geekCore),
    };
  }

  /**
   * 将消息通道状态格式化为便于日志输出的字符串。
   *
   * @param state 消息通道状态对象。
   * @returns 适合输出到日志或异常信息中的紧凑状态串。
   */
  formatSendChannelState(state: {
    imageExists: boolean;
    imageConnected: boolean;
    textExists: boolean;
    textConnected: boolean;
    geekExists: boolean;
    geekConnected: boolean;
  }): string {
    return `image(${state.imageExists ? 'Y' : 'N'}/${state.imageConnected ? 'on' : 'off'}),text(${state.textExists ? 'Y' : 'N'}/${state.textConnected ? 'on' : 'off'}),geek(${state.geekExists ? 'Y' : 'N'}/${state.geekConnected ? 'on' : 'off'})`;
  }

  private getPageUidString(): string {
    const uidValue = Tools.getPageUidString();
    if (!uidValue) {
      throw new Error('页面上下文 uid 为空');
    }
    return uidValue;
  }

  private getBossTokenPreferCookie(): string {
    const pageMeta = Tools.window?._PAGE as { token?: unknown } | undefined;
    const token = Tools.getCookieValue('bst') || Tools.getPageToken() || `${pageMeta?.token || ''}`;
    return `${token || ''}`.trim();
  }

  /**
   * 确保至少有一条消息发送通道可用。
   *
   * 方法会尝试初始化图片/文本通道，随后在限定时间内轮询状态，
   * 并定期触发重连，以提高自动消息和图片简历发送的成功率。
   *
   * @param waitMs 最长等待时间，单位毫秒。
   * @returns 任一发送通道准备就绪时返回 `true`，否则返回 `false`。
   */
  async ensureSendChannelReady(waitMs = 4500): Promise<boolean> {
    if (!Tools.window.ChatWebsocketImage && typeof setChatWebsocket === 'function') {
      await setChatWebsocket();
    }

    const tryInit = (channel: any) => {
      if (!channel || typeof channel.init !== 'function') {
        return;
      }

      if (this.isSendChannelConnected(channel)) {
        return;
      }

      try {
        channel.init();
      } catch (e) {
        logger$1.debug('初始化消息通道失败', e);
      }
    };

    tryInit(Tools.window.ChatWebsocketImage);
    tryInit(Tools.window.ChatWebsocket);

    const startTs = Date.now();
    let reconnectTs = 0;
    while (Date.now() - startTs < waitMs) {
      const state = this.getSendChannelState();

      // 只要任一通道可用，就允许后续发送逻辑继续执行。
      if (state.imageConnected || state.textConnected || state.geekConnected) {
        return true;
      }

      if (Date.now() - reconnectTs > 1000) {
        const reconnectChannels: Array<{ reConnection?: () => void } | undefined> = [
          Tools.window.ChatWebsocketImage as { reConnection?: () => void } | undefined,
          Tools.window.ChatWebsocket as { reConnection?: () => void } | undefined,
        ];
        reconnectChannels.forEach((channel) => {
          if (!channel || typeof channel.reConnection !== 'function') {
            return;
          }

          try {
            // 对仍未连通的通道周期性发起重连，兼容页面懒初始化或掉线重连场景。
            channel.reConnection();
          } catch (e) {
            logger$1.debug('消息通道重连触发失败', e);
          }
        });
        reconnectTs = Date.now();
      }

      await Tools.sleep(180);
    }

    return false;
  }

  private getRecommendPageScrollHeight(): number {
    const selectors = [
      '.job-list-container',
      '.job-list',
      '.recommend-job-list',
      '.recommend-search-inner',
    ];
    const heights = selectors
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((node): node is HTMLElement => !!node)
      .map((node) => node.scrollHeight || 0);
    heights.push(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    return Math.max(...heights, 0);
  }

  /**
   * 处理投递成功或失败后的统一收尾逻辑。
   *
   * 投递成功时会更新成功计数、记录 AI 判定理由，并尝试发送图片简历与自定义消息；
   * 投递失败时则根据平台返回内容转换为明确的业务异常。
   *
   * @param pushResult 投递接口返回结果。
   * @param jobDetail 已执行投递的岗位详情对象。
   * @returns 投递成功后返回更新过联系状态的岗位对象。
   * @throws {PushLimitError} 当平台提示当日沟通人数达到上限时抛出。
   * @throws {PushRequestError} 当投递结果不是成功且不属于每日上限时抛出。
   */
  async pushAfterHandler(pushResult: any, jobDetail: any): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (pushResult.message === 'Success' && pushResult.code === 0) {
      pushResultCounter.successIncr();
      const aiJudgeReason = `${jobDetail?.aiDeliveryJudge?.reason || ''}`.trim();
      if (aiJudgeReason) {
        this.preferenceLogRecorder.info(`工作【${jobTitle}】 投递成功 AI理由：${aiJudgeReason}`);
      } else {
        this.preferenceLogRecorder.info(`工作【${jobTitle}】 投递成功`);
      }

      // 投递成功后的附加动作互不阻断：图片失败不影响消息发送，消息失败也不回滚投递结果。
      try {
        await this.pushAfterSendImage(jobDetail);
      } catch (e: any) {
        this.preferenceLogRecorder.warn(
          `工作【${jobTitle}】发送图片简历失败 原因：${e?.message || e}`
        );
      }

      try {
        await this.pushAfterSendMsg(jobDetail);
      } catch (e: any) {
        this.preferenceLogRecorder.warn(
          `工作【${jobTitle}】发送自定义消息失败 原因：${e?.message || e}`
        );
      }

      jobDetail.contact = true;
      return jobDetail;
    }

    if (pushResult.message.includes('今日沟通人数已达上限')) {
      throw new PushLimitError(pushResult.message);
    }

    throw new PushRequestError(jobTitle, pushResult.message);
  }

  /**
   * 投递成功后发送自定义文本消息。
   *
   * @param jobDetail 已投递成功的岗位详情对象。
   * @returns 无返回值。
   * @throws {Error} 当消息通道不可用、BOSS 数据获取失败或消息发送失败时抛出。
   */
  async pushAfterSendMsg(jobDetail: any): Promise<void> {
    const preference = runtimeUserStore?.user?.preference || {};
    const customGreetingEnabled = normalizePreferenceBoolean(
      getPreferenceValue(preference, 'customGreetingEnabled', 'cgE'),
      false
    );
    if (!customGreetingEnabled || this._pushMock) {
      return;
    }

    await Tools.sleep(Tools.getRandomNumber(700, 2200));
    this.enforceAutoContactSafety('message');

    // 发送前先确保页面运行时消息通道已就绪，避免直接丢消息。
    const ready = await this.ensureSendChannelReady();
    if (!ready) {
      throw new Error(
        `消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`
      );
    }

    const bossData = await this.requestBossDataByCache(jobDetail);
    const customGreetingRaw = getPreferenceValue(preference, 'customGreeting', 'cg');
    const customGreeting =
      typeof customGreetingRaw === 'string'
        ? customGreetingRaw
        : customGreetingRaw == null
          ? void 0
          : `${customGreetingRaw}`;
    const message = new Message({
      form_uid: this.getPageUidString(),
      to_uid: bossData.data.bossId.toString(),
      to_name: jobDetail.encryptBossId,
      content: customGreeting,
      image: void 0,
    });

    let sendOk = message.send();
    if (!sendOk) {
      // 首次发送失败时进行一次短暂等待和通道重试，以兼容连接刚恢复但尚未稳定的场景。
      await Tools.sleep(300);
      await this.ensureSendChannelReady(2200);
      sendOk = message.send();
    }

    if (!sendOk) {
      throw new Error(`消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`);
    }
  }

  /**
   * 投递成功后发送图片简历。
   *
   * @param jobDetail 已投递成功的岗位详情对象。
   * @returns 无返回值。
   * @throws {Error} 当图片配置不合法、消息通道不可用、BOSS 数据获取失败或发送失败时抛出。
   */
  async pushAfterSendImage(jobDetail: any): Promise<void> {
    const preference = runtimeUserStore?.user?.preference || {};
    const customImageEnabled = normalizePreferenceBoolean(
      getPreferenceValue(preference, 'customImageEnabled', 'cIE'),
      false
    );
    if (!customImageEnabled || this._pushMock) {
      return;
    }

    await Tools.sleep(Tools.getRandomNumber(900, 2400));
    this.enforceAutoContactSafety('image');

    const customerImageSet = `${getPreferenceValue(preference, 'customImageSet', 'cI') || ''}`;
    if (!customerImageSet) {
      return;
    }

    const [originImage, tinyImage] = customerImageSet.split('===');
    if (!originImage || !tinyImage) {
      throw new Error('图片简历配置格式异常，请重新上传图片简历');
    }

    const ready = await this.ensureSendChannelReady(5500);
    if (!ready) {
      throw new Error(
        `图片消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`
      );
    }

    const bossData = await this.requestBossDataByCache(jobDetail);
    const message = new Message({
      form_uid: this.getPageUidString(),
      to_uid: bossData.data.bossId.toString(),
      to_name: jobDetail.encryptBossId,
      content: '',
      image: {
        originImage,
        tinyImage,
      },
    });

    let sendOk = message.send();
    if (!sendOk) {
      // 图片消息对连接稳定性更敏感，失败后同样进行一次短重连再补发。
      await Tools.sleep(350);
      await this.ensureSendChannelReady(2200);
      sendOk = message.send();
    }

    if (!sendOk) {
      throw new Error(
        `图片消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`
      );
    }
  }

  /**
   * 投递前对岗位对象进行预处理。
   *
   * 当前实现保持原样透传，预留给未来扩展使用。
   *
   * @param jobDetail 待投递岗位详情对象。
   * @returns 原始岗位详情对象。
   */
  pushPreHandler(jobDetail: any): any {
    return jobDetail;
  }

  /**
   * 获取岗位详情页中的扩展信息。
   *
   * 扩展信息主要用于活跃度、职位描述等规则判断；当多次获取失败时，
   * 会将该岗位视为无法安全判断并抛出不匹配异常。
   *
   * @param jobDetail 当前岗位详情对象。
   * @param message 上一次失败时记录的错误信息。
   * @param retries 允许的剩余重试次数。
   * @returns 岗位详情扩展信息。
   * @throws {NotMatchError} 当扩展信息在多次重试后仍无法获取时抛出。
   */
  async obtainBossJobDetailExt(jobDetail: any, message = '', retries = 3): Promise<any> {
    if (retries === 0) {
      logger$1.warn(`获取工作详情扩展信息异常,用于活跃度过滤以及工作内容过滤; 原因：${message}`);
      throw new NotMatchError(this.getJobKey(jobDetail), message, '获取工作详情扩展信息异常');
    }

    // 验证必需参数是否存在
    const missingParams: string[] = [];
    if (!jobDetail.securityId) missingParams.push('securityId');
    if (!jobDetail.encryptJobId) missingParams.push('encryptJobId');
    if (!jobDetail.lid) missingParams.push('lid');

    if (missingParams.length > 0) {
      const errorMsg = `岗位信息缺少必需参数: ${missingParams.join(', ')}`;
      logger$1.warn(`${errorMsg}，无法获取岗位详情扩展信息`);
      throw new NotMatchError(this.getJobKey(jobDetail), errorMsg, '岗位信息不完整');
    }

    try {
      return await this.apiClient.obtainBossJobDetailExt(
        jobDetail.securityId,
        jobDetail.encryptJobId,
        jobDetail.lid
      );
    } catch (error: any) {
      logger$1.debug('获取详情页异常正在重试:', error);
      return this.obtainBossJobDetailExt(jobDetail, error.message, retries - 1);
    }
  }

  /**
   * 确保用户画像中存在足够可用的运行时简历叙述文本。
   *
   * @param user 当前运行时用户对象。
   * @returns 无返回值。
   */
  private async ensureRuntimeResumeNarrative(user: Record<string, unknown>): Promise<void> {
    const importedResume = (user.importedResume as Record<string, unknown>) || {};
    const currentText = `${importedResume.resumeText || ''}`.trim();
    logger$1.debug(`检查运行时简历长度: ${currentText.length} 字符 (要求 >= 80)`);
    if (currentText.length >= 80) {
      return;
    }

    const now = Date.now();
    if (this.runtimeResumeRefreshPromise) {
      await this.runtimeResumeRefreshPromise;
      return;
    }
    if (now - this.lastRuntimeResumeRefreshTs < RUNTIME_RESUME_REFRESH_INTERVAL_MS) {
      return;
    }

    // 通过共享中的刷新任务避免同一轮匹配并发重复刷新简历，降低接口压力与状态竞争。
    this.lastRuntimeResumeRefreshTs = now;
    this.runtimeResumeRefreshPromise = this.fetchAndCacheRuntimeResumeText(user)
      .catch((error: any) => {
        logger$1.debug('运行时刷新简历文本失败', error?.message || error);
      })
      .finally(() => {
        this.runtimeResumeRefreshPromise = null;
      });
    await this.runtimeResumeRefreshPromise;
  }

  /**
   * 拉取并缓存运行时简历文本。
   *
   * @param user 当前运行时用户对象。
   * @returns 无返回值。
   */
  private async fetchAndCacheRuntimeResumeText(user: Record<string, unknown>): Promise<void> {
    const token = this.getBossTokenPreferCookie();
    if (!token) {
      return;
    }

    let resumeText = '';
    let resumeTextSource = '';

    // 优先走预览接口，能直接拿到结构化数据并减少页面 HTML 解析成本。
    const previewText = await this.fetchRuntimeResumeTextFromPreviewApi().catch(() => '');
    if (previewText.length >= 80) {
      resumeText = previewText;
      resumeTextSource = 'runtime-resume-preview-api';
    }

    if (!resumeText) {
      // 预览接口不可用时回退到页面 HTML 抽取，尽量保证 AI 仍能拿到简历摘要。
      const pageHtml = await this.apiClient.fetchAndCacheRuntimeResumeText();
      const pageText = extractResumeTextFromHtml(pageHtml, 12_000);
      if (pageText.length >= 80) {
        resumeText = pageText;
        resumeTextSource = 'runtime-resume-page';
      }
    }

    if (!resumeText) {
      logger$1.warn(
        '简历获取失败：预览 API 和页面 HTML 均未返回足够长度的简历文本（要求 >= 80 字符）'
      );
      return;
    }

    const importedResume = (user.importedResume as Record<string, unknown>) || {};
    user.importedResume = {
      ...importedResume,
      resumeText,
      resumeTextSource,
      importedAt: new Date().toISOString(),
    };
    logger$1.info(`简历更新成功: 来源=${resumeTextSource}, 长度=${resumeText.length} 字符`);
    if (runtimeUserStore?.user) {
      Tools.saveStoredUserProfile(runtimeUserStore.user);
    }
  }

  /**
   * 通过预览接口获取运行时简历文本。
   *
   * @returns 截断后的简历文本。
   */
  private async fetchRuntimeResumeTextFromPreviewApi(): Promise<string> {
    const zpData = await this.apiClient.fetchRuntimeResumeTextFromPreviewApi();
    return this.buildRuntimeResumeTextFromPreviewData(zpData, 12_000);
  }

  /**
   * 将预览接口返回的结构化简历数据拼装为可供 AI 使用的文本。
   *
   * @param dataInput 简历预览接口返回的数据对象。
   * @param maxLength 输出文本最大长度。
   * @returns 结构化拼接后的简历文本；若无有效内容则返回空字符串。
   */
  private buildRuntimeResumeTextFromPreviewData(
    dataInput: Record<string, unknown>,
    maxLength = 12_000
  ): string {
    const data = toRecord(dataInput);
    const baseInfo = toRecord(data.baseInfo);
    const expectList = Array.isArray(data.expectList) ? data.expectList : [];
    const workExpList = Array.isArray(data.workExpList) ? data.workExpList : [];
    const projectExpList = Array.isArray(data.projectExpList) ? data.projectExpList : [];
    const educationExpList = Array.isArray(data.educationExpList) ? data.educationExpList : [];

    const sections: string[] = [];

    // 将不同信息块统一整理成可读段落，便于 AI 在单次上下文中理解候选人画像。
    const basicLines = [
      `姓名：${toText(baseInfo.nickName, 80)}`,
      `工作年限：${toText(baseInfo.workYearDesc, 60)}`,
      `学历：${toText(baseInfo.degreeCategory, 60)}`,
      `求职状态：${toText(data.applyStatusDesc, 80)}`,
    ].filter((line) => line.split('：')[1]);
    if (basicLines.length) {
      sections.push(`基本信息\n${basicLines.join('\n')}`);
    }

    const expectRows = expectList
      .filter((item: any) => Number(item?.positionType ?? 0) === 0)
      .map((item: any) =>
        [
          toText(item?.positionName, 80),
          toText(item?.cityName || item?.locationName, 80),
          toText(item?.salaryDesc, 80),
        ]
          .filter(Boolean)
          .join(' / ')
      )
      .filter(Boolean);
    if (expectRows.length) {
      sections.push(`期望职位\n${expectRows.map((row) => `- ${row}`).join('\n')}`);
    }

    const userDesc = toText(data.userDesc || data.selfIntroduction, 1600);
    if (userDesc) {
      sections.push(`个人优势\n${userDesc}`);
    }

    const workRows = workExpList
      .map((item: any) => {
        const title = [toText(item?.companyName, 100), toText(item?.positionName, 100)]
          .filter(Boolean)
          .join(' - ');
        const period = [
          toText(item?.startDate || item?.startYear, 40),
          toText(item?.endDate || item?.endYear, 40),
        ]
          .filter(Boolean)
          .join(' ~ ');
        const content = [toText(item?.workContent, 1200), toText(item?.workPerformance, 1200)]
          .filter(Boolean)
          .join('\n');
        const block = [title, period, content].filter(Boolean).join('\n');
        return block ? `- ${block}` : '';
      })
      .filter(Boolean);
    if (workRows.length) {
      sections.push(`工作经历\n${workRows.join('\n\n')}`);
    }

    const projectRows = projectExpList
      .map((item: any) => {
        const title = [toText(item?.name, 120), toText(item?.roleName, 80)]
          .filter(Boolean)
          .join(' - ');
        const period = [toText(item?.startDate, 40), toText(item?.endDate, 40)]
          .filter(Boolean)
          .join(' ~ ');
        const content = [toText(item?.projectDesc, 1200), toText(item?.performance, 1200)]
          .filter(Boolean)
          .join('\n');
        const block = [title, period, content].filter(Boolean).join('\n');
        return block ? `- ${block}` : '';
      })
      .filter(Boolean);
    if (projectRows.length) {
      sections.push(`项目经历\n${projectRows.join('\n\n')}`);
    }

    const educationRows = educationExpList
      .map((item: any) =>
        [
          toText(item?.school || item?.schoolName, 120),
          toText(item?.major || item?.majorName, 120),
          toText(item?.degreeName, 60),
          [
            toText(item?.startYear || item?.startDate, 40),
            toText(item?.endYear || item?.endDate, 40),
          ]
            .filter(Boolean)
            .join(' ~ '),
        ]
          .filter(Boolean)
          .join(' / ')
      )
      .filter(Boolean);
    if (educationRows.length) {
      sections.push(`教育经历\n${educationRows.map((row) => `- ${row}`).join('\n')}`);
    }

    const finalText = sections.join('\n\n').trim();
    if (!finalText) {
      return '';
    }
    return finalText.length > maxLength ? `${finalText.slice(0, maxLength)}...` : finalText;
  }

  /**
   * 根据偏好配置判断 BOSS 活跃时间是否满足要求。
   *
   * @param activeText 页面展示的活跃时间描述。
   * @param activePreference 活跃度过滤偏好配置。
   * @returns 满足当前活跃度配置时返回 `true`。
   */
  bossIsActive(activeText: string, activePreference: Record<string, boolean> = {}): boolean {
    const checkWeek = normalizePreferenceBoolean(activePreference.acW, true);
    const checkMonth = normalizePreferenceBoolean(activePreference.acM, true);
    const checkYear = normalizePreferenceBoolean(activePreference.acY, true);

    if (checkWeek && activeText.includes('周')) {
      return false;
    }

    if (checkMonth && activeText.includes('月')) {
      return false;
    }

    if (checkYear && activeText.includes('年')) {
      return false;
    }

    return true;
  }

  /**
   * 判断岗位是否已经存在沟通关系。
   *
   * @param jobCardJson 岗位或详情接口返回的数据对象。
   * @returns 若 `friendStatus` 表示已沟通，则返回 `true`。
   */
  isCommunication(jobCardJson: any): boolean {
    return jobCardJson?.friendStatus === 1;
  }

  private shouldEnableAiDeliveryJudge(): boolean {
    const preference = runtimeUserStore?.user?.preference || {};
    return Tools.getAiDeliveryJudgeConfig(preference).enabled;
  }

  private isTraditionalDeliveryEnabled(): boolean {
    const preference = runtimeUserStore?.user?.preference || {};
    return normalizePreferenceBoolean(preference.traditionalDeliveryE, true);
  }

  /**
   * 在 AI 回退到传统规则时执行传统规则校验。
   *
   * @param traditionalDeliveryEnabled 是否启用了传统投递规则。
   * @param jobDetail 岗位基础详情对象。
   * @param jobDetailExt 岗位扩展详情对象。
   * @param jobTitle 岗位可读标识。
   * @param fallbackReason 触发回退的原因说明。
   * @returns 无返回值。
   * @throws {NotMatchError} 当未开启传统规则或传统规则校验失败时抛出。
   */
  private applyTraditionalFallbackChecks(
    traditionalDeliveryEnabled: boolean,
    jobDetail: any,
    jobDetailExt: any,
    jobTitle: string,
    fallbackReason: string
  ): void {
    if (!traditionalDeliveryEnabled) {
      throw new NotMatchError(jobTitle, fallbackReason, 'AI回退传统投递失败：未开启传统投递规则');
    }

    // 回退时需要完整执行传统基础与扩展规则，确保 AI 失败不会放宽既有约束。
    this.applyCommonHardConstraints(jobDetail, jobTitle);
    this.applyTraditionalSoftFilters(jobDetail, jobTitle);
    this.applyTraditionalExtChecks(jobDetailExt, jobTitle);
  }

  /**
   * 执行 AI 与传统模式共用的硬性约束检查。
   *
   * @param jobDetail 岗位详情对象。
   * @param jobTitle 岗位可读标识。
   * @returns 无返回值。
   * @throws {NotMatchError} 当命中猎头过滤、黑名单、薪资范围或公司规模限制时抛出。
   */
  private applyCommonHardConstraints(jobDetail: any, jobTitle: string): void {
    const preference = runtimeUserStore?.user?.preference || {};

    // 过滤猎头
    if (preference.fhE && jobDetail.goldHunter === 1) {
      throw new NotMatchError(jobTitle, jobDetail.goldHunter, '过滤猎头');
    }

    // 仅投递在线 BOSS
    if (preference.polE && !jobDetail.bossOnline) {
      throw new NotMatchError(jobTitle, jobDetail.bossOnline, '仅投递在线boss');
    }

    // 公司名排除（黑名单）
    const companyNameExclude = preference.cne;
    if (preference.cneE && Tools.fuzzyMatch(companyNameExclude, jobDetail.brandName, false)) {
      throw new NotMatchError(jobTitle, jobDetail.brandName, '满足排除公司名');
    }

    // 岗位名排除（黑名单）
    const jobNameExclude = preference.jne;
    if (preference.jneE && Tools.fuzzyMatch(jobNameExclude, jobDetail.jobName, false)) {
      throw new NotMatchError(jobTitle, jobDetail.jobName, '满足排除工作名');
    }

    // 薪资范围检查
    const pageSalaryRange = `${jobDetail.salaryDesc || ''}`.split('.')[0];
    if (preference.srE) {
      const salaryFilterType = `${preference.srT || '1'}`;
      if (!Tools.isSalaryTypeSupportedForFilter(pageSalaryRange, salaryFilterType)) {
        throw new NotMatchError(jobTitle, pageSalaryRange, '薪资类型不匹配');
      }

      const comparableSalaryRange = Tools.getComparableSalaryRange(
        pageSalaryRange,
        salaryFilterType
      );
      if (!Tools.isSalaryRangeMatched(preference.sr, comparableSalaryRange)) {
        throw new NotMatchError(jobTitle, pageSalaryRange, '不满足薪资范围');
      }
    }

    // 公司规模范围检查
    const pageCompanyScaleRange = preference.csr;
    if (preference.csrE && !Tools.isRangeOverlap(pageCompanyScaleRange, jobDetail.brandScaleName)) {
      throw new NotMatchError(jobTitle, jobDetail.brandScaleName, '不满足公司规模范围');
    }
  }

  /**
   * 执行仅在传统投递模式下生效的软性过滤。
   *
   * @param jobDetail 岗位详情对象。
   * @param jobTitle 岗位可读标识。
   * @returns 无返回值。
   * @throws {NotMatchError} 当不满足公司名或岗位名白名单条件时抛出。
   */
  private applyTraditionalSoftFilters(jobDetail: any, jobTitle: string): void {
    const preference = runtimeUserStore?.user?.preference || {};

    // 公司名包含（白名单）
    const companyNameInclude = preference.cni;
    if (preference.cniE && !Tools.fuzzyMatch(companyNameInclude, jobDetail.brandName, true)) {
      throw new NotMatchError(jobTitle, jobDetail.brandName, '不满足配置公司名');
    }

    // 岗位名包含（白名单）
    const jobNameInclude = preference.jni;
    if (preference.jniE && !Tools.fuzzyMatch(jobNameInclude, jobDetail.jobName, true)) {
      throw new NotMatchError(jobTitle, jobDetail.jobName, '不满足配置工作名');
    }
  }

  /**
   * 执行传统投递基础检查。
   *
   * 该方法用于兼容旧调用路径；新代码优先直接使用 `applyCommonHardConstraints` 与 `applyTraditionalSoftFilters`。
   * @param jobDetail 岗位详情对象。
   * @param jobTitle 岗位可读标识。
   * @returns 无返回值。
   * @throws {NotMatchError} 当任一基础规则不满足时抛出。
   */
  private applyTraditionalBaseChecks(jobDetail: any, jobTitle: string): void {
    this.applyCommonHardConstraints(jobDetail, jobTitle);
    this.applyTraditionalSoftFilters(jobDetail, jobTitle);
  }

  /**
   * 执行依赖岗位扩展详情的传统规则检查。
   *
   * @param jobDetailExt 岗位扩展详情对象。
   * @param jobTitle 岗位可读标识。
   * @returns 无返回值。
   * @throws {NotMatchError} 当活跃度或职位描述规则不满足时抛出。
   */
  private applyTraditionalExtChecks(jobDetailExt: any, jobTitle: string): void {
    const preference = runtimeUserStore?.user?.preference || {};
    const activeTimeDesc = jobDetailExt.activeTimeDesc;
    const isActiveFilterEnabled = normalizePreferenceBoolean(preference.acE, false);

    // 活跃度规则用于过滤长时间未上线的招聘方，降低低响应岗位占比。
    if (isActiveFilterEnabled && !this.bossIsActive(activeTimeDesc, preference)) {
      throw new NotMatchError(jobTitle, activeTimeDesc, '不满足活跃度检查');
    }

    const jobContent = jobDetailExt.postDescription;
    const jobContentExclude = preference.jce;

    // 先执行职位描述黑名单，再执行白名单，避免命中排除项时被白名单误放行。
    if (preference.jceE && Tools.fuzzyMatch(jobContentExclude, jobContent, false)) {
      throw new NotMatchError(jobTitle, jobContent, '满足排除工作内容');
    }

    const jobContentInclude = preference.jci;
    if (preference.jciE && !Tools.fuzzyMatch(jobContentInclude, jobContent, true)) {
      throw new NotMatchError(jobTitle, jobContent, '不满足工作内容');
    }
  }

  /**
   * 对 AI 日志中输出的用户画像做脱敏处理。
   *
   * @param userProfile 原始用户画像对象。
   * @returns 已脱敏的用户画像副本。
   */
  private maskAiDeliveryUserProfile(userProfile: Record<string, unknown>): Record<string, unknown> {
    const maskText = (value: unknown, keepStart = 2, keepEnd = 2): string => {
      const text = `${value || ''}`;
      if (!text) {
        return '';
      }
      if (text.length <= keepStart + keepEnd) {
        return `${'*'.repeat(Math.max(1, text.length - 1))}${text.slice(-1)}`;
      }
      return `${text.slice(0, keepStart)}${'*'.repeat(text.length - keepStart - keepEnd)}${text.slice(-keepEnd)}`;
    };

    return {
      ...userProfile,
      phone: maskText(userProfile.phone),
      email: maskText(userProfile.email, 2, 4),
      resumeId: maskText(userProfile.resumeId, 1, 2),
      importedResumeTextSource: `${userProfile.importedResumeTextSource || ''}`.slice(0, 80),
      importedResumeTextSnippet: `${userProfile.importedResumeTextSnippet || ''}`.slice(0, 180),
      resumeNarrative: `${userProfile.resumeNarrative || ''}`.slice(0, 180),
    };
  }

  /**
   * 规范化 AI 判定理由文本。
   *
   * @param reason 原始理由。
   * @param fallback 当理由为空时使用的兜底说明。
   * @returns 清洗并截断后的理由文本。
   */
  private normalizeAiJudgeReason(reason: unknown, fallback: string): string {
    const normalized = `${reason || ''}`.replace(/\s+/g, ' ').trim();
    if (normalized) {
      return normalized.slice(0, 360);
    }
    return fallback;
  }

  private extractAiJudgeJsonText(text: string): string {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fencedMatch?.[1] || text).trim();
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return candidate.slice(start, end + 1);
    }
    return '';
  }

  private parseAiJudgeObjectPayload(
    payload: any,
    parseMode: string
  ): { match: boolean; reason: string; valid: boolean; parseMode: string } | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    if (typeof payload.match === 'boolean') {
      return {
        match: payload.match,
        reason: this.normalizeAiJudgeReason(
          payload.reason,
          '[NO_REASON] AI未提供理由，已按判定结果执行'
        ),
        valid: true,
        parseMode,
      };
    }
    if (typeof payload.filter === 'boolean') {
      return {
        match: !payload.filter,
        reason: this.normalizeAiJudgeReason(
          payload.reason,
          '[NO_REASON] AI未提供理由，已按过滤结果执行'
        ),
        valid: true,
        parseMode,
      };
    }
    return null;
  }

  private extractAiJudgeReasonFromText(text: string, fallback: string): string {
    const reasonMatch = text.match(/reason\s*[:：=]\s*["“”']?([^"“”'，,}\n]+)["“”']?/i);
    if (reasonMatch?.[1]) {
      return this.normalizeAiJudgeReason(reasonMatch[1], fallback);
    }
    const cleaned = text
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return this.normalizeAiJudgeReason(cleaned, fallback);
  }

  /**
   * 解析 AI 投递判定结果。
   *
   * 会兼容对象、JSON 字符串和启发式字符串等多种返回形态，
   * 尽可能将模型输出统一转换为稳定的业务结构。
   *
   * @param filterResp AI 过滤接口返回结果。
   * @returns 包含是否匹配、理由、有效性和解析模式的统一结果对象。
   */
  private parseAiDeliveryJudgeResult(filterResp: any): {
    match: boolean;
    reason: string;
    valid: boolean;
    parseMode: string;
  } {
    const raw = filterResp?.data?.data;
    if (!raw) {
      return { match: false, reason: 'AI判定返回为空', valid: false, parseMode: 'empty' };
    }

    if (typeof raw === 'object') {
      const parsedObject = this.parseAiJudgeObjectPayload(raw, 'object');
      if (parsedObject) {
        return parsedObject;
      }
    }

    if (typeof raw === 'string') {
      const text = raw.trim();
      try {
        // 优先按 JSON 字符串解析，兼容模型返回被包裹成文本的结构化结果。
        const parsed = JSON.parse(text);
        const parsedObject = this.parseAiJudgeObjectPayload(parsed, 'json-string');
        if (parsedObject) {
          return parsedObject;
        }
      } catch (_e) {
        const jsonText = this.extractAiJudgeJsonText(text);
        if (jsonText) {
          try {
            const parsed = JSON.parse(jsonText);
            const parsedObject = this.parseAiJudgeObjectPayload(parsed, 'json-substring');
            if (parsedObject) {
              return parsedObject;
            }
          } catch (_e2) {
            // 子串仍不可解析时继续使用启发式识别。
          }
        }

        // JSON 解析失败时再做轻量启发式识别，尽量从非标准输出中恢复结论并保留模型文本理由。
        const lower = text.toLowerCase();
        if (lower.includes('"match":true') || lower.includes('match:true')) {
          return {
            match: true,
            reason: this.extractAiJudgeReasonFromText(text, 'AI文本判定为可投递'),
            valid: true,
            parseMode: 'heuristic-string.true',
          };
        }
        if (lower.includes('"match":false') || lower.includes('match:false')) {
          return {
            match: false,
            reason: this.extractAiJudgeReasonFromText(text, 'AI文本判定为不投递'),
            valid: true,
            parseMode: 'heuristic-string.false',
          };
        }
      }
    }

    return { match: false, reason: 'AI判定结果无法解析', valid: false, parseMode: 'invalid' };
  }

  /**
   * 生成 AI 判定链路追踪标识。
   *
   * @returns 由时间戳和随机后缀组成的追踪 ID。
   */
  private buildAiJudgeTraceId(): string {
    const ts = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${ts}-${randomSuffix}`;
  }
}
