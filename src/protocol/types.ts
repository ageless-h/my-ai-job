// -*- coding: utf-8 -*-

export interface ChatChannel {
  send(payload: unknown): void;
  client?: {
    isConnected?: () => boolean;
  };
}

export interface GeekChatCoreClient {
  client: {
    send(payload: unknown): void;
  };
}

export interface GeekChatCoreInstance {
  getClient(): GeekChatCoreClient;
}

export interface GeekChatCoreStatic {
  getInstance(): GeekChatCoreInstance;
}

export interface ChatRuntimeWindow extends Window {
  ChatWebsocket?: ChatChannel;
  ChatWebsocketImage?: ChatChannel;
  GeekChatCore?: GeekChatCoreStatic;
  [key: string]: unknown;
}

export interface MessageImagePayload {
  originImage: string;
  tinyImage: string;
}

export interface MessageConstructorOptions {
  form_uid: number | string;
  to_uid: number | string;
  to_name: string;
  content?: string;
  image?: MessageImagePayload;
}

export interface TechwolfUser {
  uid: number | string;
  source: number;
  name?: string;
}

export interface TechwolfImage {
  originImage: {
    url: string;
  };
  tinyImage: {
    url: string;
  };
}

export interface TechwolfMessageBody {
  type: number;
  templateId: number;
  text: string | null;
  image: TechwolfImage | Record<string, never>;
}

export interface TechwolfMessage {
  from: TechwolfUser;
  to: TechwolfUser;
  type: number;
  mid: string;
  time: string;
  body: TechwolfMessageBody;
  cmid: string;
}

export interface TechwolfChatProtocolPayload {
  messages: TechwolfMessage[];
  type: number;
}

export interface MessageReadConstructorOptions {
  userId: number;
  messageId: number;
}

export interface TechwolfMessageReadPayload {
  messageRead: Array<{
    messageId: number;
    readTime: number;
    userId: number;
    userSource: number;
  }>;
  type: number;
}
