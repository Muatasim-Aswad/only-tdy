import type { TaskPriority } from '../contracts.ts';

/**
 * Priority is peripheral by design. Colour carries it visually — it tints the
 * border of the empty completion box rather than adding a mark of its own —
 * and this carries it to assistive technology, which cannot see a border.
 * Neither ever prints the token the user typed.
 */
const PRIORITY_LABEL: Readonly<Record<'high' | 'medium', string>> = {
  high: 'High priority',
  medium: 'Medium priority',
};

export interface PriorityMarkerProps {
  readonly priority: TaskPriority;
}

export function PriorityMarker({ priority }: PriorityMarkerProps) {
  if (priority === 'low') {
    // Most tasks are low priority. Announcing it — like drawing it — would turn
    // the quiet default into the loudest thing in the list.
    return null;
  }

  return <span className="sr-only">{PRIORITY_LABEL[priority]}</span>;
}
