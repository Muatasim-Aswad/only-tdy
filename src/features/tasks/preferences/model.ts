import { isObject } from '../../../infra/tududi-profile.ts';
import type { ThemeChoice } from '../../../infra/theme.ts';

export interface Preferences {
  readonly theme: ThemeChoice;
  readonly autoDuePromotion: boolean;
  readonly datedBacklog: 'always' | 'before' | 'due';
  readonly daysBeforeDue: number;
  readonly editorLayout: 'full' | 'compact';
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  autoDuePromotion: true,
  datedBacklog: 'always',
  daysBeforeDue: 1,
  editorLayout: 'full',
};

export const PREFERENCE_KEYS = Object.keys(
  DEFAULT_PREFERENCES,
) as (keyof Preferences)[];

export function preferenceChanges(value: unknown): Partial<Preferences> {
  if (!isObject(value)) return {};
  return {
    ...(value.theme === 'system' ||
    value.theme === 'light' ||
    value.theme === 'dark'
      ? { theme: value.theme }
      : {}),
    ...(typeof value.autoDuePromotion === 'boolean'
      ? { autoDuePromotion: value.autoDuePromotion }
      : {}),
    ...(value.datedBacklog === 'always' ||
    value.datedBacklog === 'before' ||
    value.datedBacklog === 'due'
      ? { datedBacklog: value.datedBacklog }
      : {}),
    ...(typeof value.daysBeforeDue === 'number' &&
    Number.isSafeInteger(value.daysBeforeDue) &&
    value.daysBeforeDue >= 1 &&
    value.daysBeforeDue <= 365_000
      ? { daysBeforeDue: value.daysBeforeDue }
      : {}),
    ...(value.editorLayout === 'full' || value.editorLayout === 'compact'
      ? { editorLayout: value.editorLayout }
      : {}),
  };
}

export function preferences(value: unknown): Preferences {
  return { ...DEFAULT_PREFERENCES, ...preferenceChanges(value) };
}
