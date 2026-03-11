// -*- coding: utf-8 -*-
// DirectAiClient: 通过 GM_xmlhttpRequest 直接调用用户的 AI API
// 支持 OpenAI Chat Completions 和 Responses API 两种格式

import { Tools } from '@/shared/utils/tools';

declare const GM_xmlhttpRequest: ((options: Record<string, unknown>) => unknown) | undefined;

const _GM_xmlhttpRequest = typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : undefined;

export type ApiFormat = 'completions' | 'responses';

export interface DirectAiConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  apiFormat: ApiFormat;
  timeout?: number;
}

export interface DirectAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DirectAiResult {
  answerContent: string;
  answerTypeList: number[];
  operationTypeList: number[];
}

const DIRECT_TEST_MAX_RETRY = 1;
const DIRECT_TEST_RETRY_DELAY_MS = 1200;

function isRetryableDirectNetworkError(message: string): boolean {
  const text = `${message || ''}`.toLowerCase();
  if (
    text.includes('跨域') ||
    text.includes('白名单') ||
    text.includes('鉴权失败') ||
    text.includes('接口不存在(404)') ||
    text.includes('请求过于频繁(429)') ||
    text.includes('请求失败(')
  ) {
    return false;
  }

  return (
    text.includes('请求超时') ||
    text.includes('network error') ||
    text.includes('timed out') ||
    text.includes('econnreset') ||
    text.includes('eai_again') ||
    text.includes('dns') ||
    text.includes('failed to fetch')
  );
}

function normalizeGmNetworkError(
  url: string,
  err: any,
  context?: { timeoutMs?: number; elapsedMs?: number }
): string {
  const reasonCandidate = err?.error || err?.message || err?.statusText || '';
  const reason = typeof reasonCandidate === 'string' ? reasonCandidate.trim() : '';
  const reasonLower = reason.toLowerCase();
  const connectListHints = ['@connect', 'not a part of the @connect list'];
  const blockedByConnectList = connectListHints.some((hint) => reasonLower.includes(hint));
  const deniedHints = [
    'access denied',
    'forbidden',
    'blocked',
    'denied',
    'not whitelisted',
    'cross-origin',
    'cors',
    'access-control',
    '跨域',
  ];
  const isDenied = deniedHints.some((hint) => reasonLower.includes(hint));
  const timeoutHints = ['timeout', 'timed out', '请求超时'];
  const looksLikeTimeout = timeoutHints.some((hint) => reasonLower.includes(hint));
  const elapsedMs = Number(context?.elapsedMs || 0);
  const timeoutMs = Number(context?.timeoutMs || 0);
  const nearTimeout = timeoutMs > 0 && elapsedMs >= Math.max(timeoutMs - 1000, timeoutMs * 0.9);

  if (looksLikeTimeout || nearTimeout) {
    return `请求超时: 请检查网络连接或增大超时时间 (${url})`;
  }

  if (blockedByConnectList) {
    return `跨域请求被脚本白名单拦截: 域名未在 @connect 中放行，请更新到最新脚本后重试 (${url})`;
  }

  if (isDenied) {
    return `跨域请求可能被拦截: 请刷新页面并在油猴弹窗中允许跨域请求 (${url})`;
  }

  if (reason) {
    return `网络错误: ${reason} (${url})`;
  }

  return `网络错误: 请检查 URL 是否正确，或刷新页面后在油猴弹窗中允许跨域请求 (${url})`;
}

/**
 * 获取当前激活的自有 API 配置
 * 如果没有激活的自有 API 配置，返回 null
 */
export function getActiveDirectConfig(): DirectAiConfig | null {
  const ext = Tools.getAiConfigExt();
  const apiConfigs = Array.isArray((ext as any).apiConfigs) ? (ext as any).apiConfigs : [];
  const activeId = (ext as any).activeApiConfigId || '';

  if (!activeId || !apiConfigs.length) {
    return null;
  }

  const active = apiConfigs.find((c: any) => c.id === activeId && c.status === 1);
  if (!active || !active.baseUrl || !active.apiKey || !active.modelName) {
    return null;
  }

  return {
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    modelName: active.modelName,
    apiFormat: active.apiFormat || 'completions',
    timeout: Number(active.timeout || 60),
  };
}

/**
 * 判断当前是否应该使用直接调用路径
 */
export function shouldUseDirectCall(): boolean {
  const config = getActiveDirectConfig();
  return !!config;
}

/**
 * 通过 GM_xmlhttpRequest 直接调用 AI API
 */
export async function directAiCall(
  config: DirectAiConfig,
  messages: DirectAiMessage[]
): Promise<string> {
  if (!_GM_xmlhttpRequest) {
    throw new Error('GM_xmlhttpRequest 不可用');
  }

  const { baseUrl, apiKey, modelName, apiFormat, timeout } = config;
  const timeoutMs = (timeout || 60) * 1000;

  if (apiFormat === 'responses') {
    return callResponsesApi(baseUrl, apiKey, modelName, messages, timeoutMs);
  }
  return callCompletionsApi(baseUrl, apiKey, modelName, messages, timeoutMs);
}

/**
 * 调用 Chat Completions API 格式
 * POST baseUrl/v1/chat/completions
 */
function callCompletionsApi(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  messages: DirectAiMessage[],
  timeoutMs: number
): Promise<string> {
  const url = buildApiEndpointUrl(baseUrl, 'completions');
  const body = JSON.stringify({
    model: modelName,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return gmRequest(url, apiKey, body, timeoutMs).then((data: any) => {
    const choice = data?.choices?.[0];
    return choice?.message?.content || '';
  });
}

/**
 * 调用 Responses API 格式
 * POST baseUrl/v1/responses
 */
function callResponsesApi(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  messages: DirectAiMessage[],
  timeoutMs: number
): Promise<string> {
  const url = buildApiEndpointUrl(baseUrl, 'responses');

  // 将 messages 转换为 Responses API 的 input 格式
  const input = messages.map((m) => ({
    type: 'message' as const,
    role: m.role === 'system' ? 'developer' : m.role,
    content: [{ type: 'input_text' as const, text: m.content }],
  }));

  const body = JSON.stringify({
    model: modelName,
    input,
  });

  return gmRequest(url, apiKey, body, timeoutMs).then((data: any) => {
    // Responses API 返回格式: { output: [{ type: "message", content: [{ type: "output_text", text: "..." }] }] }
    const output = Array.isArray(data?.output) ? data.output : [];
    const msgOutput = output.find((o: any) => o.type === 'message');
    if (!msgOutput) {
      return '';
    }
    const contentArr = Array.isArray(msgOutput.content) ? msgOutput.content : [];
    const textParts = contentArr
      .filter((c: any) => c.type === 'output_text')
      .map((c: any) => c.text || '');
    return textParts.join('');
  });
}

function buildApiEndpointUrl(baseUrl: string, apiFormat: ApiFormat): string {
  const normalizedBase = `${baseUrl || ''}`.trim().replace(/\/+$/, '');
  const lowerBase = normalizedBase.toLowerCase();

  if (apiFormat === 'responses') {
    if (lowerBase.endsWith('/v1/responses') || lowerBase.endsWith('/responses')) {
      return normalizedBase;
    }
    if (lowerBase.endsWith('/v1')) {
      return `${normalizedBase}/responses`;
    }
    return `${normalizedBase}/v1/responses`;
  }

  if (lowerBase.endsWith('/v1/chat/completions') || lowerBase.endsWith('/chat/completions')) {
    return normalizedBase;
  }
  if (lowerBase.endsWith('/v1')) {
    return `${normalizedBase}/chat/completions`;
  }
  return `${normalizedBase}/v1/chat/completions`;
}

/**
 * GM_xmlhttpRequest 封装
 */
function gmRequest(url: string, apiKey: string, body: string, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!_GM_xmlhttpRequest) {
      reject(new Error('GM_xmlhttpRequest 不可用'));
      return;
    }
    try {
      Tools.ensureAllowedNetworkUrl(url, 'AI直连请求');
    } catch (error: any) {
      reject(error);
      return;
    }
    const startedAt = Date.now();
    let settled = false;
    const resolveOnce = (value: any) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    _GM_xmlhttpRequest({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      data: body,
      responseType: 'json',
      timeout: timeoutMs,
      onload: (response: any) => {
        if (response.status >= 200 && response.status < 300) {
          try {
            const data =
              typeof response.response === 'string'
                ? JSON.parse(response.response)
                : response.response;
            resolveOnce(data);
          } catch (parseError: any) {
            rejectOnce(new Error(`AI响应解析失败: ${parseError?.message || parseError}`));
          }
        } else {
          const status = Number(response?.status || 0);
          const errMsg =
            typeof response.response === 'object'
              ? response.response?.error?.message || JSON.stringify(response.response)
              : response.responseText || `HTTP ${response.status}`;
          if (status === 401 || status === 403) {
            rejectOnce(new Error(`鉴权失败(${status}): 请检查 API Key 是否正确`));
            return;
          }
          if (status === 404) {
            rejectOnce(new Error(`接口不存在(404): 请检查 Base URL 与 API 格式是否匹配`));
            return;
          }
          if (status === 429) {
            rejectOnce(new Error('请求过于频繁(429): 请稍后重试'));
            return;
          }
          if (status >= 500 && status < 600) {
            rejectOnce(new Error(`服务暂时不可用(${status}): ${errMsg}`));
            return;
          }
          if (status === 0) {
            rejectOnce(
              new Error(
                normalizeGmNetworkError(url, response, {
                  timeoutMs,
                  elapsedMs: Date.now() - startedAt,
                })
              )
            );
            return;
          }
          rejectOnce(new Error(`请求失败(${status || 'unknown'}): ${errMsg}`));
        }
      },
      onerror: (err: any) => {
        rejectOnce(
          new Error(
            normalizeGmNetworkError(url, err, {
              timeoutMs,
              elapsedMs: Date.now() - startedAt,
            })
          )
        );
      },
      ontimeout: () => {
        rejectOnce(new Error(`请求超时: 请检查网络连接或增大超时时间 (${url})`));
      },
    });
  });
}

/**
 * 将原始 AI 文本包装成后端兼容的响应结构
 * 用于代聊场景，使 BossOption.handleBossMessage 无需修改
 */
export function wrapAsBackendResponse(answerContent: string): any {
  return {
    data: {
      code: 200,
      data: {
        answerContent,
        answerTypeList: [1], // MSG_TEXT
        operationTypeList: [],
      },
    },
  };
}

/**
 * 直接调用 AI 并返回后端兼容格式（用于 AiPower.ask 替代路径）
 */
export async function directAsk(
  question: string,
  systemPrompt: string,
  messageHistory: DirectAiMessage[],
  config: DirectAiConfig
): Promise<any> {
  const messages: DirectAiMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // 添加历史消息
  if (messageHistory.length) {
    messages.push(...messageHistory);
  }

  // 添加当前问题
  messages.push({ role: 'user', content: question });

  try {
    const answer = await directAiCall(config, messages);
    return wrapAsBackendResponse(answer || '(AI 未返回内容)');
  } catch (e: any) {
    return wrapAsBackendResponse(`[AI调用失败] ${e?.message || e}`);
  }
}

/**
 * 直接测试 API 连通性
 */
export async function directTest(config: DirectAiConfig): Promise<string> {
  const messages: DirectAiMessage[] = [{ role: 'user', content: '你好，请简短回复确认连接正常。' }];
  let lastError: unknown;
  for (let attempt = 0; attempt <= DIRECT_TEST_MAX_RETRY; attempt += 1) {
    try {
      return await directAiCall(config, messages);
    } catch (error: any) {
      lastError = error;
      if (
        attempt >= DIRECT_TEST_MAX_RETRY ||
        !isRetryableDirectNetworkError(error?.message || '')
      ) {
        throw error;
      }
      await Tools.sleep(DIRECT_TEST_RETRY_DELAY_MS);
    }
  }

  throw lastError || new Error('测试失败: 未知错误');
}
