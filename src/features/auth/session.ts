import { createContext, useContext } from 'react';

export const AuthSession = createContext<{
  readonly uid: string | null;
  readonly signOut: () => Promise<void>;
} | null>(null);

/** Optional outside the app shell, including standalone task previews. */
export function useAuthSession() {
  return useContext(AuthSession);
}
