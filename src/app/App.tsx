import { useTranslation } from 'react-i18next';
import { LocaleBoundary } from './LocaleBoundary.tsx';
import { t } from './messages.ts';
import { PageShell } from '../shared/PageShell.tsx';
import { lazy, Suspense, useCallback, useState, type MouseEvent } from 'react';

import { routePath } from '../config/routes.ts';
import { UpdateToast } from './UpdateToast.tsx';

import { buildLabel, type BuildInfo } from '../infra/build-info.ts';
import { handleLinkNavigation, useRoute } from '../infra/navigation.ts';
const AuthBoundary = lazy(() =>
  import('../features/auth/AuthBoundary.tsx').then((module) => ({
    default: module.AuthBoundary,
  })),
);
const TaskProvider = lazy(() =>
  import('../features/tasks/TaskProvider.tsx').then((module) => ({
    default: module.TaskProvider,
  })),
);
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
  useTranslation('app');
  const [notice, setNotice] = useState(updateNotice);
  const dismissNotice = useCallback(() => {
    setNotice(null);
  }, []);
  const openVersion = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    handleLinkNavigation(event, VERSION_PATH);
  }, []);

  return (
    <LocaleBoundary>
      <Suspense
        fallback={
          <PageShell>
            <p className="ps-rail text-muted" role="status">
              {t('app.Page.loading')}
            </p>
          </PageShell>
        }
      >
        <AuthBoundary>
          <Suspense fallback={null}>
            <TaskProvider>
              <Page />
              <UpdateToast
                label={notice === null ? undefined : buildLabel(notice)}
                href={VERSION_PATH}
                onOpen={openVersion}
                onDismiss={dismissNotice}
              />
            </TaskProvider>
          </Suspense>
        </AuthBoundary>
      </Suspense>
    </LocaleBoundary>
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
              {t('app.Page.loadingTask')}
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
              {t('app.Page.loadingTasks')}
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
              {t('app.Page.loading')}
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
              {t('app.Page.loading')}
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
            {t('app.Page.loadingTasks')}
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
