import { classNames } from './classNames.ts';

export interface InlineMessageProps {
  /** Absent means the region is empty, which is its resting state. */
  readonly message?: string | undefined;
  readonly tone?: 'neutral' | 'error';
  /*
   * What the line is. A `reply` answers something that was just done and takes
   * the quiet fill that marks it as an answer; a `hint` was not asked for and
   * takes none, the same way the backlog's own hint does not.
   */
  readonly kind?: 'reply' | 'hint';
  /** Lets a screen hold its own space for the region. */
  readonly className?: string;
}

/** Inline feedback remains a live region while its empty space collapses. */
export function InlineMessage({
  message,
  tone = 'neutral',
  kind = 'reply',
  className = 'focus-feedback',
}: InlineMessageProps) {
  return (
    <div className={className} aria-live="polite">
      {message === undefined || message === '' ? null : (
        <p
          className={classNames(
            'focus-message mt-2 ms-rail rounded-message pt-2 pe-3 pb-2 ps-3 bg-surface text-muted',
            kind === 'hint' &&
              'focus-message--plain [&.focus-message--plain]:rounded-[0] [&.focus-message--plain]:px-0 [&.focus-message--plain]:bg-transparent',
            tone === 'error' &&
              'focus-message--error [&.focus-message--error]:text-priority-high',
            'text-action',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
