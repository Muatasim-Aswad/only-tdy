import type { ComponentProps } from 'react';
import { classNames } from './classNames.ts';

export function ActionButton({
  primary = false,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { readonly primary?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      className={classNames(
        'min-h-11 inline-flex items-center justify-center gap-2 rounded-[6px] border px-4 py-2 text-action cursor-pointer transition-[background-color,border-color,color,opacity] duration-120 ease-focus focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:3px] enabled:active:opacity-70 disabled:cursor-default disabled:opacity-50 aria-busy:cursor-wait',
        primary
          ? 'border-accent bg-accent text-canvas enabled:hover:opacity-85 enabled:focus-visible:opacity-85'
          : 'border-line text-accent enabled:hover:opacity-85 enabled:focus-visible:opacity-85 enabled:hover:bg-selection enabled:focus-visible:bg-selection aria-[pressed=true]:border-accent aria-[pressed=true]:bg-selection',
        className,
      )}
    />
  );
}
