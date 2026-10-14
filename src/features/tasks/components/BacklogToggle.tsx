import { classNames } from '../../../shared/classNames.ts';
import { COPY } from './copy.ts';

export interface BacklogToggleProps {
  /** True while the backlog is the page on screen. */
  readonly active: boolean;
  readonly onToggle: () => void;
}

/**
 * The second mark at the foot of the page: a stack, which is what a backlog
 * is — the things set down to come back to, in the order they were set down.
 *
 * It behaves exactly as the record's mark beside it. Both are pressed buttons
 * rather than links because both report which page is showing, and pressing
 * the lit one returns to the open list; that shared behaviour is what keeps
 * the marks reading as one rail rather than as a tab bar.
 *
 * The title carries the same sentence the label does, so a pointer resting on
 * an unnamed mark is told what it is without the foot of the page having to
 * say it in ink.
 */
export function BacklogToggle({ active, onToggle }: BacklogToggleProps) {
  return (
    <button
      type="button"
      className={classNames('focus-history', active && 'focus-history--active')}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={COPY.backlog}
      title={COPY.backlog}
    >
      <svg
        className="focus-home__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M7.5 4.5h9" />
        <path d="M5.5 8h13" />
        <path d="M5 11.5h14v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      </svg>
    </button>
  );
}
