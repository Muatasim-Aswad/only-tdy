export function readBrowserStorage(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(
  key: string,
  value: string | null,
): boolean {
  try {
    if (value === null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
