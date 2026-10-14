import { APP_BASE_PATH } from '../config/base-path.ts';
import type { BuildInfo } from './build-info.ts';

/** The deployed build, or `null` when it cannot be read (offline, dev, old server). */
export async function fetchDeployedBuild(): Promise<BuildInfo | null> {
  try {
    const response = await fetch(`${APP_BASE_PATH}version.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<BuildInfo>;
    return typeof body.revision === 'string' &&
      (body.version === null || typeof body.version === 'string') &&
      (body.committedAt === null || typeof body.committedAt === 'string') &&
      typeof body.builtAt === 'string'
      ? (body as BuildInfo)
      : null;
  } catch {
    return null;
  }
}

/**
 * Reloads onto the deployed build. The worker activates a new version as soon
 * as it installs, so this asks it to look, waits briefly for the switch, and
 * reloads either way.
 */
export async function reloadToLatest(
  reload: () => void = () => {
    window.location.reload();
  },
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  let removeListener: () => void = () => undefined;
  try {
    const update = async () => {
      if (!('serviceWorker' in navigator)) return;
      const worker = navigator.serviceWorker;
      const registration = await worker.getRegistration();
      if (finished || registration === undefined) return;
      const switched = new Promise<void>((resolve) => {
        const onChange = () => {
          resolve();
        };
        worker.addEventListener('controllerchange', onChange);
        removeListener = () => {
          worker.removeEventListener('controllerchange', onChange);
        };
      });
      await registration.update();
      if (registration.installing !== null || registration.waiting !== null)
        await switched;
    };
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 5000);
    });
    await Promise.race([update(), deadline]);
  } catch {
    // Reload still recovers the shell when service-worker inspection fails.
  } finally {
    finished = true;
    clearTimeout(timer);
    removeListener();
    reload();
  }
}
