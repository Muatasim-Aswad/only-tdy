import { describe, expect, it, vi } from 'vitest';

import { readBrowserStorage, writeBrowserStorage } from './browser-storage.ts';

describe('browser preferences', () => {
  it('tolerates a browser that refuses access to storage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(readBrowserStorage('preference')).toBeNull();
    expect(writeBrowserStorage('preference', 'on')).toBe(false);
    expect(writeBrowserStorage('preference', null)).toBe(false);
  });

  it('tolerates quota failure without retaining task data', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(writeBrowserStorage('preference', 'on')).toBe(false);
  });
});
