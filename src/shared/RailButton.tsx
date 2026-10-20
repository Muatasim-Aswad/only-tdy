import type { ComponentProps } from 'react';
import { classNames } from './classNames.ts';

export function RailButton({
  active = false,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'type'> & { readonly active?: boolean }) {
  return (
    <button
      {...props}
      type="button"
      className={classNames(
        'focus-history flex size-rail items-center justify-center cursor-pointer transition-[color,opacity] duration-120 ease-focus focus-visible:text-accent focus-visible:opacity-100 hover:text-accent hover:opacity-100',
        active
          ? 'focus-history--active text-accent opacity-100'
          : 'text-muted opacity-55',
        className,
      )}
    />
  );
}
