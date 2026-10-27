import { t } from '../messages.ts';
import { SubmitButton } from '../../../shared/SubmitButton.tsx';
import { PageShell } from '../../../shared/PageShell.tsx';
import { useId, useState, type MouseEvent, type ReactNode } from 'react';

import type {
  Project,
  SaveFeedback,
  TaskDetail,
  TaskDetailState,
  TaskEdit,
} from '../contracts.ts';
import { TUDUDI_LOGIN_PATH } from '../../../config/app.ts';

import { BackLink } from './BackLink.tsx';
import { COPY } from './copy.ts';
import { DeleteTaskAction } from './DeleteTaskAction.tsx';
import { TaskEditor } from './TaskEditor.tsx';

export interface TaskDetailScreenProps {
  readonly preview?: boolean;
  readonly state: TaskDetailState;
  readonly projects: readonly Project[];
  /** Tag names the tag field completes against. */
  readonly tags?: readonly string[] | undefined;
  /** The source page, or the status-based fallback for a direct link. */
  readonly backHref: string;
  readonly backLabel?: string;
  readonly onBack?:
    ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
  readonly onSave: (edit: TaskEdit) => Promise<TaskDetail | undefined>;
  readonly onDelete: () => void;
  readonly onSkip?: () => void;
  readonly creating?: boolean;
  readonly skipping?: boolean;
  readonly onRetry: () => void;
  readonly feedback: SaveFeedback;
  readonly onDismissFeedback?: (() => void) | undefined;
  readonly saving?: boolean;
  readonly deleting?: boolean;
  readonly disabled?: boolean;
}

/**
 * One task on a page of its own, with no data layer. It is the same column as the list screen, read in the same order, and
 * it is the one page that opens with the way out rather than ending with it.
 *
 * The head of the page is the whole task in two words: where this came from,
 * and the one press that matters now. Untouched, that is Delete; once a field
 * has changed it is Save, in the same place, and Delete steps aside — an
 * unsaved edit is never one stray press from being thrown out with the task.
 * Delete is mounted only once the task is, so there is never an offer to
 * destroy a page that has not loaded.
 *
 * Back and Save return to the page that opened the task, with a fallback for
 * directly opened links. The editor footer switches its layout.
 */
export function TaskDetailScreen({
  preview = false,
  state,
  projects,
  tags,
  backHref,
  backLabel = COPY.backToList,
  onBack,
  onSave,
  onDelete,
  onSkip,
  creating = false,
  skipping = false,
  onRetry,
  feedback,
  onDismissFeedback,
  saving = false,
  deleting = false,
  disabled = false,
}: TaskDetailScreenProps) {
  const formId = useId();
  const [dirty, setDirty] = useState(false);

  return (
    <PageShell>
      {preview && (
        <p className="ps-rail mb-3 text-meta text-muted">
          {t('taskDetailScreen.tourExample')}
        </p>
      )}
      <div className="focus-head flex items-center justify-between gap-4 mb-2">
        <BackLink href={backHref} label={backLabel} onNavigate={onBack} />
        {state.kind === 'ready' ? (
          <div className="focus-head__action flex items-center justify-end min-w-0 -me-2">
            {dirty || creating ? (
              <SubmitButton
                title={t('taskDetailScreen.saveCtrlEnterCmdEnterOnLabel')}
                aria-keyshortcuts="Control+Enter Meta+Enter"
                form={formId}
                className="focus-detail__save ms-auto"
                disabled={disabled || saving || deleting || skipping}
              >
                {COPY.save}
              </SubmitButton>
            ) : (
              <DeleteTaskAction
                onDelete={onDelete}
                pending={deleting}
                disabled={disabled || saving || skipping}
              />
            )}
          </div>
        ) : null}
      </div>
      {state.kind === 'ready' ? (
        <TaskEditor
          key={state.task.uid}
          task={state.task}
          preview={preview}
          projects={projects}
          tags={tags}
          onSave={onSave}
          feedback={feedback}
          onDismissFeedback={onDismissFeedback}
          saving={saving}
          creating={creating}
          skipping={skipping}
          onSkip={
            state.task.recurrence && state.task.status !== 'done' && !dirty
              ? onSkip
              : undefined
          }
          deleting={deleting}
          disabled={disabled}
          formId={formId}
          onDirtyChange={setDirty}
        />
      ) : (
        <div className="focus-listing mt-0 min-h-30" aria-live="polite">
          {renderState(state, backHref, onBack, onRetry)}
        </div>
      )}
    </PageShell>
  );
}

function renderState(
  state: TaskDetailState,
  backHref: string,
  onBack: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined,
  onRetry: () => void,
): ReactNode {
  switch (state.kind) {
    case 'loading':
      return (
        <p className="focus-state ps-rail py-4 text-muted text-task">
          {COPY.taskLoading}
        </p>
      );

    case 'not-found':
      return (
        <p className="focus-state ps-rail py-4 text-muted text-task">
          {COPY.taskMissing}{' '}
          <a
            className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer"
            href={backHref}
            onClick={onBack}
          >
            {COPY.backToList}
          </a>
        </p>
      );

    case 'error':
      return (
        <p className="focus-state ps-rail py-4 text-muted text-task">
          {COPY.taskLoadFailed}{' '}
          <button
            type="button"
            className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer"
            onClick={onRetry}
          >
            {COPY.retry}
          </button>
        </p>
      );

    case 'session-expired':
      return (
        <p className="focus-state ps-rail py-4 text-muted text-task">
          {COPY.sessionExpired}{' '}
          <a
            className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer"
            href={TUDUDI_LOGIN_PATH}
          >
            {COPY.signIn}
          </a>
        </p>
      );

    case 'ready':
      // Handled above, where the editor owns the whole column.
      return null;
  }
}
