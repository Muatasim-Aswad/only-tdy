import type { MouseEvent, ReactNode } from 'react';

import type { TaskListState } from '../contracts.ts';
import { TUDUDI_LOGIN_PATH } from '../../../config/app.ts';

import { classNames } from '../../../shared/classNames.ts';
import { COPY } from './copy.ts';
import { TaskRow, type TaskRowMode, type TaskRowMotion } from './TaskRow.tsx';

export interface TaskListProps {
  readonly state: TaskListState;
  readonly details?: boolean;
  /** What the box on each row is for. The backlog page chooses; everywhere
      else, ticks. */
  readonly mode?: TaskRowMode;
  /** Which rows are chosen, in `select` mode. Read per row, so a row still
      takes a boolean and stays memoized against the rest of the list. */
  readonly selectedUids?: ReadonlySet<string> | undefined;
  readonly onToggle: (uid: string) => void;
  /** Opens a row's own page without leaving and reloading the app. */
  readonly onOpenTask?:
    ((event: MouseEvent<HTMLAnchorElement>, uid: string) => void) | undefined;
  readonly onRetry: () => void;
  /** What to say when the list resolved with nothing in it. */
  readonly emptyMessage?: string;
  /** Parts one row from the next with a hairline. The pages that are read
      through rather than acted on ask for it; Today does not. */
  readonly ruled?: boolean;
  /** Offline disables completion on every row at once. */
  readonly disabled?: boolean;
  /** Per-task motion, keyed by uid. Absent means the row is at rest. */
  readonly rowMotion?: Readonly<Record<string, TaskRowMotion>> | undefined;
  /** Per-task error, keyed by uid, shown beside the row it belongs to. */
  readonly rowErrors?: Readonly<Record<string, string>> | undefined;
}

/**
 * The task ledger. Whichever list resolved, its rows are all there is: the
 * list names itself by what it holds, not by a title and a count above it. The container holds its height across
 * every state, so loading, the handover, and a resolved list all occupy the
 * same space and nothing below them jumps.
 *
 * It is one polite live region: loading, arrivals, completions, and
 * recoverable errors are all announced without stealing focus.
 */
export function TaskList({
  state,
  details = false,
  mode = 'complete',
  selectedUids,
  onToggle,
  onOpenTask,
  onRetry,
  emptyMessage = COPY.empty,
  ruled = false,
  disabled = false,
  rowMotion,
  rowErrors,
}: TaskListProps) {
  let content: ReactNode;

  switch (state.kind) {
    case 'loading':
      content = <p className="focus-state text-task">{COPY.loading}</p>;
      break;

    case 'empty':
      content = <p className="focus-state text-task">{emptyMessage}</p>;
      break;

    case 'error':
      content = (
        <p className="focus-state text-task">
          {COPY.loadFailed}{' '}
          <button
            type="button"
            className="focus-state__action"
            onClick={onRetry}
          >
            {COPY.retry}
          </button>
        </p>
      );
      break;

    case 'session-expired':
      content = (
        <p className="focus-state text-task">
          {COPY.sessionExpired}{' '}
          <a className="focus-state__action" href={TUDUDI_LOGIN_PATH}>
            {COPY.signIn}
          </a>
        </p>
      );
      break;

    case 'ready':
      content = (
        <ul className={classNames('focus-list', ruled && 'focus-list--ruled')}>
          {state.tasks.map((task) => (
            <TaskRow
              key={task.uid}
              task={task}
              details={details}
              mode={mode}
              selected={selectedUids?.has(task.uid) ?? false}
              onToggle={onToggle}
              onOpen={onOpenTask}
              disabled={disabled}
              motion={rowMotion?.[task.uid] ?? 'idle'}
              errorMessage={rowErrors?.[task.uid]}
            />
          ))}
        </ul>
      );
      break;
  }

  return (
    <div className="focus-listing" aria-live="polite">
      {content}
    </div>
  );
}
