import type { TaskPriority } from '../contracts.ts';
import { classNames } from '../../../shared/classNames.ts';
import { PRIORITY_NAME } from './copy.ts';

const PRIORITY_COLOR: Readonly<Record<TaskPriority, string>> = {
  low: 'text-line',
  medium: 'focus-row__priority--medium text-priority-medium',
  high: 'focus-row__priority--high text-priority-high',
};

export function PriorityIndicator({
  priority,
}: {
  readonly priority: TaskPriority;
}) {
  const label = `${PRIORITY_NAME[priority]} priority`;
  return (
    <span
      className={classNames(
        'focus-row__priority flex flex-none items-center justify-center w-rail h-rail mt-1.5',
        PRIORITY_COLOR[priority],
      )}
      role="img"
      aria-label={label}
      title={label}
    >
      <span
        className="focus-row__priority-dot w-1.5 h-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
    </span>
  );
}
