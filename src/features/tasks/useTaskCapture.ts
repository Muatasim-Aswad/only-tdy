import { guidanceFacts } from './guidance/events.ts';
import { tokenFacts } from './guidance/token-facts.ts';
import { t } from './messages.ts';
import { taskErrorMessage } from './data/errors.ts';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { CaptureFeedback, Project } from './contracts.ts';
import { containsProjectSyntax } from './domain/entry-tokens.ts';
import { parseQuickEntry } from './domain/quick-entry.ts';
import { useCreateTaskMutation } from './data/mutations.ts';
import { tududiApi } from './data/tududi-api.ts';
import { isUnauthorized } from '../../infra/tududi-client.ts';
import { navigate } from '../../infra/navigation.ts';
import { routePath } from '../../config/routes.ts';

interface CaptureOptions {
  readonly captureValue: string;
  readonly onCaptureChange: Dispatch<SetStateAction<string>>;
  readonly projectsQuery: UseQueryResult<readonly Project[]>;
  readonly disabled: boolean;
  readonly onUnauthorized: () => void;
  readonly showBacklogFeedback?: boolean;
  readonly onCreated?: (uid: string) => void;
}

export function useTaskCapture({
  captureValue,
  onCaptureChange,
  projectsQuery,
  disabled,
  onUnauthorized,
  showBacklogFeedback = false,
  onCreated,
}: CaptureOptions) {
  const [feedback, setFeedback] = useState<CaptureFeedback>({ kind: 'none' });
  const { mutateAsync: createTask } = useCreateTaskMutation();
  const dismissFeedback = useCallback(() => {
    setFeedback({ kind: 'none' });
  }, []);
  const handleCaptureChange = useCallback(
    (value: string) => {
      onCaptureChange(value);
      setFeedback((current) =>
        current.kind === 'error' ? { kind: 'none' } : current,
      );
    },
    [onCaptureChange],
  );

  const handleCaptureSubmit = useCallback(async () => {
    if (disabled) return;

    setFeedback({ kind: 'none' });
    const submittedInput = captureValue;
    let projects = projectsQuery.data ?? [];
    if (containsProjectSyntax(submittedInput) && !projectsQuery.isSuccess) {
      const result = await projectsQuery.refetch();
      if (result.isError) {
        if (isUnauthorized(result.error)) onUnauthorized();
        else
          setFeedback({
            kind: 'error',
            message: taskErrorMessage(
              result.error,
              t('useTaskCapture.couldNotLoadProjectsTryAgain'),
            ),
          });
        return;
      }
      projects = result.data ?? [];
    }

    let accountTimezone: string;
    try {
      accountTimezone = await tududiApi.fetchAccountTimezone();
    } catch (error) {
      if (isUnauthorized(error)) onUnauthorized();
      else
        setFeedback({
          kind: 'error',
          message: taskErrorMessage(
            error,
            t('useTaskCapture.couldNotLoadTheAccountTimezone'),
          ),
        });
      return;
    }
    const parsed = parseQuickEntry(submittedInput, projects, {
      timezone: accountTimezone,
      allowRepeating: true,
    });
    if (!parsed.ok) {
      setFeedback({ kind: 'error', message: parsed.error.message });
      return;
    }
    if (parsed.repeating) {
      guidanceFacts('token-repeating');
      navigate(routePath({ kind: 'new-repeating' }));
      return;
    }

    const projectName =
      parsed.draft.newProjectName ??
      projects.find((project) => project.uid === parsed.draft.projectUid)?.name;

    try {
      const task = await createTask({
        input: submittedInput,
        draft: parsed.draft,
        ...(projectName === undefined ? {} : { projectName }),
      });
      guidanceFacts(
        'captured',
        ...(parsed.draft.status === 'not_started'
          ? ['captured-backlog' as const]
          : []),
        ...tokenFacts(submittedInput),
      );
      onCaptureChange((current) => (current === submittedInput ? '' : current));

      const hiddenBacklog =
        parsed.draft.status === 'not_started' && showBacklogFeedback;
      if (hiddenBacklog) {
        setFeedback({ kind: 'added-to-backlog', uid: task.uid });
      } else {
        setFeedback({ kind: 'none' });
        onCreated?.(task.uid);
      }
    } catch (error) {
      if (isUnauthorized(error)) {
        onUnauthorized();
      } else {
        const message = taskErrorMessage(
          error,
          t('useTaskCapture.theTaskCouldNotBeAdded'),
        );
        setFeedback({ kind: 'error', message });
      }
    }
  }, [
    captureValue,
    createTask,
    disabled,
    onCaptureChange,
    projectsQuery,
    onCreated,
    onUnauthorized,
    showBacklogFeedback,
  ]);

  const submitCapture = useCallback(() => {
    void handleCaptureSubmit();
  }, [handleCaptureSubmit]);
  return { feedback, dismissFeedback, handleCaptureChange, submitCapture };
}
