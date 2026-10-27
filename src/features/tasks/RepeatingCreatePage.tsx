import { t } from './messages.ts';
import { useMemo, useState } from 'react';
import { routePath } from '../../config/routes.ts';
import {
  handleLinkNavigation,
  navigate,
  pageReturnPath,
} from '../../infra/navigation.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { useOnlineStatus } from '../../infra/useOnlineStatus.ts';
import { TaskDetailScreen } from './components/TaskDetailScreen.tsx';
import { useCreateTaskMutation } from './data/mutations.ts';
import { useProjectListQuery, useTagListQuery } from './data/queries.ts';
import { taskErrorMessage } from './data/errors.ts';
import { useDateTimezone } from './date-timezone.ts';
import { parseQuickEntry } from './domain/quick-entry.ts';
import { currentDate } from './domain/task-dates.ts';
import { defaultRecurrence } from './domain/recurrence.ts';
import { useTaskSession } from './task-session.ts';
import type { SaveFeedback, TaskDetail } from './contracts.ts';

const DRAFT_PROJECT_UID = 'draft:repeating-project';

export function RepeatingCreatePage() {
  const timezone = useDateTimezone();
  const online = useOnlineStatus();
  const { captureValue, onCaptureChange } = useTaskSession();
  const projects = useProjectListQuery(true);
  const tags = useTagListQuery(true);
  const create = useCreateTaskMutation();
  const [feedback, setFeedback] = useState<SaveFeedback>({ kind: 'none' });
  const [expired, setExpired] = useState(false);
  const parsed = useMemo(
    () =>
      parseQuickEntry(captureValue, projects.data ?? [], {
        timezone,
        allowRepeating: true,
      }),
    [captureValue, projects.data, timezone],
  );
  const task = useMemo<TaskDetail>(() => {
    const draft = parsed.ok ? parsed.draft : undefined;
    const dueDate = draft?.dueDate ?? currentDate({ timezone });
    return {
      uid: 'new-repeating',
      title: draft?.title ?? captureValue,
      note: draft?.note ?? '',
      status: draft?.status ?? 'not_started',
      priority: draft?.priority ?? 'low',
      projectUid: draft?.newProjectName
        ? DRAFT_PROJECT_UID
        : (draft?.projectUid ?? ''),
      ...(draft?.newProjectName ? { projectName: draft.newProjectName } : {}),
      tags: draft?.tags ?? [],
      dueDate,
      deferUntil: '',
      recurrence: defaultRecurrence('daily', dueDate),
    };
  }, [parsed, captureValue, timezone]);
  const repeatingPath = routePath({ kind: 'repeating' });
  const back = pageReturnPath(repeatingPath);
  return (
    <TaskDetailScreen
      creating
      state={
        expired || isUnauthorized(projects.error)
          ? { kind: 'session-expired' }
          : projects.isError
            ? { kind: 'error' }
            : projects.isPending
              ? { kind: 'loading' }
              : { kind: 'ready', task }
      }
      projects={projects.data ?? []}
      tags={tags.data}
      backHref={back}
      onBack={(event) => {
        handleLinkNavigation(event, back);
      }}
      onDelete={() => {
        navigate(back);
      }}
      onRetry={() => {
        setExpired(false);
        void projects.refetch();
      }}
      saving={create.isPending}
      disabled={!online || expired}
      feedback={online ? feedback : { kind: 'offline' }}
      onDismissFeedback={() => {
        setFeedback({ kind: 'none' });
      }}
      onSave={async (edit) => {
        if (!online || expired) return undefined;
        if (!edit.recurrence) {
          setFeedback({
            kind: 'error',
            message: t('repeatingCreatePage.message'),
          });
          return undefined;
        }
        try {
          const saved = await create.mutateAsync({
            input: captureValue,
            draft: {
              title: edit.title,
              note: edit.note,
              status: edit.status === 'not_started' ? 'not_started' : 'planned',
              priority: edit.priority,
              ...(edit.projectUid === DRAFT_PROJECT_UID
                ? {}
                : { projectUid: edit.projectUid }),
              ...(edit.newProjectName
                ? { newProjectName: edit.newProjectName }
                : parsed.ok &&
                    parsed.draft.newProjectName &&
                    edit.projectUid === DRAFT_PROJECT_UID
                  ? { newProjectName: parsed.draft.newProjectName }
                  : {}),
              tags: edit.tags,
              dueDate: edit.dueDate,
              recurrence: edit.recurrence,
            },
          });
          onCaptureChange('');
          navigate(repeatingPath, { replace: true });
          return {
            ...task,
            ...saved,
            note: saved.note ?? '',
            dueDate: saved.dueDate ?? '',
            deferUntil: '',
            projectUid: edit.projectUid,
          };
        } catch (error) {
          if (isUnauthorized(error)) setExpired(true);
          else
            setFeedback({
              kind: 'error',
              message: taskErrorMessage(
                error,
                t('repeatingCreatePage.couldnTSaveThisRepeatingTask'),
              ),
            });
          return undefined;
        }
      }}
    />
  );
}
