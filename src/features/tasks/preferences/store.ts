import { applyAccountLocale } from '../../../infra/locale.ts';
import {
  readBrowserStorage,
  writeBrowserStorage,
} from '../../../infra/browser-storage.ts';
import {
  createProfileStorage,
  isObject,
  type ProfileStorage,
} from '../../../infra/tududi-profile.ts';
import { applyTheme, readStoredTheme } from '../../../infra/theme.ts';
import { readDuePromotion, setDuePromotion } from '../due-promotion.ts';
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  preferenceChanges,
  preferences,
  type Preferences,
} from './model.ts';

const LAST_ACCOUNT_KEY = 'only-tdy:settings-account:v1';
const LEGACY_OWNER_KEY = 'only-tdy:settings-migration:v1';

export function settingsCacheKey(uid: string): string {
  return `only-tdy:settings:v1:${encodeURIComponent(window.location.origin)}:${encodeURIComponent(uid)}`;
}

interface CachedSettings {
  readonly settings: Preferences;
  readonly pending: Partial<Preferences>;
}

export interface PreferencesState {
  readonly settings: Preferences;
  readonly account: string | null;
  readonly status: 'loading' | 'synced' | 'saving' | 'local' | 'unavailable';
  readonly cached: boolean;
}

function readCache(uid: string): CachedSettings | undefined {
  try {
    const raw: unknown = JSON.parse(
      readBrowserStorage(settingsCacheKey(uid)) ?? 'null',
    );
    if (!isObject(raw) || !isObject(raw.settings)) return undefined;
    return {
      settings: preferences(raw.settings),
      pending: preferenceChanges(raw.pending),
    };
  } catch {
    return undefined;
  }
}

function legacySettings(): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    theme: readStoredTheme(),
    autoDuePromotion: readDuePromotion(),
    editorLayout:
      readBrowserStorage('only-tdy:editor-layout:v1') === 'compact'
        ? 'compact'
        : 'full',
  };
}

function reflectSettings(settings: Preferences): void {
  if (settings.locale !== null) applyAccountLocale(settings.locale);
  applyTheme(settings.theme);
  if (readDuePromotion() !== settings.autoDuePromotion) {
    setDuePromotion(settings.autoDuePromotion);
  }
  writeBrowserStorage('only-tdy:editor-layout:v1', settings.editorLayout);
}

export function createPreferencesStore(
  storage: ProfileStorage = createProfileStorage(),
) {
  let state: PreferencesState = {
    settings: DEFAULT_PREFERENCES,
    account: null,
    status: 'loading',
    cached: true,
  };
  let pending: Partial<Preferences> = {};
  let operation: Promise<void> | undefined;
  let generation = 0;
  let legacyOwner: string | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: PreferencesState) => {
    state = next;
    reflectSettings(state.settings);
    for (const listener of listeners) listener();
  };

  const cache = () => {
    if (state.account === null) return;
    const cached = writeBrowserStorage(
      settingsCacheKey(state.account),
      JSON.stringify({ settings: state.settings, pending }),
    );
    if (cached !== state.cached) {
      state = { ...state, cached };
      for (const listener of listeners) listener();
    }
  };

  const synchronize = async (run: number) => {
    try {
      for (;;) {
        const profile = await storage.read();
        if (run !== generation) return;
        const switched = state.account !== profile.uid;
        const saved = readCache(profile.uid);
        pending = switched
          ? (saved?.pending ?? {})
          : { ...saved?.pending, ...pending };
        if (switched) {
          state = {
            ...state,
            account: profile.uid,
            settings: saved?.settings ?? DEFAULT_PREFERENCES,
          };
        }
        writeBrowserStorage(LAST_ACCOUNT_KEY, profile.uid);
        const raw = profile.uiSettings.onlyTdy;
        if (raw !== undefined && raw !== null && !isObject(raw)) {
          throw new Error('Tududi returned invalid only-tdy settings.');
        }
        const owner = readBrowserStorage(LEGACY_OWNER_KEY) ?? legacyOwner;
        const fallback =
          saved?.settings ??
          (switched
            ? owner === null || owner === profile.uid
              ? legacySettings()
              : DEFAULT_PREFERENCES
            : state.settings);
        const settings =
          raw === undefined || raw === null ? fallback : preferences(raw);
        if (raw === undefined || raw === null)
          pending = { ...settings, ...pending };
        legacyOwner = owner ?? profile.uid;
        if (owner === null) writeBrowserStorage(LEGACY_OWNER_KEY, profile.uid);
        publish({
          ...state,
          account: profile.uid,
          settings: { ...settings, ...pending },
          status: Object.keys(pending).length === 0 ? 'synced' : 'saving',
        });
        cache();
        if (Object.keys(pending).length === 0) return;

        const sent = { ...pending };
        const namespace = {
          ...(isObject(raw) ? raw : {}),
          ...settings,
          ...sent,
        };
        const result = await storage.write({
          ...profile.uiSettings,
          onlyTdy: namespace,
        });
        if (run !== generation) return;
        if (result.uid !== profile.uid) {
          throw new Error('The Tududi account changed while saving settings.');
        }
        const stored = preferences(result.uiSettings.onlyTdy);
        if (
          !isObject(result.uiSettings.onlyTdy) ||
          PREFERENCE_KEYS.some((key) => stored[key] !== namespace[key])
        ) {
          throw new Error('Tududi did not retain the settings.');
        }
        pending = Object.fromEntries(
          Object.entries(pending).filter(
            ([key, value]) => sent[key as keyof Preferences] !== value,
          ),
        );
        publish({
          ...state,
          settings: { ...stored, ...pending },
          status: Object.keys(pending).length === 0 ? 'synced' : 'saving',
        });
        cache();
        if (Object.keys(pending).length === 0) return;
      }
    } catch {
      if (run !== generation) return;
      publish({
        ...state,
        status: state.account === null ? 'unavailable' : 'local',
      });
      cache();
    }
  };

  const sync = (): Promise<void> => {
    if (operation !== undefined) return operation;
    const run = generation;
    operation = synchronize(run).finally(() => {
      if (run === generation) {
        operation = undefined;
        // An effect can enqueue a preference after the last read resolves,
        // while this operation is still settling. Drain that late change too.
        if (state.status === 'saving' && Object.keys(pending).length > 0)
          void sync();
      }
    });
    return operation;
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start(verifiedAccount?: string) {
      const account = verifiedAccount ?? readBrowserStorage(LAST_ACCOUNT_KEY);
      const saved = account === null ? undefined : readCache(account);
      pending = saved?.pending ?? {};
      const owner = readBrowserStorage(LEGACY_OWNER_KEY);
      const fallback =
        verifiedAccount !== undefined &&
        owner !== null &&
        owner !== verifiedAccount
          ? DEFAULT_PREFERENCES
          : legacySettings();
      publish({
        settings: saved?.settings ?? fallback,
        account,
        status: 'loading',
        cached: true,
      });
      await sync();
    },
    sync,
    update(changes: Partial<Preferences>) {
      const valid = preferenceChanges(changes);
      pending = { ...pending, ...valid };
      publish({
        ...state,
        settings: { ...state.settings, ...valid },
        status: state.account === null ? 'unavailable' : 'saving',
      });
      cache();
      if (state.account !== null) void sync();
    },
    stop() {
      generation += 1;
      operation = undefined;
      pending = {};
      state = {
        settings: DEFAULT_PREFERENCES,
        account: null,
        status: 'loading',
        cached: true,
      };
    },
  };
}

export const preferencesStore = createPreferencesStore();
