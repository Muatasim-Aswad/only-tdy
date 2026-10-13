import {
  readBrowserStorage,
  writeBrowserStorage,
} from '../../infra/browser-storage.ts';

const STORAGE_KEY = 'only-tdy:auto-due-promotion:v1';
const CHANGE_EVENT = 'only-tdy:due-promotion';
let unavailableChoice = false;

export function readDuePromotion(): boolean {
  return readBrowserStorage(STORAGE_KEY) === 'on' || unavailableChoice;
}

export function setDuePromotion(enabled: boolean): void {
  unavailableChoice =
    !writeBrowserStorage(STORAGE_KEY, enabled ? 'on' : null) && enabled;
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
