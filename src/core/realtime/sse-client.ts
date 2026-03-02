// -*- coding: utf-8 -*-
import { EventSourcePolyfill } from "event-source-polyfill";

type OnMessageCallback = (event: MessageEvent) => void;

export class SSEClient {
  url: string;
  eventSource: EventSourcePolyfill | null;
  callbackList: OnMessageCallback[];

  constructor(url: string) {
    this.url = url;
    this.eventSource = null;
    this.callbackList = [];
  }

  start(): void {
    const authorization = localStorage.getItem("Authorization");
    this.eventSource = new EventSourcePolyfill(this.url, {
      withCredentials: true,
      // 5分钟超时(略小于nginx sse超时时间)
      heartbeatTimeout: 5 * 59 * 1e3,
      headers: {
        Authorization: authorization
      }
    });

    this.eventSource.onmessage = (event: MessageEvent) => {
      this.callbackList.forEach((callBackFunc) => callBackFunc(event));
    };

    this.eventSource.onerror = (_error: unknown) => {
      this.close();
    };
  }

  addEventListener(eventType: string, listener: (event: Event) => void): void {
    if (this.eventSource) {
      this.eventSource.addEventListener(eventType, listener);
    }
  }

  addOnMsgCallback(func: OnMessageCallback): void {
    this.callbackList.push(func);
  }

  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
