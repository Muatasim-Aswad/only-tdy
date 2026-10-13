import type { MouseEvent } from 'react';

import { COPY } from './copy.ts';
import { FeedbackToast } from '../shared/FeedbackToast.tsx';

export interface UpdateToastProps {
  readonly label?: string | undefined;
  readonly href: string;
  readonly onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
  readonly onDismiss: () => void;
}

export function UpdateToast({
  label,
  href,
  onOpen,
  onDismiss,
}: UpdateToastProps) {
  return (
    <FeedbackToast
      className="focus-update-feedback"
      message={label === undefined ? undefined : COPY.updated(label)}
      onDismiss={onDismiss}
      action={
        <a
          className="focus-toast__action"
          href={href}
          onClick={(event) => {
            onDismiss();
            onOpen(event);
          }}
        >
          Details
        </a>
      }
    />
  );
}
