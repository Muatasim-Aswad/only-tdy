import { memo, useCallback, type MouseEvent } from 'react';

import type { Task } from '../contracts.ts';
import { useDateTimezone } from '../date-timezone.ts';
import { displayDate, hideDate } from '../domain/task-dates.ts';
import { taskPath } from '../../../config/routes.ts';

import { classNames } from '../../../shared/classNames.ts';
import { CompletionButton } from './CompletionButton.tsx';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';
import { PriorityIndicator } from './PriorityIndicator.tsx';
import { PriorityMarker } from './PriorityMarker.tsx';
import { SelectionButton } from './SelectionButton.tsx';
import { TaskMetadata } from './TaskMetadata.tsx';

/**
 * What the row is doing right now. `idle` is the resting row; the other two are
 * the only animated moments in the interface, and each answers an action the
 * person just took.
 *
 * Completion is not among them: a done task keeps its row and simply sorts to
 * the bottom, so its appearance follows `task.status` rather than a moment.
 */
export type TaskRowMotion = 'idle' | 'inserted' | 'restoring';

const MOTION_CLASS: Readonly<Record<TaskRowMotion, string>> = {
  idle: '',
  inserted: 'focus-row--inserted',
  restoring: 'focus-row--restoring',
};

/**
 * What the box on this row is for. `complete` ticks the task off; `select`
 * chooses it, which is what the backlog page's box does; `view` has no box at
 * all — Today's matches in a backlog search, which are there to be seen and
 * opened, not chosen. The row is otherwise identical, so a task reads the same
 * wherever it is listed.
 */
export type TaskRowMode = 'complete' | 'select' | 'view';

export interface TaskRowProps {
  readonly task: Task;
  readonly details?: boolean;
  readonly mode?: TaskRowMode;
  /** True only in `select` mode: this row is one of the chosen. */
  readonly selected?: boolean;
  /** Presses the box: ticks, unticks, or chooses, according to the mode. */
  readonly onToggle: (uid: string) => void;
  /** Takes the click that would otherwise leave and reload the whole app.
      One stable function for the whole list; the row supplies its own uid. */
  readonly onOpen?:
    ((event: MouseEvent<HTMLAnchorElement>, uid: string) => void) | undefined;
  /** Offline and expired sessions disable completion without hiding it. */
  readonly disabled?: boolean;
  readonly motion?: TaskRowMotion | undefined;
  /** Floating feedback after a completion that did not stick. */
  readonly errorMessage?: string | undefined;
}

/**
 * One task, identical in Today, in Backlog, and in history. There are two
 * targets: the box, which ticks it, and the title, which opens it.
 *
 * The title is a real link to the task's own address, so it can be opened in
 * a new tab, copied, and shared like any other. At rest it is drawn exactly
 * as the plain title always was — no colour of its own, no underline, no
 * hover rule on the row body — and the affordance arrives only under the
 * pointer and under focus. A list of twenty tasks is a list, not twenty
 * links shouting at once.
 *
 * A done row is the same row: ticked, struck through, and still readable —
 * and still pressable, because the tick can be taken back.
 */
export const TaskRow = memo(function TaskRow({
  task,
  details = false,
  mode = 'complete',
  selected = false,
  onToggle,
  onOpen,
  disabled = false,
  motion = 'idle',
  errorMessage,
}: TaskRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(task.uid);
  }, [onToggle, task.uid]);

  const handleOpen = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onOpen?.(event, task.uid);
    },
    [onOpen, task.uid],
  );

  const timezone = useDateTimezone();
  const hiddenUntil = hideDate(task.deferUntil ?? '', timezone);
  const hasMetadata =
    details ||
    (task.projectName !== undefined && task.projectName !== '') ||
    task.tags.length > 0;
  const done = task.status === 'done';
  const choosing = mode === 'select';

  return (
    <li
      className={classNames(
        'focus-row',
        hasMetadata && 'focus-row--metadata',
        done && 'focus-row--done',
        choosing && selected && 'focus-row--selected',
        MOTION_CLASS[motion],
      )}
    >
      {mode === 'view' ? (
        details ? (
          <PriorityIndicator priority={task.priority} />
        ) : (
          <span className="focus-row__spacer" aria-hidden="true" />
        )
      ) : choosing ? (
        <SelectionButton
          taskTitle={task.title}
          selected={selected}
          priority={task.priority}
          onToggle={handleToggle}
          disabled={disabled}
        />
      ) : (
        <CompletionButton
          taskTitle={task.title}
          done={done}
          priority={task.priority}
          onToggle={handleToggle}
          disabled={disabled}
        />
      )}
      <div className="focus-row__body">
        <a
          className="focus-row__title text-task"
          href={taskPath(task.uid)}
          onClick={handleOpen}
        >
          {task.title}
        </a>
        <TaskMetadata projectName={task.projectName} tags={task.tags} />
        {details ? (
          <>
            <p className="focus-row__badges text-meta">
              {!done ? (
                <span className="focus-row__badge focus-row__badge--list">
                  {task.status === 'not_started' ? 'Backlog' : 'Today'}
                </span>
              ) : null}
              {hiddenUntil !== '' ? (
                <span className="focus-row__badge">
                  Hide until {displayDate(hiddenUntil)}
                </span>
              ) : null}
              {task.dueDate ? (
                <span className="focus-row__badge">
                  Due {displayDate(task.dueDate.slice(0, 10))}
                </span>
              ) : null}
            </p>
            {task.note ? (
              <p className="focus-row__note text-meta">{task.note}</p>
            ) : null}
          </>
        ) : null}
        <FeedbackToast
          className="focus-row-feedback"
          message={errorMessage}
          tone="error"
        />
      </div>
      {mode === 'view' && details ? null : (
        <PriorityMarker priority={task.priority} />
      )}
    </li>
  );
});
