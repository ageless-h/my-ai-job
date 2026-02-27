// -*- coding: utf-8 -*-
import axios from "axios";
import { AiPower } from "@/services/ai-power";
import { AbsPlatform, PushResultStatus, PushStatus, pushResultCounter, userStore$2 } from "@/services/push-engine";
import { Logger } from "@/utils/logger";
import { Tools, resolvePromptVariables, buildPromptVarsFromJob } from "@/utils/tools";
import { TampermonkeyApi } from "@/utils/tampermonkey";
import {
  NotMatchException,
  PushReqException,
  CollectReqException,
  FetchJobBossFailExp,
  PublishLimitExp,
  PublishStopExp
} from "@/errors";
import { Message } from "@/protocol/message";
import { simulateScrollToEnd } from "@/utils/scroll";

const logger$1 = Logger.rootLogger;

async function setChatWebsocket(): Promise<void> {
  logger$1.info("build ChatWebsocket");
  try {
    const res = await fetch("https://static.zhipin.com/assets/zhipin/geek/socket.js?v=20250313");
    const code = await res.text();
    const str = '\nTools.window.ChatWebsocketImage = ChatWebsocket;\nconsole.log("set ChatWebsocket 成功", ChatWebsocket)\n';
    const modifiedCode = code
      .replaceAll(/if \("EventBus" in window\) \{\s+EventBus.subscribe\("CHAT_SEND_TEXT".*fail\);\s+}\);\s+}/gs, str)
      .replace("ChatWebsocket.init()", "");
    eval(modifiedCode);
    logger$1.info("window 挂载 ChatWebsocket", Tools.window.ChatWebsocketImage);
  } catch (err) {
    logger$1.info("window 挂载 ChatWebsocket 失败", err);
  }
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
          logger$1.error(0, "获取平台挂载元素失败");
          resolve({ el: document.createElement("div"), p: "" });
          return;
        }

        count++;
      }, 300);
    });
  }

  async getRenderComponent(): Promise<any> {
    if (this.curUrl.includes("www.zhipin.com/web/geek/chat")) {
      const mod = await import("@/components/BossMessage.vue");
      return mod.default;
    }

    if (this.curUrl.includes("www.zhipin.com/web/geek/job") || this.curUrl.includes("overseas")) {
      const mod = await import("@/components/Panel.vue");
      return mod.default;
    }
  }

  startPreHandler(): void {
    this.lastHeight = 0;
  }

  getJobList(): any[] {
    if (this.curUrl.includes("jobs")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
      const jobList = Array.from(elementNodeList2)
        .map((item: any) => item.__vue__.data)
        .filter((job: any) => !job.processed);

      if (elementNodeList2.length !== 0 && jobList.length === 0) {
        this.logRecorder.info("当前筛选条件下岗位均已投递");
      }

      return jobList;
    }

    if (this.curUrl.includes("job-recommend")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
      return Array.from(elementNodeList2).map((item: any) => item.__vue__.data).filter((job: any) => !job.contact);
    }

    if (this.curUrl.includes("overseas")) {
      const elementNodeList2 = document.querySelectorAll(".job-card-box");
      return Array.from(elementNodeList2).map((item: any) => item.__vue__.data).filter((job: any) => !job.contact);
    }

    const elementNodeList = document.querySelectorAll(".job-card-wrapper");
    return Array.from(elementNodeList).map((item: any) => item.__vue__.data);
  }

  hasNext(): boolean {
    logger$1.debug("hasNext");

    if (this.curUrl.includes("jobs")) {
      return this.lastHeight !== document.querySelector(".job-list-container")?.scrollHeight;
    }

    if (this.curUrl.includes("overseas")) {
      return this.lastHeight !== document.querySelector(".job-list")?.scrollHeight;
    }

    if (this.curUrl.includes("job-recommend")) {
      return !!document.querySelector("#footer");
    }

    const nextPageBtn = document.querySelector(".ui-icon-arrow-right");
    if (nextPageBtn === null) {
      return false;
    }

    return (nextPageBtn.parentElement as HTMLElement).className !== "disabled";
  }

  acquireDataPre(): void {
    if (this.pushStatus === PushStatus.PAUSE) {
      return;
    }

    if (this.curUrl.includes("jobs")) {
      this.lastHeight = document.querySelector(".job-list-container")?.scrollHeight || 0;
      simulateScrollToEnd().then(() => {
        logger$1.info("获取下一页成功");
      }).catch((e) => {
        this.logRecorder.warn("获取下一页失败", e);
      });
      return;
    }

    if (this.curUrl.includes("job-recommend")) {
      simulateScrollToEnd().then(() => {
        logger$1.info("获取下一页成功");
      }).catch((e) => {
        this.logRecorder.warn("获取下一页失败", e);
      });
      return;
    }

    if (this.curUrl.includes("overseas")) {
      this.lastHeight = document.querySelector(".job-list")?.scrollHeight || 0;
      simulateScrollToEnd().then(() => {
        logger$1.info("获取下一页成功");
      }).catch((e) => {
        this.logRecorder.warn("获取下一页失败", e);
      });
      return;
    }

    (document.querySelector(".ui-icon-arrow-right") as HTMLElement).click();
  }

  async matchJob(jobDetail: any): Promise<boolean> {
    jobDetail.processed = true;
    const jobTitle = this.getJobKey(jobDetail);

    if (jobDetail.contact) {
      throw new NotMatchException(jobTitle, jobDetail.contact, "已经沟通过");
    }

    if (userStore$2.user.preference.fhE && jobDetail.goldHunter === 1) {
      throw new NotMatchException(jobTitle, jobDetail.goldHunter, "过滤猎头");
    }

    if (userStore$2.user.preference.polE && !jobDetail.bossOnline) {
      throw new NotMatchException(jobTitle, jobDetail.bossOnline, "仅投递在线boss");
    }

    const companyNameInclude = userStore$2.user.preference.cni;
    if (userStore$2.user.preference.cniE && !Tools.fuzzyMatch(companyNameInclude, jobDetail.brandName, true)) {
      throw new NotMatchException(jobTitle, jobDetail.brandName, "不满足配置公司名");
    }

    const companyNameExclude = userStore$2.user.preference.cne;
    if (userStore$2.user.preference.cneE && Tools.fuzzyMatch(companyNameExclude, jobDetail.brandName, false)) {
      throw new NotMatchException(jobTitle, jobDetail.brandName, "满足排除公司名");
    }

    const jobNameInclude = userStore$2.user.preference.jni;
    if (userStore$2.user.preference.jniE && !Tools.fuzzyMatch(jobNameInclude, jobDetail.jobName, true)) {
      throw new NotMatchException(jobTitle, jobDetail.jobName, "不满足配置工作名");
    }

    const jobNameExclude = userStore$2.user.preference.jne;
    if (userStore$2.user.preference.jneE && Tools.fuzzyMatch(jobNameExclude, jobDetail.jobName, false)) {
      throw new NotMatchException(jobTitle, jobDetail.jobName, "满足排除工作名");
    }

    const pageSalaryRange = jobDetail.salaryDesc.split(".")[0];
    if (userStore$2.user.preference.srE) {
      const salaryFilterType = `${userStore$2.user.preference.srT || "1"}`;
      if (!Tools.isSalaryTypeSupportedForFilter(pageSalaryRange, salaryFilterType)) {
        throw new NotMatchException(jobTitle, pageSalaryRange, "薪资类型不匹配");
      }

      const comparableSalaryRange = Tools.getComparableSalaryRange(pageSalaryRange, salaryFilterType);
      if (!Tools.isSalaryRangeMatched(userStore$2.user.preference.sr, comparableSalaryRange)) {
        throw new NotMatchException(jobTitle, pageSalaryRange, "不满足薪资范围");
      }
    }

    const pageCompanyScaleRange = userStore$2.user.preference.csr;
    if (userStore$2.user.preference.csrE && !Tools.isRangeOverlap(pageCompanyScaleRange, jobDetail.brandScaleName)) {
      throw new NotMatchException(jobTitle, jobDetail.brandScaleName, "不满足公司规模范围");
    }

    const jobDetailExt = await this.obtainBossJobDetailExt(jobDetail);
    logger$1.debug(`获取工作【${jobTitle}】详情扩展信息用于过滤 `, jobDetail);

    const activeTimeDesc = jobDetailExt.activeTimeDesc;
    const activePreference = userStore$2.user.preference || {};
    if (activePreference.acE !== false && !this.bossIsActive(activeTimeDesc, activePreference)) {
      throw new NotMatchException(jobTitle, activeTimeDesc, "不满足活跃度检查");
    }

    const jobContent = jobDetailExt.postDescription;
    const jobContentExclude = userStore$2.user.preference.jce;
    if (userStore$2.user.preference.jceE && Tools.fuzzyMatch(jobContentExclude, jobContent, false)) {
      throw new NotMatchException(jobTitle, jobContent, "满足排除工作内容");
    }

    const jobContentInclude = userStore$2.user.preference.jci;
    if (userStore$2.user.preference.jciE && !Tools.fuzzyMatch(jobContentInclude, jobContent, true)) {
      throw new NotMatchException(jobTitle, jobContent, "不满足工作内容");
    }

    if (userStore$2.user.preference.afE && userStore$2.user.preference.af) {
      const promptVars = buildPromptVarsFromJob(jobDetail);
      const resolvedFilterPrompt = resolvePromptVariables(userStore$2.user.preference.af, promptVars);
      const filterResp = await AiPower.filter(
        resolvedFilterPrompt,
        JSON.stringify(this.unpackBaseInfo(jobDetail)),
        JSON.stringify(this.unpackExtInfo(jobDetailExt))
      );

      const filterResult = filterResp?.data?.data;
      if (filterResult && filterResult?.filter) {
        throw new NotMatchException(jobTitle, filterResult.reason, "AI过滤");
      }
    }

    if (this.isCommunication(jobDetailExt)) {
      throw new NotMatchException(jobTitle, jobDetailExt.friendStatus, "已经沟通过");
    }

    return true;
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
      msg: "Boss投递限制每天100次"
    };
  }

  async doPush(jobDetail: any, errorMsg = "", retries = 3): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (retries === 3) {
      logger$1.debug("正在投递：" + jobTitle);
    }

    if (retries === 0) {
      throw new PushReqException(jobTitle, errorMsg);
    }

    const publishUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${jobDetail.securityId}&jobId=${jobDetail.encryptJobId}&lid=${jobDetail.lid}`;
    let pushResp: any = { code: PushResultStatus.NOT_START, message: "" };
    try {
      await Tools.sleep(userStore$2.user.preference.pi * 1000);
      pushResp = await axios.post(publishUrl, null, { headers: { Zp_token: Tools.getCookieValue("bst") } });
    } catch (error: any) {
      logger$1.debug(`工作【${jobTitle}】投递失败; 正在等待重试; 原因：${error.message}`);
      await Tools.sleep(800);
      return await this.doPush(jobDetail, error.message, retries - 1);
    }

    if (pushResp.data.code === PushResultStatus.FAIL && pushResp.data?.zpData?.bizData?.chatRemindDialog?.content) {
      if (pushResp.data?.zpData?.bizData?.chatRemindDialog?.content.include("您今天已与120位BOSS沟通")) {
        logger$1.debug(`当天已投递超过120次 工作【${jobTitle}】已修正为投递成功`);
        return {
          code: PushResultStatus.SUCCESS,
          message: "Success"
        };
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
      throw new CollectReqException(jobTitle, errorMsg || "收藏重试多次失败");
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

      await Tools.sleep(Math.max(500, ((userStore$2?.user.preference.pi) || 3) * 600));
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
      throw new FetchJobBossFailExp(jobTitle, errorMsg || "获取boss数据重试多次失败");
    }

    const url = "https://www.zhipin.com/wapi/zpchat/geek/getBossData";
    const token = Tools.getCookieValue("bst");
    if (!token) {
      throw new FetchJobBossFailExp(jobTitle, "未获取到zp-token");
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
      throw new FetchJobBossFailExp(jobTitle, resp.data.message);
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

  getSendChannelState(): { imageExists: boolean; imageConnected: boolean; textExists: boolean; textConnected: boolean; geekExists: boolean } {
    return {
      imageExists: !!Tools.window.ChatWebsocketImage,
      imageConnected: this.isSendChannelConnected(Tools.window.ChatWebsocketImage),
      textExists: !!Tools.window.ChatWebsocket,
      textConnected: this.isSendChannelConnected(Tools.window.ChatWebsocket),
      geekExists: !!Tools.window.GeekChatCore
    };
  }

  formatSendChannelState(state: { imageExists: boolean; imageConnected: boolean; textExists: boolean; textConnected: boolean; geekExists: boolean }): string {
    return `image(${state.imageExists ? "Y" : "N"}/${state.imageConnected ? "on" : "off"}),text(${state.textExists ? "Y" : "N"}/${state.textConnected ? "on" : "off"}),geek(${state.geekExists ? "Y" : "N"})`;
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
      if (state.imageConnected || state.textConnected || state.geekExists) {
        return true;
      }

      if (Date.now() - reconnectTs > 1000) {
        [Tools.window.ChatWebsocketImage, Tools.window.ChatWebsocket].forEach((channel) => {
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

  async pushAfterHandler(pushResult: any, jobDetail: any): Promise<any> {
    const jobTitle = this.getJobKey(jobDetail);
    if (pushResult.message === "Success" && pushResult.code === 0) {
      pushResultCounter.successIncr();
      this.logRecorder.info(`工作【${jobTitle}】 投递成功`);
      try {
        await this.pushAfterSendImage(jobDetail);
      } catch (e: any) {
        this.logRecorder.warn(`工作【${jobTitle}】发送图片简历失败 原因：${e?.message || e}`);
      }

      try {
        await this.pushAfterSendMsg(jobDetail);
      } catch (e: any) {
        this.logRecorder.warn(`工作【${jobTitle}】发送自定义消息失败 原因：${e?.message || e}`);
      }

      jobDetail.contact = true;
      return jobDetail;
    }

    if (pushResult.message.includes("今日沟通人数已达上限")) {
      throw new PublishLimitExp(pushResult.message);
    }

    throw new PushReqException(jobTitle, pushResult.message);
  }

  async pushAfterSendMsg(jobDetail: any): Promise<void> {
    if (!userStore$2.user.preference.cgE || this._pushMock) {
      return;
    }

    const ready = await this.ensureSendChannelReady();
    if (!ready) {
      throw new Error(`消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`);
    }

    const bossData = await this.requestBossDataByCache(jobDetail);
    const customGreeting = userStore$2.user.preference.cg;
    const message = new Message({
      form_uid: Tools.window._PAGE.uid.toString(),
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
    if (!userStore$2.user.preference.cIE || this._pushMock) {
      return;
    }

    const customerImageSet = userStore$2.user.preference.cI;
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
      form_uid: Tools.window._PAGE.uid.toString(),
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
      throw new NotMatchException(this.getJobKey(jobDetail), message, "获取工作详情扩展信息异常");
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

  bossIsActive(activeText: string, activePreference: Record<string, boolean> = {}): boolean {
    const checkWeek = activePreference.acW !== false;
    const checkMonth = activePreference.acM !== false;
    const checkYear = activePreference.acY !== false;

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
}
