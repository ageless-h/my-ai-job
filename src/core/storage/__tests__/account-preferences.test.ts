import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalDB } from '../local-db';
import type { UserPreferences } from '../types';

const row = (id: string, text: string) => ({ id, customGreeting: text }) as unknown as UserPreferences;
const seed = (id: string, text: string) => LocalDB.requireInitialized().put('preferences', row(id, text));

beforeEach(async () => { await LocalDB.init(); await LocalDB.clearAll(); });

describe('account-scoped preferences', () => {
  it('binds a matching default mirror to its owner even with an older account row', async () => {
    await seed('42', 'old');
    await seed('default', 'new');
    const mirror = { id: 42, preference: { customGreeting: 'new' } };
    expect(await LocalDB.getPreferences('99', mirror)).toBeUndefined();
    expect(await LocalDB.getPreferences('42', mirror)).toMatchObject({id: '42', customGreeting: 'new'});
    expect(await LocalDB.requireInitialized().get('preferences', 'default')).toBeUndefined();
    LocalDB.close(); await LocalDB.init();
    expect(await LocalDB.getPreferences('42')).toMatchObject({customGreeting: 'new'});
    expect(await LocalDB.getPreferences('99')).toBeUndefined();
  });

  it('keeps an ambiguous default on disk and never assigns it to another user', async () => {
    await seed('default', 'private');
    expect(await LocalDB.getPreferences('42')).toBeUndefined();
    expect(await LocalDB.getPreferences('99', {id:'99', preference:{customGreeting:'different'}})).toBeUndefined();
    expect(await LocalDB.requireInitialized().get('preferences', 'default')).toMatchObject({customGreeting:'private'});
  });

  it('uses the account key even when the payload contains a different owner, and keeps newer writes', async () => {
    await seed('default', 'old');
    await LocalDB.savePreferences('42', row('99', 'new'));
    expect(await LocalDB.getPreferences('42', {id:'42', preference:{customGreeting:'old'}})).toMatchObject({id:'42',customGreeting:'new'});
    expect(await LocalDB.getPreferences('99')).toBeUndefined();
    await expect(LocalDB.savePreferences('', row('99','missing owner'))).rejects.toThrow();
  });

  it('exports only the active profile preferences and upgrades a legacy backup using its own profile', async () => {
    const userProfile = {id:'42',token:'example',authenticatedAt:0};
    await seed('99','other');
    await LocalDB.importAllData({ userProfile, preferences:row('default','mine') });
    expect((await LocalDB.exportAllData()).preferences).toMatchObject({id:'42',customGreeting:'mine'});
    await expect(LocalDB.importAllData({userProfile,preferences:row('99','bad')})).rejects.toThrow();
    expect(await LocalDB.getPreferences('99')).toMatchObject({customGreeting:'other'});
  });
});
