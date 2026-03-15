// -*- coding: utf-8 -*-
// ConversationCleaner: 自动检测并清理被拒绝/僵尸会话
// API 端点均通过浏览器抓包验证

import axios from 'axios';
import { Tools } from '@/shared/utils/tools';
import { getLocalUser } from '@/state/user';
import { directAiCall, getActiveDirectConfig } from '@/core/ai/direct-ai-client';
import type { DirectAiMessage } from '@/core/ai/direct-ai-client';
import { RequestThrottle } from '@/core/http/request-throttle';

// ============ 类型定义 ============

export interface FriendItem {
  friendId: number;
  encryptFriendId: string;
  name: string;
  updateTime: number; // 毫秒时间戳
  brandName: string;
}

export interface FriendDetail {
  uid: number;
  encryptBossId: string;
  securityId: string;
  encryptJobId: string;
  brandName: string;
  title: string;
  name: string;
}

export interface HistoryMessage {
  mid: number;
  time: number;
  fromUid: number;
  toUid: number;
  bodyType: number;
  text: string;
}

export type RejectReason =
  | 'hr_rejected' // HR 回复了拒绝消息
  | 'self_rejected' // 我主动拒绝
  | 'stale_no_reply' // 超过 N 天未活跃
  | 'ai_detected'; // AI 分析判定

export interface CleanCandidate {
  friendId: number;
  encryptBossId: string;
  securityId: string;
  name: string;
  brandName: string;
  title: string;
  updateTime: number;
  lastText: string;
  reason: RejectReason;
  reasonDetail: string;
  selected: boolean;
}

export interface ScanProgress {
  phase: 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

// ============ 常量 ============

const STALE_DAYS = 14;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;
const STALE_DIRECT_SAFE_DAYS = 21;
const STALE_DIRECT_SAFE_MS = STALE_DIRECT_SAFE_DAYS * 24 * 60 * 60 * 1000;
const HISTORY_MSG_COUNT = 10;
const HISTORY_MAX_PAGES = 3;
const CLEANER_MANUAL_CONFIRM_THRESHOLD_DEFAULT = 40;
const CLEANER_SAFETY_CHECK_SCAN_INTERVAL_MS = 10000;
const CLEANER_SAFETY_CHECK_DELETE_INTERVAL_MS = 6000;
const CLEANER_DETAIL_BATCH_SIZE = 80;
const CLEANER_HIGH_VOLUME_THRESHOLD = 500;
const CLEANER_HISTORY_MAX_PAGES_HIGH_VOLUME = 1;
const CLEANER_SCAN_BATCH_SLEEP_MIN_MS = 20;
const CLEANER_SCAN_BATCH_SLEEP_MAX_MS = 80;
const CLEANER_SCAN_ITEM_SLEEP_MIN_MS = 30;
const CLEANER_SCAN_ITEM_SLEEP_MAX_MS = 120;
const CLEANER_DELETE_INTERVAL_MIN_MS = 1200;
const CLEANER_DELETE_INTERVAL_MAX_MS = 2200;
const CLEANER_DELETE_NETWORK_MAX_RETRIES = 1;
const CLEANER_READ_THROTTLE_MIN_MS = 350;
const CLEANER_READ_THROTTLE_MAX_MS = 700;
const CLEANER_DELETE_THROTTLE_MIN_MS = 500;
const CLEANER_DELETE_THROTTLE_MAX_MS = 900;

const cleanerReadThrottle = new RequestThrottle({
  minDelay: CLEANER_READ_THROTTLE_MIN_MS,
  maxDelay: CLEANER_READ_THROTTLE_MAX_MS,
});

const cleanerDeleteThrottle = new RequestThrottle({
  minDelay: CLEANER_DELETE_THROTTLE_MIN_MS,
  maxDelay: CLEANER_DELETE_THROTTLE_MAX_MS,
});

function createManualVerificationGuard(
  action: string,
  intervalMs: number
): (force?: boolean) => void {
  let lastCheckAt = 0;
  return (force = false): void => {
    const now = Date.now();
    if (force || now - lastCheckAt >= intervalMs) {
      Tools.ensureNoManualVerificationOrThrow(action);
      lastCheckAt = now;
    }
  };
}

function getCleanerSafetyConfig(): {
  manualConfirmThreshold: number;
} {
  let preference: Record<string, unknown> = {};
  try {
    const user = getLocalUser();
    preference = (user?.preference || {}) as Record<string, unknown>;
  } catch (_e) {
    preference = {};
  }

  const toSafeInt = (value: unknown, fallback: number, min: number, max: number): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
  };

  return {
    manualConfirmThreshold: toSafeInt(
      preference.cleanerManualConfirmThreshold,
      CLEANER_MANUAL_CONFIRM_THRESHOLD_DEFAULT,
      5,
      300
    ),
  };
}

// ============ API 调用 ============

function getZpToken(): string {
  return Tools.getCookieValue('bst') || '';
}

/** 获取全部会话列表 */
export async function fetchFriendList(): Promise<FriendItem[]> {
  const resp = await axios.get(
    'https://www.zhipin.com/wapi/zprelation/friend/geekFilterByLabel?labelId=0'
  );
  if (resp.data?.message === '当前登录状态已失效') {
    throw new Error('未登录 BOSS 直聘');
  }
  const list = resp.data?.zpData?.friendList;
  if (!Array.isArray(list)) return [];
  return list.map((f: any) => ({
    friendId: f.friendId,
    encryptFriendId: f.encryptFriendId || '',
    name: f.name || '',
    updateTime: f.updateTime || 0,
    brandName: f.brandName || '',
  }));
}

/** 批量获取好友详情（含 securityId） */
export async function fetchFriendDetails(friendIds: number[]): Promise<FriendDetail[]> {
  if (!friendIds.length) return [];
  // API 限制 200 个
  const ids = friendIds.slice(0, 199).join(',');
  const resp = await axios.get(
    'https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?friendIds=' + ids
  );
  const list = resp.data?.zpData?.result;
  if (!Array.isArray(list)) return [];
  return list.map((f: any) => ({
    uid: f.uid,
    encryptBossId: f.encryptBossId || '',
    securityId: f.securityId || '',
    encryptJobId: f.encryptJobId || '',
    brandName: f.brandName || '',
    title: f.title || '',
    name: f.name || '',
  }));
}

/** 获取聊天历史消息 */
export async function fetchHistoryMessages(
  encryptBossId: string,
  securityId: string,
  count = HISTORY_MSG_COUNT,
  maxPages = HISTORY_MAX_PAGES
): Promise<HistoryMessage[]> {
  let maxMsgId = '0';
  const merged: HistoryMessage[] = [];
  const seenMid = new Set<string>();

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const params = new URLSearchParams({
      bossId: encryptBossId,
      groupId: encryptBossId,
      maxMsgId,
      c: String(count),
      page: '1',
      src: '0',
      securityId,
      loading: 'true',
      _t: String(Date.now()),
    });
    const resp = await axios.get(
      'https://www.zhipin.com/wapi/zpchat/geek/historyMsg?' + params.toString()
    );
    const messages = resp.data?.zpData?.messages;
    if (!Array.isArray(messages) || !messages.length) break;

    const parsed = messages.map((m: any) => ({
      mid: m.mid,
      time: m.time || 0,
      fromUid: m.from?.uid || 0,
      toUid: m.to?.uid || 0,
      bodyType: m.body?.type || 0,
      text: m.body?.text || '',
    }));

    for (const msg of parsed) {
      const key = msg.mid
        ? `mid:${msg.mid}`
        : `fallback:${msg.time}:${msg.fromUid}:${msg.bodyType}:${msg.text}`;
      if (seenMid.has(key)) continue;
      seenMid.add(key);
      merged.push(msg);
    }

    const mids = parsed.map((m) => Number(m.mid || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (!mids.length) break;
    const nextMaxMsgId = String(Math.min(...mids));
    if (nextMaxMsgId === maxMsgId) break;
    maxMsgId = nextMaxMsgId;

    if (messages.length < count) break;
  }

  return merged;
}

/** 删除好友/会话 */
export async function deleteFriend(
  securityId: string
): Promise<{ ok: boolean; message: string; code?: number }> {
  const token = getZpToken();
  if (!token) return { ok: false, message: '未获取到 Zp_token' };
  const resp = await axios.post(
    'https://www.zhipin.com/wapi/zprelation/friend/delete.json',
    'securityId=' + encodeURIComponent(securityId),
    {
      headers: {
        Zp_token: token,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    }
  );
  const code = resp.data?.code;
  if (code === 0) return { ok: true, message: '', code };
  return { ok: false, message: resp.data?.message || `code=${code}`, code };
}

// ============ 分析逻辑 ============

const REJECT_KEYWORDS = [
  '不合适',
  '不太合适',
  '不匹配',
  '不太匹配',
  '暂不考虑',
  '不考虑',
  '岗位已关闭',
  '岗位已满',
  '已招到',
  '已经招到',
  '不太符合',
  '不符合',
  '抱歉',
  '很遗憾',
  '祝您求职顺利',
  '再看看其他',
  '已向您表达不合适',
];

const SELF_REJECT_KEYWORDS = ['不考虑了', '不合适', '算了', '不去了', '放弃', '不感兴趣'];

/** 关键词快速检测 */
function detectByKeywords(
  messages: HistoryMessage[],
  myUid: number
): { reason: RejectReason; detail: string } | null {
  // 从最新消息往前扫
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.bodyType !== 1 || !m.text) continue;

    const isFromMe = m.fromUid === myUid;
    const text = m.text;

    if (!isFromMe) {
      for (const kw of REJECT_KEYWORDS) {
        if (text.includes(kw)) {
          return { reason: 'hr_rejected', detail: `HR: "${text.substring(0, 60)}"` };
        }
      }
    } else {
      for (const kw of SELF_REJECT_KEYWORDS) {
        if (text.includes(kw)) {
          return { reason: 'self_rejected', detail: `我: "${text.substring(0, 60)}"` };
        }
      }
    }
  }
  return null;
}

/** AI 分析会话是否应该清理 */
async function analyzeWithAi(
  messages: HistoryMessage[],
  myUid: number,
  contactName: string
): Promise<{ shouldClean: boolean; reason: string }> {
  const config = getActiveDirectConfig();
  if (!config) {
    return { shouldClean: false, reason: '无可用 AI 配置' };
  }

  const textMessages = messages
    .filter((m) => m.bodyType === 1 && m.text)
    .map((m) => {
      const role = m.fromUid === myUid ? '我' : contactName;
      return `[${role}]: ${m.text}`;
    })
    .join('\n');

  if (!textMessages.trim()) {
    return { shouldClean: false, reason: '无文本消息' };
  }

  const prompt = `分析以下求职对话，判断是否属于以下情况之一：
1. HR明确拒绝了求职者（如不合适、岗位已满等）
2. 求职者明确拒绝了该岗位
3. 对话已经结束，双方不再有继续沟通的意向

对话内容：
${textMessages}

请只回复 JSON 格式：{"shouldClean": true/false, "reason": "简短原因"}`;

  const aiMessages: DirectAiMessage[] = [
    { role: 'system', content: '你是一个求职对话分析助手，只输出 JSON，不要输出其他内容。' },
    { role: 'user', content: prompt },
  ];

  try {
    const answer = await directAiCall(config, aiMessages);
    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        shouldClean: !!parsed.shouldClean,
        reason: parsed.reason || '',
      };
    }
    return { shouldClean: false, reason: 'AI 返回格式异常' };
  } catch (e: any) {
    return { shouldClean: false, reason: `AI 调用失败: ${e?.message || e}` };
  }
}

// ============ 主扫描流程 ============

export async function scanConversations(
  onProgress: (progress: ScanProgress) => void
): Promise<CleanCandidate[]> {
  Tools.ensureBossDomainOrThrow('会话扫描');
  const ensureSafeScan = createManualVerificationGuard(
    '会话扫描',
    CLEANER_SAFETY_CHECK_SCAN_INTERVAL_MS
  );
  ensureSafeScan(true);
  const candidates: CleanCandidate[] = [];
  const now = Date.now();
  const myUid = (Tools.window as any)?._PAGE?.uid || 0;

  // Phase 1: 获取会话列表
  onProgress({ phase: 'fetching', current: 0, total: 0, message: '获取会话列表...' });
  let friendList: FriendItem[];
  try {
    friendList = await fetchFriendList();
  } catch (e: any) {
    onProgress({ phase: 'error', current: 0, total: 0, message: e?.message || '获取会话列表失败' });
    return [];
  }

  if (!friendList.length) {
    onProgress({ phase: 'done', current: 0, total: 0, message: '没有会话' });
    return [];
  }

  // Phase 2: 全量扫描队列（日期只做最后兜底判断）
  const staleCount = friendList.filter((f) => now - f.updateTime > STALE_MS).length;
  const analysisList = friendList;
  const highVolumeMode = analysisList.length >= CLEANER_HIGH_VOLUME_THRESHOLD;
  const historyMaxPages = highVolumeMode
    ? CLEANER_HISTORY_MAX_PAGES_HIGH_VOLUME
    : HISTORY_MAX_PAGES;
  const enableAiAnalyze = !highVolumeMode;
  let aiSkippedByHighVolume = 0;
  const scanBatchSize = Math.min(
    CLEANER_DETAIL_BATCH_SIZE,
    analysisList.length || CLEANER_DETAIL_BATCH_SIZE
  );
  let analyzeFailedCount = 0;

  onProgress({
    phase: 'fetching',
    current: 0,
    total: analysisList.length,
    message: `共 ${friendList.length} 个会话（本次执行全量扫描，详情分批约 ${scanBatchSize} 个/批）${highVolumeMode ? '，当前为高吞吐模式（历史仅1页，AI判定跳过）' : ''}，其中 ${staleCount} 个超过 ${STALE_DAYS} 天未活跃；开始扫描`,
  });

  // Phase 3: 批量获取详情
  const analysisIds = analysisList.map((f) => f.friendId);
  let details: FriendDetail[] = [];
  // 分批获取详情（高吞吐配置下默认按 80 个/批）
  for (let i = 0; i < analysisIds.length; i += scanBatchSize) {
    ensureSafeScan();
    const batch = analysisIds.slice(i, i + scanBatchSize);
    const batchDetails = await cleanerReadThrottle.enqueue(() => fetchFriendDetails(batch));
    details = details.concat(batchDetails);
    if (i + scanBatchSize < analysisIds.length) {
      await Tools.sleep(
        Tools.getRandomNumber(CLEANER_SCAN_BATCH_SLEEP_MIN_MS, CLEANER_SCAN_BATCH_SLEEP_MAX_MS)
      );
    }
  }

  const detailMap = new Map<number, FriendDetail>();
  details.forEach((d) => detailMap.set(d.uid, d));

  // Phase 4: 逐个分析
  onProgress({
    phase: 'analyzing',
    current: 0,
    total: analysisList.length,
    message: '分析会话内容...',
  });

  for (let i = 0; i < analysisList.length; i++) {
    ensureSafeScan();
    const friend = analysisList[i];
    const detail = detailMap.get(friend.friendId);
    if (!detail || !detail.securityId) continue;

    onProgress({
      phase: 'analyzing',
      current: i + 1,
      total: analysisList.length,
      message: `分析 ${detail.name}@${detail.brandName} (${i + 1}/${analysisList.length}，共 ${friendList.length} 个会话)`,
    });

    try {
      const staleDurationMs = now - friend.updateTime;
      const isStaleSession = staleDurationMs > STALE_MS;
      const canDirectClassifyStale = highVolumeMode && staleDurationMs > STALE_DIRECT_SAFE_MS;
      if (canDirectClassifyStale) {
        candidates.push({
          friendId: friend.friendId,
          encryptBossId: detail.encryptBossId,
          securityId: detail.securityId,
          name: detail.name,
          brandName: detail.brandName,
          title: detail.title,
          updateTime: friend.updateTime,
          lastText: '',
          reason: 'stale_no_reply',
          reasonDetail: `会话超过 ${STALE_DIRECT_SAFE_DAYS} 天未活跃（高吞吐直判）`,
          selected: true,
        });
        continue;
      }

      await Tools.sleep(
        Tools.getRandomNumber(CLEANER_SCAN_ITEM_SLEEP_MIN_MS, CLEANER_SCAN_ITEM_SLEEP_MAX_MS)
      );
      const messages = await cleanerReadThrottle.enqueue(() =>
        fetchHistoryMessages(
          detail.encryptBossId,
          detail.securityId,
          HISTORY_MSG_COUNT,
          historyMaxPages
        )
      );

      // 最后一条文本消息
      const lastTextMsg = [...messages].reverse().find((m) => m.bodyType === 1 && m.text);

      // Step A: 关键词快速检测
      const kwResult = detectByKeywords(messages, myUid);
      if (kwResult) {
        candidates.push({
          friendId: friend.friendId,
          encryptBossId: detail.encryptBossId,
          securityId: detail.securityId,
          name: detail.name,
          brandName: detail.brandName,
          title: detail.title,
          updateTime: friend.updateTime,
          lastText: lastTextMsg?.text || '',
          reason: kwResult.reason,
          reasonDetail: kwResult.detail,
          selected: true,
        });
        continue;
      }

      if (isStaleSession) {
        candidates.push({
          friendId: friend.friendId,
          encryptBossId: detail.encryptBossId,
          securityId: detail.securityId,
          name: detail.name,
          brandName: detail.brandName,
          title: detail.title,
          updateTime: friend.updateTime,
          lastText: lastTextMsg?.text || '',
          reason: 'stale_no_reply',
          reasonDetail: `会话超过 ${STALE_DAYS} 天未活跃（历史快速确认）`,
          selected: true,
        });
        continue;
      }

      if (!enableAiAnalyze) {
        aiSkippedByHighVolume += 1;
        continue;
      }

      // Step B: AI 分析（高吞吐模式下默认跳过）
      const aiResult = await analyzeWithAi(messages, myUid, detail.name);
      if (aiResult.shouldClean) {
        candidates.push({
          friendId: friend.friendId,
          encryptBossId: detail.encryptBossId,
          securityId: detail.securityId,
          name: detail.name,
          brandName: detail.brandName,
          title: detail.title,
          updateTime: friend.updateTime,
          lastText: lastTextMsg?.text || '',
          reason: 'ai_detected',
          reasonDetail: aiResult.reason,
          selected: true,
        });
        continue;
      }
    } catch (_e) {
      // 单个会话分析失败不影响整体
      analyzeFailedCount += 1;
    }
  }

  onProgress({
    phase: 'done',
    current: analysisList.length,
    total: analysisList.length,
    message: `扫描完成，找到 ${candidates.length} 个待清理会话${analyzeFailedCount > 0 ? `，${analyzeFailedCount} 个会话分析失败` : ''}${aiSkippedByHighVolume > 0 ? `，高吞吐模式跳过AI判定 ${aiSkippedByHighVolume} 个` : ''}`,
  });

  return candidates;
}

/** 批量删除选中的会话 */
export async function batchDelete(
  items: CleanCandidate[],
  onProgress: (current: number, total: number, name: string, failReason?: string) => void,
  options: { manualConfirmed?: boolean } = {}
): Promise<{
  success: number;
  failed: number;
  lastError: string;
  topFailReason: string;
  successSecurityIds: string[];
}> {
  Tools.ensureBossDomainOrThrow('会话删除');
  const ensureSafeDelete = createManualVerificationGuard(
    '会话删除',
    CLEANER_SAFETY_CHECK_DELETE_INTERVAL_MS
  );
  ensureSafeDelete(true);
  let success = 0;
  let failed = 0;
  let lastError = '';
  const failReasonCounter: Record<string, number> = {};
  const successSecurityIds: string[] = [];
  const safety = getCleanerSafetyConfig();
  const selected = items.filter((i) => i.selected);
  if (selected.length >= safety.manualConfirmThreshold && !options.manualConfirmed) {
    throw new Error(`批量删除达到高风险阈值(${safety.manualConfirmThreshold})，缺少人工二次确认`);
  }

  const isRiskControlDeleteError = (msg: string, status?: number): boolean => {
    if (status === 429) return true;
    const text = `${msg || ''}`.toLowerCase();
    if (!text) return false;
    return (
      text.includes('频繁') ||
      text.includes('繁忙') ||
      text.includes('稍后') ||
      text.includes('429') ||
      text.includes('验证码') ||
      text.includes('风控')
    );
  };

  const isRetryableDeleteError = (msg: string, status?: number): boolean => {
    if (isRiskControlDeleteError(msg, status)) return false;
    if (typeof status === 'number' && status >= 500) return true;
    const text = `${msg || ''}`.toLowerCase();
    if (!text) return false;
    if (text.includes('未获取到 zp_token') || text.includes('securityid')) return false;
    return (
      text.includes('network') ||
      text.includes('timeout') ||
      text.includes('status code 5') ||
      text.includes('服务异常')
    );
  };

  const deleteWithRetry = async (
    securityId: string
  ): Promise<{ ok: boolean; message: string; riskControlHit: boolean }> => {
    const maxAttempts = 1 + CLEANER_DELETE_NETWORK_MAX_RETRIES;
    let latestMsg = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      ensureSafeDelete();
      try {
        const result = await cleanerDeleteThrottle.enqueue(() => deleteFriend(securityId));
        if (result.ok) return { ok: true, message: '', riskControlHit: false };
        latestMsg = result.message || '删除失败';
        if (isRiskControlDeleteError(latestMsg, result.code)) {
          return { ok: false, message: latestMsg, riskControlHit: true };
        }
        if (!isRetryableDeleteError(latestMsg, result.code) || attempt === maxAttempts) {
          return { ok: false, message: latestMsg, riskControlHit: false };
        }
      } catch (e: any) {
        latestMsg = e?.message || String(e);
        const status = e?.response?.status;
        if (isRiskControlDeleteError(latestMsg, status)) {
          return { ok: false, message: latestMsg, riskControlHit: true };
        }
        if (!isRetryableDeleteError(latestMsg, status) || attempt === maxAttempts) {
          return { ok: false, message: latestMsg, riskControlHit: false };
        }
      }
      await Tools.sleep(3000 * attempt);
    }
    return { ok: false, message: latestMsg || '删除失败', riskControlHit: false };
  };

  let stoppedByRiskControl = false;
  for (let i = 0; i < selected.length; i++) {
    ensureSafeDelete();
    const item = selected[i];
    await Tools.sleep(
      Tools.getRandomNumber(CLEANER_DELETE_INTERVAL_MIN_MS, CLEANER_DELETE_INTERVAL_MAX_MS)
    );
    onProgress(i + 1, selected.length, item.name);
    try {
      const result = await deleteWithRetry(item.securityId);
      if (result.ok) {
        success++;
        successSecurityIds.push(item.securityId);
      } else {
        failed++;
        lastError = result.message;
        failReasonCounter[result.message || '未知错误'] =
          (failReasonCounter[result.message || '未知错误'] || 0) + 1;
        onProgress(i + 1, selected.length, item.name, result.message);
        if (result.riskControlHit) {
          stoppedByRiskControl = true;
          break;
        }
      }
    } catch (e: any) {
      failed++;
      lastError = e?.message || String(e);
      failReasonCounter[lastError || '未知错误'] =
        (failReasonCounter[lastError || '未知错误'] || 0) + 1;
      onProgress(i + 1, selected.length, item.name, lastError);
      if (isRiskControlDeleteError(lastError)) {
        stoppedByRiskControl = true;
        break;
      }
    }
  }

  if (stoppedByRiskControl) {
    const riskStopMsg = `触发风控保护(${lastError || '删除频率受限'})，已停止后续删除`;
    failReasonCounter[riskStopMsg] = (failReasonCounter[riskStopMsg] || 0) + 1;
    lastError = riskStopMsg;
  }

  const topFailReason = Object.entries(failReasonCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  return { success, failed, lastError, topFailReason, successSecurityIds };
}
