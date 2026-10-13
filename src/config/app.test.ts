import { describe, expect, it } from 'vitest';

import {
  APP_ID,
  APP_NAME,
  APP_SCOPE,
  APP_SHORT_NAME,
  APP_START_URL,
  CACHE_PREFIX,
  TASK_PAGE_LIMIT,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  TUDUDI_LOGIN_PATH,
  TUDUDI_TODAY_PATH,
} from './app.ts';
import { APP_BASE_PATH } from './base-path.ts';

describe('app identity', () => {
  it('uses the fixed install identity', () => {
    expect(APP_NAME).toBe('only-tdy');
    expect(APP_SHORT_NAME).toBe('only-tdy');
    expect([APP_ID, APP_START_URL, APP_SCOPE]).toEqual([
      APP_BASE_PATH,
      APP_BASE_PATH,
      APP_BASE_PATH,
    ]);
  });

  it('namespaces caches so Tududi caches are never claimed', () => {
    expect(CACHE_PREFIX).toBe('only-tdy-');
  });

  it('links to Tududi on the same origin', () => {
    expect(TUDUDI_TODAY_PATH).toBe('/today');
    expect(TUDUDI_LOGIN_PATH).toBe('/login');
  });

  it('caps a list at one page', () => {
    expect(TASK_PAGE_LIMIT).toBe(50);
  });

  it('exposes one theme colour per scheme', () => {
    expect(THEME_COLOR_LIGHT).not.toBe(THEME_COLOR_DARK);
    for (const colour of [THEME_COLOR_LIGHT, THEME_COLOR_DARK]) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
