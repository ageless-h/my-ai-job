// -*- coding: utf-8 -*-

export interface PushResultCounterRuntime {
  notMatchCount: number;
  successCount: number;
  onceSuccessCount: number;
  failCount: number;
  collectSuccessCount: number;
  collectFailCount: number;
  onceCollectSuccessCount: number;
  notMatchIncr: () => void;
  successIncr: () => void;
  failIncr: () => void;
  collectSuccessIncr: () => void;
  collectFailIncr: () => void;
  clearOnceSuccessCount: () => void;
  clearOnceCollectSuccessCount: () => void;
}

export interface RuntimeUserProfile {
  preference: Record<string, any>;
  [key: string]: any;
}

export interface RuntimeUserStore {
  user: RuntimeUserProfile;
  platformType?: number;
  preferenceLoadStatus?: "idle" | "loading" | "success" | "failed";
  preferenceLoadError?: string;
}

export interface PlatformRuntimeDeps {
  counter: PushResultCounterRuntime;
  userStore: RuntimeUserStore;
}
