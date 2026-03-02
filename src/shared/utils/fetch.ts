// -*- coding: utf-8 -*-

import { Tools } from "@/shared/utils/tools";

declare const GM_xmlhttpRequest:
  | ((options: Record<string, unknown>) => unknown)
  | undefined;

const _GM_xmlhttpRequest =
  typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : undefined;

export interface FetchWithGMRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  responseType?: XMLHttpRequestResponseType;
  data?: string | FormData | Blob | ArrayBuffer | null;
}

export interface GMFetchResponse<T = unknown> {
  status: number;
  response: T;
  [key: string]: unknown;
}

export async function fetchWithGM_request<T = unknown>(
  url: string,
  options: FetchWithGMRequestOptions = {}
): Promise<GMFetchResponse<T>> {
  return new Promise((resolve, reject) => {
    if (!_GM_xmlhttpRequest) {
      reject(new Error("GM_xmlhttpRequest is not available"));
      return;
    }
    try {
      Tools.ensureAllowedNetworkUrl(url, "GM请求");
    } catch (error: any) {
      reject(error);
      return;
    }
    _GM_xmlhttpRequest({
      method: options.method || "GET",
      url,
      headers: options.headers,
      responseType: options.responseType || "json",
      data: options.data,
      onload: (response: GMFetchResponse<T>) => {
        if (response.status === 200) {
          resolve(response);
        } else {
          reject(new Error(`Request failed with status: ${response.status}`));
        }
      },
      onerror: () => {
        reject(new Error("Network error"));
      },
      ontimeout: () => {
        reject(new Error("Request timed out"));
      }
    });
  });
}
