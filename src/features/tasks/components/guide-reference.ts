import type { english } from '../messages.ts';
import type { ChipSpan } from './TokenChips.tsx';

/** One mark the guide explains: what is typed, and what it does. */
export interface GuideEntry {
  readonly typedKey: keyof typeof english;
  readonly meaningKey: keyof typeof english;
  readonly chipKind?: ChipSpan['kind'];
}

/* The quick-entry grammar, said for the person typing it. It has to agree
   with `parseQuickEntry` and `parseSearch`, which are the grammar itself. */
export const GUIDE_CAPTURE: readonly GuideEntry[] = [
  {
    typedKey: 'guideTokens.project',
    meaningKey: 'guideCopy.projectMeaning',
  },
  {
    typedKey: 'guideTokens.tag',
    meaningKey: 'guideCopy.tagMeaning',
  },
  {
    typedKey: 'guideTokens.note',
    meaningKey: 'guideCopy.noteMeaning',
  },
  {
    typedKey: 'guideTokens.priority',
    meaningKey: 'guideCopy.priorityMeaning',
  },
  {
    typedKey: 'guideTokens.today',
    meaningKey: 'guideCopy.commandtodayMeaning',
  },
  {
    typedKey: 'guideTokens.repeating',
    meaningKey: 'guideCopy.commandrepeatingMeaning',
  },
  {
    typedKey: 'guideTokens.due',
    chipKind: 'command',
    meaningKey: 'guideCopy.commandduedatetokenMeaning',
  },
  {
    typedKey: 'guideTokens.hide',
    chipKind: 'command',
    meaningKey: 'guideCopy.commandhidedatetokenMeaning',
  },
  {
    typedKey: 'guideTokens.multiple',
    chipKind: 'note',
    meaningKey: 'guideCopy.multiplewordsMeaning',
  },
];

export const GUIDE_DATES: readonly GuideEntry[] = [
  {
    typedKey: 'guideTokens.dateToday',
    chipKind: 'command',
    meaningKey: 'guideCopy.todayMeaning',
  },
  {
    typedKey: 'guideTokens.dateTomorrow',
    chipKind: 'command',
    meaningKey: 'guideCopy.tomorrowMeaning',
  },
  {
    typedKey: 'guideTokens.dateFormat',
    chipKind: 'command',
    meaningKey: 'guideCopy.ddmmyyyyMeaning',
  },
  {
    typedKey: 'guideTokens.relative',
    chipKind: 'command',
    meaningKey: 'guideCopy.NMeaning',
  },
];
