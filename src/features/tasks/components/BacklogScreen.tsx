import { t } from '../messages.ts';
import { PageShell } from '../../../shared/PageShell.tsx';
import { TaskInput } from './TaskInput.tsx';
import { CaptureFeedbackMessage } from './CaptureFeedbackMessage.tsx';
import type { CaptureFeedback } from '../contracts.ts';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type MouseEvent,
} from 'react';

import type { FocusDestination, TaskListState } from '../contracts.ts';
import { orderBySelection } from '../backlog-state.ts';

import { BacklogActions } from './BacklogActions.tsx';
import { FocusFooter } from './FocusFooter.tsx';
import { TaskList } from './TaskList.tsx';

const IGNORE = () => undefined;

export interface BacklogScreenProps {
  readonly inputMode?: 'add' | 'search';
  readonly onToggleInputMode?: (() => void) | undefined;
  readonly captureValue?: string;
  readonly onCaptureChange?: (value: string) => void;
  readonly onCaptureSubmit?: () => void;
  readonly onDismissFeedback?: (() => void) | undefined;
  readonly feedback?: CaptureFeedback;
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSearchSubmit: () => void;
  readonly listState: TaskListState;
  /** True while a term is in force, so an empty list says which kind of empty. */
  readonly searching: boolean;
  readonly selectedUids: ReadonlySet<string>;
  readonly onToggleSelection: (uid: string) => void;
  readonly onMove: () => void;
  readonly onOpenTask?:
    ((event: MouseEvent<HTMLAnchorElement>, uid: string) => void) | undefined;
  readonly onRetry: () => void;
  readonly onNavigate: (destination: FocusDestination) => void;
  /** Floating feedback for a refused search or failed move. */
  readonly message?: string | undefined;
  readonly messageTone?: 'neutral' | 'error';
  readonly moving?: boolean;
  /** Offline or expired: choosing and moving are withheld, nothing is hidden. */
  readonly disabled?: boolean;
  /** Project and tag names the field offers while a term is typed. */
  readonly projects?: readonly string[] | undefined;
  readonly tags?: readonly string[] | undefined;
}

/**
 * The backlog, on a page of its own.
 *
 * It is the same column as every other only-tdy screen and it is read in the same
 * order: one field at the top, selection controls, the list, then the way out.
 * Transient feedback floats above the page. Where the open list asks what needs doing, this one asks
 * what is already waiting — so the field searches rather than captures, and
 * the box on a row chooses rather than ticks.
 *
 * Nothing here is a mode the page can be stuck in. A term narrows the list and
 * clearing the field returns it; choosing rows lifts them to the top of the
 * list and taking the choice back sets them down where they were.
 *
 */
export function BacklogScreen({
  inputMode = 'search',
  onToggleInputMode,
  captureValue = '',
  onCaptureChange = IGNORE,
  onCaptureSubmit = IGNORE,
  feedback = { kind: 'none' },
  onDismissFeedback,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  listState,
  searching,
  selectedUids,
  onToggleSelection,
  onMove,
  onOpenTask,
  onRetry,
  onNavigate,
  message,
  messageTone = 'neutral',
  moving = false,
  disabled = false,
  projects,
  tags,
}: BacklogScreenProps) {
  const { ledgerRef, toggleSelection } = useBacklogSelection(
    selectedUids,
    disabled,
    onToggleSelection,
  );

  /* Only the order shown changes; what is chosen and what is moved are still
     the page's own set, so lifting a row is a matter of drawing, not state. */
  const shown = useMemo<TaskListState>(
    () =>
      listState.kind === 'ready'
        ? {
            ...listState,
            tasks: orderBySelection(listState.tasks, selectedUids),
          }
        : listState,
    [listState, selectedUids],
  );

  return (
    <PageShell>
      <TaskInput
        mode={inputMode}
        onToggleMode={onToggleInputMode}
        value={inputMode === 'search' ? searchValue : captureValue}
        onValueChange={
          inputMode === 'search' ? onSearchChange : onCaptureChange
        }
        onSubmit={inputMode === 'search' ? onSearchSubmit : onCaptureSubmit}
        projects={projects}
        tags={tags}
        disabled={disabled}
      />
      {inputMode === 'add' ? (
        <CaptureFeedbackMessage
          feedback={feedback}
          onDismiss={onDismissFeedback}
          onOpenTask={onOpenTask}
        />
      ) : null}
      <div
        ref={ledgerRef}
        className="focus-backlog__ledger [overflow-anchor:none]"
      >
        <BacklogActions
          selectedCount={selectedUids.size}
          onMove={onMove}
          message={message}
          tone={messageTone}
          moving={moving}
          disabled={disabled}
        />
        <TaskList
          state={shown}
          mode="select"
          selectedUids={selectedUids}
          onToggle={toggleSelection}
          onOpenTask={onOpenTask}
          onRetry={onRetry}
          emptyMessage={
            searching ? t('copy.backlogSearchEmpty') : t('copy.backlogEmpty')
          }
          ruled
          disabled={disabled}
        />
      </div>
      <FocusFooter current="backlog" onNavigate={onNavigate} />
    </PageShell>
  );
}

function useBacklogSelection(
  selectedUids: ReadonlySet<string>,
  disabled: boolean,
  onToggleSelection: (uid: string) => void,
) {
  const ledgerRef = useRef<HTMLDivElement>(null);
  const readingPosition = useRef<{
    row: HTMLElement;
    top: number;
    keyboardTarget: HTMLButtonElement | null;
  } | null>(null);

  const toggleSelection = useCallback(
    (uid: string) => {
      readingPosition.current = null;
      const ledger = ledgerRef.current;
      if (ledger !== null && window.scrollY > 0 && !disabled) {
        const actionsBottom =
          ledger
            .querySelector('.focus-backlog__actions')
            ?.getBoundingClientRect().bottom ?? 0;
        const row = Array.from(
          ledger.querySelectorAll<HTMLElement>(
            '[data-task-uid]:not(.focus-row--selected)',
          ),
        ).find((row) => {
          const bounds = row.getBoundingClientRect();
          return (
            row.dataset.taskUid !== uid &&
            bounds.top >= Math.max(0, actionsBottom) &&
            bounds.top < window.innerHeight
          );
        });
        if (row !== undefined) {
          const focused = document.activeElement;
          const focusedRow = focused?.closest<HTMLElement>('[data-task-uid]');
          const keyboardTarget =
            focused?.matches(':focus-visible') &&
            focusedRow?.dataset.taskUid === uid
              ? ((
                  focusedRow.nextElementSibling ??
                  focusedRow.previousElementSibling
                )?.querySelector<HTMLButtonElement>(
                  'button[aria-pressed="false"]',
                ) ?? null)
              : null;
          readingPosition.current = {
            row,
            top: row.getBoundingClientRect().top,
            keyboardTarget,
          };
        }
      }
      onToggleSelection(uid);
    },
    [disabled, onToggleSelection],
  );

  useLayoutEffect(() => {
    const position = readingPosition.current;
    readingPosition.current = null;
    if (!position?.row.isConnected) return;
    window.scrollBy({
      top: position.row.getBoundingClientRect().top - position.top,
      behavior: 'instant',
    });
    const focusedBounds = document.activeElement?.getBoundingClientRect();
    if (
      focusedBounds !== undefined &&
      (focusedBounds.bottom < 0 || focusedBounds.top > window.innerHeight)
    ) {
      position.keyboardTarget?.focus({ preventScroll: true });
    }
  }, [selectedUids]);

  return { ledgerRef, toggleSelection };
}
