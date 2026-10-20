import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react';

import { CaptureField } from './CaptureField.tsx';
import { SearchField } from './SearchField.tsx';

interface TaskInputProps {
  readonly mode: 'add' | 'search';
  readonly onToggleMode?: (() => void) | undefined;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly pageName?: string;
  readonly label?: string;
  readonly projects?: readonly string[] | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly disabled?: boolean;
}

const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
const KEY_SEGMENTS = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const INTERACTIVE = `${EDITABLE}, button, a[href], [role="button"]`;

export function TaskInput({
  mode,
  onToggleMode,
  value,
  onValueChange,
  onSubmit,
  pageName,
  label,
  projects,
  tags,
  disabled,
}: TaskInputProps) {
  const root = useRef<HTMLFormElement>(null);
  const focusPending = useRef(false);

  useLayoutEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const field = root.current?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >('input, textarea');
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
  }, [mode, value]);

  const toggle =
    onToggleMode === undefined
      ? undefined
      : () => {
          focusPending.current = true;
          onToggleMode();
        };

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey) return;
    if (
      document.querySelector(
        '[role="menu"], [role="dialog"], [aria-modal="true"], dialog[open], [popover]:popover-open, button[aria-expanded="true"][aria-controls]',
      )
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    const field = root.current?.querySelector('input, textarea');
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      if (!toggle || (target !== field && target?.closest(EDITABLE))) return;
      event.preventDefault();
      if (!event.repeat) toggle();
      return;
    }
    if (
      event.ctrlKey ||
      event.metaKey ||
      Array.from(KEY_SEGMENTS.segment(event.key)).length !== 1 ||
      target?.closest(INTERACTIVE) ||
      window.getSelection()?.toString()
    )
      return;
    event.preventDefault();
    focusPending.current = true;
    onValueChange(value + event.key);
  });

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const common = {
    formRef: root,
    value,
    onValueChange,
    onSubmit,
    onToggleMode: toggle,
    projects,
    tags,
    ...(disabled === undefined ? {} : { disabled }),
  };
  return (
    <>
      {mode === 'add' ? (
        <CaptureField {...common} />
      ) : (
        <SearchField
          {...common}
          {...(pageName === undefined ? {} : { pageName })}
          {...(label === undefined ? {} : { label })}
        />
      )}
    </>
  );
}
