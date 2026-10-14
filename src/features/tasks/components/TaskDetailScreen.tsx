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
  readonly state: TaskDetailState;
  readonly projects: readonly Project[];
  /** Tag names the tag field completes against. */
  readonly tags?: readonly string[] | undefined;
  /** The source page, or the status-based fallback for a direct link. */
  readonly backHref: string;
  readonly onBack?:
    ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
  readonly onSave: (edit: TaskEdit) => Promise<TaskDetail | undefined>;
  readonly onDelete: () => void;
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
  state,
  projects,
  tags,
  backHref,
  onBack,
  onSave,
  onDelete,
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
    <main className="focus-shell">
      <div className="focus-head">
        <BackLink href={backHref} onNavigate={onBack} />
        {state.kind === 'ready' ? (
          <div className="focus-head__action">
            {dirty ? (
              <button
                type="submit"
                form={formId}
                className="focus-detail__save text-action"
                disabled={disabled || saving || deleting}
              >
                {COPY.save}
              </button>
            ) : (
              <DeleteTaskAction
                onDelete={onDelete}
                pending={deleting}
                disabled={disabled || saving}
              />
            )}
          </div>
        ) : null}
      </div>
      {state.kind === 'ready' ? (
        <TaskEditor
          key={state.task.uid}
          task={state.task}
          projects={projects}
          tags={tags}
          onSave={onSave}
          feedback={feedback}
          onDismissFeedback={onDismissFeedback}
          saving={saving}
          deleting={deleting}
          disabled={disabled}
          formId={formId}
          onDirtyChange={setDirty}
        />
      ) : (
        <div className="focus-listing" aria-live="polite">
          {renderState(state, backHref, onBack, onRetry)}
        </div>
      )}
    </main>
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
      return <p className="focus-state text-task">{COPY.taskLoading}</p>;

    case 'not-found':
      return (
        <p className="focus-state text-task">
          {COPY.taskMissing}{' '}
          <a className="focus-state__action" href={backHref} onClick={onBack}>
            {COPY.backToList}
          </a>
        </p>
      );

    case 'error':
      return (
        <p className="focus-state text-task">
          {COPY.taskLoadFailed}{' '}
          <button
            type="button"
            className="focus-state__action"
            onClick={onRetry}
          >
            {COPY.retry}
          </button>
        </p>
      );

    case 'session-expired':
      return (
        <p className="focus-state text-task">
          {COPY.sessionExpired}{' '}
          <a className="focus-state__action" href={TUDUDI_LOGIN_PATH}>
            {COPY.signIn}
          </a>
        </p>
      );

    case 'ready':
      // Handled above, where the editor owns the whole column.
      return null;
  }
}
