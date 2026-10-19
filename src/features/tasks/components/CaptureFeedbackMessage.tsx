import type { MouseEvent } from 'react';

import type { CaptureFeedback } from '../contracts.ts';
import { taskPath } from '../../../config/routes.ts';

import { COPY } from './copy.ts';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';

export interface CaptureFeedbackMessageProps {
  readonly feedback: CaptureFeedback;
  readonly onDismiss?: (() => void) | undefined;
  readonly onOpenTask?:
    ((event: MouseEvent<HTMLAnchorElement>, uid: string) => void) | undefined;
}

export function CaptureFeedbackMessage({
  feedback,
  onDismiss,
  onOpenTask,
}: CaptureFeedbackMessageProps) {
  switch (feedback.kind) {
    case 'none':
      return <FeedbackToast />;
    case 'error':
      return (
        <FeedbackToast
          message={feedback.message}
          tone="error"
          onDismiss={onDismiss}
        />
      );
    case 'added-to-backlog':
      return (
        <FeedbackToast
          key={feedback.uid}
          message={COPY.addedToBacklog}
          duration={8000}
          onDismiss={onDismiss}
          action={
            <a
              className="focus-toast__icon"
              href={taskPath(feedback.uid)}
              aria-label="Edit task"
              title="Edit task"
              onClick={(event) => {
                onOpenTask?.(event, feedback.uid);
                onDismiss?.();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
              </svg>
            </a>
          }
        />
      );
    case 'offline':
      return <FeedbackToast message={COPY.offline} />;
  }
}
