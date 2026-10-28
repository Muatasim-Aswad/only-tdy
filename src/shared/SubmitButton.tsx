import type { ComponentProps } from 'react';
import { classNames } from './classNames.ts';

export function SubmitButton({
  className,
  type = 'submit',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      type={type}
      className={classNames(
        className,
        'min-h-11 min-w-14 flex-none cursor-pointer animate-submit px-2 text-end text-action text-accent transition-colors duration-120 ease-focus focus-visible:underline focus-visible:underline-offset-[3px] disabled:cursor-default disabled:text-muted motion-reduce:animate-none',
      )}
    />
  );
}
