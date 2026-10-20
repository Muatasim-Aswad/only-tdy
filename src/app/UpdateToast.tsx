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
          className="focus-toast__action flex-none pt-3 pr-2 pb-3 pl-2 text-accent focus-visible:underline focus-visible:underline-offset-[3px]"
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
