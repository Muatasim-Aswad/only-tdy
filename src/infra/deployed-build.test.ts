import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDeployedBuild, reloadToLatest } from './deployed-build.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('build recovery', () => {
  it('uses an uncached deployed identity check and rejects incomplete identity', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ revision: 'incomplete' })),
      );
    vi.stubGlobal('fetch', fetcher);
    expect(await fetchDeployedBuild()).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      '/only-tdy/version.json',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('reloads even if service-worker inspection fails', async () => {
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () => Promise.reject(new Error('Unavailable')),
      },
    });
    const reload = vi.fn();
    await reloadToLatest(reload);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('bounds a stalled worker update and removes the activation listener', async () => {
    vi.useFakeTimers();
    const removeEventListener = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () =>
          Promise.resolve({ update: () => new Promise(() => undefined) }),
        addEventListener: vi.fn(),
        removeEventListener,
      },
    });
    const reload = vi.fn();
    const result = reloadToLatest(reload);
    await vi.advanceTimersByTimeAsync(5000);
    await result;
    expect(reload).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function),
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});

it('does not attach a worker listener after the reload deadline', async () => {
  vi.useFakeTimers();
  let release: ((registration: object) => void) | undefined;
  const addEventListener = vi.fn();
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
      addEventListener,
      removeEventListener: vi.fn(),
    },
  });
  const reload = vi.fn();
  const result = reloadToLatest(reload);
  await vi.advanceTimersByTimeAsync(5000);
  await result;
  release?.({ update: vi.fn() });
  await Promise.resolve();
  expect(addEventListener).not.toHaveBeenCalled();
  expect(reload).toHaveBeenCalledOnce();
});
