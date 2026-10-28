import { useEffect, useId, useRef, useState } from 'react';

export function HelpTip({
  label,
  text,
}: {
  readonly label: string;
  readonly text: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <span
      className="help-tip relative inline-flex flex-none items-center"
      ref={root}
    >
      <button
        type="button"
        ref={trigger}
        className="help-tip__trigger focus-visible:text-accent aria-expanded:text-accent inline-flex items-center justify-center w-11 h-11 text-muted cursor-pointer"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7v1" />
        </svg>
      </button>
      {open ? (
        <span
          className="help-tip__content absolute z-30 end-0 bottom-[calc(100%_+_4px)] w-[min(19rem,_calc(100vw_-_72px))] px-3 py-2.5 border border-line rounded-[6px] bg-surface text-ink text-meta"
          id={id}
          role="tooltip"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
