import type { ReactNode } from 'react';

interface SelectProps {
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
  value,
  onChange,
  children,
  disabled,
  description,
}: SelectProps) {
  return (
    <span className="focus-select" data-empty={value === '' ? '' : undefined}>
      <select
        id={id}
        className="focus-select__control text-task"
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
        className="focus-select__mark"
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
