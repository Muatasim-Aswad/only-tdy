import { t } from '../messages.ts';
import type { ChipSpan } from './TokenChips.tsx';

export const GUIDE_COPY = {
  get guideCaptureHeading() {
    return t('guideCopy.guideCaptureHeading');
  },
  get guideCaptureIntro() {
    return t('guideCopy.guideCaptureIntro');
  },
  get guideCaptureExample() {
    return t('guideCopy.guideCaptureExampleText');
  },
  get guideSearchHeading() {
    return t('guideCopy.guideSearchHeading');
  },
  get guideSearchIntro() {
    return t('guideCopy.guideSearchIntro');
  },
  get guideDatesHeading() {
    return t('guideCopy.guideDatesHeading');
  },
  get guideDatesIntro() {
    return t('guideCopy.guideDatesIntro');
  },
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
    get typed() {
      return t('guideTokens.project');
    },
    get meaning() {
      return t('guideCopy.projectMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.tag');
    },
    get meaning() {
      return t('guideCopy.tagMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.note');
    },
    get meaning() {
      return t('guideCopy.noteMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.priority');
    },
    get meaning() {
      return t('guideCopy.priorityMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.today');
    },
    get meaning() {
      return t('guideCopy.commandtodayMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.repeating');
    },
    get meaning() {
      return t('guideCopy.commandrepeatingMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.due');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.commandduedatetokenMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.hide');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.commandhidedatetokenMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.multiple');
    },
    chipKind: 'note',
    get meaning() {
      return t('guideCopy.multiplewordsMeaning');
    },
  },
];

export const GUIDE_DATES: readonly GuideEntry[] = [
  {
    get typed() {
      return t('guideTokens.dateToday');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.todayMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.dateTomorrow');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.tomorrowMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.dateFormat');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.ddmmyyyyMeaning');
    },
  },
  {
    get typed() {
      return t('guideTokens.relative');
    },
    chipKind: 'command',
    get meaning() {
      return t('guideCopy.NMeaning');
    },
  },
];
