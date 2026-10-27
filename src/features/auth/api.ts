import { PublicError } from '../../shared/PublicError.ts';

export type AuthFailure =
  'credentials' | 'unverified' | 'disabled' | 'limited' | 'connection';

export class AuthError extends PublicError {
  constructor(readonly reason: AuthFailure) {
    super(reason);
  }
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  try {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    const response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      if (response.status === 401) throw new AuthError('credentials');
      if (response.status === 429) throw new AuthError('limited');
      if (response.status === 403) {
        throw new AuthError(
          typeof data === 'object' &&
            data !== null &&
            'email_not_verified' in data &&
            data.email_not_verified === true
            ? 'unverified'
            : 'disabled',
        );
      }
      throw new AuthError('connection');
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data))
      throw new AuthError('connection');
    return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('connection');
  }
}

export async function currentAccount(): Promise<string | null> {
  const data = await request('/api/current_user');
  if (data.user === null) return null;
  const user = data.user;
  if (
    typeof user !== 'object' ||
    !('uid' in user) ||
    typeof user.uid !== 'string' ||
    user.uid === ''
  )
    throw new AuthError('connection');
  return user.uid;
}

export async function passwordAuthEnabled(): Promise<boolean> {
  const data = await request('/api/password-auth-status');
  if (typeof data.enabled !== 'boolean') throw new AuthError('connection');
  return data.enabled;
}

export async function signIn(email: string, password: string): Promise<string> {
  await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const uid = await currentAccount();
  if (uid === null) throw new AuthError('connection');
  return uid;
}

export async function signOut(): Promise<void> {
  await request('/api/logout');
}
