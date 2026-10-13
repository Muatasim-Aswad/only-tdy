import { PublicError } from '../shared/PublicError.ts';

export type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type TududiErrorKind =
  | 'unauthorized'
  | 'not-found'
  | 'validation'
  | 'csrf'
  | 'http'
  | 'timeout'
  | 'network';

export class TududiApiError extends PublicError {
  constructor(
    readonly status: number,
    readonly kind: TududiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'TududiApiError';
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof TududiApiError && error.kind === 'unauthorized';
}

export function isNotFound(error: unknown): boolean {
  return error instanceof TududiApiError && error.kind === 'not-found';
}

function responseError(status: number): TududiApiError {
  if (status === 401)
    return new TududiApiError(
      status,
      'unauthorized',
      'Your Tududi session expired.',
    );
  if (status === 404)
    return new TududiApiError(status, 'not-found', 'That task is gone.');
  if (status === 400 || status === 422)
    return new TududiApiError(
      status,
      'validation',
      'Tududi could not accept this change. Check the fields and try again.',
    );
  if (status === 403)
    return new TududiApiError(
      status,
      'csrf',
      'Your session could not verify this change. Reload and try again.',
    );
  return new TududiApiError(
    status,
    'http',
    'Tududi could not complete the request. Try again.',
  );
}

export interface TududiClient {
  readonly request: (path: string, init?: RequestInit) => Promise<unknown>;
  readonly mutate: (
    path: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ) => Promise<unknown>;
  readonly clearCsrfToken: () => void;
}

export function createTududiClient(
  fetcher: Fetch = (input, init) => globalThis.fetch(input, init),
  timeoutMs = 15_000,
): TududiClient {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('Request timeout must be positive.');
  let token: string | null = null;
  let inFlight: Promise<string> | null = null;
  let generation = 0;

  const request = async (
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> => {
    if (
      !path.startsWith('/api/') ||
      /[\\#]/.test(path) ||
      !new URL(path, 'https://only-tdy.invalid').pathname.startsWith('/api/')
    )
      throw new Error('Tududi requires a same-origin /api/ path.');
    const controller = new AbortController();
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new TududiApiError(
            0,
            'timeout',
            'Request timed out. Refresh before retrying a change.',
          ),
        );
        controller.abort();
      }, timeoutMs);
    });
    const send = async (): Promise<unknown> => {
      const response = await fetcher(path, {
        ...init,
        credentials: 'include',
        headers,
        signal:
          init.signal == null
            ? controller.signal
            : AbortSignal.any([init.signal, controller.signal]),
      });
      if (!response.ok) throw responseError(response.status);
      const text = await response.text();
      if (text === '') return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new PublicError(
          'Tududi returned an unreadable response. Refresh before retrying a change.',
        );
      }
    };
    try {
      return await Promise.race([send(), timeout]);
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new TududiApiError(
        0,
        'network',
        'Could not reach Tududi. Refresh before retrying a change.',
      );
    } finally {
      clearTimeout(timer);
    }
  };

  const clearCsrfToken = () => {
    generation += 1;
    token = null;
    inFlight = null;
  };
  const getToken = (): Promise<string> => {
    if (token !== null) return Promise.resolve(token);
    if (inFlight !== null) return inFlight;
    const requestedGeneration = generation;
    const pending = request('/api/csrf-token')
      .then((payload) => {
        if (
          typeof payload !== 'object' ||
          payload === null ||
          !('csrfToken' in payload) ||
          typeof payload.csrfToken !== 'string' ||
          payload.csrfToken === ''
        ) {
          throw new PublicError(
            'Your session could not verify this change. Reload and try again.',
          );
        }
        if (requestedGeneration === generation) token = payload.csrfToken;
        return payload.csrfToken;
      })
      .finally(() => {
        if (inFlight === pending) inFlight = null;
      });
    inFlight = pending;
    return pending;
  };
  const mutate: TududiClient['mutate'] = async (path, method, body) => {
    const send = async () =>
      request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': await getToken(),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    try {
      return await send();
    } catch (error) {
      if (!(error instanceof TududiApiError) || error.kind !== 'csrf')
        throw error;
      clearCsrfToken();
      return send();
    }
  };
  return { request, mutate, clearCsrfToken };
}
