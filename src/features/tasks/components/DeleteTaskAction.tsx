import { useCallback, useRef, useState } from 'react';

import { COPY } from './copy.ts';

export interface DeleteTaskActionProps {
  readonly onDelete: () => void;
  /** True while the request is out. */
  readonly pending?: boolean;
  readonly disabled?: boolean;
}

/**
 * Deleting, in two presses, with no dialog.
 *
 * only-tdy has no overlays, and a browser confirm would freeze the page around a
 * box the interface does not own. So the control asks in place: the word
 * Delete grows a question mark and the two answers appear beside it, on the
 * same line, in the same space. Nothing moves underneath and nothing is
 * covered.
 *
 * The warning colour moves with the press that would do the deleting. At rest
 * that is Delete itself; once asked, Delete? drops back to the weight every
 * other word on the line is set in and Yes takes the colour, so the red is
 * always on the one thing that cannot be undone.
 *
 * only-tdy follows the question and comes back with the answer, so the two
 * presses are one keyboard gesture rather than a hunt for where the control
 * went.
 */
export function DeleteTaskAction({
  onDelete,
  pending = false,
  disabled = false,
}: DeleteTaskActionProps) {
  const [confirming, setConfirming] = useState(false);
  const restoreFocus = useRef(false);

  const focusOnMount = useCallback((node: HTMLButtonElement | null) => {
    node?.focus();
  }, []);

  const restoreOnMount = useCallback((node: HTMLButtonElement | null) => {
    if (node === null || !restoreFocus.current) return;
    restoreFocus.current = false;
    node.focus();
  }, []);

  const handleKeep = useCallback(() => {
    restoreFocus.current = true;
    setConfirming(false);
  }, []);

  const handleAsk = useCallback(() => {
    setConfirming(true);
  }, []);

  if (!confirming) {
    return (
      <button
        type="button"
        ref={restoreOnMount}
        className="focus-delete focus-delete--danger text-action"
        onClick={handleAsk}
        disabled={disabled || pending}
      >
        {COPY.delete}
      </button>
    );
  }

  return (
    <span className="focus-delete__confirm">
      <span className="focus-delete__question text-action">
        {COPY.deleteConfirm}
      </span>
      <button
        type="button"
        ref={focusOnMount}
        className="focus-delete focus-delete--danger text-action"
        onClick={onDelete}
        disabled={disabled || pending}
      >
        {COPY.deleteYes}
      </button>
      <button
        type="button"
        className="focus-delete text-action"
        onClick={handleKeep}
        disabled={pending}
      >
        {COPY.deleteKeep}
      </button>
    </span>
  );
}
