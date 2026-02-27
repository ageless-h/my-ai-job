// -*- coding: utf-8 -*-
// DirectAiClient: 通过 GM_xmlhttpRequest 直接调用用户的 AI API
// 支持 OpenAI Chat Completions 和 Responses API 两种格式

import { Tools } from '@/utils/tools';

declare const GM_xmlhttpRequest:
  | ((options: Record<string, unknown>) => unknown)
  | undefined;

const _GM_xmlhttpRequest =
  typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : undefined;

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
  messages: DirectAiMessage[],
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
  timeoutMs: number,
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
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
  timeoutMs: number,
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/responses`;

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

/**
 * GM_xmlhttpRequest 封装
 */
function gmRequest(url: string, apiKey: string, body: string, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!_GM_xmlhttpRequest) {
      reject(new Error('GM_xmlhttpRequest 不可用'));
      return;
    }
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
          const data = typeof response.response === 'string'
            ? JSON.parse(response.response)
            : response.response;
          resolve(data);
        } else {
          const errMsg = typeof response.response === 'object'
            ? (response.response?.error?.message || JSON.stringify(response.response))
            : (response.responseText || `HTTP ${response.status}`);
          reject(new Error(errMsg));
        }
      },
      onerror: (err: any) => {
        reject(new Error(`网络错误: 请检查 URL 是否正确，或刷新页面后在油猴弹窗中允许跨域请求 (${url})`));
      },
      ontimeout: () => {
        reject(new Error('请求超时'));
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
  config: DirectAiConfig,
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
  const messages: DirectAiMessage[] = [
    { role: 'user', content: '你好，请简短回复确认连接正常。' },
  ];
  return directAiCall(config, messages);
}
