import type { TaskPriority } from '../contracts.ts';

import { classNames } from '../../../shared/classNames.ts';

export interface CompletionButtonProps {
  /** Named in the accessible label so the control is unambiguous out of context. */
  readonly taskTitle: string;
  readonly done: boolean;
  /** Tints the empty box. Low priority leaves it in the plain line colour. */
  readonly priority: TaskPriority;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}

/**
 * The one action on a task row, in Today, in Backlog, and in history alike.
 * The visible box is 20px; the button around it is the full 44px target.
 *
 * It is a checkbox in the plainest sense: pressing it ticks an open task and
 * unticks a done one. Nothing here is a one-way door, so the control says what
 * the next press will do rather than reporting a final state.
 *
 * The empty box is also where priority is shown, so the row needs no second
 * mark for it. Once ticked the box is filled in the accent: what is done is
 * done, and how urgent it was stops being the point.
 */
export function CompletionButton({
  taskTitle,
  done,
  priority,
  onToggle,
  disabled = false,
}: CompletionButtonProps) {
  return (
    <button
      type="button"
      className="focus-complete"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={done}
      aria-label={done ? `Reopen “${taskTitle}”` : `Complete “${taskTitle}”`}
    >
      <span
        className={classNames(
          'focus-complete__box',
          priority !== 'low' && `focus-complete__box--${priority}`,
        )}
        aria-hidden="true"
      />
    </button>
  );
}
