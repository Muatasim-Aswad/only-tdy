import { useSyncExternalStore } from 'react';

import {
  readDuePromotion,
  setDuePromotion,
  subscribeDuePromotion,
} from '../due-promotion.ts';

export function DuePromotionAction() {
  const enabled = useSyncExternalStore(subscribeDuePromotion, readDuePromotion);
  return (
    <button
      type="button"
      className="focus-more__item text-action"
      aria-label="Automatically move due tasks to Today"
      aria-pressed={enabled}
      onClick={() => {
        setDuePromotion(!enabled);
      }}
    >
      <svg
        className="focus-more__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="3.5" y="5.5" width="17" height="15" rx="1.5" />
        <path d="M7 3v5M17 3v5M3.5 10h17" />
        {enabled ? <path d="m8 15 2.5 2.5L16 12" /> : <path d="M8 15h8" />}
      </svg>
      Due tasks to Today: {enabled ? 'On' : 'Off'}
    </button>
  );
}
