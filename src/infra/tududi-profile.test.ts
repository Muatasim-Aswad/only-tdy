import { describe, expect, it, vi } from 'vitest';
import type { TududiClient } from './tududi-client.ts';
import { createProfileStorage } from './tududi-profile.ts';

function client(payload: unknown): TududiClient {
  return {
    request: vi.fn(() => Promise.resolve(payload)),
    mutate: vi.fn(() => Promise.resolve(payload)),
    clearCsrfToken: vi.fn(),
  };
}

describe('Tududi profile storage', () => {
  it('reads a stable account identity and accepts serialized UI JSON', async () => {
    const storage = createProfileStorage(
      client({
        uid: 'user-profile',
        ui_settings: JSON.stringify({ onlyTdy: { theme: 'dark' } }),
      }),
    );
    expect(await storage.read()).toEqual({
      uid: 'user-profile',
      uiSettings: { onlyTdy: { theme: 'dark' } },
    });
  });

  it('refuses missing identities and malformed JSON instead of using another account’s cache', async () => {
    for (const payload of [
      { ui_settings: {} },
      { uid: '', ui_settings: {} },
      { uid: 'user-profile', ui_settings: [] },
      { uid: 'user-profile', ui_settings: '{' },
    ]) {
      await expect(
        createProfileStorage(client(payload)).read(),
      ).rejects.toThrow();
    }
  });

  it('patches only UI settings and retains unrelated settings in the supplied object', async () => {
    const uiSettings = {
      project: { details: { showMetrics: false } },
      onlyTdy: { theme: 'dark' },
    };
    const transport = client({ uid: 'user-profile', ui_settings: uiSettings });
    await createProfileStorage(transport).write(uiSettings);
    expect(transport.mutate).toHaveBeenCalledExactlyOnceWith(
      '/api/profile',
      'PATCH',
      { ui_settings: uiSettings },
    );
  });
});
