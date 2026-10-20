import { PageShell } from '../shared/PageShell.tsx';
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
const RepeatingPage = lazy(() =>
  import('../features/tasks/RepeatingPage.tsx').then((module) => ({
    default: module.RepeatingPage,
  })),
);
const RepeatingCreatePage = lazy(() =>
  import('../features/tasks/RepeatingCreatePage.tsx').then((module) => ({
    default: module.RepeatingCreatePage,
  })),
);

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
  if (route.kind === 'new-repeating')
    return (
      <Suspense fallback={null}>
        <RepeatingCreatePage />
      </Suspense>
    );
  if (route.kind === 'repeating')
    return (
      <Suspense fallback={null}>
        <RepeatingPage />
      </Suspense>
    );

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
          <PageShell>
            <div className="focus-listing mt-0 min-h-30" aria-live="polite">
              Loading task…
            </div>
          </PageShell>
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
          <PageShell>
            <div className="focus-listing mt-0 min-h-30" aria-live="polite">
              Loading tasks…
            </div>
          </PageShell>
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
          <PageShell>
            <div className="focus-listing mt-0 min-h-30" aria-live="polite">
              Loading…
            </div>
          </PageShell>
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
          <PageShell>
            <div className="focus-listing mt-0 min-h-30" aria-live="polite">
              Loading…
            </div>
          </PageShell>
        }
      >
        <GuidePage />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="focus-listing mt-0 min-h-30" aria-live="polite">
            Loading tasks…
          </div>
        </PageShell>
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
