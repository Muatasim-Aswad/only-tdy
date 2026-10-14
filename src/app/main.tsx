import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { preload } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import fontUrl from '../assets/fonts/AtkinsonHyperlegibleNext-Variable.woff2?url';
import { App } from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { announceBuild, takeUpdateNotice } from '../infra/build-info.ts';
import { canonicalizeAppPath } from '../config/base-path.ts';
import { canonicalRoutePath } from '../config/routes.ts';
import './styles.css';

preload(fontUrl, {
  as: 'font',
  type: 'font/woff2',
  crossOrigin: 'anonymous',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

registerSW({ immediate: true });
announceBuild();

if (!canonicalizeAppPath(window.location)) {
  /*
   * Now that only-tdy answers to more than one address, a link can arrive with a
   * trailing slash or point at a page that no longer exists. Correcting it
   * here, before React starts, means the app renders once at an address that
   * matches what it is showing — and leaves no entry behind for Back to
   * return to.
   */
  const canonical = canonicalRoutePath(window.location.pathname);
  if (canonical !== null) {
    window.history.replaceState(
      null,
      '',
      canonical + window.location.search + window.location.hash,
    );
  }

  const container = document.getElementById('root');
  if (container === null) {
    throw new Error(
      'only-tdy could not start: #root is missing from the document.',
    );
  }

  /* Read before rendering: the check also records this build as seen, so it
     must run exactly once, which a render under StrictMode does not. */
  const updateNotice = takeUpdateNotice();

  createRoot(container, { onCaughtError: () => undefined }).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App updateNotice={updateNotice} />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
