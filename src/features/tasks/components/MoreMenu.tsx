import { guidanceFacts } from '../guidance/events.ts';
import { RailButton } from '../../../shared/RailButton.tsx';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { COPY } from './copy.ts';

const MorePanel = lazy(() =>
  import('./MorePanel.tsx').then((module) => ({ default: module.MorePanel })),
);

export interface MoreMenuProps {
  /** True while the record is the page on screen, so the mark stays lit. */
  readonly historyActive: boolean;
  readonly onOpenHistory: () => void;
}

export function MoreMenu({ historyActive, onOpenHistory }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) close(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close(true);
    }

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  return (
    <div className="focus-more relative" ref={root}>
      <RailButton
        data-tour="more"
        ref={trigger}
        active={open}
        onClick={() => {
          if (!open) guidanceFacts('more');
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={COPY.more}
        title={COPY.more}
      >
        <svg
          className="focus-home__icon block"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </RailButton>
      {open ? (
        <Suspense fallback={null}>
          <MorePanel
            id={menuId}
            historyActive={historyActive}
            onOpenHistory={onOpenHistory}
            onClose={close}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
