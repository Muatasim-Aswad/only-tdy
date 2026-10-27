import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTududiClient, type Fetch } from './tududi-client.ts';
import { changeSession } from './session.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('Tududi transport safety', () => {
  it('rejects a previous account’s delayed response, including a stalled body', async () => {
    let finish!: (text: string) => void;
    const client = createTududiClient(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          new Promise<string>((resolve) => {
            finish = resolve;
          }),
      } as Response),
    );
    const result = client.request('/api/tasks');
    await Promise.resolve();
    changeSession();
    finish(JSON.stringify({ tasks: [{ name: 'Private previous task' }] }));
    await expect(result).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('fetches a fresh CSRF token after an account transition', async () => {
    let tokens = 0;
    const headers: string[] = [];
    const client = createTududiClient((path, init) => {
      if (path === '/api/csrf-token')
        return Promise.resolve(
          new Response(
            JSON.stringify({ csrfToken: `token-${String(++tokens)}` }),
          ),
        );
      headers.push(new Headers(init?.headers).get('x-csrf-token') ?? '');
      return Promise.resolve(new Response('{}'));
    });
    await client.mutate('/api/task', 'POST', {});
    changeSession();
    await client.mutate('/api/task', 'POST', {});
    expect(headers).toEqual(['token-1', 'token-2']);
  });
  it.each(['fetch', 'body'])(
    'bounds a stalled %s and aborts its request',
    async (stall) => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const fetcher: Fetch = (_input, init) => {
        signal = init?.signal;
        return stall === 'fetch'
          ? new Promise(() => undefined)
          : Promise.resolve({
              ok: true,
              text: () => new Promise<string>(() => undefined),
            } as Response);
      };
      const result = createTududiClient(fetcher, 25).request('/api/tasks');
      const rejected = expect(result).rejects.toMatchObject({
        kind: 'timeout',
      });
      await vi.advanceTimersByTimeAsync(25);
      await rejected;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('replaces backend payloads and network details with safe public errors', async () => {
    const backend = createTududiClient(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'private title and token' }), {
          status: 422,
        }),
      ),
    );
    await expect(backend.mutate('/api/task', 'POST', {})).rejects.toMatchObject(
      {
        message:
          'Tududi could not accept this change. Check the fields and try again.',
      },
    );
    const network = createTududiClient(() =>
      Promise.reject(new Error('private proxy address')),
    );
    await expect(network.request('/api/tasks')).rejects.toMatchObject({
      kind: 'network',
      message: 'Could not reach Tududi. Refresh before retrying a change.',
    });
  });

  it('does not retry a timed-out write whose outcome is unknown', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<Fetch>((input) =>
      input === '/api/csrf-token'
        ? Promise.resolve(
            new Response(JSON.stringify({ csrfToken: 'test-token' })),
          )
        : new Promise(() => undefined),
    );
    const result = createTududiClient(fetcher, 25).mutate(
      '/api/task',
      'POST',
      {},
    );
    const rejected = expect(result).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(25);
    await rejected;
    expect(
      fetcher.mock.calls.filter(([path]) => path === '/api/task'),
    ).toHaveLength(1);
  });
});
