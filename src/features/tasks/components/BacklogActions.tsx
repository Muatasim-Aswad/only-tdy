import { classNames } from '../../../shared/classNames.ts';
import { COPY } from './copy.ts';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';

export interface BacklogActionsProps {
  /** How many rows are chosen. */
  readonly selectedCount: number;
  readonly onMove: () => void;
  /** Floating feedback about the last attempt. */
  readonly message?: string | undefined;
  readonly tone?: 'neutral' | 'error';
  readonly moving?: boolean;
  readonly disabled?: boolean;
}

/** Selection controls stay in the page; transient feedback floats. */
export function BacklogActions({
  selectedCount,
  onMove,
  message,
  tone = 'neutral',
  moving = false,
  disabled = false,
}: BacklogActionsProps) {
  const chosen = selectedCount > 0;
  const said = chosen ? `${String(selectedCount)} selected` : undefined;

  return (
    <>
      <FeedbackToast
        className="focus-backlog__feedback"
        message={message}
        tone={tone}
      />
      <div
        className={classNames(
          'focus-backlog__actions',
          !chosen && 'focus-backlog__actions--empty',
        )}
      >
        <div className="focus-backlog__status" aria-live="polite">
          {said === undefined ? null : (
            <p className={classNames('focus-backlog__count', 'text-action')}>
              {said}
            </p>
          )}
        </div>
        {chosen ? (
          <button
            type="button"
            className="focus-detail__save text-action"
            onClick={onMove}
            disabled={disabled || moving}
          >
            {COPY.moveToToday}
          </button>
        ) : null}
      </div>
    </>
  );
}
