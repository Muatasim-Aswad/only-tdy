import { useTaskSession } from './task-session.ts';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';

import type {
  FocusDestination,
  FocusView,
  Project,
  SearchTerm,
  Task,
  TaskStatus,
} from './contracts.ts';
import { handleLinkNavigation, navigate } from '../../infra/navigation.ts';
import {
  deriveHistoryListState,
  deriveTaskListState,
  narrowListState,
} from './task-list-state.ts';
import { useTaskCapture } from './useTaskCapture.ts';
import { useOnlineStatus } from '../../infra/useOnlineStatus.ts';
import { routePath, taskPath } from '../../config/routes.ts';
import {
  matchesTask,
  parseSearch,
  resolveSearch,
  sameSearchTerm,
} from './domain/task-search.ts';
import { useSetTaskStatusMutation } from './data/mutations.ts';
import {
  useAllTasksQuery,
  useHistoryQuery,
  useProjectsQuery,
  useSearchQuery,
  useTagsQuery,
  useTaskListQueries,
} from './data/queries.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { COPY } from './components/copy.ts';
import { FocusScreen } from './components/FocusScreen.tsx';
import type { TaskRowMotion } from './components/TaskRow.tsx';

const INSERTION_MOTION_MS = 180;
const RESTORE_MOTION_MS = 120;
const NO_TASKS: readonly Task[] = [];
const NO_PROJECTS: readonly Project[] = [];
const NO_NAMES: readonly string[] = [];
const NO_TERM: SearchTerm = { kind: 'none' };

type RowMotionMap = Readonly<Record<string, TaskRowMotion>>;
type RowErrorMap = Readonly<Record<string, string>>;

export interface TaskListPageProps {
  readonly view: FocusView;
}

/** The record's search term as a link carried it, or nothing. */
function linkedQuery(): string {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
}

export function TaskListPage({ view }: TaskListPageProps) {
  const { captureValue, onCaptureChange } = useTaskSession();
  const [inputMode, setInputMode] = useState<'add' | 'search'>(
    view === 'tasks' ? 'add' : 'search',
  );
  const [sessionExpired, setSessionExpired] = useState(false);
  /*
   * The record's field, and the term taken from it. They are two pieces of
   * state for the same reason they are on the backlog page: typing must not
   * fire a request per character, so a term is taken only on submit — and
   * emptying the field takes it back at once, because a cleared search that
   * still showed its results would be lying about what is on screen.
   *
   * Neither outlives the page. Leaving the record is leaving the question, and
   * coming back to a field still holding last week's word would be answering
   * something nobody asked.
   */
  /* A link from the backlog's search opens the record already searched for
     the same term, carried as `?q=`. */
  const [searchValue, setSearchValue] = useState(() =>
    view !== 'tasks' ? linkedQuery() : '',
  );
  const [term, setTerm] = useState<SearchTerm>(() => {
    const linked = view !== 'tasks' ? linkedQuery() : '';
    return linked === '' ? NO_TERM : parseSearch(linked);
  });
  const [rowMotion, setRowMotion] = useState<RowMotionMap>({});
  const [rowErrors, setRowErrors] = useState<RowErrorMap>({});
  const rowTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const history = view !== 'tasks';
  const all = view === 'all';
  const isOnline = useOnlineStatus();
  const taskQueries = useTaskListQueries(undefined, !history);
  /*
   * One project list, asked for by whichever field is on screen. Both use `+`
   * to name a project and both need the name as a uid before anything can be
   * sent, so the lookup starts while the name is still being typed rather than
   * becoming a wait after the return key.
   */
  const projectsQuery = useProjectsQuery(
    inputMode === 'search' ? searchValue : captureValue,
  );
  /* The tag list is asked for on the same terms, by whichever field is on
     screen, and for the same reason: only a suggestion list reads it. */
  const tagsQuery = useTagsQuery(
    inputMode === 'search' ? searchValue : captureValue,
  );
  const searchRequest = resolveSearch(
    inputMode === 'search' ? term : NO_TERM,
    projectsQuery.data ?? NO_PROJECTS,
    projectsQuery.isSuccess,
  );
  /*
   * One completed list, two jobs. The record is all of it; the open list takes
   * the part of it finished today and shows it under what is still open. So it
   * is asked for on both views — everywhere except a record being searched,
   * where the narrowed query answers instead.
   */
  const historyQuery = useHistoryQuery(
    !history || (!all && searchRequest.kind === 'none'),
  );
  const allQuery = useAllTasksQuery(all && searchRequest.kind === 'none');
  const historySearchQuery = useSearchQuery(
    all ? 'all' : 'history',
    history ? searchRequest : { kind: 'none' },
  );
  const browseQuery = all ? allQuery : historyQuery;
  const { mutateAsync: setTaskStatus } = useSetTaskStatusMutation();

  /* Absent until fetched, so capture never offers a known name as new. */
  const projectNames = useMemo(
    () => projectsQuery.data?.map((project) => project.name),
    [projectsQuery.data],
  );

  /* What is typed but not yet submitted narrows the record already shown. */
  const typed = useMemo(() => parseSearch(searchValue), [searchValue]);
  const liveTerm =
    inputMode === 'search' && !sameSearchTerm(typed, term) ? typed : NO_TERM;

  const listState = history
    ? narrowListState(
        deriveHistoryListState(
          sessionExpired,
          searchRequest,
          browseQuery,
          historySearchQuery,
          all ? 'all' : 'completed',
        ),
        (task) => matchesTask(task, liveTerm),
      )
    : searchRequest.kind === 'refused'
      ? { kind: 'empty' as const }
      : searchRequest.kind === 'pending'
        ? { kind: 'loading' as const }
        : narrowListState(
            deriveTaskListState(
              sessionExpired,
              taskQueries.today,
              historyQuery,
            ),
            (task) =>
              matchesTask(task, inputMode === 'search' ? typed : NO_TERM),
          );
  const disabled = !isOnline || listState.kind === 'session-expired';
  const visibleTasks = listState.kind === 'ready' ? listState.tasks : NO_TASKS;
  const tasksByUid = useMemo(
    () => new Map(visibleTasks.map((task) => [task.uid, task])),
    [visibleTasks],
  );

  const scheduleRowMotion = useCallback(
    (uid: string, motion: TaskRowMotion, duration: number) => {
      const previousTimer = rowTimers.current.get(uid);
      if (previousTimer !== undefined) clearTimeout(previousTimer);
      setRowMotion((current) => ({ ...current, [uid]: motion }));
      const timer = setTimeout(() => {
        rowTimers.current.delete(uid);
        setRowMotion((current) => ({ ...current, [uid]: 'idle' }));
      }, duration);
      rowTimers.current.set(uid, timer);
    },
    [],
  );

  useEffect(
    () => () => {
      for (const timer of rowTimers.current.values()) clearTimeout(timer);
      rowTimers.current.clear();
    },
    [],
  );

  /*
   * Where a reopened task goes: the list it is being reopened on.
   *
   * Nothing is remembered about what the task was before it was ticked,
   * because remembering only works for a tick this page watched — and now that
   * the day's record loads with the list, most done rows on screen were ticked
   * before the page existed. The list the person is looking at is the one
   * answer that is always there, and it is the one that makes the row stay
   * where it is: undo on Today leaves the row on Today.
   *
   * The record is the exception, having no open list of its own. A task
   * finished at some point in the past and reopened there is not a commitment
   * for today, so it goes back to the backlog.
   */
  const reopenStatus: TaskStatus = history ? 'not_started' : 'planned';

  /*
   * Completion is immediate and in place: the optimistic update ticks the box
   * and the ordering sinks the row. There is nothing to wait for, so unlike the
   * old collapse there is no delay before the request goes out.
   *
   * The same press unticks a done row. Nothing about a task is final in only-tdy
   * any more than it is in Tududi, so the box is a toggle rather than a
   * one-way door.
   */
  const handleToggle = useCallback(
    (uid: string) => {
      const task = tasksByUid.get(uid);
      if (task === undefined || disabled) return;

      const done = task.status === 'done';
      const status: TaskStatus = done ? reopenStatus : 'done';

      setRowErrors((current) => {
        const next = { ...current };
        Reflect.deleteProperty(next, uid);
        return next;
      });

      const previousTimer = rowTimers.current.get(uid);
      if (previousTimer !== undefined) {
        clearTimeout(previousTimer);
        rowTimers.current.delete(uid);
      }

      void setTaskStatus({ task, status }).catch((error: unknown) => {
        if (isUnauthorized(error)) {
          setSessionExpired(true);
          return;
        }
        setRowErrors((current) => ({
          ...current,
          [uid]: done ? COPY.reopenFailed : COPY.completionFailed,
        }));
        scheduleRowMotion(uid, 'restoring', RESTORE_MOTION_MS);
      });
    },
    [disabled, reopenStatus, scheduleRowMotion, setTaskStatus, tasksByUid],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    // An emptied field is its own submission: the whole record, immediately.
    if (value.trim() === '') setTerm(NO_TERM);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setTerm(parseSearch(searchValue));
  }, [searchValue]);

  /*
   * Each page at the foot has an address of its own, so pressing a mark is a
   * navigation. They stay pressed buttons rather than becoming links: each one
   * reports which list is showing, and that is what `aria-pressed` is for.
   * Pressing the lit mark comes back here, which is what makes it a toggle.
   */
  const handleNavigate = useCallback(
    (destination: FocusDestination) => {
      navigate(
        routePath({ kind: destination === view ? 'tasks' : destination }),
      );
    },
    [view],
  );

  /* Rows are real links. This only stops the browser reloading the whole app
     to reach a page it is already running. */
  const handleOpenTask = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, uid: string) => {
      handleLinkNavigation(event, taskPath(uid));
    },
    [],
  );

  const handleOpenBacklog = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      handleLinkNavigation(event, routePath({ kind: 'backlog' }));
    },
    [],
  );
  const todayClear = useMemo(
    () =>
      taskQueries.todayClear
        ? {
            backlogCount: taskQueries.backlog.data?.length,
            onNavigate: handleOpenBacklog,
          }
        : undefined,
    [taskQueries.todayClear, taskQueries.backlog.data, handleOpenBacklog],
  );

  const handleRetry = useCallback(() => {
    setSessionExpired(false);
    if (history) {
      void (searchRequest.kind === 'none'
        ? browseQuery.refetch()
        : historySearchQuery.refetch());
      return;
    }
    void taskQueries.today.refetch();
    /* The day's record is part of this screen now, so a retry has to ask for
       it too — it is the half that can have failed on its own. */
    void historyQuery.refetch();
  }, [
    history,
    browseQuery,
    historyQuery,
    historySearchQuery,
    searchRequest.kind,
    taskQueries.today,
  ]);

  const onUnauthorized = useCallback(() => {
    setSessionExpired(true);
  }, []);
  const onCreated = useCallback(
    (uid: string) => {
      scheduleRowMotion(uid, 'inserted', INSERTION_MOTION_MS);
    },
    [scheduleRowMotion],
  );
  const { feedback, dismissFeedback, handleCaptureChange, submitCapture } =
    useTaskCapture({
      captureValue,
      onCaptureChange,
      projectsQuery,
      disabled,
      onUnauthorized,
      onCreated,
      showBacklogFeedback: true,
    });
  const toggleInputMode = useCallback(() => {
    setInputMode((current) => (current === 'add' ? 'search' : 'add'));
    setTerm(NO_TERM);
  }, []);

  return (
    <FocusScreen
      view={view}
      inputMode={inputMode}
      onToggleInputMode={toggleInputMode}
      onNavigate={handleNavigate}
      projectNames={projectNames}
      tagNames={tagsQuery.data ?? NO_NAMES}
      captureValue={captureValue}
      onCaptureChange={handleCaptureChange}
      onCaptureSubmit={submitCapture}
      feedback={isOnline ? feedback : { kind: 'offline' }}
      onDismissFeedback={isOnline ? dismissFeedback : undefined}
      searchValue={searchValue}
      onSearchChange={handleSearchChange}
      onSearchSubmit={handleSearchSubmit}
      searching={
        inputMode === 'search' &&
        (term.kind !== 'none' || liveTerm.kind !== 'none')
      }
      searchMessage={
        searchRequest.kind === 'refused' ? searchRequest.message : undefined
      }
      listState={listState}
      todayClear={todayClear}
      onToggle={handleToggle}
      onOpenTask={handleOpenTask}
      onRetry={handleRetry}
      disabled={disabled}
      rowMotion={rowMotion}
      rowErrors={rowErrors}
    />
  );
}
