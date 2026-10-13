import { readBrowserStorage, writeBrowserStorage } from './browser-storage.ts';

/**
 * Which build of only-tdy is running, which one is deployed, and the one-time
 * notice when the first changes.
 *
 * The running build is baked in by the `build-info` Vite plugin; the deployed
 * one is `version.json`, served beside the shell and never precached, so it
 * always answers for what the server has now.
 */

export interface BuildInfo {
  /** `package.json` version, when the app has one. */
  readonly version: string | null;
  /** Commit SHA, or `dev` for a build with unverified source identity. */
  readonly revision: string;
  /** Commit time, ISO 8601. */
  readonly committedAt: string | null;
  /** Build time, ISO 8601. */
  readonly builtAt: string;
}

declare const __BUILD_INFO__: BuildInfo;

export const RUNNING_BUILD: BuildInfo = __BUILD_INFO__;

/** Where the last revision this device ran is remembered. */
export const SEEN_REVISION_KEY = 'only-tdy:seen-revision';

/** Short enough to read aloud, long enough to find in `git log`. */
export function shortRevision(revision: string): string {
  return revision.slice(0, 7);
}

/** `0.1.0 · a1b2c3d`, or the revision alone when there is no version. */
export function buildLabel(build: BuildInfo): string {
  const revision = shortRevision(build.revision);
  return build.version === null ? revision : `${build.version} · ${revision}`;
}

/** One line in the console, so the running build is known without any UI. */
export function announceBuild(): void {
  console.info(
    `only-tdy ${buildLabel(RUNNING_BUILD)}, built ${RUNNING_BUILD.builtAt}`,
  );
}

/**
 * The running build when it differs from the last one this device ran, once.
 * A first visit only remembers it, and blocked storage says nothing.
 */
export function takeUpdateNotice(): BuildInfo | null {
  const seen = readBrowserStorage(SEEN_REVISION_KEY);
  const saved = writeBrowserStorage(SEEN_REVISION_KEY, RUNNING_BUILD.revision);
  return saved && seen !== null && seen !== RUNNING_BUILD.revision
    ? RUNNING_BUILD
    : null;
}
