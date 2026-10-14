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
    ? 'Clear input'
    : mode === 'add'
      ? 'Switch to search'
      : 'Switch to add';
  return (
    <button
      type="button"
      className="focus-capture__marker focus-rail text-capture"
      aria-label={label}
      title={label}
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
