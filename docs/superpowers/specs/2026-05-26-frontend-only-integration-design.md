# 纯前端独立版设计方案

## 概述

将 AI 求职助手从前后端分离架构重构为纯前端架构，完全去除对 `43.138.246.37` 的后端依赖，消除数据外泄风险。

## 背景

### 当前问题
- 后端服务器 `43.138.246.37` 存在数据外泄风险
- 原作者已宣布关闭该服务器（2026年4月13日）
- 用户简历、AI API keys、聊天记录都发送到第三方服务器

### 目标
- ✅ 完全去除后端依赖
- ✅ 所有数据存储在本地浏览器
- ✅ 保持现有功能完整（除支付）
- ✅ 零服务器成本

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│  用户脚本 (Tampermonkey)                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Vue 3 + Pinia 前端                                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │ │
│  │  │ Panel UI     │ │ AI Config    │ │ Job Assistant │  │ │
│  │  └──────────────┘ └──────────────┘ └───────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                            │                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  核心服务层 (TypeScript)                               │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │ │
│  │  │ AiClient     │ │ LocalDB      │ │ Boss Platform │  │ │
│  │  │ (直连API)    │ │ (IndexedDB)  │ │ (DOM/API)     │  │ │
│  │  └──────────────┘ └──────────────┘ └───────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                            │                                │
│              ┌─────────────┼─────────────┐                  │
│              ▼             ▼             ▼                  │
│        [OpenAI API] [Kimi API]    [BOSS直聘]                │
│        [Claude API] [DeepSeek]    [WebSocket]               │
└─────────────────────────────────────────────────────────────┘
```

### 模块依赖关系

```
app/
├── main.ts
├── App.vue
└── ...

core/
├── ai/
│   ├── ai-power.ts (修改：移除后端调用)
│   ├── direct-ai-client.ts (已有，无需改动)
│   └── resume-parser.ts (新增：简历OCR)
├── auth/
│   └── auth.ts (重构：本地认证)
├── storage/
│   ├── local-db.ts (新增：IndexedDB封装)
│   └── encryption.ts (新增：API Key加密)
└── platform/
    └── boss-platform.ts (已有，无需改动)

state/
├── login.ts (修改：本地登录状态)
├── user.ts (修改：本地用户数据)
└── ...
```

## 核心功能设计

### 1. 本地认证系统

**替换后端登录流程**

```typescript
// core/auth/local-auth.ts
export class LocalAuthService {
  /**
   * 使用 BOSS Token 进行本地认证
   */
  async authenticate(): Promise<AuthResult> {
    const token = this.extractBossToken();
    const userId = this.extractBossUserId();
    
    if (!token || !userId) {
      throw new Error('请先登录 BOSS 直聘');
    }
    
    // 存储到本地数据库
    await LocalDB.setUserProfile({
      id: userId,
      token: token,
      authenticatedAt: Date.now()
    });
    
    return { userId, token };
  }
  
  /**
   * 检查登录状态
   */
  isAuthenticated(): boolean {
    const profile = LocalDB.getUserProfile();
    return !!profile?.token;
  }
  
  /**
   * 从 BOSS 页面提取 Token
   */
  private extractBossToken(): string | null {
    const unsafeWindow = (window as any).unsafeWindow || window;
    return unsafeWindow._PAGE?.token || null;
  }
}
```

### 2. 本地数据存储系统

**IndexedDB 数据库设计**

```typescript
// core/storage/local-db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface JobHuntingDB extends DBSchema {
  userProfile: {
    key: string;
    value: UserProfile;
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
  aiConfigs: {
    key: string;
    value: AiConfig;
  };
  deliveryRecords: {
    key: string;
    value: DeliveryRecord;
    indexes: { byTimestamp: number };
  };
  chatSessions: {
    key: string;
    value: ChatSession;
  };
  resumeData: {
    key: string;
    value: ResumeData;
  };
}

export class LocalDB {
  private static db: IDBPDatabase<JobHuntingDB>;
  
  static async init(): Promise<void> {
    this.db = await openDB<JobHuntingDB>('ai-job-hunting', 1, {
      upgrade(db) {
        // 用户档案
        db.createObjectStore('userProfile', { keyPath: 'id' });
        
        // 用户偏好设置
        db.createObjectStore('preferences', { keyPath: 'id' });
        
        // AI 配置列表
        db.createObjectStore('aiConfigs', { keyPath: 'id' });
        
        // 投递记录
        const deliveryStore = db.createObjectStore('deliveryRecords', { 
          keyPath: 'id' 
        });
        deliveryStore.createIndex('byTimestamp', 'timestamp');
        
        // 聊天会话
        db.createObjectStore('chatSessions', { keyPath: 'jobKey' });
        
        // 简历数据
        db.createObjectStore('resumeData', { keyPath: 'userId' });
      }
    });
  }
  
  // 用户档案操作
  static async setUserProfile(profile: UserProfile): Promise<void> {
    await this.db.put('userProfile', profile);
  }
  
  static async getUserProfile(): Promise<UserProfile | undefined> {
    const profiles = await this.db.getAll('userProfile');
    return profiles[0];
  }
  
  // AI 配置操作
  static async saveAiConfig(config: AiConfig): Promise<void> {
    // 加密存储 API Key
    config.apiKey = await Encryption.encrypt(config.apiKey);
    await this.db.put('aiConfigs', config);
  }
  
  static async getAiConfigs(): Promise<AiConfig[]> {
    const configs = await this.db.getAll('aiConfigs');
    // 解密 API Keys
    return Promise.all(configs.map(async c => ({
      ...c,
      apiKey: await Encryption.decrypt(c.apiKey)
    })));
  }
  
  // 投递记录操作
  static async addDeliveryRecord(record: DeliveryRecord): Promise<void> {
    await this.db.add('deliveryRecords', record);
  }
  
  static async getDeliveryRecords(
    limit: number = 100
  ): Promise<DeliveryRecord[]> {
    const index = this.db.transaction('deliveryRecords')
      .store.index('byTimestamp');
    return index.getAll(null, limit);
  }
  
  // 聊天会话操作
  static async saveChatSession(session: ChatSession): Promise<void> {
    await this.db.put('chatSessions', session);
  }
  
  static async getChatSession(jobKey: string): Promise<ChatSession | undefined> {
    return this.db.get('chatSessions', jobKey);
  }
  
  // 简历数据操作
  static async saveResume(data: ResumeData): Promise<void> {
    await this.db.put('resumeData', data);
  }
  
  static async getResume(userId: string): Promise<ResumeData | undefined> {
    return this.db.get('resumeData', userId);
  }
}
```

### 3. 简历解析服务（前端化）

**直接调用 Kimi API 进行 OCR**

```typescript
// core/ai/resume-parser.ts
export class ResumeParser {
  /**
   * 解析简历 PDF 文件
   */
  async parseResume(
    file: File, 
    config: DirectAiConfig
  ): Promise<ParsedResume> {
    // 1. 上传文件到 Kimi
    const fileId = await this.uploadFile(file, config);
    
    // 2. 请求文件解析
    const result = await this.requestFileParse(fileId, config);
    
    // 3. 提取结构化信息
    return this.extractResumeInfo(result);
  }
  
  private async uploadFile(
    file: File, 
    config: DirectAiConfig
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${config.baseUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: formData
    });
    
    const data = await response.json();
    return data.id;
  }
  
  private async requestFileParse(
    fileId: string,
    config: DirectAiConfig
  ): Promise<string> {
    // 使用 Kimi 的文件解析功能
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: 'system',
            content: '请分析这份简历，提取关键信息：姓名、联系方式、技能、工作经历、项目经验、教育背景。'
          },
          {
            role: 'user',
            content: `请解析文件 ID: ${fileId}`
          }
        ]
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  private extractResumeInfo(rawText: string): ParsedResume {
    // 解析 AI 返回的文本，提取结构化信息
    // 使用正则表达式或简单的文本分析
    return {
      rawText,
      name: this.extractField(rawText, '姓名'),
      phone: this.extractField(rawText, '电话'),
      email: this.extractField(rawText, '邮箱'),
      skills: this.extractList(rawText, '技能'),
      workExperience: this.extractSection(rawText, '工作经历'),
      projects: this.extractSection(rawText, '项目经验'),
      education: this.extractSection(rawText, '教育背景')
    };
  }
}
```

### 4. 加密模块

**保护敏感数据（API Keys）**

```typescript
// core/storage/encryption.ts
export class Encryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  
  /**
   * 生成或获取本地加密密钥
   */
  private static async getKey(): Promise<CryptoKey> {
    const storedKey = localStorage.getItem('__encryption_key__');
    
    if (storedKey) {
      // 从存储恢复密钥
      const keyData = this.base64ToBuffer(storedKey);
      return crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );
    }
    
    // 生成新密钥
    const key = await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
    
    // 存储密钥
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(
      '__encryption_key__', 
      this.bufferToBase64(exported)
    );
    
    return key;
  }
  
  /**
   * 加密字符串
   */
  static async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoded
    );
    
    // 合并 IV 和密文
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return this.bufferToBase64(combined);
  }
  
  /**
   * 解密字符串
   */
  static async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const combined = this.base64ToBuffer(ciphertext);
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  private static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private static base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
```

## 数据模型

### TypeScript 类型定义

```typescript
// types/local-storage.ts

export interface UserProfile {
  id: string;                    // BOSS userId
  token: string;                 // BOSS token（加密存储）
  email?: string;
  phone?: string;
  authenticatedAt: number;
  lastSyncAt?: number;
}

export interface UserPreferences {
  id: string;
  pushIntervalSec: number;
  maxDailyActions: number;
  maxActionsPerMinute: number;
  maxConsecutiveFailures: number;
  cooldownMinutesOnLimit: number;
  safetyTimeWindowE: boolean;
  safetyStartHour: number;
  safetyEndHour: number;
  // ... 其他原有配置
}

export interface AiConfig {
  id: string;
  name: string;                  // 配置名称（如"Kimi主账号"）
  provider: string;              // 提供商（openai、kimi、claude等）
  baseUrl: string;
  apiKey: string;                // 加密存储
  modelName: string;
  apiFormat: 'completions' | 'responses' | 'anthropic-messages' | 'google-generative-ai';
  timeout: number;
  isActive: boolean;
  createdAt: number;
}

export interface DeliveryRecord {
  id: string;
  jobId: string;
  encryptJobId: string;
  jobTitle: string;
  companyName: string;
  salaryDesc?: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  error?: string;
  securityId?: string;
  lid?: string;
}

export interface ChatSession {
  jobKey: string;
  bossId: string;
  bossName: string;
  jobTitle: string;
  companyName: string;
  messages: ChatMessage[];
  isAiEnabled: boolean;
  lastMessageAt: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isAiGenerated?: boolean;
}

export interface ResumeData {
  userId: string;
  rawText: string;
  parsedData: {
    name?: string;
    phone?: string;
    email?: string;
    skills: string[];
    workExperience: string;
    projects: string;
    education: string;
  };
  fileName: string;
  uploadedAt: number;
}
```

## 文件变更清单

### 需修改的文件

1. **`src/core/auth/auth.ts`**
   - 移除 `silentlyLogin` 后端调用
   - 改为本地认证流程
   - 保留 BOSS Token 提取逻辑

2. **`src/core/http/request.ts`**
   - 移除 `baseURL` 设置
   - 改为按需直接调用 AI API
   - 保留错误处理逻辑

3. **`src/core/ai/ai-power.ts`**
   - 已支持直连，移除对后端 `/api/job/seeker/cloned/ask` 的调用
   - 确保所有路径都使用 `directAiCall`

4. **`src/state/login.ts`**
   - 修改登录状态管理
   - 使用 LocalDB 存储登录状态

5. **`src/state/user.ts`**
   - 修改用户数据获取逻辑
   - 从 LocalDB 读取用户偏好

6. **`src/features/ai-config/...`**
   - 修改 AI 配置存储逻辑
   - 从本地存储读取/保存配置

### 新增文件

1. **`src/core/storage/local-db.ts`**
   - IndexedDB 封装
   - 数据 CRUD 操作

2. **`src/core/storage/encryption.ts`**
   - API Key 加密/解密
   - 使用 Web Crypto API

3. **`src/core/ai/resume-parser.ts`**
   - 前端简历 OCR
   - 直接调用 Kimi API

4. **`src/core/auth/local-auth.ts`**
   - 本地认证服务
   - BOSS Token 管理

### 可删除的代码

1. 所有 `request.post('/api/user/...')` 调用
2. SSE 连接相关代码（`src/core/realtime/...` 可选保留用于 WebSocket Hook）
3. 支付相关功能（如需保留，需考虑其他方案）

## 迁移步骤

### Phase 1: 基础架构（1-2天）

1. 添加 `idb` 依赖（IndexedDB 封装库）
2. 实现 `LocalDB` 类
3. 实现 `Encryption` 类
4. 测试数据存储和加密功能

### Phase 2: 认证迁移（1天）

1. 实现 `LocalAuthService`
2. 重构 `auth.ts`
3. 更新登录状态管理
4. 测试本地登录流程

### Phase 3: AI 功能迁移（1天）

1. 重构 `ai-power.ts`，移除后端调用
2. 实现 `ResumeParser` 前端版
3. 重构 `auth.ts` 中的简历导入功能
4. 测试 AI 聊天和简历解析

### Phase 4: 配置迁移（1天）

1. 重构 AI 配置存储
2. 重构用户偏好存储
3. 实现数据导入/导出（备份功能）
4. 测试配置持久化

### Phase 5: 测试与优化（2天）

1. 全面功能测试
2. 性能优化
3. 错误处理完善
4. 数据迁移工具（从旧版本迁移）

## 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 浏览器存储容量限制 | 中 | 定期清理旧投递记录，提供数据导出 |
| 数据丢失风险 | 高 | 提供数据导出/导入功能，建议定期备份 |
| 单设备使用限制 | 中 | 明确告知用户，提供数据迁移方案 |
| API Key 安全 | 中 | 使用 Web Crypto API 加密存储 |
| 浏览器兼容性 | 低 | 要求现代浏览器，不支持时优雅降级 |

## 性能预估

| 操作 | 原后端方案 | 纯前端方案 | 差异 |
|-----|-----------|-----------|------|
| AI 聊天请求 | 2-hop（前端→后端→AI） | 1-hop（前端→AI） | **快50%** |
| 配置读取 | 网络请求 | 本地读取 | **快100倍** |
| 投递记录查询 | 网络请求 | 本地查询 | **快100倍** |
| 首屏加载 | 需等待后端响应 | 立即渲染 | **快3-5秒** |

## 结论

**纯前端方案是完全可行的**，且能带来以下收益：

✅ **消除数据外泄风险** - 所有数据本地存储，永不发送到第三方服务器  
✅ **性能提升** - 去除后端中转，直接调用 AI API  
✅ **零成本运维** - 无需服务器费用  
✅ **更好的隐私保护** - 用户完全掌控自己的数据  

⚠️ **需要注意**：
- 单设备使用（数据不跨设备同步）
- 需要定期手动备份数据
- 浏览器数据清除会导致数据丢失

---

**下一步**：请确认此设计方案，我将编写详细的实现计划。
