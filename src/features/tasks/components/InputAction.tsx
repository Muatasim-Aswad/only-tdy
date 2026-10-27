import { t } from '../messages.ts';
interface InputActionProps {
  readonly value: string;
  readonly mode: 'add' | 'search';
  readonly onClear: () => void;
  readonly onToggle?: (() => void) | undefined;
}

export function InputAction({
  value,
  mode,
  onClear,
  onToggle,
}: InputActionProps) {
  const filled = value !== '';
  const label = filled
    ? t('inputAction.clearInput')
    : mode === 'add'
      ? t('inputAction.switchToSearch')
      : t('inputAction.switchToAdd');
  return (
    <button
      type="button"
      className="focus-capture__marker [.focus-capture:focus-within_&]:text-accent [.focus-capture:focus-within_&]:opacity-100 flex items-center justify-center self-stretch border-0 p-0 bg-transparent cursor-pointer text-muted opacity-55 transition-[color,opacity] duration-140 ease-focus focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:2px] focus-rail flex-none w-rail text-capture"
      aria-label={label}
      title={onToggle ? t('inputAction.shortcut', { label }) : label}
      aria-keyshortcuts={!filled && onToggle ? 'Control+/ Meta+/' : undefined}
      onClick={filled ? onClear : onToggle}
      disabled={!filled && onToggle === undefined}
    >
      {filled || mode === 'search' ? (
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {filled ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <>
              <circle cx="10.5" cy="10.5" r="6" />
              <path d="m15 15 4.5 4.5" />
            </>
          )}
        </svg>
      ) : (
        '+'
      )}
    </button>
  );
}
