import { t } from './messages.ts';
import {
  Activity,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { PageShell } from '../../shared/PageShell.tsx';
import { changeSession, subscribeSessionExpiry } from '../../infra/session.ts';
import { currentAccount, passwordAuthEnabled, signOut } from './api.ts';
import { AuthSession } from './session.ts';
import { LoginScreen } from './LoginScreen.tsx';

/** Keeps a same-account draft mounted during reauthentication; isolates new accounts. */
export function AuthBoundary({ children }: { readonly children: ReactNode }) {
  const parentClient = useQueryClient();
  const [account, setAccount] = useState<{
    uid: string;
    client: QueryClient;
  } | null>(null);
  const [status, setStatus] = useState<
    'checking' | 'signed-in' | 'signed-out' | 'failed'
  >('checking');
  const [enabled, setEnabled] = useState(true);
  const [expired, setExpired] = useState(false);
  const operation = useRef(0);
  const accountRef = useRef(account);
  // Updated in callbacks as well, so rapid requests cannot see a previous account.
  const accept = useCallback(
    (uid: string) => {
      operation.current += 1;
      changeSession();
      const previous = accountRef.current;
      if (previous?.uid === uid) {
        void previous.client.invalidateQueries();
      } else {
        previous?.client.clear();
        const next = {
          uid,
          client: new QueryClient({
            defaultOptions: parentClient.getDefaultOptions(),
          }),
        };
        accountRef.current = next;
        setAccount(next);
      }
      setStatus('signed-in');
      setExpired(false);
    },
    [parentClient],
  );

  const check = useCallback(async () => {
    const run = ++operation.current;
    try {
      const uid = await currentAccount();
      if (run !== operation.current) return;
      if (uid !== null) {
        if (accountRef.current?.uid !== uid) accept(uid);
        else setStatus('signed-in');
        return;
      }
      if (accountRef.current !== null) {
        setExpired(true);
        void accountRef.current.client.cancelQueries();
      }
      const passwordEnabled = await passwordAuthEnabled();
      if (run === operation.current) {
        setEnabled(passwordEnabled);
        setStatus('signed-out');
      }
    } catch {
      if (run === operation.current)
        setStatus((current) => (current === 'signed-in' ? current : 'failed'));
    }
  }, [accept]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void check();
    });
    const stop = subscribeSessionExpiry(() => {
      operation.current += 1;
      changeSession();
      void accountRef.current?.client.cancelQueries();
      setExpired(true);
      setStatus('signed-out');
      void passwordAuthEnabled().then(setEnabled, () => {
        /* Retry remains possible through the form. */
      });
    });
    const onFocus = () => {
      void check();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      operation.current += 1;
      stop();
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  const logout = useCallback(async () => {
    // Keep the account visible if the server could not end its session.
    await signOut();
    operation.current += 1;
    changeSession();
    const previous = accountRef.current;
    accountRef.current = null;
    setAccount(null);
    await previous?.client.cancelQueries();
    previous?.client.clear();
    setExpired(false);
    setStatus('signed-out');
  }, []);

  return (
    <AuthSession value={{ uid: account?.uid ?? null, signOut: logout }}>
      {account !== null && (
        <Activity mode={status === 'signed-in' ? 'visible' : 'hidden'}>
          <QueryClientProvider key={account.uid} client={account.client}>
            {children}
          </QueryClientProvider>
        </Activity>
      )}
      {status === 'signed-out' && (
        <LoginScreen enabled={enabled} expired={expired} onSignedIn={accept} />
      )}
      {status === 'checking' && (
        <PageShell>
          <p className="ps-rail text-muted" role="status">
            {t('authBoundary.connecting')}
          </p>
        </PageShell>
      )}
      {status === 'failed' && (
        <PageShell>
          <div className="ps-rail">
            <p role="alert">
              {t('authBoundary.couldNotConnectCheckYourConnection')}
            </p>
            <button
              type="button"
              className="min-h-11 text-accent"
              onClick={() => {
                setStatus('checking');
                void check();
              }}
            >
              {t('authBoundary.tryAgain')}
            </button>
          </div>
        </PageShell>
      )}
    </AuthSession>
  );
}
