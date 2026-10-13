import type { TaskPriority } from '../contracts.ts';

import { classNames } from '../../../shared/classNames.ts';

export interface SelectionButtonProps {
  /** Named in the accessible label so the control is unambiguous out of context. */
  readonly taskTitle: string;
  readonly selected: boolean;
  /** Tints the empty box, exactly as it does on every other row. */
  readonly priority: TaskPriority;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}

/**
 * The box on a backlog row, where choosing is the thing being done.
 *
 * It is the same 20px mark in the same 44px target as the completion control,
 * and it is drawn round rather than square. Choosing is not finishing, and the
 * two questions sit one above the other on the same rail across the app — the
 * shape is what says which one this row is asking. Completion is not offered
 * here: the backlog page is for deciding what today is, and a task is ticked
 * off from Today or from its own page, where finishing it is what the screen
 * is about.
 *
 * Like every other control in only-tdy the label says what the next press will
 * do, not what the box currently looks like.
 */
export function SelectionButton({
  taskTitle,
  selected,
  priority,
  onToggle,
  disabled = false,
}: SelectionButtonProps) {
  return (
    <button
      type="button"
      className="focus-complete"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={
        selected
          ? `Leave “${taskTitle}” in Backlog`
          : `Add “${taskTitle}” to Today`
      }
    >
      <span
        className={classNames(
          'focus-complete__box',
          'focus-complete__box--choice',
          priority !== 'low' && `focus-complete__box--${priority}`,
        )}
        aria-hidden="true"
      />
    </button>
  );
}
