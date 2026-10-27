import { t } from './messages.ts';
import { taskErrorMessage } from './data/errors.ts';
import { useCallback, useState, type MouseEvent } from 'react';

import type {
  Project,
  SaveFeedback,
  TaskDetail,
  TaskEdit,
} from './contracts.ts';
import {
  handleLinkNavigation,
  navigate,
  pageReturnPath,
} from '../../infra/navigation.ts';
import { deriveTaskDetailState } from './task-detail-state.ts';
import { useOnlineStatus } from '../../infra/useOnlineStatus.ts';
import { routePath } from '../../config/routes.ts';
import {
  useDeleteTaskMutation,
  useUpdateTaskMutation,
  useSkipOccurrenceMutation,
} from './data/mutations.ts';
import {
  useProjectListQuery,
  useTagListQuery,
  useTaskQuery,
} from './data/queries.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { COPY } from './components/copy.ts';
import { TaskDetailScreen } from './components/TaskDetailScreen.tsx';

const NO_PROJECTS: readonly Project[] = [];
const NO_TAG_NAMES: readonly string[] = [];

export interface TaskDetailPageProps {
  readonly uid: string;
}

/**
 * Everything the task page needs from the network, and nothing it needs to
 * draw.
 *
 * The task and the project list are asked for at the same time. The projects
 * only label a control, so waiting for the task before starting them would be
 * a waterfall that buys nothing — and the control is the last thing the page
 * needs, not the first.
 */
export function TaskDetailPage({ uid }: TaskDetailPageProps) {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [feedback, setFeedback] = useState<SaveFeedback>({ kind: 'none' });

  const dismissFeedback = useCallback(() => {
    setFeedback({ kind: 'none' });
  }, []);
  const isOnline = useOnlineStatus();
  const taskQuery = useTaskQuery(uid);
  const projectsQuery = useProjectListQuery(true);
  /* Fetched with the page rather than on the first `#`: this field is a tag
     field and nothing else, so there is no mark to wait for. */
  const tagsQuery = useTagListQuery(true);
  const { mutateAsync: updateTask, isPending: saving } =
    useUpdateTaskMutation();
  const { mutateAsync: deleteTask, isPending: deleting } =
    useDeleteTaskMutation();
  const { mutateAsync: skipOccurrence, isPending: skipping } =
    useSkipOccurrenceMutation();

  const state = deriveTaskDetailState(sessionExpired, taskQuery);
  const disabled = !isOnline || state.kind === 'session-expired';
  const visibleFeedback: SaveFeedback = isOnline
    ? feedback
    : { kind: 'offline' };

  const done = state.kind === 'ready' && state.task.status === 'done';
  const backHref = pageReturnPath(
    routePath({
      kind: done
        ? 'history'
        : state.kind === 'ready' && state.task.recurrence
          ? 'repeating'
          : 'tasks',
    }),
  );

  const handleBack = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      handleLinkNavigation(event, backHref);
    },
    [backHref],
  );

  const handleSave = useCallback(
    async (edit: TaskEdit): Promise<TaskDetail | undefined> => {
      if (disabled || edit.title === '') {
        if (!disabled)
          setFeedback({ kind: 'error', message: COPY.titleRequired });
        return undefined;
      }

      setFeedback({ kind: 'none' });
      try {
        const saved = await updateTask({
          uid,
          edit,
          previousDueDate: taskQuery.data?.dueDate,
          previousStatus: taskQuery.data?.status,
        });
        // Replaced rather than pushed: Back must not reopen a finished edit.
        navigate(backHref, { replace: true });
        return saved;
      } catch (error) {
        if (isUnauthorized(error)) {
          setSessionExpired(true);
          return undefined;
        }
        setFeedback({
          kind: 'error',
          message: taskErrorMessage(error, COPY.saveFailed),
        });
        return undefined;
      }
    },
    [backHref, disabled, uid, updateTask, taskQuery.data],
  );

  const handleDelete = useCallback(() => {
    if (disabled) return;

    // Replaced rather than pushed: Back must not return to a task that is gone.
    void deleteTask({ uid })
      .then(() => {
        navigate(backHref, { replace: true });
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          setSessionExpired(true);
          return;
        }
        setFeedback({
          kind: 'error',
          message: taskErrorMessage(error, COPY.deleteFailed),
        });
      });
  }, [backHref, deleteTask, disabled, uid]);

  const handleRetry = useCallback(() => {
    setSessionExpired(false);
    void taskQuery.refetch();
  }, [taskQuery]);

  return (
    <TaskDetailScreen
      state={state}
      projects={projectsQuery.data ?? NO_PROJECTS}
      tags={tagsQuery.data ?? NO_TAG_NAMES}
      backHref={backHref}
      onBack={handleBack}
      onSave={handleSave}
      onDelete={handleDelete}
      onSkip={() => {
        void skipOccurrence(uid)
          .then(() => {
            navigate(backHref, { replace: true });
          })
          .catch((error: unknown) => {
            if (isUnauthorized(error)) setSessionExpired(true);
            else
              setFeedback({
                kind: 'error',
                message: taskErrorMessage(
                  error,
                  t('taskDetailPage.couldnTSkipThisOccurrenceTry'),
                ),
              });
          });
      }}
      onRetry={handleRetry}
      feedback={visibleFeedback}
      onDismissFeedback={isOnline ? dismissFeedback : undefined}
      saving={saving}
      skipping={skipping}
      deleting={deleting}
      disabled={disabled}
    />
  );
}
