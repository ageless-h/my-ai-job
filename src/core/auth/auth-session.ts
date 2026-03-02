// -*- coding: utf-8 -*-

const AUTH_STORAGE_KEY = "ai-job-auth-state";
const LEGACY_AUTH_KEY = "Authorization";
const DEFAULT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

type AuthState = {
  token: string;
  issuedAt: number;
  expiresAt: number;
};

let memoryState: AuthState | null = null;

function parseAuthState(raw: string | null): AuthState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    const token = `${parsed.token || ""}`;
    const issuedAt = Number(parsed.issuedAt || 0);
    const expiresAt = Number(parsed.expiresAt || 0);
    if (!token || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
      return null;
    }

    return {
      token,
      issuedAt,
      expiresAt
    };
  } catch (_e) {
    return null;
  }
}

function loadFromSessionStorage(): AuthState | null {
  try {
    return parseAuthState(sessionStorage.getItem(AUTH_STORAGE_KEY));
  } catch (_e) {
    return null;
  }
}

function persistToSessionStorage(state: AuthState | null): void {
  try {
    if (!state) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(LEGACY_AUTH_KEY);
      return;
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_AUTH_KEY);
  } catch (_e) {
    // ignore storage failures
  }
}

function migrateLegacyTokenIfAny(): string {
  try {
    const legacyToken = `${localStorage.getItem(LEGACY_AUTH_KEY) || ""}`;
    if (!legacyToken) {
      return "";
    }

    setAuthorizationToken(legacyToken, DEFAULT_TOKEN_TTL_MS);
    localStorage.removeItem(LEGACY_AUTH_KEY);
    return legacyToken;
  } catch (_e) {
    return "";
  }
}

export function setAuthorizationToken(token: string, ttlMs = DEFAULT_TOKEN_TTL_MS): void {
  const normalizedToken = `${token || ""}`.trim();
  if (!normalizedToken) {
    clearAuthorizationToken();
    return;
  }

  const now = Date.now();
  memoryState = {
    token: normalizedToken,
    issuedAt: now,
    expiresAt: now + Math.max(30_000, Number(ttlMs) || DEFAULT_TOKEN_TTL_MS)
  };
  persistToSessionStorage(memoryState);
}

export function getAuthorizationToken(): string {
  const now = Date.now();
  if (memoryState && memoryState.expiresAt > now) {
    return memoryState.token;
  }

  const storageState = loadFromSessionStorage();
  if (storageState && storageState.expiresAt > now) {
    memoryState = storageState;
    return storageState.token;
  }

  const legacyToken = migrateLegacyTokenIfAny();
  if (legacyToken) {
    return legacyToken;
  }

  clearAuthorizationToken();
  return "";
}

export function clearAuthorizationToken(): void {
  memoryState = null;
  persistToSessionStorage(null);
}
