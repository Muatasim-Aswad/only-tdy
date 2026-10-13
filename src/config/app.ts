/** Fixed identity and outbound links shared by the shell, manifest, and worker. */

import { APP_BASE_PATH } from './base-path.ts';

export const APP_NAME = 'only-tdy';
export const APP_SHORT_NAME = 'only-tdy';

/** Install identity: id, start URL, and worker scope are all the base path. */
export const APP_ID = APP_BASE_PATH;
export const APP_START_URL = APP_BASE_PATH;
export const APP_SCOPE = APP_BASE_PATH;

/** Cache Storage namespace prefix, so only-tdy never claims a Tududi cache. */
export const CACHE_PREFIX = 'only-tdy-';

/** Cache Storage namespace used before the rename; the worker deletes it. */
export const LEGACY_CACHE_PREFIX = 'td-focused-';

/**
 * Tasks per request. Today, Backlog and Completed keep one page; the All
 * view reads the remaining pages so hidden and older tasks are reachable.
 */
export const TASK_PAGE_LIMIT = 50;

/** Same-origin Tududi destinations. only-tdy never collects credentials itself. */
export const TUDUDI_TODAY_PATH = '/today';
export const TUDUDI_LOGIN_PATH = '/login';

/** Browser theme colour per scheme; mirrors the --canvas token. */
export const THEME_COLOR_LIGHT = '#F4F6F5';
export const THEME_COLOR_DARK = '#151A17';
