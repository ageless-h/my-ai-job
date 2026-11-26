import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalDB } from '../local-db';
import { SecureLocalDB } from '../secure-local-db';
import type { AiConfig, ResumeData } from '../types';

vi.stubGlobal('window', {});
const gm = new Map<string, unknown>();
const ls = new Map<string, string>();
let failDelete = false;
vi.stubGlobal('GM_getValue', (k: string, fallback: unknown) => gm.get(k) ?? fallback);
vi.stubGlobal('GM_setValue', (k: string, v: unknown) => gm.set(k,v));
vi.stubGlobal('GM_deleteValue', (k: string) => { if (!failDelete) gm.delete(k); });
vi.stubGlobal('GM_listValues', () => [...gm.keys()]);
vi.stubGlobal('localStorage', {
  get length() {return ls.size;}, key: (i: number) => [...ls.keys()][i],
  getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string,v: string) => ls.set(k,v), removeItem: (k: string) => ls.delete(k),
});
const {clearAllSensitiveData, hasResumeStorageConsent} = await import('@/shared/utils/sensitive-data-consent');
const {getActiveDirectConfig} = await import('@/core/ai/direct-ai-client');
const resume = (userId: string) => ({userId, rawText: userId+'-private', uploadedAt: 0, fileName:'t.txt', parsedData:{skills:[],workExperience:'',projects:'',education:''}} satisfies ResumeData);
const model = {id:'cfg',provider:'openai',name:'m',modelName:'test',baseUrl:'https://example.com/v1',apiKey:'synthetic',apiFormat:'completions',timeout:60,createdAt:0,isActive:true} satisfies AiConfig;
const profile = (id: string) => ({id,token:'',authenticatedAt:0});
beforeEach(async () => {
  gm.clear(); ls.clear(); failDelete=false;
  await LocalDB.init(); await LocalDB.clearAll(); await LocalDB.setUserProfile(profile('B'));
  await LocalDB.saveResume(resume('A')); await LocalDB.saveResume(resume('B'));
});
describe('full backup ownership and account cleanup', () => {
  it('exports the active account attachment even when another account sorts first', async () => {
    const exported = JSON.parse(await SecureLocalDB.exportEncryptedData());
    expect(exported.resumeData.userId).toBe('B');
    await LocalDB.clearUserProfile();
    expect((await LocalDB.exportAllData()).resumeData).toBeUndefined();
  });
  it('rejects mixed or foreign backups before altering current profile or global configs', async () => {
    for (const data of [{userProfile:profile('B'),resumeData:resume('A')},{userProfile:profile('A'),resumeData:resume('A')},{resumeData:resume('A')}]) {
      await expect(SecureLocalDB.importEncryptedData(JSON.stringify({...data,aiConfigs:[model]}))).rejects.toThrow('不一致');
    }
    expect(await LocalDB.getAiConfigs()).toEqual([]);
    expect((await LocalDB.getUserProfile())?.id).toBe('B');
    await SecureLocalDB.importEncryptedData(JSON.stringify({resumeData:{...resume('B'),rawText:'restore'}}));
    expect((await LocalDB.getResume('B'))?.rawText).toBe('restore');
    expect((await LocalDB.getResume('A'))?.rawText).toBe('A-private');
  });
  it('removes both active sources of model keys, cleans current profile mirrors, keeps other account and ordinary settings', async () => {
    for (const id of ['A','B']) await LocalDB.savePreferences(id,{deliveryProjects:'project', deliveryResume:{name:'cv',source:'local',text:'resume'},maxDailyActions:50});
    const backupConfig={apiConfigs:[{...model,status:1}],activeApiConfigId:'cfg'};
    gm.set('ai-job-ai-config-ext',JSON.stringify(backupConfig)); gm.set('ai-job-ai-config-key:cfg','runtime-key'); gm.set('ai-job-ai-config-key:orphan','old');
    ls.set('ai-job-ai-config-ext',JSON.stringify(backupConfig));
    gm.set('ai-job-user',JSON.stringify({id:'B',parsedResume:{projects:'private'},preference:{deliveryProjects:'private',pi:3}}));
    gm.set('ai-job-user_backup',JSON.stringify({id:'A', importedResume:{resumeText:'A-private'}}));
    gm.set('ai-job-sensitive-data-consent',JSON.stringify({version:2,apiKeyStorage:true,resumeAccounts:['A','B']}));
    expect(getActiveDirectConfig()?.apiKey).toBe('runtime-key');
    await LocalDB.saveAiConfig(model);
    await clearAllSensitiveData('B');
    expect(await LocalDB.getResume('B')).toBeUndefined();expect((await LocalDB.getResume('A'))?.rawText).toBe('A-private');
    expect(await LocalDB.getPreferences('B')).toEqual({id:'B',accountScoped:true,maxDailyActions:50});expect((await LocalDB.getPreferences('A'))?.deliveryProjects).toBe('project');
    expect(await SecureLocalDB.getActiveAiConfig()).toEqual({...model,apiKey:''});expect(getActiveDirectConfig()).toBeNull();
    expect(JSON.parse(String(gm.get('ai-job-user')))).toEqual({id:'B', preference:{pi:3}});expect(String(gm.get('ai-job-user_backup'))).toContain('A-private');
    expect(gm.has('ai-job-ai-config-key:orphan')).toBe(false);expect(ls.get('ai-job-ai-config-ext')).not.toContain('synthetic');
    expect(hasResumeStorageConsent('A')).toBe(true);expect(hasResumeStorageConsent('B')).toBe(false);
  });
  it('reports a partial failure and supports a second cleanup', async () => {
    gm.set('ai-job-ai-config-key:orphan','old');failDelete=true;
    await expect(clearAllSensitiveData('B')).rejects.toThrow('部分数据已清除');failDelete=false;
    await clearAllSensitiveData('B');expect(gm.has('ai-job-ai-config-key:orphan')).toBe(false);
  });
});
