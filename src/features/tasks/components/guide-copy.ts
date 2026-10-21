import type { ChipSpan } from './TokenChips.tsx';

export const GUIDE_COPY = {
  guideCaptureHeading: 'Capturing a task',
  guideCaptureIntro:
    'Use these in quick entry or a task’s title. /repeating is for Add fields only.',
  guideCaptureExample: 'call plumber +Home #errand !3 /today',
  guideSearchHeading: 'Searching',
  guideSearchIntro:
    'Toggle the empty field’s icon to search this page. Search titles and notes, or filter with #tag, +project or !priority. The clear icon resets the field.',
  guideDatesHeading: 'Date tokens',
  guideDatesIntro: 'Use a date token after /due: or /hide:.',
} as const;

/** One mark the guide explains: what is typed, and what it does. */
export interface GuideEntry {
  readonly typed: string;
  readonly meaning: string;
  readonly chipKind?: ChipSpan['kind'];
}

/* The quick-entry grammar, said for the person typing it. It has to agree
   with `parseQuickEntry` and `parseSearch`, which are the grammar itself. */
export const GUIDE_CAPTURE: readonly GuideEntry[] = [
  {
    typed: '+project',
    meaning: 'Project. One per task; a new name creates it.',
  },
  { typed: '#tag', meaning: 'Tag. As many as you like.' },
  { typed: '*note', meaning: 'Note. One per task.' },
  {
    typed: '!priority',
    meaning: 'Priority: !1 low, !2 medium, !3 high. Low if left out.',
  },
  { typed: '/today', meaning: 'Put it on Today instead of the backlog.' },
  {
    typed: '/repeating',
    meaning: 'Open the repeating task form before saving.',
  },
  {
    typed: '/due:<date token>',
    chipKind: 'command',
    meaning: 'Due date. Due or overdue tasks move to Today.',
  },
  {
    typed: '/hide:<date token>',
    chipKind: 'command',
    meaning: 'Hide from Backlog until that day. Today clears it.',
  },
  {
    typed: '(multiple words)',
    chipKind: 'note',
    meaning:
      'Wrap a project, tag or note with several words: +(Big move), #(next week), *(call first).',
  },
];

export const GUIDE_DATES: readonly GuideEntry[] = [
  { typed: 'today', chipKind: 'command', meaning: 'Today’s date.' },
  { typed: 'tomorrow', chipKind: 'command', meaning: 'Tomorrow’s date.' },
  {
    typed: 'dd-mm-yyyy',
    chipKind: 'command',
    meaning:
      'Day-month-year. Month and year autocomplete from today if omitted. Tab accepts the suggested full date.',
  },
  {
    typed: '+N',
    chipKind: 'command',
    meaning:
      'N calendar days from today. +3 means three days; +3d and +3days also work.',
  },
];
