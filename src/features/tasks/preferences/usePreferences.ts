import { useSyncExternalStore } from 'react';

import { preferencesStore } from './store.ts';

export function usePreferences() {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
  );
}
