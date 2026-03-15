// -*- coding: utf-8 -*-
// DirectAiClient: 通过 GM_xmlhttpRequest 直接调用用户的 AI API
// 支持 OpenAI Completions / Responses、Anthropic Messages、Google Generative AI

import { Tools } from '@/shared/utils/tools';

declare const GM_xmlhttpRequest: ((options: Record<string, unknown>) => unknown) | undefined;

const _GM_xmlhttpRequest = typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : undefined;

export type ApiFormat =
  | 'completions'
  | 'responses'
  | 'anthropic-messages'
  | 'google-generative-ai';

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

function parseApiFormat(value: unknown): ApiFormat | null {
  const normalized = `${value || ''}`.trim();
  if (!normalized || normalized === 'completions') {
    return 'completions';
  }
  if (normalized === 'responses') {
    return 'responses';
  }
  if (normalized === 'anthropic-messages') {
    return 'anthropic-messages';
  }
  if (normalized === 'google-generative-ai') {
    return 'google-generative-ai';
  }
  return null;
}

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
  const safeUrl = `${url || ''}`.replace(/([?&]key=)[^&#]+/gi, '$1***');
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
    return `请求超时: 请检查网络连接或增大超时时间 (${safeUrl})`;
  }

  if (blockedByConnectList) {
    return `跨域请求被脚本白名单拦截: 域名未在 @connect 中放行，请更新到最新脚本后重试 (${safeUrl})`;
  }

  if (isDenied) {
    return `跨域请求可能被拦截: 请刷新页面并在油猴弹窗中允许跨域请求 (${safeUrl})`;
  }

  if (reason) {
    return `网络错误: ${reason} (${safeUrl})`;
  }

  return `网络错误: 请检查 URL 是否正确，或刷新页面后在油猴弹窗中允许跨域请求 (${safeUrl})`;
}

function extractHostnameFromUrl(rawUrl: string): string {
  const candidate = `${rawUrl || ''}`.trim();
  if (!candidate) {
    return '';
  }

  try {
    return new URL(candidate).hostname;
  } catch (_error) {
    try {
      return new URL(`https://${candidate}`).hostname;
    } catch (_error2) {
      return '';
    }
  }
}

/**
 * 获取当前激活的自有 API 配置
 * 如果没有激活的自有 API 配置，返回 null
 */
export function getActiveDirectConfig(): DirectAiConfig | null {
  const active = Tools.getActiveModelConfig();
  if (!active || !active.baseUrl || !active.apiKey || !active.modelName) {
    return null;
  }

  const parsedApiFormat = parseApiFormat(active.apiFormat);
  if (!parsedApiFormat) {
    return null;
  }

  return {
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    modelName: active.modelName,
    apiFormat: parsedApiFormat,
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

  const { baseUrl, apiKey, modelName, timeout } = config;
  const apiFormat = parseApiFormat(config.apiFormat);
  if (!apiFormat) {
    throw new Error(`不支持的 API 协议: ${config?.apiFormat || 'unknown'}`);
  }
  const timeoutMs = (timeout || 60) * 1000;

  switch (apiFormat) {
    case 'responses':
      return callResponsesApi(baseUrl, apiKey, modelName, messages, timeoutMs);
    case 'anthropic-messages':
      return callAnthropicMessagesApi(baseUrl, apiKey, modelName, messages, timeoutMs);
    case 'google-generative-ai':
      return callGoogleGenerativeApi(baseUrl, apiKey, modelName, messages, timeoutMs);
    default:
      return callCompletionsApi(baseUrl, apiKey, modelName, messages, timeoutMs);
  }
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
  const url = buildOpenAiEndpointUrl(baseUrl, 'completions');
  const extraTrustedHosts = [extractHostnameFromUrl(baseUrl), extractHostnameFromUrl(url)].filter(
    Boolean
  );
  const body = JSON.stringify({
    model: modelName,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return gmRequest({ url, apiKey, body, timeoutMs, extraTrustedHosts }).then((data: any) => {
    const choice = data?.choices?.[0];
    if (typeof choice?.message?.content === 'string') {
      return choice.message.content;
    }
    return `${choice?.message?.content || ''}`;
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
  const url = buildOpenAiEndpointUrl(baseUrl, 'responses');
  const extraTrustedHosts = [extractHostnameFromUrl(baseUrl), extractHostnameFromUrl(url)].filter(
    Boolean
  );

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

  return gmRequest({ url, apiKey, body, timeoutMs, extraTrustedHosts }).then((data: any) => {
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

function callAnthropicMessagesApi(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  messages: DirectAiMessage[],
  timeoutMs: number
): Promise<string> {
  const url = buildAnthropicEndpointUrl(baseUrl);
  const extraTrustedHosts = [extractHostnameFromUrl(baseUrl), extractHostnameFromUrl(url)].filter(
    Boolean
  );
  const systemPrompt = messages
    .filter((m) => m.role === 'system')
    .map((m) => `${m.content || ''}`.trim())
    .filter(Boolean)
    .join('\n\n');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: `${m.content || ''}`,
    }));

  if (!chatMessages.length) {
    chatMessages.push({ role: 'user', content: '你好，请简短回复确认连接正常。' });
  }

  const body = JSON.stringify({
    model: modelName,
    max_tokens: 4096,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: chatMessages,
  });

  return gmRequest({
    url,
    apiKey,
    body,
    timeoutMs,
    extraTrustedHosts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    useBearerAuth: false,
  }).then((data: any) => {
    const contentArr = Array.isArray(data?.content) ? data.content : [];
    const textParts = contentArr
      .filter((item: any) => item?.type === 'text')
      .map((item: any) => `${item?.text || ''}`)
      .filter(Boolean);
    if (textParts.length) {
      return textParts.join('');
    }

    const completion = `${data?.completion || data?.output_text || ''}`;
    if (completion.trim()) {
      return completion;
    }

    const fallbackChoice = data?.choices?.[0]?.message?.content;
    return `${fallbackChoice || ''}`;
  });
}

function callGoogleGenerativeApi(
  baseUrl: string,
  apiKey: string,
  modelName: string,
  messages: DirectAiMessage[],
  timeoutMs: number
): Promise<string> {
  const url = buildGoogleEndpointUrl(baseUrl, modelName, apiKey);
  const extraTrustedHosts = [extractHostnameFromUrl(baseUrl), extractHostnameFromUrl(url)].filter(
    Boolean
  );
  const payload = buildGooglePayload(messages);
  const body = JSON.stringify(payload);

  return gmRequest({
    url,
    apiKey,
    body,
    timeoutMs,
    extraTrustedHosts,
    headers: {
      'Content-Type': 'application/json',
    },
    useBearerAuth: false,
  }).then((data: any) => {
    const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
    const first = candidates[0] || null;
    const parts = Array.isArray(first?.content?.parts) ? first.content.parts : [];
    const text = parts
      .map((part: any) => `${part?.text || ''}`)
      .filter(Boolean)
      .join('');
    if (text) {
      return text;
    }
    const fallback = `${data?.text || data?.output_text || ''}`;
    if (fallback) {
      return fallback;
    }
    return `${first?.output || ''}`;
  });
}

function buildOpenAiEndpointUrl(baseUrl: string, apiFormat: Extract<ApiFormat, 'completions' | 'responses'>): string {
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

function buildAnthropicEndpointUrl(baseUrl: string): string {
  const normalizedBase = `${baseUrl || ''}`.trim().replace(/\/+$/, '');
  const lowerBase = normalizedBase.toLowerCase();

  if (lowerBase.endsWith('/v1/messages') || lowerBase.endsWith('/messages')) {
    return normalizedBase;
  }
  if (lowerBase.endsWith('/v1')) {
    return `${normalizedBase}/messages`;
  }
  return `${normalizedBase}/v1/messages`;
}

function buildGoogleEndpointUrl(baseUrl: string, modelName: string, apiKey: string): string {
  const safeModelName = encodeURIComponent(`${modelName || ''}`.trim() || 'gemini-2.5-flash-lite');
  const normalizedBase = `${baseUrl || ''}`.trim().replace(/\/+$/, '');
  const lowerBase = normalizedBase.toLowerCase();

  let endpoint = '';
  if (!normalizedBase) {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeModelName}:generateContent`;
  } else if (lowerBase.includes('/models/') && lowerBase.includes(':generatecontent')) {
    endpoint = normalizedBase;
  } else if (lowerBase.endsWith('/v1beta') || lowerBase.endsWith('/v1')) {
    endpoint = `${normalizedBase}/models/${safeModelName}:generateContent`;
  } else if (lowerBase.includes('/v1beta/models/')) {
    endpoint = `${normalizedBase}:generateContent`;
  } else {
    endpoint = `${normalizedBase}/v1beta/models/${safeModelName}:generateContent`;
  }

  if (/[?&]key=/i.test(endpoint)) {
    return endpoint;
  }
  const delimiter = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${delimiter}key=${encodeURIComponent(apiKey)}`;
}

function buildGooglePayload(messages: DirectAiMessage[]): Record<string, unknown> {
  const systemPrompt = messages
    .filter((m) => m.role === 'system')
    .map((m) => `${m.content || ''}`.trim())
    .filter(Boolean)
    .join('\n\n');

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: `${m.content || ''}` }],
    }));

  if (!contents.length) {
    contents.push({
      role: 'user',
      parts: [{ text: '你好，请简短回复确认连接正常。' }],
    });
  }

  return {
    ...(systemPrompt
      ? {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        }
      : {}),
    contents,
  };
}

/**
 * GM_xmlhttpRequest 封装
 */
type GmRequestInput = {
  url: string;
  apiKey: string;
  body: string;
  timeoutMs: number;
  extraTrustedHosts?: string[];
  headers?: Record<string, string>;
  useBearerAuth?: boolean;
};

function gmRequest(input: GmRequestInput): Promise<any> {
  const {
    url,
    apiKey,
    body,
    timeoutMs,
    extraTrustedHosts = [],
    headers = {},
    useBearerAuth = true,
  } = input;
  return new Promise((resolve, reject) => {
    if (!_GM_xmlhttpRequest) {
      reject(new Error('GM_xmlhttpRequest 不可用'));
      return;
    }
    try {
      Tools.ensureAllowedNetworkUrl(url, 'AI直连请求', extraTrustedHosts);
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

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (useBearerAuth && !finalHeaders.Authorization && apiKey) {
      finalHeaders.Authorization = `Bearer ${apiKey}`;
    }

    _GM_xmlhttpRequest({
      method: 'POST',
      url,
      headers: finalHeaders,
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
        rejectOnce(
          new Error(
            `请求超时: 请检查网络连接或增大超时时间 (${`${url || ''}`.replace(/([?&]key=)[^&#]+/gi, '$1***')})`
          )
        );
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
