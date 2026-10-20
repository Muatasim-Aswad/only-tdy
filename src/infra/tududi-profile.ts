import { createTududiClient, type TududiClient } from './tududi-client.ts';

export interface TududiProfile {
  readonly uid: string;
  readonly uiSettings: Readonly<Record<string, unknown>>;
}

export interface ProfileStorage {
  readonly read: () => Promise<TududiProfile>;
  readonly write: (
    uiSettings: Readonly<Record<string, unknown>>,
  ) => Promise<TududiProfile>;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function profile(value: unknown): TududiProfile {
  if (!isObject(value) || typeof value.uid !== 'string' || value.uid === '') {
    throw new Error('Tududi returned no account identifier.');
  }
  let settings: unknown = value.ui_settings;
  if (typeof settings === 'string') settings = JSON.parse(settings);
  if (settings !== undefined && settings !== null && !isObject(settings)) {
    throw new Error('Tududi returned invalid UI settings.');
  }
  return { uid: value.uid, uiSettings: settings ?? {} };
}

export function createProfileStorage(
  client: TududiClient = createTududiClient(),
): ProfileStorage {
  return {
    read: async () => profile(await client.request('/api/profile')),
    write: async (uiSettings) =>
      profile(
        await client.mutate('/api/profile', 'PATCH', {
          ui_settings: uiSettings,
        }),
      ),
  };
}
