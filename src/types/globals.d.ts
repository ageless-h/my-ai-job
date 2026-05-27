/// <reference types="vite/client" />

declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
declare function GM_setValue<T = unknown>(key: string, value: T): void;
declare function GM_deleteValue(key: string): void;
declare function GM_addValueChangeListener(
  key: string,
  callback: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void
): number;
declare function GM_notification(options: {
  title?: string;
  text: string;
  timeout?: number;
  onclick?: () => void;
}): void;
declare function GM_xmlhttpRequest(options: Record<string, unknown>): unknown;

// pdf.js loaded via @require from CDN in production build
declare const pdfjsLib: {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer } | { url: string } | Record<string, unknown>) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string; [key: string]: unknown }>;
        }>;
      }>;
    }>;
  };
} | undefined;

declare module 'vitest' {
  export interface VitestMatcher {
    toBe: (...args: unknown[]) => VitestMatcher;
    toEqual: (...args: unknown[]) => VitestMatcher;
    toBeDefined: (...args: unknown[]) => VitestMatcher;
    toBeUndefined: (...args: unknown[]) => VitestMatcher;
    toBeNull: (...args: unknown[]) => VitestMatcher;
    toBeTruthy: (...args: unknown[]) => VitestMatcher;
    toBeFalsy: (...args: unknown[]) => VitestMatcher;
    toContain: (...args: unknown[]) => VitestMatcher;
    toHaveLength: (...args: unknown[]) => VitestMatcher;
    toHaveBeenCalled: (...args: unknown[]) => VitestMatcher;
    toHaveBeenCalledWith: (...args: unknown[]) => VitestMatcher;
    toHaveBeenCalledTimes: (...args: unknown[]) => VitestMatcher;
    toBeInstanceOf: (...args: unknown[]) => VitestMatcher;
    toThrow: (...args: unknown[]) => VitestMatcher;
    rejects: VitestMatcher;
    resolves: VitestMatcher;
    not: VitestMatcher;
    [key: string]: unknown;
  }

  export type TestCallback = () => unknown | Promise<unknown>;

  export function describe(name: string, fn: TestCallback): void;
  export function it(name: string, fn: TestCallback): void;
  export const test: typeof it;
  export function beforeEach(fn: TestCallback): void;
  export function afterEach(fn: TestCallback): void;
  export function beforeAll(fn: TestCallback): void;
  export function afterAll(fn: TestCallback): void;

  type ExpectStatic = {
    any: (ctor: unknown) => unknown;
    stringContaining: (text: string) => unknown;
    objectContaining: (value: Record<string, unknown>) => unknown;
    [key: string]: (...args: unknown[]) => unknown;
  };

  export const expect: ((actual: unknown) => VitestMatcher) & ExpectStatic;

  export type MockFunction<
    T extends (...args: never[]) => unknown = (...args: never[]) => unknown,
  > = T & {
    mockImplementation: (impl: (...args: never[]) => unknown) => MockFunction<T>;
    mockReturnValue: (value: unknown) => MockFunction<T>;
    mockResolvedValue: (value: unknown) => MockFunction<T>;
    mockResolvedValueOnce: (value: unknown) => MockFunction<T>;
    mockRejectedValue: (value: unknown) => MockFunction<T>;
    mockRejectedValueOnce: (value: unknown) => MockFunction<T>;
    mockReset: () => void;
    mockClear: () => void;
    mock: {
      calls: unknown[][];
      results: Array<{ type: string; value: unknown }>;
    };
  };

  export const vi: {
    fn: <T extends (...args: never[]) => unknown = (...args: never[]) => unknown>(
      impl?: T
    ) => MockFunction<T>;
    spyOn: <T extends object, K extends keyof T>(
      obj: T,
      method: K
    ) => MockFunction<
      T[K] extends (...args: never[]) => unknown ? T[K] : (...args: never[]) => unknown
    >;
    mock: (moduleName: string, factory?: () => unknown) => void;
    hoisted: <T>(factory: () => T) => T;
    clearAllMocks: () => void;
    restoreAllMocks: () => void;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    advanceTimersByTime: (ms: number) => void;
    setSystemTime: (date: number | Date) => void;
    stubGlobal: (name: string, value: unknown) => void;
    unstubAllGlobals: () => void;
  };
}
