export interface UserProfile {
  id: string;
  token: string;
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
  imMaxReloadPerDay: number;
  cleanerManualConfirmThreshold: number;
  autoContactMinIntervalSec: number;
  maxAutoMessagePerSession: number;
  maxAutoResumePerSession: number;
  chatMinReplyIntervalSec: number;
  chatMaxPerMinute: number;
  chatMaxSessionReplies: number;
  autoResumeMaxPerSession: number;
  acE: boolean;
  acW: boolean;
  acM: boolean;
  acY: boolean;
}

export interface AiConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isAiGenerated?: boolean;
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

export interface StorageExportData {
  userProfile?: UserProfile;
  preferences?: UserPreferences;
  aiConfigs: AiConfig[];
  deliveryRecords: DeliveryRecord[];
  chatSessions: ChatSession[];
  resumeData?: ResumeData;
}

export type StorageImportData = Partial<StorageExportData>;
