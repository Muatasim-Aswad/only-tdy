import { classNames } from './classNames.ts';
import type { ReactNode } from 'react';

interface SelectProps {
  readonly className?: string;
  readonly controlClassName?: string;
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly description?: string;
}

/**
 * A native select with its box taken off. The platform arrow goes with the
 * box, so a mark of the same family as the capture `+` takes its place: the
 * muted resting weight the whole interface uses for a signpost, coming up to
 * the accent while the control has focus.
 *
 * It stays a real `<select>` with real `<option>` children, because the open
 * list is styled rather than rebuilt: `appearance: base-select` moves that
 * list into the page, where the stylesheet can reach it, and leaves the
 * keyboard, the form and the accessibility tree exactly as the platform
 * wrote them.
 *
 * A control holding the empty choice is marked as such, so the stylesheet can
 * say it the way it says every other prompt: in the muted ink, because it is
 * the absence of an answer rather than one.
 */
export function Select({
  id,
  className,
  controlClassName,
  value,
  onChange,
  children,
  disabled,
  description,
}: SelectProps) {
  return (
    <span
      className={classNames(
        'focus-select group/select flex items-center gap-1.5 min-w-0 min-[360px]:flex-auto',
        className,
      )}
      data-empty={value === '' ? '' : undefined}
    >
      <select
        id={id}
        className={classNames(
          'focus-select__control min-[360px]:flex-auto text-task',
          controlClassName,
        )}
        value={value}
        disabled={disabled}
        aria-description={description}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {children}
      </select>
      <svg
        className="focus-select__mark flex-none block text-muted opacity-55 pointer-events-none transition-[color,opacity] duration-140 ease-focus group-focus-within/select:text-accent group-focus-within/select:opacity-100"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m6 9.5 6 6 6-6" />
      </svg>
    </span>
  );
}
