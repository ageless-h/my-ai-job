// -*- coding: utf-8 -*-
declare module "event-source-polyfill" {
  export interface EventSourcePolyfillInit extends EventSourceInit {
    headers?: Record<string, string | null>;
    heartbeatTimeout?: number;
  }

  export class EventSourcePolyfill extends EventSource {
    constructor(url: string, eventSourceInitDict?: EventSourcePolyfillInit);
  }
}
