import { TaskProvider } from '../features/tasks/TaskProvider.tsx';
import { lazy, Suspense, useCallback, useState, type MouseEvent } from 'react';

import { routePath } from '../config/routes.ts';
import { UpdateToast } from './UpdateToast.tsx';

import { buildLabel, type BuildInfo } from '../infra/build-info.ts';
import { handleLinkNavigation, useRoute } from '../infra/navigation.ts';
const TaskListPage = lazy(() =>
  import('../features/tasks/TaskListPage.tsx').then((module) => ({
    default: module.TaskListPage,
  })),
);

const BacklogPage = lazy(() =>
  import('../features/tasks/BacklogPage.tsx').then((module) => ({
    default: module.BacklogPage,
  })),
);

const TaskDetailPage = lazy(() =>
  import('../features/tasks/TaskDetailPage.tsx').then((module) => ({
    default: module.TaskDetailPage,
  })),
);

const GuidePage = lazy(() =>
  import('../features/tasks/GuidePage.tsx').then((module) => ({
    default: module.GuidePage,
  })),
);

const VersionPage = lazy(() =>
  import('./VersionPage.tsx').then((module) => ({
    default: module.VersionPage,
  })),
);

const SettingsPage = lazy(() =>
  import('../features/tasks/SettingsPage.tsx').then((module) => ({
    default: module.SettingsPage,
  })),
);

const VERSION_PATH = routePath({ kind: 'version' });

export interface AppProps {
  /** A build this device has not run before, announced once over any page. */
  readonly updateNotice?: BuildInfo | null;
}

/** The page the address is on, with the once-per-build update notice above it. */
export function App({ updateNotice = null }: AppProps) {
  const [notice, setNotice] = useState(updateNotice);
  const dismissNotice = useCallback(() => {
    setNotice(null);
  }, []);
  const openVersion = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    handleLinkNavigation(event, VERSION_PATH);
  }, []);

  return (
    <TaskProvider>
      <Page />
      <UpdateToast
        label={notice === null ? undefined : buildLabel(notice)}
        href={VERSION_PATH}
        onOpen={openVersion}
        onDismiss={dismissNotice}
      />
    </TaskProvider>
  );
}

function Page() {
  const route = useRoute();

  if (route.kind === 'settings') {
    return (
      <Suspense fallback={null}>
        <SettingsPage />
      </Suspense>
    );
  }

  if (route.kind === 'task') {
    return (
      <Suspense
        fallback={
          <main className="focus-shell">
            <div className="focus-listing" aria-live="polite">
              Loading task…
            </div>
          </main>
        }
      >
        <TaskDetailPage key={route.uid} uid={route.uid} />
      </Suspense>
    );
  }

  if (route.kind === 'backlog') {
    return (
      <Suspense
        fallback={
          <main className="focus-shell">
            <div className="focus-listing" aria-live="polite">
              Loading tasks…
            </div>
          </main>
        }
      >
        <BacklogPage />
      </Suspense>
    );
  }

  if (route.kind === 'version') {
    return (
      <Suspense
        fallback={
          <main className="focus-shell">
            <div className="focus-listing" aria-live="polite">
              Loading…
            </div>
          </main>
        }
      >
        <VersionPage />
      </Suspense>
    );
  }

  if (route.kind === 'guide') {
    return (
      <Suspense
        fallback={
          <main className="focus-shell">
            <div className="focus-listing" aria-live="polite">
              Loading…
            </div>
          </main>
        }
      >
        <GuidePage />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="focus-shell">
          <div className="focus-listing" aria-live="polite">
            Loading tasks…
          </div>
        </main>
      }
    >
      <TaskListPage
        key={route.kind}
        view={
          route.kind === 'history' || route.kind === 'all'
            ? route.kind
            : 'tasks'
        }
      />
    </Suspense>
  );
}
