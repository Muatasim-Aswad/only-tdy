import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProfileStorage,
  TududiProfile,
} from '../../../infra/tududi-profile.ts';
import { DEFAULT_PREFERENCES } from './model.ts';
import { createPreferencesStore, settingsCacheKey } from './store.ts';

function backend(initial?: Record<string, unknown>) {
  let profile: TududiProfile = {
    uid: 'user-one',
    uiSettings: {
      project: { details: { showMetrics: false } },
      ...(initial === undefined ? {} : { onlyTdy: initial }),
    },
  };
  const storage = {
    read: vi.fn(() => Promise.resolve(structuredClone(profile))),
    write: vi.fn((uiSettings: TududiProfile['uiSettings']) => {
      profile = { ...profile, uiSettings };
      return Promise.resolve(structuredClone(profile));
    }),
  } satisfies ProfileStorage;
  return {
    storage,
    store: createPreferencesStore(storage),
    getProfile: () => profile,
    replace: (next: TududiProfile) => {
      profile = next;
    },
  };
}

function browserCopy(uid = 'user-one') {
  return JSON.parse(localStorage.getItem(settingsCacheKey(uid)) ?? '{}') as {
    settings: Record<string, unknown>;
    pending: Record<string, unknown>;
  };
}

function cached(uid: string, settings: object, pending: object = {}) {
  localStorage.setItem(
    settingsCacheKey(uid),
    JSON.stringify({ settings, pending }),
  );
  localStorage.setItem('only-tdy:settings-account:v1', uid);
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('account preferences', () => {
  it('prefers the server to the browser and refreshes the account cache', async () => {
    cached('user-one', { theme: 'dark', daysBeforeDue: 9 });
    const { store, storage } = backend({ theme: 'light', daysBeforeDue: 3 });
    await store.start();
    expect(store.getSnapshot().settings).toMatchObject({
      theme: 'light',
      daysBeforeDue: 3,
    });
    expect(browserCopy().settings.theme).toBe('light');
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('restores a missing server namespace from the scoped browser copy', async () => {
    cached('user-one', {
      ...DEFAULT_PREFERENCES,
      datedBacklog: 'before',
      daysBeforeDue: 5,
    });
    const { store, getProfile } = backend();
    await store.start();
    expect(getProfile().uiSettings).toEqual({
      project: { details: { showMetrics: false } },
      onlyTdy: {
        ...DEFAULT_PREFERENCES,
        datedBacklog: 'before',
        daysBeforeDue: 5,
      },
    });
    expect(store.getSnapshot().status).toBe('synced');
  });

  it('initializes both copies with neutral defaults when neither exists', async () => {
    const { store, getProfile } = backend();
    await store.start();
    expect(getProfile().uiSettings.onlyTdy).toEqual(DEFAULT_PREFERENCES);
    expect(browserCopy().settings).toEqual(DEFAULT_PREFERENCES);
  });

  it('migrates legacy choices once without copying them into a different account', async () => {
    localStorage.setItem('only-tdy:theme', 'dark');
    localStorage.setItem('only-tdy:auto-due-promotion:v1', 'off');
    localStorage.setItem('only-tdy:editor-layout:v1', 'compact');
    const { store, replace, getProfile } = backend();
    await store.start();
    expect(store.getSnapshot().settings).toMatchObject({
      theme: 'dark',
      autoDuePromotion: false,
      editorLayout: 'compact',
    });
    replace({ uid: 'user-two', uiSettings: {} });
    await store.sync();
    expect(store.getSnapshot().account).toBe('user-two');
    expect(getProfile().uiSettings.onlyTdy).toEqual(DEFAULT_PREFERENCES);
  });

  it('uses cached settings after a failed read without writing to the server', async () => {
    cached('user-one', { ...DEFAULT_PREFERENCES, theme: 'dark' });
    const { store, storage } = backend();
    storage.read.mockRejectedValue(new Error('offline'));
    await store.start();
    expect(store.getSnapshot()).toMatchObject({
      status: 'local',
      settings: { theme: 'dark' },
    });
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('does not invent an account when the first request fails', async () => {
    const { store, storage } = backend();
    storage.read.mockRejectedValue(new Error('offline'));
    await store.start();
    expect(store.getSnapshot()).toMatchObject({
      account: null,
      status: 'unavailable',
    });
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('retains failed changes across reloads and merges only pending fields into fresh server settings', async () => {
    const { store, storage, getProfile, replace } = backend({
      ...DEFAULT_PREFERENCES,
    });
    await store.start();
    storage.write.mockRejectedValueOnce(new Error('offline'));
    store.update({ datedBacklog: 'before' });
    await store.sync();
    expect(store.getSnapshot().status).toBe('local');
    replace({
      ...getProfile(),
      uiSettings: {
        project: { list: { showCompleted: true } },
        onlyTdy: {
          ...DEFAULT_PREFERENCES,
          theme: 'dark',
          daysBeforeDue: 7,
          futurePreference: 'keep',
        },
      },
    });
    store.stop();
    await store.start();
    expect(getProfile().uiSettings).toEqual({
      project: { list: { showCompleted: true } },
      onlyTdy: {
        ...DEFAULT_PREFERENCES,
        theme: 'dark',
        daysBeforeDue: 7,
        datedBacklog: 'before',
        futurePreference: 'keep',
      },
    });
    expect(store.getSnapshot().status).toBe('synced');
  });

  it('serializes saves and retains edits made while a save is in flight', async () => {
    const { store, storage } = backend({ ...DEFAULT_PREFERENCES });
    await store.start();
    let release!: () => void;
    storage.write.mockImplementationOnce(
      (uiSettings) =>
        new Promise((resolve) => {
          release = () => {
            resolve({ uid: 'user-one', uiSettings });
          };
        }),
    );
    store.update({ daysBeforeDue: 2 });
    await vi.waitFor(() => {
      expect(storage.write).toHaveBeenCalledOnce();
    });
    store.update({ daysBeforeDue: 4, theme: 'dark' });
    release();
    await store.sync();
    expect(store.getSnapshot()).toMatchObject({
      status: 'synced',
      settings: { daysBeforeDue: 4, theme: 'dark' },
    });
    expect(storage.write).toHaveBeenCalledTimes(2);
  });

  it('never sends one account’s pending edits to another account', async () => {
    const { store, storage, replace, getProfile } = backend({
      ...DEFAULT_PREFERENCES,
    });
    await store.start();
    storage.read.mockRejectedValueOnce(new Error('offline'));
    store.update({ datedBacklog: 'due' });
    await store.sync();
    replace({
      uid: 'user-two',
      uiSettings: { onlyTdy: { ...DEFAULT_PREFERENCES, theme: 'light' } },
    });
    await store.sync();
    expect(getProfile().uiSettings.onlyTdy).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'light',
    });
    expect(store.getSnapshot().settings.datedBacklog).toBe('always');
    expect(storage.write).not.toHaveBeenCalled();
    expect(browserCopy().pending).toEqual({ datedBacklog: 'due' });
  });

  it('saves explicit defaults on reset so another browser cannot resurrect old settings', async () => {
    const { store, getProfile } = backend({
      ...DEFAULT_PREFERENCES,
      datedBacklog: 'due',
      theme: 'dark',
    });
    await store.start();
    store.update(DEFAULT_PREFERENCES);
    await store.sync();
    expect(getProfile().uiSettings.onlyTdy).toEqual(DEFAULT_PREFERENCES);
  });

  it('can save to the server when browser storage is blocked', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { store, getProfile } = backend({ ...DEFAULT_PREFERENCES });
    await store.start();
    store.update({ theme: 'dark' });
    await store.sync();
    expect(store.getSnapshot()).toMatchObject({
      status: 'synced',
      cached: false,
      settings: { theme: 'dark' },
    });
    expect(getProfile().uiSettings.onlyTdy).toMatchObject({ theme: 'dark' });
  });

  it('refuses malformed server data rather than treating it as a missing namespace', async () => {
    const { store, storage, replace } = backend();
    replace({ uid: 'user-one', uiSettings: { onlyTdy: 'invalid' } });
    await store.start();
    expect(store.getSnapshot().status).toBe('local');
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('does not copy session-only choices into another account when browser storage is blocked', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { store, replace, getProfile } = backend({
      ...DEFAULT_PREFERENCES,
      autoDuePromotion: false,
    });
    await store.start();
    replace({ uid: 'user-two', uiSettings: {} });
    await store.sync();
    expect(getProfile().uiSettings.onlyTdy).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps account caches separate even when the new account has malformed server settings', async () => {
    const { store, storage, replace } = backend({ ...DEFAULT_PREFERENCES });
    await store.start();
    storage.read.mockRejectedValueOnce(new Error('offline'));
    store.update({ datedBacklog: 'due' });
    await store.sync();
    cached(
      'user-two',
      { ...DEFAULT_PREFERENCES, theme: 'dark' },
      { theme: 'dark' },
    );
    replace({ uid: 'user-two', uiSettings: { onlyTdy: 'invalid' } });
    await store.sync();
    expect(store.getSnapshot()).toMatchObject({
      account: 'user-two',
      status: 'local',
      settings: { theme: 'dark' },
    });
    expect(browserCopy('user-one').pending).toEqual({ datedBacklog: 'due' });
    expect(browserCopy('user-two').pending).toEqual({ theme: 'dark' });
  });
});
