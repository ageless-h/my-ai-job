import { stripAccountResume } from './resume-fields';

interface KeyStore {
  keys(): string[];
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

const prefix = 'ai-job-ai-config-key:';
const modelKeys = new Set(['ai-job-ai-config-ext', 'ai-job-ai-config-ext_backup', 'ai-job-ai-config-ext_corrupted_backup', 'ai-job-ai-config-ext_oversized_backup']);
const userKeys = new Set(['ai-job-user', 'ai-job-user_backup', 'ai-job-user-profile', 'ai-job-user-corrupted-backup', 'ai-job-user_corrupted_backup', 'ai-job-user_oversized_backup', 'ai-job-user-preference']);

function removeApiKeys(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'apiKey') delete (value as Record<string, unknown>)[key];
    else removeApiKeys(child);
  }
}

/** Work from stored bytes, not migrated runtime config (which can repopulate secrets). */
export function scrubMirrors(store: KeyStore, owner: string, isScriptStore: boolean): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.remove(key);
      if (store.read(key) != null) throw new Error('模型密钥删除失败');
      continue;
    }
    const model = modelKeys.has(key) || (isScriptStore && ['aiConfigs','apiConfigs'].includes(key));
    const user = userKeys.has(key) || (isScriptStore && ['user','preferences','preference'].includes(key));
    if (!model && !user) continue;
    const raw = store.read(key);
    if (raw == null || raw === '') continue;
    const prev = typeof raw === 'string' ? raw : JSON.stringify(raw);
    let data: Record<string, unknown>;
    try { data = JSON.parse(prev); }
    catch { throw new Error(`存储项 ${key} 无法解析，未能核实敏感字段`); }
    if (!data || typeof data !== 'object') continue;
    if (model) removeApiKeys(data);
    else if (String(data.id ?? data.userId ?? data.uid) === owner) stripAccountResume(data);
    const clean = JSON.stringify(data);
    if (prev === clean) continue;
    store.write(key, typeof raw === 'string' ? clean : data);
    const updated = store.read(key);
    if ((typeof updated === 'string' ? updated : JSON.stringify(updated)) !== clean) throw new Error(`无法清理 ${key}`);
  }
}
