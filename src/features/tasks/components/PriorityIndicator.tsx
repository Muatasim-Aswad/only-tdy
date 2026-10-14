import type { TaskPriority } from '../contracts.ts';
import { classNames } from '../../../shared/classNames.ts';
import { PRIORITY_NAME } from './copy.ts';

export function PriorityIndicator({
  priority,
}: {
  readonly priority: TaskPriority;
}) {
  const label = `${PRIORITY_NAME[priority]} priority`;
  return (
    <span
      className={classNames(
        'focus-row__priority',
        priority !== 'low' && `focus-row__priority--${priority}`,
      )}
      role="img"
      aria-label={label}
      title={label}
    >
      <span className="focus-row__priority-dot" aria-hidden="true" />
    </span>
  );
}
