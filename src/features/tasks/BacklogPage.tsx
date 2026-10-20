import { taskErrorMessage } from './data/errors.ts';
import { useTaskSession } from './task-session.ts';
import { useCallback, useMemo, useState, type MouseEvent } from 'react';

import type {
  FocusDestination,
  Project,
  SearchTerm,
  Task,
} from './contracts.ts';
import { deriveBacklogListState } from './backlog-state.ts';
import { narrowListState } from './task-list-state.ts';
import { handleLinkNavigation, navigate } from '../../infra/navigation.ts';
import { useTaskCapture } from './useTaskCapture.ts';
import { useOnlineStatus } from '../../infra/useOnlineStatus.ts';
import { routePath, taskPath } from '../../config/routes.ts';
import {
  matchesTask,
  parseSearch,
  resolveSearch,
  sameSearchTerm,
} from './domain/task-search.ts';
import { useMoveTasksToTodayMutation } from './data/mutations.ts';
import {
  useBacklogQuery,
  useProjectsQuery,
  useSearchQuery,
  useTagsQuery,
} from './data/queries.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { BacklogScreen } from './components/BacklogScreen.tsx';
import { COPY } from './components/copy.ts';
import { usePreferences } from './preferences/usePreferences.ts';
import { useDateTimezone } from './date-timezone.ts';

const NO_PROJECTS: readonly Project[] = [];
const NO_TASKS: readonly Task[] = [];
const NO_TERM: SearchTerm = { kind: 'none' };

interface MoveFeedback {
  readonly message: string;
  readonly tone: 'neutral' | 'error';
}

/**
 * The backlog page: everything it needs from the network, and nothing it needs
 * to draw.
 *
 * The field's value and the term in force are two different pieces of state on
 * purpose. Typing must not fire a request per character, so a term is taken
 * only on submit — and emptying the field takes it back at once, because a
 * cleared search that still shows its results would be lying about what is on
 * screen. Between the two, the rows already on screen are narrowed in the
 * browser as each character is typed, so the list answers before the return
 * key asks Tududi.
 *
 * The project list is fetched as soon as a `+` appears, not when the search is
 * submitted. A project filter has to travel as a uid, so the lookup is a
 * dependency of the request; starting it while the name is still being typed
 * is what keeps it from becoming a wait after the return key.
 */
export function BacklogPage() {
  const { settings } = usePreferences();
  const timezone = useDateTimezone();
  const { captureValue, onCaptureChange } = useTaskSession();
  const [inputMode, setInputMode] = useState<'add' | 'search'>('search');
  const [searchValue, setSearchValue] = useState('');
  /* The field's text as it was submitted: the term in force, and what the
     record is searched for when its link is followed. */
  const [submitted, setSubmitted] = useState('');
  const term = useMemo<SearchTerm>(
    () =>
      submitted === '' || inputMode !== 'search'
        ? NO_TERM
        : parseSearch(submitted),
    [submitted, inputMode],
  );
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [moveFeedback, setMoveFeedback] = useState<MoveFeedback | undefined>(
    undefined,
  );

  const isOnline = useOnlineStatus();
  const projectsQuery = useProjectsQuery(
    inputMode === 'search' ? searchValue : captureValue,
  );
  const tagsQuery = useTagsQuery(
    inputMode === 'search' ? searchValue : captureValue,
  );
  const projectNames = useMemo(
    () => (projectsQuery.data ?? NO_PROJECTS).map((project) => project.name),
    [projectsQuery.data],
  );
  const request = resolveSearch(
    term,
    projectsQuery.data ?? NO_PROJECTS,
    projectsQuery.isSuccess,
  );

  const backlogQuery = useBacklogQuery(request.kind === 'none');
  const searchQuery = useSearchQuery('backlog', request);
  const { mutateAsync: moveTasks, isPending: moving } =
    useMoveTasksToTodayMutation();

  /* What is typed but not yet submitted narrows what is already shown. */
  const typed = useMemo(() => parseSearch(searchValue), [searchValue]);
  const liveTerm =
    inputMode === 'search' && !sameSearchTerm(typed, term) ? typed : NO_TERM;
  const keep = useCallback(
    (task: Task) => matchesTask(task, liveTerm),
    [liveTerm],
  );

  const state = deriveBacklogListState(
    sessionExpired,
    request,
    backlogQuery,
    searchQuery,
    settings,
    { timezone },
  );
  const listState = narrowListState(state, keep);
  const disabled = !isOnline || listState.kind === 'session-expired';
  const visibleTasks = listState.kind === 'ready' ? listState.tasks : NO_TASKS;

  /*
   * The chosen set is narrowed to what is actually listed rather than pruned
   * in an effect: searching, refetching, and a successful move all change the
   * list, and a row that is no longer on screen must not still be counted or
   * still be moved.
   */
  const selectedUids = useMemo(() => {
    const listed = new Set(visibleTasks.map((task) => task.uid));
    return new Set([...chosen].filter((uid) => listed.has(uid)));
  }, [chosen, visibleTasks]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    setMoveFeedback(undefined);
    // An emptied field is its own submission: the whole backlog, immediately.
    if (value.trim() === '') setSubmitted('');
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setMoveFeedback(undefined);
    setSubmitted(searchValue.trim());
  }, [searchValue]);

  const handleToggleSelection = useCallback(
    (uid: string) => {
      if (disabled) return;
      setMoveFeedback(undefined);
      setChosen((current) => {
        const next = new Set(current);
        if (!next.delete(uid)) next.add(uid);
        return next;
      });
    },
    [disabled],
  );

  const handleMove = useCallback(() => {
    if (disabled || selectedUids.size === 0) return;

    const tasks: readonly Task[] = visibleTasks.filter((task) =>
      selectedUids.has(task.uid),
    );
    setMoveFeedback(undefined);

    void moveTasks({ tasks })
      .then(({ moved, failed }) => {
        if (failed.length === 0) return;
        if (failed.some((entry) => isUnauthorized(entry.error))) {
          setSessionExpired(true);
          return;
        }
        /* Only what did not move stays chosen, so the next press retries
           exactly that and nothing is moved to Today twice. */
        setChosen(new Set(failed.map((entry) => entry.task.uid)));
        setMoveFeedback({
          message: moved.length === 0 ? COPY.moveFailed : COPY.movePartlyFailed,
          tone: 'error',
        });
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          setSessionExpired(true);
          return;
        }
        setMoveFeedback({
          message: taskErrorMessage(error, COPY.moveFailed),
          tone: 'error',
        });
      });
  }, [disabled, moveTasks, selectedUids, visibleTasks]);

  const handleOpenTask = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, uid: string) => {
      handleLinkNavigation(event, taskPath(uid));
    },
    [],
  );

  const handleRetry = useCallback(() => {
    setSessionExpired(false);
    void (request.kind === 'none'
      ? backlogQuery.refetch()
      : searchQuery.refetch());
  }, [backlogQuery, request.kind, searchQuery]);

  /* Pressing the lit mark comes home; the other two go where they say. */
  const handleNavigate = useCallback((destination: FocusDestination) => {
    navigate(
      routePath({ kind: destination === 'backlog' ? 'tasks' : destination }),
    );
  }, []);

  const message = !isOnline
    ? COPY.moveOffline
    : request.kind === 'refused'
      ? request.message
      : moveFeedback?.message;
  const tone: 'neutral' | 'error' =
    isOnline && request.kind !== 'refused' && moveFeedback !== undefined
      ? moveFeedback.tone
      : 'neutral';

  const onUnauthorized = useCallback(() => {
    setSessionExpired(true);
  }, []);
  const { feedback, dismissFeedback, handleCaptureChange, submitCapture } =
    useTaskCapture({
      captureValue,
      onCaptureChange,
      projectsQuery,
      disabled,
      onUnauthorized,
    });
  const toggleInputMode = useCallback(() => {
    setInputMode((current) => (current === 'add' ? 'search' : 'add'));
    setSubmitted('');
  }, []);

  return (
    <BacklogScreen
      inputMode={inputMode}
      onToggleInputMode={toggleInputMode}
      captureValue={captureValue}
      onCaptureChange={handleCaptureChange}
      onCaptureSubmit={submitCapture}
      feedback={isOnline ? feedback : { kind: 'offline' }}
      onDismissFeedback={isOnline ? dismissFeedback : undefined}
      searchValue={searchValue}
      onSearchChange={handleSearchChange}
      onSearchSubmit={handleSearchSubmit}
      listState={listState}
      searching={term.kind !== 'none' || liveTerm.kind !== 'none'}
      selectedUids={selectedUids}
      onToggleSelection={handleToggleSelection}
      onMove={handleMove}
      onOpenTask={handleOpenTask}
      onRetry={handleRetry}
      onNavigate={handleNavigate}
      message={message}
      messageTone={tone}
      moving={moving}
      disabled={disabled}
      projects={projectNames}
      tags={tagsQuery.data}
    />
  );
}
