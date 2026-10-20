import type { MouseEvent } from 'react';

import { APP_BASE_PATH } from '../../../config/base-path.ts';

import { COPY } from './copy.ts';

export interface BackLinkProps {
  /** The source list, with a fallback for directly opened forms. */
  readonly href?: string;
  readonly label?: string;
  readonly onNavigate?:
    ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
}

export function BackLink({
  href = APP_BASE_PATH,
  label = COPY.backToList,
  onNavigate,
}: BackLinkProps) {
  return (
    <a
      className="focus-back inline-flex items-center text-muted cursor-pointer transition-[color] duration-120 ease-focus focus-visible:text-accent hover:text-accent"
      href={href}
      onClick={onNavigate}
    >
      <span
        className="focus-back__mark flex items-center justify-center w-rail"
        aria-hidden="true"
      >
        <svg
          className="focus-home__icon block"
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
      <span className="text-action">{label}</span>
    </a>
  );
}
