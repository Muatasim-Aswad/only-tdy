import { t } from './messages.ts';
import { useMemo, useState } from 'react';
import { routePath, taskPath } from '../../config/routes.ts';
import { handleLinkNavigation, navigate } from '../../infra/navigation.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { useOnlineStatus } from '../../infra/useOnlineStatus.ts';
import {
  useRepeatingQuery,
  useProjectsQuery,
  useTagsQuery,
} from './data/queries.ts';
import { FocusScreen } from './components/FocusScreen.tsx';
import { parseSearch, matchesTask } from './domain/task-search.ts';
import { parseQuickEntry } from './domain/quick-entry.ts';
import { containsProjectSyntax } from './domain/entry-tokens.ts';
import { useDateTimezone } from './date-timezone.ts';
import { useTaskSession } from './task-session.ts';
import type { CaptureFeedback, TaskListState } from './contracts.ts';

export function RepeatingPage() {
  const query = useRepeatingQuery();
  const timezone = useDateTimezone();
  const online = useOnlineStatus();
  const { captureValue, onCaptureChange } = useTaskSession();
  const [inputMode, setInputMode] = useState<'add' | 'search'>('search');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<CaptureFeedback>({ kind: 'none' });
  const projects = useProjectsQuery(
    inputMode === 'add' ? captureValue : search,
  );
  const tags = useTagsQuery(inputMode === 'add' ? captureValue : search);
  const tasks = useMemo(() => {
    const term = parseSearch(inputMode === 'search' ? search : '');
    return (query.data ?? [])
      .filter((task) => matchesTask(task, term))
      .sort(
        (a, b) =>
          Number(a.status === 'done') - Number(b.status === 'done') ||
          (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
      );
  }, [query.data, search, inputMode]);
  const state: TaskListState = isUnauthorized(query.error)
    ? { kind: 'session-expired' }
    : query.isError
      ? { kind: 'error' }
      : !query.isSuccess
        ? { kind: 'loading' }
        : tasks.length
          ? { kind: 'ready', list: 'all', tasks }
          : { kind: 'empty' };

  const add = async () => {
    let available = projects.data ?? [];
    if (containsProjectSyntax(captureValue) && !projects.isSuccess) {
      const result = await projects.refetch();
      if (result.isError) {
        setFeedback({
          kind: 'error',
          message: t('repeatingPage.message'),
        });
        return;
      }
      available = result.data ?? [];
    }
    const parsed = parseQuickEntry(captureValue, available, {
      timezone,
      allowRepeating: true,
    });
    if (!parsed.ok) {
      setFeedback({ kind: 'error', message: parsed.error.message });
      return;
    }
    navigate(routePath({ kind: 'new-repeating' }));
  };

  return (
    <FocusScreen
      view="repeating"
      inputMode={inputMode}
      onToggleInputMode={() => {
        setInputMode((current) => (current === 'add' ? 'search' : 'add'));
        setFeedback({ kind: 'none' });
      }}
      onNavigate={(destination) => {
        navigate(
          routePath({
            kind: destination === 'repeating' ? 'tasks' : destination,
          }),
        );
      }}
      captureValue={captureValue}
      onCaptureChange={(value) => {
        onCaptureChange(value);
        setFeedback({ kind: 'none' });
      }}
      onCaptureSubmit={() => {
        void add();
      }}
      feedback={online ? feedback : { kind: 'offline' }}
      onDismissFeedback={() => {
        setFeedback({ kind: 'none' });
      }}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
      }}
      onSearchSubmit={() => undefined}
      searching={inputMode === 'search' && search.trim() !== ''}
      listState={state}
      onToggle={() => undefined}
      onOpenTask={(event, uid) => {
        handleLinkNavigation(event, taskPath(uid));
      }}
      onRetry={() => {
        void query.refetch();
      }}
      disabled={!online || state.kind === 'session-expired'}
      projectNames={projects.data?.map((project) => project.name)}
      tagNames={tags.data}
    />
  );
}
