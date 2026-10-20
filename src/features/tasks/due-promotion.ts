import {
  readBrowserStorage,
  writeBrowserStorage,
} from '../../infra/browser-storage.ts';

const STORAGE_KEY = 'only-tdy:auto-due-promotion:v1';
const CHANGE_EVENT = 'only-tdy:due-promotion';
let unavailableChoice: boolean | undefined;

export function readDuePromotion(): boolean {
  return unavailableChoice ?? readBrowserStorage(STORAGE_KEY) !== 'off';
}

export function setDuePromotion(enabled: boolean): void {
  unavailableChoice = writeBrowserStorage(STORAGE_KEY, enabled ? 'on' : 'off')
    ? undefined
    : enabled;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeDuePromotion(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
