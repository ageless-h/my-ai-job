// -*- coding: utf-8 -*-
import type { ApiFormat } from '@/core/ai/direct-ai-client';

export type ModelProtocol = ApiFormat | 'bedrock-converse-stream';

export interface ModelCatalogModel {
  id: string;
  name: string;
}

export interface ModelProviderTemplate {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: ModelProtocol;
  models: ModelCatalogModel[];
  source: 'internal/provider-template';
}

export interface ModelProtocolVariant extends ModelCatalogModel {
  protocol: ModelProtocol;
  source: 'internal/model-protocol-variant';
}

export type ModelProviderApiKeyLinkType = 'official' | 'invite';

export interface ModelProviderApiKeyLink {
  apiKeyUrl: string;
  websiteUrl?: string;
  linkType: ModelProviderApiKeyLinkType;
}

export const MODEL_PROVIDER_API_KEY_LINKS: Record<string, ModelProviderApiKeyLink> = {
  deepseek: {
    websiteUrl: 'https://platform.deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    linkType: 'official',
  },
  'zhipu-glm': {
    websiteUrl: 'https://open.bigmodel.cn',
    apiKeyUrl:
      'https://www.bigmodel.cn/invite?icode=ZKDHiDm%2B22bog0HN3roPmlwpqjqOwPB5EXW6OL4DgqY%3D',
    linkType: 'invite',
  },
  'zhipu-glm-en': {
    websiteUrl: 'https://z.ai',
    apiKeyUrl: 'https://z.ai/subscribe?ic=XIHRXQOONY',
    linkType: 'invite',
  },
  'qwen-coder': {
    websiteUrl: 'https://bailian.console.aliyun.com',
    apiKeyUrl: 'https://bailian.console.aliyun.com/#/api-key',
    linkType: 'official',
  },
  'kimi-k2-5': {
    websiteUrl: 'https://platform.moonshot.cn/console',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    linkType: 'official',
  },
  'kimi-for-coding': {
    websiteUrl: 'https://www.kimi.com/coding/docs/',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    linkType: 'official',
  },
  stepfun: {
    websiteUrl: 'https://platform.stepfun.ai',
    apiKeyUrl: 'https://platform.stepfun.ai/interface-key',
    linkType: 'official',
  },
  minimax: {
    websiteUrl: 'https://platform.minimaxi.com',
    apiKeyUrl: 'https://platform.minimaxi.com/subscribe/coding-plan?code=A7pKgCYnhi&source=link',
    linkType: 'invite',
  },
  'minimax-en': {
    websiteUrl: 'https://platform.minimax.io',
    apiKeyUrl: 'https://platform.minimax.io/subscribe/coding-plan',
    linkType: 'official',
  },
  'kat-coder': {
    websiteUrl: 'https://console.streamlake.ai',
    apiKeyUrl: 'https://console.streamlake.ai/console/api-key',
    linkType: 'official',
  },
  longcat: {
    websiteUrl: 'https://longcat.chat/platform',
    apiKeyUrl: 'https://longcat.chat/platform/api_keys',
    linkType: 'official',
  },
  doubaoseed: {
    websiteUrl: 'https://www.volcengine.com/product/doubao',
    apiKeyUrl: 'https://www.volcengine.com/product/doubao',
    linkType: 'official',
  },
  bailing: {
    websiteUrl: 'https://alipaytbox.yuque.com/sxs0ba/ling/get_started',
    apiKeyUrl: 'https://alipaytbox.yuque.com/sxs0ba/ling/get_started',
    linkType: 'official',
  },
  'xiaomi-mimo': {
    websiteUrl: 'https://platform.xiaomimimo.com',
    apiKeyUrl: 'https://platform.xiaomimimo.com/#/console/api-keys',
    linkType: 'official',
  },
  aihubmix: {
    websiteUrl: 'https://aihubmix.com',
    apiKeyUrl: 'https://aihubmix.com',
    linkType: 'official',
  },
  dmxapi: {
    websiteUrl: 'https://www.dmxapi.cn',
    apiKeyUrl: 'https://www.dmxapi.cn/register?aff=23hi',
    linkType: 'invite',
  },
  openrouter: {
    websiteUrl: 'https://openrouter.ai',
    apiKeyUrl: 'https://openrouter.ai/keys',
    linkType: 'official',
  },
  modelscope: {
    websiteUrl: 'https://modelscope.cn',
    apiKeyUrl: 'https://modelscope.cn/my/myaccesstoken',
    linkType: 'official',
  },
  siliconflow: {
    websiteUrl: 'https://siliconflow.cn',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/h0tOXH3L',
    linkType: 'invite',
  },
  'siliconflow-en': {
    websiteUrl: 'https://siliconflow.com',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/h0tOXH3L',
    linkType: 'invite',
  },
  'novita-ai': {
    websiteUrl: 'https://novita.ai',
    apiKeyUrl: 'https://novita.ai',
    linkType: 'official',
  },
  nvidia: {
    websiteUrl: 'https://build.nvidia.com',
    apiKeyUrl: 'https://build.nvidia.com/settings/api-keys',
    linkType: 'official',
  },
  packycode: {
    websiteUrl: 'https://www.packyapi.com',
    apiKeyUrl: 'https://www.packyapi.com/register?aff=MFve',
    linkType: 'invite',
  },
  cubence: {
    websiteUrl: 'https://cubence.com',
    apiKeyUrl: 'https://cubence.com/signup?code=SCUWJBM3',
    linkType: 'invite',
  },
  aigocode: {
    websiteUrl: 'https://aigocode.com',
    apiKeyUrl: 'https://aigocode.com/invite/AFQXZTHN',
    linkType: 'invite',
  },
  rightcode: {
    websiteUrl: 'https://www.right.codes',
    apiKeyUrl: 'https://www.right.codes/register?aff=66a66d17',
    linkType: 'invite',
  },
  aicodemirror: {
    websiteUrl: 'https://www.aicodemirror.com',
    apiKeyUrl: 'https://www.aicodemirror.com/register?invitecode=O4YZKX',
    linkType: 'invite',
  },
  aicoding: {
    websiteUrl: 'https://aicoding.sh',
    apiKeyUrl: 'https://aicoding.sh/i/cjxJp2',
    linkType: 'invite',
  },
  crazyrouter: {
    websiteUrl: 'https://www.crazyrouter.com',
    apiKeyUrl: 'https://crazyrouter.com/register?aff=Xlnc',
    linkType: 'invite',
  },
  sssaicode: {
    websiteUrl: 'https://www.sssaicode.com',
    apiKeyUrl: 'https://www.sssaicode.com/register?ref=8991ME',
    linkType: 'invite',
  },
  compshare: {
    websiteUrl: 'https://www.compshare.cn',
    apiKeyUrl: 'https://passport.compshare.cn/register?referral_code=GylGEfB4q05FiZIUaNkbvk',
    linkType: 'invite',
  },
  micu: {
    websiteUrl: 'https://www.openclaudecode.cn',
    apiKeyUrl: 'https://www.openclaudecode.cn/register?aff=yCKx',
    linkType: 'invite',
  },
  'ctok-ai': {
    websiteUrl: 'https://ctok.ai',
    apiKeyUrl: 'https://ctok.ai',
    linkType: 'official',
  },
  'x-code': {
    websiteUrl: 'https://x-code.cc',
    apiKeyUrl: 'https://x-code.cc/register?aff=OsFA',
    linkType: 'invite',
  },
  'aws-bedrock': {
    websiteUrl: 'https://aws.amazon.com/bedrock/',
    apiKeyUrl: 'https://aws.amazon.com/bedrock/',
    linkType: 'official',
  },
  'openai-compatible': {
    websiteUrl: 'https://platform.openai.com/',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    linkType: 'official',
  },
};

export const MODEL_PROVIDER_INVITE_LINK_IDS = Object.keys(MODEL_PROVIDER_API_KEY_LINKS).filter(
  (id) => MODEL_PROVIDER_API_KEY_LINKS[id]?.linkType === 'invite'
);

export const SUPPORTED_DIRECT_MODEL_PROTOCOLS: ApiFormat[] = [
  'completions',
  'responses',
  'anthropic-messages',
  'google-generative-ai',
];

export const MODEL_PROVIDER_TEMPLATES: ModelProviderTemplate[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3.2' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
    ],
  },
  {
    id: 'zhipu-glm',
    name: 'Zhipu GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'glm-5', name: 'GLM-5' }],
  },
  {
    id: 'zhipu-glm-en',
    name: 'Zhipu GLM en',
    baseUrl: 'https://api.z.ai/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'glm-5', name: 'GLM-5' }],
  },
  {
    id: 'qwen-coder',
    name: 'Qwen Coder',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'qwen3.5-plus', name: 'Qwen3.5 Plus' }],
  },
  {
    id: 'kimi-k2-5',
    name: 'Kimi k2.5',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'kimi-k2.5', name: 'Kimi K2.5' }],
  },
  {
    id: 'kimi-for-coding',
    name: 'Kimi For Coding',
    baseUrl: 'https://api.kimi.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'kimi-for-coding', name: 'Kimi For Coding' }],
  },
  {
    id: 'stepfun',
    name: 'StepFun',
    baseUrl: 'https://api.stepfun.ai/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'step-3.5-flash', name: 'Step 3.5 Flash' }],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'MiniMax-M2.5', name: 'MiniMax M2.5' }],
  },
  {
    id: 'minimax-en',
    name: 'MiniMax en',
    baseUrl: 'https://api.minimax.io/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'MiniMax-M2.5', name: 'MiniMax M2.5' }],
  },
  {
    id: 'kat-coder',
    name: 'KAT-Coder',
    baseUrl: 'https://vanchin.streamlake.ai/api/gateway/v1/endpoints/${ENDPOINT_ID}/openai',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'KAT-Coder-Pro', name: 'KAT-Coder Pro' }],
  },
  {
    id: 'longcat',
    name: 'Longcat',
    baseUrl: 'https://api.longcat.chat/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'LongCat-Flash-Chat', name: 'LongCat Flash Chat' }],
  },
  {
    id: 'doubaoseed',
    name: 'DouBaoSeed',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [
      {
        id: 'doubao-seed-2-0-code-preview-latest',
        name: 'DouBao Seed Code Preview',
      },
    ],
  },
  {
    id: 'bailing',
    name: 'BaiLing',
    baseUrl: 'https://api.tbox.cn/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'Ling-2.5-1T', name: 'Ling 2.5 1T' }],
  },
  {
    id: 'xiaomi-mimo',
    name: 'Xiaomi MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'mimo-v2-flash', name: 'MiMo V2 Flash' }],
  },
  {
    id: 'aihubmix',
    name: 'AiHubMix',
    baseUrl: 'https://aihubmix.com',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'dmxapi',
    name: 'DMXAPI',
    baseUrl: 'https://www.dmxapi.cn',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [
      { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
      { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'modelscope',
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'ZhipuAI/GLM-5', name: 'GLM-5' }],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'Pro/MiniMaxAI/MiniMax-M2.5', name: 'MiniMax M2.5' }],
  },
  {
    id: 'siliconflow-en',
    name: 'SiliconFlow en',
    baseUrl: 'https://api.siliconflow.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'MiniMaxAI/MiniMax-M2.5', name: 'MiniMax M2.5' }],
  },
  {
    id: 'novita-ai',
    name: 'Novita AI',
    baseUrl: 'https://api.novita.ai/openai',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'zai-org/glm-5', name: 'GLM-5' }],
  },
  {
    id: 'nvidia',
    name: 'Nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [{ id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5' }],
  },
  {
    id: 'packycode',
    name: 'PackyCode',
    baseUrl: 'https://www.packyapi.com',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'cubence',
    name: 'Cubence',
    baseUrl: 'https://api.cubence.com',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'aigocode',
    name: 'AIGoCode',
    baseUrl: 'https://api.aigocode.com',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'rightcode',
    name: 'RightCode',
    baseUrl: 'https://www.right.codes/claude',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'aicodemirror',
    name: 'AICodeMirror',
    baseUrl: 'https://api.aicodemirror.com/api/claudecode',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'aicoding',
    name: 'AICoding',
    baseUrl: 'https://api.aicoding.sh',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'crazyrouter',
    name: 'CrazyRouter',
    baseUrl: 'https://crazyrouter.com/v1',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'sssaicode',
    name: 'SSSAiCode',
    baseUrl: 'https://node-hk.sssaicode.com/api',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'compshare',
    name: 'Compshare',
    baseUrl: 'https://api.modelverse.cn/v1',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }],
  },
  {
    id: 'micu',
    name: 'Micu',
    baseUrl: 'https://www.openclaudecode.cn',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }],
  },
  {
    id: 'x-code',
    name: 'X-Code API',
    baseUrl: 'https://x-code.cc/v1',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    ],
  },
  {
    id: 'ctok-ai',
    name: 'CTok.ai',
    baseUrl: 'https://api.ctok.ai',
    apiFormat: 'anthropic-messages',
    source: 'internal/provider-template',
    models: [{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }],
  },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    baseUrl: 'https://bedrock-runtime.us-west-2.amazonaws.com',
    apiFormat: 'bedrock-converse-stream',
    source: 'internal/provider-template',
    models: [
      {
        id: 'anthropic.claude-opus-4-6-20250514-v1:0',
        name: 'Claude Opus 4.6',
      },
      { id: 'anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      {
        id: 'anthropic.claude-haiku-4-5-20251022-v1:0',
        name: 'Claude Haiku 4.5',
      },
    ],
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    baseUrl: '',
    apiFormat: 'completions',
    source: 'internal/provider-template',
    models: [],
  },
];

export const MODEL_PROTOCOL_VARIANTS: ModelProtocolVariant[] = [
  {
    id: 'MiniMax-M2.5',
    name: 'MiniMax M2.5',
    protocol: 'completions',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    protocol: 'completions',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    protocol: 'completions',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'step-3.5-flash',
    name: 'Step 3.5 Flash',
    protocol: 'completions',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    protocol: 'responses',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gemini-claude-opus-4-5-thinking',
    name: 'Antigravity - Claude Opus 4.5',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gemini-claude-sonnet-4-5-thinking',
    name: 'Antigravity - Claude Sonnet 4.5',
    protocol: 'anthropic-messages',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    protocol: 'google-generative-ai',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    protocol: 'google-generative-ai',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    protocol: 'google-generative-ai',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'global.anthropic.claude-opus-4-6-v1',
    name: 'Claude Opus 4.6 (Bedrock)',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'global.anthropic.claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (Bedrock)',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
    name: 'Claude Haiku 4.5 (Bedrock)',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'us.amazon.nova-pro-v1:0',
    name: 'Amazon Nova Pro',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'us.meta.llama4-maverick-17b-instruct-v1:0',
    name: 'Meta Llama 4 Maverick',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
  {
    id: 'us.deepseek.r1-v1:0',
    name: 'DeepSeek R1 (Bedrock)',
    protocol: 'bedrock-converse-stream',
    source: 'internal/model-protocol-variant',
  },
];

export function isSupportedDirectModelProtocol(apiFormat: ModelProtocol): apiFormat is ApiFormat {
  return SUPPORTED_DIRECT_MODEL_PROTOCOLS.includes(apiFormat as ApiFormat);
}

export function getModelProviderTemplateById(presetId: string): ModelProviderTemplate | null {
  return MODEL_PROVIDER_TEMPLATES.find((item) => item.id === presetId) || null;
}

export function getModelProviderApiKeyLink(templateId: string): ModelProviderApiKeyLink | null {
  const key = `${templateId || ''}`.trim();
  if (!key) {
    return null;
  }
  return MODEL_PROVIDER_API_KEY_LINKS[key] || null;
}

export function getModelProviderInviteLinks(): Array<{
  id: string;
  name: string;
  apiKeyUrl: string;
}> {
  return MODEL_PROVIDER_TEMPLATES.filter((item) =>
    MODEL_PROVIDER_INVITE_LINK_IDS.includes(item.id)
  ).map((item) => ({
    id: item.id,
    name: item.name,
    apiKeyUrl: MODEL_PROVIDER_API_KEY_LINKS[item.id]?.apiKeyUrl || '',
  }));
}

export function getModelSuggestionsByProtocol(protocol: ModelProtocol): ModelCatalogModel[] {
  const fromVariants = MODEL_PROTOCOL_VARIANTS.filter((item) => item.protocol === protocol).map(
    (item) => ({ id: item.id, name: item.name })
  );
  const merged: ModelCatalogModel[] = [];
  const seen = new Set<string>();
  for (const item of fromVariants) {
    const key = `${item.id}`.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
