/**
 * The proxy strips /only-tdy before forwarding to the static server. The
 * browser retains /only-tdy/, which is also the service-worker scope, so the
 * client canonicalizes the exact unslashed path before starting.
 * Legacy /focus/ links redirect to the equivalent current path.
 */

/** Base used by Vite, the manifest, the worker scope, and every emitted URL. */
export const APP_BASE_PATH = '/only-tdy/';

/** The single non-canonical pathname below the current base. */
export const APP_UNSLASHED_PATH = '/only-tdy';

/** The base the app was served from before it was renamed. */
export const LEGACY_BASE_PATH = '/focus/';

const LEGACY_UNSLASHED_PATH = '/focus';

/**
 * Returns the canonical URL for the exact `/only-tdy` pathname or any legacy
 * `/focus` address, otherwise `null`. `/only-tdy/`, `/only-tdy/anything`, and
 * unrelated paths are left alone so a proxy loop is impossible.
 */
export function canonicalAppUrl(
  pathname: string,
  search = '',
  hash = '',
): string | null {
  const rest = basePathRemainder(pathname);
  return rest === null ? null : `${APP_BASE_PATH}${rest}${search}${hash}`;
}

function basePathRemainder(pathname: string): string | null {
  if (pathname === APP_UNSLASHED_PATH || pathname === LEGACY_UNSLASHED_PATH)
    return '';
  if (pathname.startsWith(LEGACY_BASE_PATH))
    return pathname.slice(LEGACY_BASE_PATH.length);
  return null;
}

/**
 * Replaces the current history entry with the canonical URL when needed and
 * reports whether a redirect was issued. Call this before React initializes so
 * the app never renders under a non-canonical path.
 */
export function canonicalizeAppPath(
  location: Pick<Location, 'pathname' | 'search' | 'hash' | 'replace'>,
): boolean {
  const target = canonicalAppUrl(
    location.pathname,
    location.search,
    location.hash,
  );
  if (target === null) {
    return false;
  }
  location.replace(target);
  return true;
}
