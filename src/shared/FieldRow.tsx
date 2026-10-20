import type { ComponentProps } from 'react';
import { classNames } from './classNames.ts';

export function FieldRow({
  children,
  block = false,
  className,
  ...props
}: ComponentProps<'div'> & {
  readonly block?: boolean;
}) {
  return (
    <div
      {...props}
      className={classNames(
        'focus-field flex min-h-14 flex-col justify-center gap-0.5 py-1.5 pl-rail min-[360px]:min-h-12 min-[360px]:flex-row min-[360px]:gap-4 [&+.focus-field]:border-t [&+.focus-field]:border-line',
        block
          ? 'focus-field--block min-[360px]:items-baseline'
          : 'min-[360px]:items-center',
        className,
      )}
    >
      {children}
    </div>
  );
}
