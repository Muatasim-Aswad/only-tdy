import { t } from '../messages.ts';
import { SubmitButton } from '../../../shared/SubmitButton.tsx';
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
  const said = chosen
    ? t('actions.selected', { count: selectedCount })
    : undefined;

  return (
    <>
      <FeedbackToast
        className="focus-backlog__feedback"
        message={message}
        tone={tone}
      />
      <div
        className={classNames(
          'focus-backlog__actions flex items-center gap-4 ps-rail',
          chosen ? 'min-h-11' : 'focus-backlog__actions--empty min-h-0',
        )}
      >
        <div
          className="focus-backlog__status min-w-0 flex-auto"
          aria-live="polite"
        >
          {said === undefined ? null : (
            <p
              className={classNames(
                'focus-backlog__count text-muted',
                'text-action',
              )}
            >
              {said}
            </p>
          )}
        </div>
        {chosen ? (
          <SubmitButton
            type="button"
            className="focus-detail__save ms-auto"
            onClick={onMove}
            disabled={disabled || moving}
          >
            {COPY.moveToToday}
          </SubmitButton>
        ) : null}
      </div>
    </>
  );
}
