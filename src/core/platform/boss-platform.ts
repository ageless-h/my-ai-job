import axios from "axios";
import { AiPower } from "@/core/ai/ai-power";
import { AbsPlatform, PushResultStatus, PushStatus, pushResultCounter, runtimeUserStore } from "@/core/engine/push-engine";
import { Logger } from "@/shared/utils/logger";
import { Tools } from "@/shared/utils/tools";
import { extractResumeTextFromHtml } from "@/shared/utils/resume";
import { getPreferenceValue, normalizePreferenceBoolean } from "@/shared/utils/preference";
import {
  buildAiDeliveryFilterJobInput,
  buildAiDeliveryJudgePrompt,
  buildAiDeliveryUserProfile,
  buildTraditionalRuleSnapshot,
  resolveAiDeliveryFallback
} from "@/shared/utils/ai-delivery";
import { TampermonkeyApi } from "@/shared/utils/tampermonkey";
import {
  NotMatchError,
  PushRequestError,
  FavoriteRequestError,
  FetchJobDetailError,
  PushLimitError,
  PushStopError
} from "@/shared/errors";
import { Message } from "@/core/protocol/message";
import { simulateScrollToEnd } from "@/shared/utils/scroll";

const logger$1 = Logger.rootLogger;
const AI_DELIVERY_JUDGE_TIMEOUT_MS = 12_000;
const RUNTIME_RESUME_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const toText = (value: unknown, maxLength = 500): string => {
  const text = `${value || ""}`.replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

async function setChatWebsocket(): Promise<void> {
  logger$1.info("check ChatWebsocket runtime channels");
  if (!Tools.isBossDomainHost(Tools.getCurrentHostname())) {
    logger$1.warn("当前域名不受信任，跳过消息通道初始化");
    return;
  }

  const runtimeWindow = Tools.window as Window & {
    ChatWebsocket?: unknown;
    ChatWebsocketImage?: unknown;
  };
  if (!runtimeWindow.ChatWebsocketImage && runtimeWindow.ChatWebsocket) {
    runtimeWindow.ChatWebsocketImage = runtimeWindow.ChatWebsocket;
    logger$1.info("复用 ChatWebsocket 作为图片消息通道");
    return;
  }

  if (runtimeWindow.ChatWebsocketImage) {
    logger$1.info("图片消息通道已就绪");
    return;
  }

  const scriptCandidates = [
    "https://www.zhipin.com/web/common/security-js/socket.js",
    "https://static.zhipin.com/web/common/security-js/socket.js"
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

        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        window.setTimeout(() => resolve(!!(runtimeWindow.ChatWebsocketImage || runtimeWindow.ChatWebsocket)), 1800);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(script);
      window.setTimeout(() => resolve(!!(runtimeWindow.ChatWebsocketImage || runtimeWindow.ChatWebsocket)), 2500);
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
      logger$1.info("图片消息通道已通过 socket.js 初始化");
      return;
    }
  }

  logger$1.warn("未发现可用消息通道，自动图片消息将跳过");
}

type FavoriteResp = {
  success: boolean;
  verified?: boolean;
  channel?: string;
  message: string;
};

export class BossPlatform extends AbsPlatform {
  curUrl: string;
  name = "Boss";
  urlList = ["/web/geek", "overseas"];
  lastHeight = 0;
  bossDataCache = new Map<string, any>();
  sessionAutoMessageCount = 0;
  sessionAutoResumeCount = 0;
  lastAutoContactTs = 0;
  private lastJobCardCount = 0;
  private lastJobsTailKey = "";
  private lastRecommendCardCount = 0;
  private lastRecommendTailKey = "";
  private lastJobsListSignature = "";
  private lastRecommendListSignature = "";
  private recommendNoProgressRounds = 0;
  private sessionProcessedJobKeys = new Set<string>();
  private lastRuntimeResumeRefreshTs = 0;
  private runtimeResumeRefreshPromise: Promise<void> | null = null;

  constructor(curUrl: string) {
    super();
    this.curUrl = curUrl;
  }

  getPlatformType(): number {
    return 0;
  }

  getMountEle(): Promise<{ el: Element; p: string }> {
    return new Promise((resolve) => {
      let count = 0;
      const interval = setInterval(() => {
        let element: Element | null = null;
        let p = "";

        if (this.curUrl.includes("www.zhipin.com/web/geek/chat")) {
          element = document.querySelector(".chat-conversation");
        }

        if (this.curUrl.includes("www.zhipin.com/web/geek/job-recommend")) {
          element = document.querySelector(".recommend-search-inner");
          p = "end";
        }

        if (this.curUrl.includes("www.zhipin.com/web/geek/jobs")) {
          element = document.querySelector(".job-recommend-result");
        } else if (this.curUrl.includes("www.zhipin.com/web/geek/job")) {
          element = document.querySelector(".page-job-inner");
        }

        if (this.curUrl.includes("www.zhipin.com/web/geek/resume")) {
          element = document.body;
          p = "end";
        }

        if (this.curUrl.includes("overseas")) {
          element = document.querySelector(".mod-header");
        }

        if (element !== null) {
          clearInterval(interval);
          resolve({ el: element, p });
          return;
        }

        if (count >= 3) {
          clearInterval(interval);
          logger$1.error(0, "获取平台挂载元素失败，回退挂载到 body");
          resolve({ el: document.body || document.documentElement, p: "end" });
          return;
        }

        count++;
      }, 300);
    });
  }

  startPreHandler(): void {
    this.lastHeight = 0;
    this.lastJobCardCount = 0;
    this.lastJobsTailKey = "";
    this.lastRecommendCardCount = 0;
    this.lastRecommendTailKey = "";
    this.lastJobsListSignature = "";
    this.lastRecommendListSignature = "";
    this.recommendNoProgressRounds = 0;
    this.sessionProcessedJobKeys.clear();
    this.sessionAutoMessageCount = 0;
    this.sessionAutoResumeCount = 0;
    this.lastAutoContactTs = 0;
  }

  private getStableJobRuntimeKey(jobDetail: any): string {
    const encryptJobId = `${jobDetail?.encryptJobId || ""}`.trim();
    if (encryptJobId) {
      return `encrypt:${encryptJobId}`;
    }

    const jobId = `${jobDetail?.jobId || ""}`.trim();
    if (jobId) {
      return `job:${jobId}`;
    }

    const lid = `${jobDetail?.lid || ""}`.trim();
    if (lid) {
      return `lid:${lid}`;
    }

    const securityId = `${jobDetail?.securityId || ""}`.trim();
    if (securityId) {
      return `sec:${securityId}`;
    }

    return this.getJobKey(jobDetail);
  }

  private getCardRuntimeKey(cardElement: any): string {
    const vueData = this.getCardVueData(cardElement) || {};
    const vueKey = this.getStableJobRuntimeKey(vueData);
    if (vueKey && !vueKey.startsWith("undefined:")) {
      return vueKey;
    }

    const href = `${cardElement?.querySelector("a.job-card-left,a.job-name,a")?.getAttribute("href") || ""}`.trim();
    const jobName = `${cardElement?.querySelector(".job-name,.job-title,.job-info .job-name")?.textContent || ""}`
      .replace(/\s+/g, " ")
      .trim();
    const companyName = `${cardElement?.querySelector(".boss-info,.company-name,.brand-name")?.textContent || ""}`
      .replace(/\s+/g, " ")
      .trim();
    const location = `${cardElement?.querySelector(".company-location,.job-area")?.textContent || ""}`
      .replace(/\s+/g, " ")
      .trim();

    const keyParts = [href, jobName, companyName, location].filter(Boolean);
    if (keyParts.length > 0) {
      return keyParts.join("|");
    }

    return `${cardElement?.textContent || ""}`.replace(/\s+/g, " ").trim().slice(0, 80);
  }

  private getCardVueData(cardElement: any): any | null {
    return cardElement?.__vue__?.data || null;
  }

  private markJobProcessed(jobDetail: any): void {
    if (!jobDetail || typeof jobDetail !== "object") {
      return;
    }
    jobDetail.processed = true;
    this.sessionProcessedJobKeys.add(this.getStableJobRuntimeKey(jobDetail));
  }

  private buildListSignature(cardList: any[]): string {
    if (!cardList.length) {
      return "";
    }

    const first = cardList.slice(0, 3).map((card) => this.getCardRuntimeKey(card));
    const last = cardList.slice(Math.max(cardList.length - 3, 0)).map((card) => this.getCardRuntimeKey(card));
    return [...first, ...last].join("||");
  }

  private getJobsPageMetrics(): { scrollHeight: number; cardCount: number; tailKey: string; listSignature: string } {
    const listContainer = document.querySelector(".job-list-container") as HTMLElement | null;
    const cardList = Array.from(document.querySelectorAll(".job-list-container .job-card-wrap")) as any[];
    const fallbackCardList = cardList.length > 0 ? cardList : Array.from(document.querySelectorAll(".rec-job-list .job-card-wrap")) as any[];
    const tailCard = fallbackCardList[fallbackCardList.length - 1] as any;
    const tailKey = this.getCardRuntimeKey(tailCard);

    return {
      scrollHeight: listContainer?.scrollHeight || 0,
      cardCount: fallbackCardList.length,
      tailKey,
      listSignature: this.buildListSignature(fallbackCardList)
    };
  }

  private getRecommendPageMetrics(): { scrollHeight: number; cardCount: number; tailKey: string; listSignature: string } {
    const scopedCards = Array.from(document.querySelectorAll(".job-list-container .job-card-wrap")) as any[];
    const cardList = scopedCards.length > 0 ? scopedCards : Array.from(document.querySelectorAll(".job-card-wrap")) as any[];
    const tailCard = cardList[cardList.length - 1] as any;
    const tailKey = this.getCardRuntimeKey(tailCard);

    return {
      scrollHeight: this.getRecommendPageScrollHeight(),
      cardCount: cardList.length,
      tailKey,
      listSignature: this.buildListSignature(cardList)
    };
  }

  private async scrollJobsListToEnd(): Promise<void> {
    const listContainer = document.querySelector(".job-list-container") as HTMLElement | null;
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
      listContainer.scrollTop = targetTop;
      listContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
      await Tools.sleep(220);

      const pendingDistance = Math.abs(targetTop - beforeTop);
      const movedDistance = Math.abs(listContainer.scrollTop - beforeTop);
      const reachedTarget = Math.abs(listContainer.scrollTop - targetTop) <= 2;
      if (pendingDistance > 2 && (!reachedTarget || movedDistance <= 2)) {
        await simulateScrollToEnd();
        return;
      }

      const afterHeight = listContainer.scrollHeight;
      const afterTargetTop = Math.max(0, afterHeight - listContainer.clientHeight);
      if (Math.abs(listContainer.scrollTop - afterTargetTop) > 2) {
        listContainer.scrollTop = afterTargetTop;
        listContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
        await Tools.sleep(160);
      }

      const atBottom = listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 4;
      const heightStable = Math.abs(afterHeight - beforeHeight) <= 2;
      if (atBottom && heightStable) {
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
  private enforceAutoContactSafety(_kind: "message" | "image"): void {
    const safety = this.getAutoContactSafetyConfig();
    const now = Date.now();
    const elapsedSec = (now - this.lastAutoContactTs) / 1000;
    if (this.lastAutoContactTs > 0 && elapsedSec < safety.minIntervalSec) {
      throw new Error(`自动${_kind === "image" ? "发图" : "发消息"}触发过快，需间隔至少${safety.minIntervalSec}秒`);
    }

    if (_kind === "message") {
      if (this.sessionAutoMessageCount >= safety.maxMessagesPerSession) {
        throw new Error(`自动消息达到会话上限(${safety.maxMessagesPerSession})`);
      }
      this.sessionAutoMessageCount++;
    } else {
      if (this.sessionAutoResumeCount >= safety.maxResumesPerSession) {
        throw new Error(`自动图片简历达到会话上限(${safety.maxResumesPerSession})`);
      }
      this.sessionAutoResumeCount++;
    }

    this.lastAutoContactTs = now;
  }

  private getAutoContactSafetyConfig(): {
    minIntervalSec: number;
    maxMessagesPerSession: number;
    maxResumesPerSession: number;
  } {
    const preference = runtimeUserStore?.user?.preference || {};
    const toNumberOr = (value: unknown, fallback: number): number => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      minIntervalSec: Math.max(5, toNumberOr(preference.autoContactMinIntervalSec, 10)),
      maxMessagesPerSession: Math.max(1, toNumberOr(preference.maxAutoMessagePerSession, 30)),
      maxResumesPerSession: Math.max(1, toNumberOr(preference.maxAutoResumePerSession, 18))
    };
  }

  private isManualVerificationText(text: string | null | undefined): boolean {
    return Tools.isManualVerificationText(text);
  }

  protected getManualVerificationReason(): string | null {
    return Tools.getManualVerificationReason();
  }

  getJobList(): any[] {
    if (this.curUrl.includes("jobs")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
      const allJobs = Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job);
      const jobList = allJobs
        .filter((job: any) => {
          if (job?.processed) {
            return false;
          }
          const runtimeKey = this.getStableJobRuntimeKey(job);
          return !this.sessionProcessedJobKeys.has(runtimeKey);
        });

      if (elementNodeList2.length !== 0 && allJobs.length === 0) {
        this.preferenceLogRecorder.warn("当前岗位卡片未提取到可用数据，已跳过无效卡片");
      }

      if (elementNodeList2.length !== 0 && jobList.length === 0) {
        this.preferenceLogRecorder.info("当前筛选条件下岗位均已投递");
      }

      return jobList;
    }

    if (this.curUrl.includes("job-recommend")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
      return Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job)
        .filter((job: any) => !job.contact);
    }

    if (this.curUrl.includes("overseas")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-box");
      return Array.from(elementNodeList2)
        .map((item: any) => this.getCardVueData(item))
        .filter((job: any) => !!job)
        .filter((job: any) => !job.contact);
    }

    const elementNodeList = document.querySelectorAll(".job-card-wrapper");
    return Array.from(elementNodeList)
      .map((item: any) => this.getCardVueData(item))
      .filter((job: any) => !!job);
  }

  hasNext(): boolean {
    logger$1.debug("hasNext");

    if (this.curUrl.includes("jobs")) {
      const metrics = this.getJobsPageMetrics();
      if (this.lastHeight <= 0 && this.lastJobCardCount <= 0) {
        return metrics.cardCount > 0 || metrics.scrollHeight > 0;
      }

      if (metrics.cardCount > this.lastJobCardCount) {
        return true;
      }

      if (metrics.tailKey && metrics.tailKey !== this.lastJobsTailKey) {
        return true;
      }

      if (metrics.listSignature && metrics.listSignature !== this.lastJobsListSignature) {
        return true;
      }

      return metrics.scrollHeight > this.lastHeight + 120;
    }

    if (this.curUrl.includes("overseas")) {
      return this.lastHeight !== document.querySelector(".job-list")?.scrollHeight;
    }

    if (this.curUrl.includes("job-recommend")) {
      const metrics = this.getRecommendPageMetrics();
      if (this.lastHeight <= 0 && this.lastRecommendCardCount <= 0) {
        return metrics.cardCount > 0 || metrics.scrollHeight > 0;
      }

      const hasProgress =
        metrics.cardCount > this.lastRecommendCardCount
        || (!!metrics.tailKey && metrics.tailKey !== this.lastRecommendTailKey)
        || (!!metrics.listSignature && metrics.listSignature !== this.lastRecommendListSignature)
        || (metrics.scrollHeight > this.lastHeight + 120 && metrics.cardCount > 0);

      if (hasProgress) {
        this.recommendNoProgressRounds = 0;
        return true;
      }

      this.recommendNoProgressRounds += 1;
      if (this.recommendNoProgressRounds < 2) {
        logger$1.info(
          `推荐页未检测到新岗位，进行第${this.recommendNoProgressRounds}次重试滚动 `
          + `count=${metrics.cardCount}/${this.lastRecommendCardCount} `
          + `tail=${metrics.tailKey === this.lastRecommendTailKey ? "same" : "changed"} `
          + `signature=${metrics.listSignature === this.lastRecommendListSignature ? "same" : "changed"} `
          + `height=${metrics.scrollHeight}/${this.lastHeight}`
        );
        return true;
      }

      return false;
    }

    const nextPageBtn = document.querySelector(".ui-icon-arrow-right");
    if (nextPageBtn === null) {
      return false;
    }

    return (nextPageBtn.parentElement as HTMLElement).className !== "disabled";
  }

  async acquireDataPre(): Promise<void> {
    if (this.pushStatus === PushStatus.PAUSE) {
      return;
    }

    if (this.curUrl.includes("jobs")) {
      const metrics = this.getJobsPageMetrics();
      this.lastHeight = metrics.scrollHeight;
      this.lastJobCardCount = metrics.cardCount;
      this.lastJobsTailKey = metrics.tailKey;
      this.lastJobsListSignature = metrics.listSignature;
      try {
        await this.scrollJobsListToEnd();
        logger$1.info("获取下一页成功");
      } catch (e) {
        this.preferenceLogRecorder.warn("获取下一页失败", e);
      }
      return;
    }

    if (this.curUrl.includes("job-recommend")) {
      const metrics = this.getRecommendPageMetrics();
      this.lastHeight = metrics.scrollHeight;
      this.lastRecommendCardCount = metrics.cardCount;
      this.lastRecommendTailKey = metrics.tailKey;
      this.lastRecommendListSignature = metrics.listSignature;
      try {
        await this.scrollJobsListToEnd();
        logger$1.info("获取下一页成功");
      } catch (e) {
        this.preferenceLogRecorder.warn("获取下一页失败", e);
      }
      return;
    }

    if (this.curUrl.includes("overseas")) {
      this.lastHeight = document.querySelector(".job-list")?.scrollHeight || 0;
      try {
        await simulateScrollToEnd();
        logger$1.info("获取下一页成功");
      } catch (e) {
        this.preferenceLogRecorder.warn("获取下一页失败", e);
      }
      return;
    }

    (document.querySelector(".ui-icon-arrow-right") as HTMLElement).click();
  }

  async matchJob(jobDetail: any): Promise<boolean> {
    const jobTitle = this.getJobKey(jobDetail);

    try {
      if (jobDetail.contact) {
        throw new NotMatchError(jobTitle, jobDetail.contact, "已经沟通过");
      }

      const aiFilterModeEnabled = this.shouldEnableAiDeliveryJudge();
      const traditionalDeliveryEnabled = this.isTraditionalDeliveryEnabled();

      if (!aiFilterModeEnabled && traditionalDeliveryEnabled) {
        this.applyTraditionalBaseChecks(jobDetail, jobTitle);
      }

      const jobDetailExt = await this.obtainBossJobDetailExt(jobDetail);
      logger$1.debug(`获取工作【${jobTitle}】详情扩展信息用于${aiFilterModeEnabled ? "AI过滤" : "常规过滤"} `, jobDetail);

      if (!aiFilterModeEnabled && traditionalDeliveryEnabled) {
        this.applyTraditionalExtChecks(jobDetailExt, jobTitle);
      }

      if (this.isCommunication(jobDetailExt)) {
        throw new NotMatchError(jobTitle, jobDetailExt.friendStatus, "已经沟通过");
      }

      if (aiFilterModeEnabled) {
      const aiConfig = Tools.getAiDeliveryJudgeConfig(runtimeUserStore?.user?.preference || {});
      const user = runtimeUserStore?.user || {};
      await this.ensureRuntimeResumeNarrative(user);
      const preference = user.preference || {};
      const userProfile = buildAiDeliveryUserProfile(user, preference);
      const traditionalSnapshot = buildTraditionalRuleSnapshot(preference);
      const prompt = buildAiDeliveryJudgePrompt(aiConfig, userProfile, traditionalSnapshot);
      const baseInfo = this.unpackBaseInfo(jobDetail);
      const extInfo = this.unpackExtInfo(jobDetailExt);
      const filterInput = buildAiDeliveryFilterJobInput(baseInfo, extInfo);
      let judgeResult: { match: boolean; reason: string; valid: boolean; parseMode: string };
      const judgeTraceId = this.buildAiJudgeTraceId();
      const filterPath = AiPower.getFilterPath();
      const aiJudgeStartedAt = Date.now();
      const maskedUserProfile = this.maskAiDeliveryUserProfile(userProfile);
      this.preferenceLogRecorder.info(`工作【${jobTitle}】开始AI投递判断 trace=${judgeTraceId} path=${filterPath} timeoutMs=${AI_DELIVERY_JUDGE_TIMEOUT_MS} onAiError=${aiConfig.onAiError} onInvalidResult=${aiConfig.onInvalidResult}`);
      this.preferenceLogRecorder.info(`工作【${jobTitle}】AI输入摘要 trace=${judgeTraceId} promptChars=${prompt.length} baseInfoChars=${filterInput.jobBaseInfo.length} extInfoChars=${filterInput.jobExtInfo.length} includeUserProfile=${aiConfig.includeUserProfile} includeTraditionalSnapshot=${aiConfig.includeTraditionalSnapshot} userProfile=${JSON.stringify(maskedUserProfile)} baseKeys=${Object.keys(baseInfo).join(",")} extKeys=${Object.keys(extInfo).join(",")}`);
      try {
        const filterStartedAt = Date.now();
        const filterResp = await AiPower.filter(
          prompt,
          filterInput.jobBaseInfo,
          filterInput.jobExtInfo,
          AI_DELIVERY_JUDGE_TIMEOUT_MS
        );
        const filterElapsed = Date.now() - filterStartedAt;
        const parseStartedAt = Date.now();
        judgeResult = this.parseAiDeliveryJudgeResult(filterResp);
        const parseElapsed = Date.now() - parseStartedAt;
        const aiJudgeElapsed = Date.now() - aiJudgeStartedAt;
        const aiJudgeElapsedSec = (aiJudgeElapsed / 1000).toFixed(2);
        this.preferenceLogRecorder.info(`工作【${jobTitle}】AI投递判断完成 trace=${judgeTraceId} path=${filterPath} total=${aiJudgeElapsed}ms (${aiJudgeElapsedSec}s) filter=${filterElapsed}ms parse=${parseElapsed}ms parseMode=${judgeResult.parseMode} match=${judgeResult.match} reason=${judgeResult.reason}`);
      } catch (error: any) {
        const aiJudgeElapsed = Date.now() - aiJudgeStartedAt;
        const aiJudgeElapsedSec = (aiJudgeElapsed / 1000).toFixed(2);
        const aiErrorMessage = `${error?.message || "AI请求失败"}`;
        this.preferenceLogRecorder.warn(`工作【${jobTitle}】AI投递判断失败 trace=${judgeTraceId} path=${filterPath} total=${aiJudgeElapsed}ms (${aiJudgeElapsedSec}s) onAiError=${aiConfig.onAiError} 原因：${aiErrorMessage}`);
        const aiErrorFallback = resolveAiDeliveryFallback(aiConfig.onAiError, "ai-error");
        if (aiErrorFallback.enabled) {
          const fallbackReason = this.normalizeAiJudgeReason(
            `[FALLBACK_TRADITIONAL] AI请求失败，回退传统规则：${aiErrorMessage}`,
            "[FALLBACK_TRADITIONAL] AI请求失败，回退传统规则"
          );
          this.preferenceLogRecorder.warn(`工作【${jobTitle}】AI失败触发传统规则回退 trace=${judgeTraceId} reason=${fallbackReason}`);
          this.applyTraditionalFallbackChecks(traditionalDeliveryEnabled, jobDetail, jobDetailExt, jobTitle, fallbackReason);
          jobDetail.aiDeliveryJudge = {
            traceId: judgeTraceId,
            path: filterPath,
            match: true,
            reason: fallbackReason,
            valid: true,
            parseMode: aiErrorFallback.parseMode,
            judgedAt: new Date().toISOString()
          };
          this.preferenceLogRecorder.info(`工作【${jobTitle}】传统规则回退通过 trace=${judgeTraceId} reason=${fallbackReason}`);
          return true;
        }
        throw new NotMatchError(jobTitle, aiErrorMessage, "AI投递判断异常");
      }

      jobDetail.aiDeliveryJudge = {
        traceId: judgeTraceId,
        path: filterPath,
        match: judgeResult.match,
        reason: judgeResult.reason,
        valid: judgeResult.valid,
        parseMode: judgeResult.parseMode,
        judgedAt: new Date().toISOString()
      };

      if (!judgeResult.valid) {
        const invalidResultFallback = resolveAiDeliveryFallback(aiConfig.onInvalidResult, "invalid-result", judgeResult.parseMode);
        if (invalidResultFallback.enabled) {
          const fallbackReason = this.normalizeAiJudgeReason(
            `[FALLBACK_TRADITIONAL] AI结果不可解析，回退传统规则：${judgeResult.reason}`,
            "[FALLBACK_TRADITIONAL] AI结果不可解析，回退传统规则"
          );
          this.preferenceLogRecorder.warn(`工作【${jobTitle}】AI结果不可解析触发传统规则回退 trace=${judgeTraceId} path=${filterPath} parseMode=${judgeResult.parseMode} reason=${fallbackReason}`);
          this.applyTraditionalFallbackChecks(traditionalDeliveryEnabled, jobDetail, jobDetailExt, jobTitle, fallbackReason);
          jobDetail.aiDeliveryJudge = {
            traceId: judgeTraceId,
            path: filterPath,
            match: true,
            reason: fallbackReason,
            valid: true,
            parseMode: invalidResultFallback.parseMode,
            judgedAt: new Date().toISOString()
          };
          this.preferenceLogRecorder.info(`工作【${jobTitle}】传统规则回退通过 trace=${judgeTraceId} reason=${fallbackReason}`);
          return true;
        }
        this.preferenceLogRecorder.warn(`工作【${jobTitle}】AI判定结果不可解析 trace=${judgeTraceId} path=${filterPath} parseMode=${judgeResult.parseMode} onInvalidResult=${aiConfig.onInvalidResult} reason=${judgeResult.reason}`);
        throw new NotMatchError(jobTitle, judgeResult.reason, "AI投递判断结果不可解析");
      }

      if (!judgeResult.match) {
        this.preferenceLogRecorder.info(`工作【${jobTitle}】AI投递判断不通过 trace=${judgeTraceId} reason=${judgeResult.reason}`);
        throw new NotMatchError(jobTitle, judgeResult.reason, "AI投递判断不通过");
      }

      this.preferenceLogRecorder.info(`工作【${jobTitle}】AI投递判断通过 trace=${judgeTraceId} reason=${judgeResult.reason}`);
      }

      this.markJobProcessed(jobDetail);
      return true;
    } catch (error: any) {
      if (error instanceof NotMatchError) {
        this.markJobProcessed(jobDetail);
      }
      throw error;
    }
  }

  unpackBaseInfo(jobDetail: any): Record<string, unknown> {
    return {
      jobName: jobDetail.jobName,
      salaryDesc: jobDetail.salaryDesc,
      jobLabels: jobDetail.jobLabels,
      skills: jobDetail.skills,
      jobExperience: jobDetail.jobExperience,
      jobDegree: jobDetail.jobDegree,
      cityName: jobDetail.cityName,
      areaDistrict: jobDetail.areaDistrict,
      businessDistrict: jobDetail.businessDistrict,
      brandName: jobDetail.brandName,
      brandStageName: jobDetail.brandStageName,
      brandIndustry: jobDetail.brandIndustry,
      brandScaleName: jobDetail.brandScaleName,
      welfareList: jobDetail.welfareList
    };
  }

  unpackExtInfo(jobDetailExt: any): Record<string, unknown> {
    return {
      postDescription: jobDetailExt.postDescription,
      address: jobDetailExt.address,
      activeTimeDesc: jobDetailExt.activeTimeDesc
    };
  }

  pausePush(): void {
    this.pushStatus = PushStatus.PAUSE;
  }

  getJobKey(jobDetail: any): string {
    return jobDetail.jobName + "-" + jobDetail.cityName + jobDetail.areaDistrict + jobDetail.businessDistrict;
  }

  isLimit(_jobDetail: any): { limit: boolean; msg: string } {
    return {
      limit: TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_LIMIT, false),
      msg: "Boss投递限制每天150次"
    };
  }

  async doPush(jobDetail: any): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    logger$1.debug("正在投递：" + jobTitle);

    const publishUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${jobDetail.securityId}&jobId=${jobDetail.encryptJobId}&lid=${jobDetail.lid}`;
    let pushResp: any = { code: PushResultStatus.NOT_START, message: "" };
    try {
      const preference = runtimeUserStore?.user?.preference || {};
      const pushIntervalSec = Number(getPreferenceValue(preference, "pushIntervalSec", "pi")) || 3;
      await Tools.sleep(pushIntervalSec * 1000);
      pushResp = await axios.post(publishUrl, null, { headers: { Zp_token: Tools.getCookieValue("bst") } });
    } catch (error: any) {
      logger$1.debug(`工作【${jobTitle}】投递失败; 原因：${error.message}`);
      throw error;
    }

    if (pushResp.data.code === PushResultStatus.FAIL && pushResp.data?.zpData?.bizData?.chatRemindDialog?.content) {
      const remindContent = `${pushResp.data?.zpData?.bizData?.chatRemindDialog?.content || ""}`;
      if (this.isManualVerificationText(remindContent)) {
        throw new PushStopError(this.getManualVerificationReason() || remindContent);
      }

      const reachedDailyLimitMatch = remindContent.match(/您今天已与(\d+)位BOSS沟通/);
      if (reachedDailyLimitMatch) {
        const reachedDailyLimit = reachedDailyLimitMatch[1];
        throw new PushLimitError(`今日沟通人数已达上限(已与${reachedDailyLimit}位BOSS沟通)`);
      }

      return {
        code: 1,
        message: pushResp.data?.zpData?.bizData?.chatRemindDialog?.content
      };
    }

    await Tools.sleep(800);
    return pushResp.data;
  }

  buildFavoriteApiRequests(jobDetail: any): Array<{ name: string; url: string; data: string; contentType: string }> {
    const interestBody = new URLSearchParams({
      securityId: jobDetail.securityId,
      jobId: jobDetail.encryptJobId,
      lid: jobDetail.lid,
      tag: "1",
      flag: "1",
      interest: "1"
    }).toString();

    return [
      {
        name: "relation-interest-form",
        url: "https://www.zhipin.com/wapi/zprelation/geekTag/job/interest",
        data: interestBody,
        contentType: "application/x-www-form-urlencoded;charset=UTF-8"
      },
      {
        name: "relation-interest-query",
        url: `https://www.zhipin.com/wapi/zprelation/geekTag/job/interest?securityId=${encodeURIComponent(jobDetail.securityId)}`,
        data: interestBody,
        contentType: "application/x-www-form-urlencoded;charset=UTF-8"
      }
    ];
  }

  isFavoriteSuccess(respData: any): boolean {
    const message = `${respData?.message || ""}`;
    const result = respData?.result ?? respData?.zpData?.result;
    if (respData?.code === 0 && result !== false) {
      return true;
    }

    return message.includes("已收藏") || message.includes("取消收藏") || message.includes("感兴趣");
  }

  findJobCardByJobDetail(jobDetail: any): any {
    const cardSelectors = [".job-card-wrapper", ".job-card-wrap", ".job-card-box"];
    for (const selector of cardSelectors) {
      const cards = Array.from(document.querySelectorAll(selector));
      const targetCard = cards.find((card: any) => {
        const cardData = card?.__vue__?.data;
        const detailEncryptJobId = `${jobDetail.encryptJobId || ""}`;
        const detailJobId = `${jobDetail.jobId || ""}`;
        const cardEncryptJobId = `${cardData?.encryptJobId || ""}`;
        const cardJobId = `${cardData?.jobId || ""}`;

        if (detailEncryptJobId && cardEncryptJobId === detailEncryptJobId) {
          return true;
        }

        if (detailJobId && cardJobId === detailJobId) {
          return true;
        }

        if (detailEncryptJobId && cardJobId === detailEncryptJobId) {
          return true;
        }

        const href = (card.querySelector("a.job-card-left,a.job-name")?.getAttribute("href")?.toString()) || "";
        if (!href) {
          return false;
        }

        if (detailEncryptJobId && href.includes(detailEncryptJobId)) {
          return true;
        }

        const detailLid = `${jobDetail.lid || ""}`;
        return !!(detailLid && href.includes(detailLid));
      });

      if (targetCard) {
        return targetCard;
      }
    }

    return null;
  }

  getFavoriteHint(element: any): string {
    const attrs = [
      element?.textContent,
      element?.getAttribute("title"),
      element?.getAttribute("aria-label"),
      element?.getAttribute("data-title"),
      element?.getAttribute("ka"),
      element?.className
    ].filter(Boolean);

    return attrs.join(" ").replace(/\s+/g, " ").trim();
  }

  isFavoriteDoneByHint(hint: string): boolean {
    const text = (hint || "").replace(/\s+/g, "");
    return text.includes("已收藏") || text.includes("取消收藏") || text.includes("已感兴趣");
  }

  getFavoriteStateSnapshot(jobDetail: any): { cardText: string; detailText: string } {
    const card = this.findJobCardByJobDetail(jobDetail);
    const detailScopes = this.findRelatedDetailScopes(jobDetail);
    return {
      cardText: (card?.textContent || "").replace(/\s+/g, ""),
      detailText: detailScopes.map((scope: any) => (scope.textContent || "").replace(/\s+/g, "")).join(" ")
    };
  }

  isFavoriteConfirmedBySnapshot(snapshot: { cardText: string; detailText: string }): boolean {
    return this.isFavoriteDoneByHint(snapshot.cardText) || this.isFavoriteDoneByHint(snapshot.detailText);
  }

  async waitFavoriteConfirmed(jobDetail: any, waitMs = 1200): Promise<{ confirmed: boolean; snapshot: { cardText: string; detailText: string } }> {
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

  isFavoriteActionByHint(hint: string): boolean {
    const text = (hint || "").replace(/\s+/g, "");
    const lowerText = text.toLowerCase();
    if (text.includes("沟通") || text.includes("投递") || text.includes("简历")) {
      return false;
    }

    return text.includes("收藏") || text.includes("感兴趣") || lowerText.includes("collect") || lowerText.includes("favorite") || lowerText.includes("star");
  }

  isVisibleFavoriteElement(element: any): boolean {
    if (!(element instanceof HTMLElement)) {
      return true;
    }

    if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  findRelatedDetailScopes(jobDetail: any): any[] {
    const scopes = [
      document.querySelector(".job-detail-box"),
      document.querySelector(".job-detail"),
      document.querySelector(".job-detail-container")
    ].filter(Boolean);

    if (scopes.length === 0) {
      return [];
    }

    const normalize = (text: string) => (text || "").replace(/\s+/g, "");
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

  async waitRelatedDetailScopes(jobDetail: any, waitMs = 1200): Promise<any[]> {
    const startTs = Date.now();
    let scopes = this.findRelatedDetailScopes(jobDetail);
    while (scopes.length === 0 && Date.now() - startTs < waitMs) {
      await Tools.sleep(120);
      scopes = this.findRelatedDetailScopes(jobDetail);
    }

    return scopes;
  }

  findFavoriteButtonInScope(scope: Element, sampleHints: string[]): { done: boolean; button: any } {
    const candidateSelector = "button,a,[role='button'],[class*='collect'],[class*='favorite'],[class*='star']";
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

      if ((this.isFavoriteActionByHint(hint) || this.isFavoriteDoneByHint(hint)) && sampleHints.length < 8) {
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

  async triggerFavoriteByDom(jobDetail: any): Promise<FavoriteResp> {
    const card = this.findJobCardByJobDetail(jobDetail);
    if (!card) {
      return { success: false, message: "未定位到岗位卡片" };
    }

    const beforeCheck = await this.waitFavoriteConfirmed(jobDetail, 120);
    if (beforeCheck.confirmed) {
      return { success: true, verified: true, channel: "dom-already", message: "Success" };
    }

    const sampleHints: string[] = [];
    const hoverEvents = ["mouseenter", "mouseover", "mousemove"];
    hoverEvents.forEach((eventName) => {
      card.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
    });

    const cardClickable = card.querySelector("a.job-card-left,a.job-name,[class*='job-card-left']");
    const clickTarget = cardClickable || card;
    clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await Tools.sleep(300);

    const detailScopes = await this.waitRelatedDetailScopes(jobDetail, 1500);
    const scopeList = [card, ...detailScopes].filter(Boolean);
    const uniqueScopeList = Array.from(new Set(scopeList));
    let favoriteBtn: any = null;

    for (const scope of uniqueScopeList) {
      const result = this.findFavoriteButtonInScope(scope as Element, sampleHints);
      if (result.done) {
        return { success: true, verified: true, channel: "dom-done-mark", message: "Success" };
      }

      if (result.button) {
        favoriteBtn = result.button;
        break;
      }
    }

    if (!favoriteBtn) {
      const detailText = detailScopes.map((scope: any) => (scope.textContent || "").replace(/\s+/g, "")).join(" ");
      if (detailText.includes("已收藏") || detailText.includes("取消收藏")) {
        return { success: true, verified: true, channel: "dom-detail-mark", message: "Success" };
      }

      const debugHint = sampleHints.length > 0 ? `;候选:${sampleHints.join(" | ")}` : "";
      return { success: false, message: `未找到收藏按钮${debugHint}` };
    }

    if (typeof favoriteBtn.click === "function") {
      favoriteBtn.click();
    } else {
      favoriteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }

    await Tools.sleep(250);
    const afterCheck = await this.waitFavoriteConfirmed(jobDetail, 1800);
    const btnHintAfterClick = this.getFavoriteHint(favoriteBtn);
    if (afterCheck.confirmed || this.isFavoriteDoneByHint(btnHintAfterClick)) {
      return { success: true, verified: true, channel: "dom-click", message: "Success" };
    }

    const afterHint = `button=${btnHintAfterClick.slice(0, 60)};card=${(afterCheck.snapshot.cardText || "").slice(0, 60)};detail=${(afterCheck.snapshot.detailText || "").slice(0, 60)}`;
    return { success: false, verified: false, message: `点击收藏后未观察到收藏态;${afterHint}` };
  }

  async doCollect(jobDetail: any, errorMsg = "", retries = 2): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FavoriteRequestError(jobTitle, errorMsg || "收藏重试多次失败");
    }

    let latestError = errorMsg;
    try {
      const beforeState = await this.waitFavoriteConfirmed(jobDetail, 120);
      if (beforeState.confirmed) {
        return {
          code: 0,
          message: "Success",
          verified: true,
          channel: "already"
        };
      }

      const domResult = await this.triggerFavoriteByDom(jobDetail);
      if (domResult.success && domResult.verified !== false) {
        return {
          code: 0,
          message: "Success",
          verified: true,
          channel: domResult.channel || "dom"
        };
      }

      latestError = domResult.message || latestError;
      if (this._collectMode) {
        await Tools.sleep(400);
        return await this.doCollect(jobDetail, latestError, retries - 1);
      }

      const preference = runtimeUserStore?.user?.preference || {};
      const pushIntervalSec = Number(getPreferenceValue(preference, "pushIntervalSec", "pi")) || 3;
      await Tools.sleep(Math.max(500, pushIntervalSec * 600));
      const token = Tools.getCookieValue("bst");
      if (token) {
        const headers = { Zp_token: token };
        for (const favoriteRequest of this.buildFavoriteApiRequests(jobDetail)) {
          try {
            const reqHeaders: Record<string, string> = {
              ...headers
            };
            if (favoriteRequest.contentType) {
              reqHeaders["content-type"] = favoriteRequest.contentType;
            }

            const resp = await axios.post(favoriteRequest.url, favoriteRequest.data, { headers: reqHeaders });
            const respData = resp?.data;
            if (this.isFavoriteSuccess(respData)) {
              const confirmCheck = await this.waitFavoriteConfirmed(jobDetail, 1000);
              if (confirmCheck.confirmed) {
                return {
                  code: 0,
                  message: "Success",
                  verified: true,
                  channel: favoriteRequest.name
                };
              }

              latestError = `${favoriteRequest.name}:接口返回成功但未观察到收藏态`;
              continue;
            }

            latestError = `${favoriteRequest.name}:${((respData?.message) || `收藏接口异常(${respData?.code || "unknown"})`).toString()}`;
          } catch (error: any) {
            latestError = `${favoriteRequest.name}:${error?.message || "收藏接口请求失败"}`;
          }
        }
      } else {
        latestError = "未获取到zp-token";
      }
    } catch (error: any) {
      latestError = error?.message || latestError;
    }

    logger$1.debug(`工作【${jobTitle}】收藏失败; 正在等待重试; 原因：${latestError}`);
    await Tools.sleep(600);
    return await this.doCollect(jobDetail, latestError, retries - 1);
  }

  async requestBossDataByCache(jobDetail: any): Promise<any> {
    const cacheKey = `${jobDetail.encryptBossId}-${jobDetail.securityId}`;
    if (this.bossDataCache.has(cacheKey)) {
      return this.bossDataCache.get(cacheKey);
    }

    const result = await this.requestBossData(jobDetail);
    this.bossDataCache.set(cacheKey, result);
    return result;
  }

  async requestBossData(jobDetail: any, errorMsg = "", retries = 3): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 0) {
      throw new FetchJobDetailError(jobTitle, errorMsg || "获取boss数据重试多次失败");
    }

    const url = "https://www.zhipin.com/wapi/zpchat/geek/getBossData";
    const token = Tools.getCookieValue("bst");
    if (!token) {
      throw new FetchJobDetailError(jobTitle, "未获取到zp-token");
    }

    const data = new FormData();
    data.append("bossId", jobDetail.encryptBossId);
    data.append("securityId", jobDetail.securityId);
    data.append("bossSrc", "0");

    let resp: any;
    try {
      resp = await axios({ url, data, method: "POST", headers: { Zp_token: token } });
    } catch (e: any) {
      return this.requestBossData(jobDetail, e.message, retries - 1);
    }

    if (resp.data.code !== 0) {
      throw new FetchJobDetailError(jobTitle, resp.data.message);
    }

    return resp.data.zpData;
  }

  isSendChannelConnected(channel: any): boolean {
    if (!channel) {
      return false;
    }

    if (channel.client && typeof channel.client.isConnected === "function") {
      try {
        return channel.client.isConnected();
      } catch (_e) {
        return false;
      }
    }

    return typeof channel.send === "function";
  }

  isGeekChannelConnected(geekCore: any): boolean {
    if (!geekCore || typeof geekCore.getInstance !== "function") {
      return false;
    }

    try {
      const instance = geekCore.getInstance?.();
      const clientWrapper = instance?.getClient?.();
      const client = clientWrapper?.client;
      if (!client || typeof client.send !== "function") {
        return false;
      }

      if (typeof client.isConnected === "function") {
        return !!client.isConnected();
      }

      if (typeof client.connected === "boolean") {
        return client.connected;
      }

      if (typeof client.readyState === "number") {
        return client.readyState === 1;
      }

      return true;
    } catch (_e) {
      return false;
    }
  }

  getSendChannelState(): { imageExists: boolean; imageConnected: boolean; textExists: boolean; textConnected: boolean; geekExists: boolean; geekConnected: boolean } {
    const geekCore = Tools.window.GeekChatCore;
    return {
      imageExists: !!Tools.window.ChatWebsocketImage,
      imageConnected: this.isSendChannelConnected(Tools.window.ChatWebsocketImage),
      textExists: !!Tools.window.ChatWebsocket,
      textConnected: this.isSendChannelConnected(Tools.window.ChatWebsocket),
      geekExists: !!geekCore,
      geekConnected: this.isGeekChannelConnected(geekCore)
    };
  }

  formatSendChannelState(state: { imageExists: boolean; imageConnected: boolean; textExists: boolean; textConnected: boolean; geekExists: boolean; geekConnected: boolean }): string {
    return `image(${state.imageExists ? "Y" : "N"}/${state.imageConnected ? "on" : "off"}),text(${state.textExists ? "Y" : "N"}/${state.textConnected ? "on" : "off"}),geek(${state.geekExists ? "Y" : "N"}/${state.geekConnected ? "on" : "off"})`;
  }

  private getPageUidString(): string {
    const uidValue = Tools.getPageUidString();
    if (!uidValue) {
      throw new Error("页面上下文 uid 为空");
    }
    return uidValue;
  }

  private getBossTokenPreferCookie(): string {
    const pageMeta = Tools.window?._PAGE as { token?: unknown } | undefined;
    const token = Tools.getCookieValue("bst") || Tools.getPageToken() || `${pageMeta?.token || ""}`;
    return `${token || ""}`.trim();
  }

  async ensureSendChannelReady(waitMs = 4500): Promise<boolean> {
    if (!Tools.window.ChatWebsocketImage && typeof setChatWebsocket === "function") {
      await setChatWebsocket();
    }

    const tryInit = (channel: any) => {
      if (!channel || typeof channel.init !== "function") {
        return;
      }

      if (this.isSendChannelConnected(channel)) {
        return;
      }

      try {
        channel.init();
      } catch (e) {
        logger$1.debug("初始化消息通道失败", e);
      }
    };

    tryInit(Tools.window.ChatWebsocketImage);
    tryInit(Tools.window.ChatWebsocket);

    const startTs = Date.now();
    let reconnectTs = 0;
    while (Date.now() - startTs < waitMs) {
      const state = this.getSendChannelState();
      if (state.imageConnected || state.textConnected || state.geekConnected) {
        return true;
      }

      if (Date.now() - reconnectTs > 1000) {
        const reconnectChannels: Array<{ reConnection?: () => void } | undefined> = [
          Tools.window.ChatWebsocketImage as { reConnection?: () => void } | undefined,
          Tools.window.ChatWebsocket as { reConnection?: () => void } | undefined
        ];
        reconnectChannels.forEach((channel) => {
          if (!channel || typeof channel.reConnection !== "function") {
            return;
          }

          try {
            channel.reConnection();
          } catch (e) {
            logger$1.debug("消息通道重连触发失败", e);
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
      ".job-list-container",
      ".job-list",
      ".recommend-job-list",
      ".recommend-search-inner"
    ];
    const heights = selectors
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((node): node is HTMLElement => !!node)
      .map((node) => node.scrollHeight || 0);
    heights.push(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    return Math.max(...heights, 0);
  }

  async pushAfterHandler(pushResult: any, jobDetail: any): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (pushResult.message === "Success" && pushResult.code === 0) {
      pushResultCounter.successIncr();
      const aiJudgeReason = `${jobDetail?.aiDeliveryJudge?.reason || ""}`.trim();
      if (aiJudgeReason) {
        this.preferenceLogRecorder.info(`工作【${jobTitle}】 投递成功 AI理由：${aiJudgeReason}`);
      } else {
        this.preferenceLogRecorder.info(`工作【${jobTitle}】 投递成功`);
      }
      try {
        await this.pushAfterSendImage(jobDetail);
      } catch (e: any) {
        this.preferenceLogRecorder.warn(`工作【${jobTitle}】发送图片简历失败 原因：${e?.message || e}`);
      }

      try {
        await this.pushAfterSendMsg(jobDetail);
      } catch (e: any) {
        this.preferenceLogRecorder.warn(`工作【${jobTitle}】发送自定义消息失败 原因：${e?.message || e}`);
      }

      jobDetail.contact = true;
      return jobDetail;
    }

    if (pushResult.message.includes("今日沟通人数已达上限")) {
      throw new PushLimitError(pushResult.message);
    }

    throw new PushRequestError(jobTitle, pushResult.message);
  }

  async pushAfterSendMsg(jobDetail: any): Promise<void> {
    const preference = runtimeUserStore?.user?.preference || {};
    const customGreetingEnabled = normalizePreferenceBoolean(getPreferenceValue(preference, "customGreetingEnabled", "cgE"), false);
    if (!customGreetingEnabled || this._pushMock) {
      return;
    }

    await Tools.sleep(Tools.getRandomNumber(700, 2200));
    this.enforceAutoContactSafety("message");

    const ready = await this.ensureSendChannelReady();
    if (!ready) {
      throw new Error(`消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`);
    }

    const bossData = await this.requestBossDataByCache(jobDetail);
    const customGreetingRaw = getPreferenceValue(preference, "customGreeting", "cg");
    const customGreeting = typeof customGreetingRaw === "string"
      ? customGreetingRaw
      : (customGreetingRaw == null ? void 0 : `${customGreetingRaw}`);
    const message = new Message({
      form_uid: this.getPageUidString(),
      to_uid: bossData.data.bossId.toString(),
      to_name: jobDetail.encryptBossId,
      content: customGreeting,
      image: void 0
    });

    let sendOk = message.send();
    if (!sendOk) {
      await Tools.sleep(300);
      await this.ensureSendChannelReady(2200);
      sendOk = message.send();
    }

    if (!sendOk) {
      throw new Error(`消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`);
    }
  }

  async pushAfterSendImage(jobDetail: any): Promise<void> {
    const preference = runtimeUserStore?.user?.preference || {};
    const customImageEnabled = normalizePreferenceBoolean(getPreferenceValue(preference, "customImageEnabled", "cIE"), false);
    if (!customImageEnabled || this._pushMock) {
      return;
    }

    await Tools.sleep(Tools.getRandomNumber(900, 2400));
    this.enforceAutoContactSafety("image");

    const customerImageSet = `${getPreferenceValue(preference, "customImageSet", "cI") || ""}`;
    if (!customerImageSet) {
      return;
    }

    const [originImage, tinyImage] = customerImageSet.split("===");
    if (!originImage || !tinyImage) {
      throw new Error("图片简历配置格式异常，请重新上传图片简历");
    }

    const ready = await this.ensureSendChannelReady(5500);
    if (!ready) {
      throw new Error(`图片消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`);
    }

    const bossData = await this.requestBossDataByCache(jobDetail);
    const message = new Message({
      form_uid: this.getPageUidString(),
      to_uid: bossData.data.bossId.toString(),
      to_name: jobDetail.encryptBossId,
      content: "",
      image: {
        originImage,
        tinyImage
      }
    });

    let sendOk = message.send();
    if (!sendOk) {
      await Tools.sleep(350);
      await this.ensureSendChannelReady(2200);
      sendOk = message.send();
    }

    if (!sendOk) {
      throw new Error(`图片消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`);
    }
  }

  pushPreHandler(jobDetail: any): any {
    return jobDetail;
  }

  async obtainBossJobDetailExt(jobDetail: any, message = "", retries = 3): Promise<any> {
    if (retries === 0) {
      logger$1.warn(`获取工作详情扩展信息异常,用于活跃度过滤以及工作内容过滤; 原因：${message}`);
      throw new NotMatchError(this.getJobKey(jobDetail), message, "获取工作详情扩展信息异常");
    }

    const params = `lid=${jobDetail.lid}&securityId=${jobDetail.securityId}&sessionId=`;
    try {
      const resp = await axios.get("https://www.zhipin.com/wapi/zpgeek/job/card.json?" + params, { timeout: 5000 });
      return (resp as any).data.zpData.jobCard;
    } catch (error: any) {
      logger$1.debug("获取详情页异常正在重试:", error);
      return this.obtainBossJobDetailExt(jobDetail, error.message, retries - 1);
    }
  }

  private async ensureRuntimeResumeNarrative(user: Record<string, unknown>): Promise<void> {
    const importedResume = (user.importedResume as Record<string, unknown>) || {};
    const currentText = `${importedResume.resumeText || ""}`.trim();
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

    this.lastRuntimeResumeRefreshTs = now;
    this.runtimeResumeRefreshPromise = this.fetchAndCacheRuntimeResumeText(user)
      .catch((error: any) => {
        logger$1.debug("运行时刷新简历文本失败", error?.message || error);
      })
      .finally(() => {
        this.runtimeResumeRefreshPromise = null;
      });
    await this.runtimeResumeRefreshPromise;
  }

  private async fetchAndCacheRuntimeResumeText(user: Record<string, unknown>): Promise<void> {
    const token = this.getBossTokenPreferCookie();
    if (!token) {
      return;
    }

    let resumeText = "";
    let resumeTextSource = "";

    const previewText = await this.fetchRuntimeResumeTextFromPreviewApi(token).catch(() => "");
    if (previewText.length >= 60) {
      resumeText = previewText;
      resumeTextSource = "runtime-resume-preview-api";
    }

    if (!resumeText) {
      const resp = await axios.get("https://www.zhipin.com/web/geek/resume", {
        headers: { Zp_token: token },
        timeout: 12_000
      });
      const pageText = extractResumeTextFromHtml(`${resp?.data || ""}`, 12_000);
      if (pageText.length >= 60) {
        resumeText = pageText;
        resumeTextSource = "runtime-resume-page";
      }
    }

    if (!resumeText) {
      return;
    }

    const importedResume = (user.importedResume as Record<string, unknown>) || {};
    user.importedResume = {
      ...importedResume,
      resumeText,
      resumeTextSource,
      importedAt: new Date().toISOString()
    };
    if (runtimeUserStore?.user) {
      Tools.saveStoredUserProfile(runtimeUserStore.user);
    }
  }

  private async fetchRuntimeResumeTextFromPreviewApi(token: string): Promise<string> {
    const resp = await axios.get("https://www.zhipin.com/wapi/zpgeek/resume/geek/preview/data.json", {
      headers: { Zp_token: token },
      params: { _: Date.now() },
      timeout: 12_000
    });
    const code = Number(resp?.data?.code ?? -1);
    if (code !== 0) {
      throw new Error(`${resp?.data?.message || ""}`.trim() || `resume preview api code=${code}`);
    }
    const zpData = toRecord(resp?.data?.zpData);
    return this.buildRuntimeResumeTextFromPreviewData(zpData, 12_000);
  }

  private buildRuntimeResumeTextFromPreviewData(dataInput: Record<string, unknown>, maxLength = 12_000): string {
    const data = toRecord(dataInput);
    const baseInfo = toRecord(data.baseInfo);
    const expectList = Array.isArray(data.expectList) ? data.expectList : [];
    const workExpList = Array.isArray(data.workExpList) ? data.workExpList : [];
    const projectExpList = Array.isArray(data.projectExpList) ? data.projectExpList : [];
    const educationExpList = Array.isArray(data.educationExpList) ? data.educationExpList : [];

    const sections: string[] = [];
    const basicLines = [
      `姓名：${toText(baseInfo.nickName, 80)}`,
      `工作年限：${toText(baseInfo.workYearDesc, 60)}`,
      `学历：${toText(baseInfo.degreeCategory, 60)}`,
      `求职状态：${toText(data.applyStatusDesc, 80)}`
    ].filter((line) => line.split("：")[1]);
    if (basicLines.length) {
      sections.push(`基本信息\n${basicLines.join("\n")}`);
    }

    const expectRows = expectList
      .filter((item: any) => Number(item?.positionType ?? 0) === 0)
      .map((item: any) => [toText(item?.positionName, 80), toText(item?.cityName || item?.locationName, 80), toText(item?.salaryDesc, 80)].filter(Boolean).join(" / "))
      .filter(Boolean);
    if (expectRows.length) {
      sections.push(`期望职位\n${expectRows.map((row) => `- ${row}`).join("\n")}`);
    }

    const userDesc = toText(data.userDesc || data.selfIntroduction, 1600);
    if (userDesc) {
      sections.push(`个人优势\n${userDesc}`);
    }

    const workRows = workExpList
      .map((item: any) => {
        const title = [toText(item?.companyName, 100), toText(item?.positionName, 100)].filter(Boolean).join(" - ");
        const period = [toText(item?.startDate || item?.startYear, 40), toText(item?.endDate || item?.endYear, 40)].filter(Boolean).join(" ~ ");
        const content = [toText(item?.workContent, 1200), toText(item?.workPerformance, 1200)].filter(Boolean).join("\n");
        const block = [title, period, content].filter(Boolean).join("\n");
        return block ? `- ${block}` : "";
      })
      .filter(Boolean);
    if (workRows.length) {
      sections.push(`工作经历\n${workRows.join("\n\n")}`);
    }

    const projectRows = projectExpList
      .map((item: any) => {
        const title = [toText(item?.name, 120), toText(item?.roleName, 80)].filter(Boolean).join(" - ");
        const period = [toText(item?.startDate, 40), toText(item?.endDate, 40)].filter(Boolean).join(" ~ ");
        const content = [toText(item?.projectDesc, 1200), toText(item?.performance, 1200)].filter(Boolean).join("\n");
        const block = [title, period, content].filter(Boolean).join("\n");
        return block ? `- ${block}` : "";
      })
      .filter(Boolean);
    if (projectRows.length) {
      sections.push(`项目经历\n${projectRows.join("\n\n")}`);
    }

    const educationRows = educationExpList
      .map((item: any) => [toText(item?.school || item?.schoolName, 120), toText(item?.major || item?.majorName, 120), toText(item?.degreeName, 60), [toText(item?.startYear || item?.startDate, 40), toText(item?.endYear || item?.endDate, 40)].filter(Boolean).join(" ~ ")].filter(Boolean).join(" / "))
      .filter(Boolean);
    if (educationRows.length) {
      sections.push(`教育经历\n${educationRows.map((row) => `- ${row}`).join("\n")}`);
    }

    const finalText = sections.join("\n\n").trim();
    if (!finalText) {
      return "";
    }
    return finalText.length > maxLength ? `${finalText.slice(0, maxLength)}...` : finalText;
  }

  bossIsActive(activeText: string, activePreference: Record<string, boolean> = {}): boolean {
    const checkWeek = normalizePreferenceBoolean(activePreference.acW, true);
    const checkMonth = normalizePreferenceBoolean(activePreference.acM, true);
    const checkYear = normalizePreferenceBoolean(activePreference.acY, true);

    if (checkWeek && activeText.includes("周")) {
      return false;
    }

    if (checkMonth && activeText.includes("月")) {
      return false;
    }

    if (checkYear && activeText.includes("年")) {
      return false;
    }

    return true;
  }

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

  private applyTraditionalFallbackChecks(
    traditionalDeliveryEnabled: boolean,
    jobDetail: any,
    jobDetailExt: any,
    jobTitle: string,
    fallbackReason: string
  ): void {
    if (!traditionalDeliveryEnabled) {
      throw new NotMatchError(jobTitle, fallbackReason, "AI回退传统投递失败：未开启传统投递规则");
    }
    this.applyTraditionalBaseChecks(jobDetail, jobTitle);
    this.applyTraditionalExtChecks(jobDetailExt, jobTitle);
  }

  private applyTraditionalBaseChecks(jobDetail: any, jobTitle: string): void {
    const preference = runtimeUserStore?.user?.preference || {};
    if (preference.fhE && jobDetail.goldHunter === 1) {
      throw new NotMatchError(jobTitle, jobDetail.goldHunter, "过滤猎头");
    }

    if (preference.polE && !jobDetail.bossOnline) {
      throw new NotMatchError(jobTitle, jobDetail.bossOnline, "仅投递在线boss");
    }

    const companyNameInclude = preference.cni;
    if (preference.cniE && !Tools.fuzzyMatch(companyNameInclude, jobDetail.brandName, true)) {
      throw new NotMatchError(jobTitle, jobDetail.brandName, "不满足配置公司名");
    }

    const companyNameExclude = preference.cne;
    if (preference.cneE && Tools.fuzzyMatch(companyNameExclude, jobDetail.brandName, false)) {
      throw new NotMatchError(jobTitle, jobDetail.brandName, "满足排除公司名");
    }

    const jobNameInclude = preference.jni;
    if (preference.jniE && !Tools.fuzzyMatch(jobNameInclude, jobDetail.jobName, true)) {
      throw new NotMatchError(jobTitle, jobDetail.jobName, "不满足配置工作名");
    }

    const jobNameExclude = preference.jne;
    if (preference.jneE && Tools.fuzzyMatch(jobNameExclude, jobDetail.jobName, false)) {
      throw new NotMatchError(jobTitle, jobDetail.jobName, "满足排除工作名");
    }

    const pageSalaryRange = `${jobDetail.salaryDesc || ""}`.split(".")[0];
    if (preference.srE) {
      const salaryFilterType = `${preference.srT || "1"}`;
      if (!Tools.isSalaryTypeSupportedForFilter(pageSalaryRange, salaryFilterType)) {
        throw new NotMatchError(jobTitle, pageSalaryRange, "薪资类型不匹配");
      }

      const comparableSalaryRange = Tools.getComparableSalaryRange(pageSalaryRange, salaryFilterType);
      if (!Tools.isSalaryRangeMatched(preference.sr, comparableSalaryRange)) {
        throw new NotMatchError(jobTitle, pageSalaryRange, "不满足薪资范围");
      }
    }

    const pageCompanyScaleRange = preference.csr;
    if (preference.csrE && !Tools.isRangeOverlap(pageCompanyScaleRange, jobDetail.brandScaleName)) {
      throw new NotMatchError(jobTitle, jobDetail.brandScaleName, "不满足公司规模范围");
    }
  }

  private applyTraditionalExtChecks(jobDetailExt: any, jobTitle: string): void {
    const preference = runtimeUserStore?.user?.preference || {};
    const activeTimeDesc = jobDetailExt.activeTimeDesc;
    const isActiveFilterEnabled = normalizePreferenceBoolean(preference.acE, false);
    if (isActiveFilterEnabled && !this.bossIsActive(activeTimeDesc, preference)) {
      throw new NotMatchError(jobTitle, activeTimeDesc, "不满足活跃度检查");
    }

    const jobContent = jobDetailExt.postDescription;
    const jobContentExclude = preference.jce;
    if (preference.jceE && Tools.fuzzyMatch(jobContentExclude, jobContent, false)) {
      throw new NotMatchError(jobTitle, jobContent, "满足排除工作内容");
    }

    const jobContentInclude = preference.jci;
    if (preference.jciE && !Tools.fuzzyMatch(jobContentInclude, jobContent, true)) {
      throw new NotMatchError(jobTitle, jobContent, "不满足工作内容");
    }
  }

  private maskAiDeliveryUserProfile(userProfile: Record<string, unknown>): Record<string, unknown> {
    const maskText = (value: unknown, keepStart = 2, keepEnd = 2): string => {
      const text = `${value || ""}`;
      if (!text) {
        return "";
      }
      if (text.length <= keepStart + keepEnd) {
        return `${"*".repeat(Math.max(1, text.length - 1))}${text.slice(-1)}`;
      }
      return `${text.slice(0, keepStart)}${"*".repeat(text.length - keepStart - keepEnd)}${text.slice(-keepEnd)}`;
    };

    return {
      ...userProfile,
      phone: maskText(userProfile.phone),
      email: maskText(userProfile.email, 2, 4),
      resumeId: maskText(userProfile.resumeId, 1, 2),
      importedResumeTextSource: `${userProfile.importedResumeTextSource || ""}`.slice(0, 80),
      importedResumeTextSnippet: `${userProfile.importedResumeTextSnippet || ""}`.slice(0, 180),
      resumeNarrative: `${userProfile.resumeNarrative || ""}`.slice(0, 180)
    };
  }

  private normalizeAiJudgeReason(reason: unknown, fallback: string): string {
    const normalized = `${reason || ""}`.replace(/\s+/g, " ").trim();
    if (normalized) {
      return normalized.slice(0, 360);
    }
    return fallback;
  }

  private parseAiDeliveryJudgeResult(filterResp: any): { match: boolean; reason: string; valid: boolean; parseMode: string } {
    const raw = filterResp?.data?.data;
    if (!raw) {
      return { match: false, reason: "AI判定返回为空", valid: false, parseMode: "empty" };
    }

    if (typeof raw === "object") {
      if (typeof raw.match === "boolean") {
        return {
          match: raw.match,
          reason: this.normalizeAiJudgeReason(raw.reason, "[NO_REASON] AI未提供理由，已按判定结果执行"),
          valid: true,
          parseMode: "object.match"
        };
      }
      if (typeof raw.filter === "boolean") {
        return {
          match: !raw.filter,
          reason: this.normalizeAiJudgeReason(raw.reason, "[NO_REASON] AI未提供理由，已按过滤结果执行"),
          valid: true,
          parseMode: "object.filter"
        };
      }
    }

    if (typeof raw === "string") {
      const text = raw.trim();
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed.match === "boolean") {
          return {
            match: parsed.match,
            reason: this.normalizeAiJudgeReason(parsed.reason, "[NO_REASON] AI未提供理由，已按判定结果执行"),
            valid: true,
            parseMode: "json-string.match"
          };
        }
      } catch (_e) {
        const lower = text.toLowerCase();
        if (lower.includes("\"match\":true") || lower.includes("match:true")) {
          return { match: true, reason: "AI文本判定为可投递", valid: true, parseMode: "heuristic-string.true" };
        }
        if (lower.includes("\"match\":false") || lower.includes("match:false")) {
          return { match: false, reason: "AI文本判定为不投递", valid: true, parseMode: "heuristic-string.false" };
        }
      }
    }

    return { match: false, reason: "AI判定结果无法解析", valid: false, parseMode: "invalid" };
  }

  private buildAiJudgeTraceId(): string {
    const ts = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${ts}-${randomSuffix}`;
  }
}
