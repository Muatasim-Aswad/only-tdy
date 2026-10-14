import { classNames } from '../../../shared/classNames.ts';
import { COPY } from './copy.ts';

export interface HomeToggleProps {
  /** True while Today is showing. */
  readonly active: boolean;
  readonly onToggle: () => void;
}

/**
 * The first mark at the foot of the page: a house, which is the page only-tdy
 * opens on — Today, and nothing else.
 *
 * It is the same control as the two marks beside it, in a different shape: a
 * pressed button that reports whether its page is the one showing, so the
 * three together answer the question the screen has no title to answer. It
 * comes first because it is the page the other two come back to; read left to
 * right, the rail then says home, waiting, done.
 */
export function HomeToggle({ active, onToggle }: HomeToggleProps) {
  return (
    <button
      type="button"
      className={classNames('focus-history', active && 'focus-history--active')}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={COPY.home}
      title={COPY.home}
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
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6 9.8V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.8" />
        <path d="M10 20v-5.5h4V20" />
      </svg>
    </button>
  );
}
