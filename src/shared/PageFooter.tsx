import type { ReactNode } from 'react';
import { classNames } from './classNames.ts';

export function PageFooter({
  children,
  align = 'rail',
}: {
  readonly children: ReactNode;
  readonly align?: 'rail' | 'content';
}) {
  return (
    <footer
      className={classNames(
        'focus-footer sticky bottom-0 mt-auto flex items-center gap-1 bg-[linear-gradient(to_bottom,transparent_0,var(--canvas)_32px)] pt-8 pb-[max(32px,env(safe-area-inset-bottom))] forced-colors:bg-none forced-colors:bg-[Canvas]',
        align === 'content' && '[&_.focus-history]:justify-start',
      )}
    >
      {children}
    </footer>
  );
}
