import type { MouseEvent } from 'react';

import { APP_BASE_PATH } from '../../../config/base-path.ts';

import { COPY } from './copy.ts';

export interface BackLinkProps {
  /** Where the list is. The record and the open list are different addresses. */
  readonly href?: string;
  readonly onNavigate?:
    ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
}

/**
 * The way back, at the head of the task page.
 *
 * Every other page in only-tdy keeps leaving at the foot, because every other
 * page is a list you read down to the end of. This one is a form: the end of
 * it is Save and Delete, and a way out sitting beside them would be a third
 * verb in a row of two — so leaving goes back to the top, above the first
 * field, where nothing has to be read past to reach it and nothing it sits
 * next to can be pressed by mistake.
 *
 * It says where it goes in words rather than in a mark alone. The foot of a
 * list page has two marks that hold a state between them and can be learned
 * once; this is one link on one page, and naming it costs a line the page has
 * room for.
 *
 * It is a link, not a history call: the address it goes to is the list the
 * task belongs in, which is the right answer whether the page was opened from
 * that list or from a link in a message.
 */
export function BackLink({ href = APP_BASE_PATH, onNavigate }: BackLinkProps) {
  return (
    <a className="focus-back" href={href} onClick={onNavigate}>
      <span className="focus-back__mark" aria-hidden="true">
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
          focusable="false"
        >
          <path d="M19.5 12h-15" />
          <path d="M10.5 6 4.5 12l6 6" />
        </svg>
      </span>
      <span className="text-action">{COPY.backToList}</span>
    </a>
  );
}
