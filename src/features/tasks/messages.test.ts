import { describe, expect, it } from 'vitest';
import { english, arabic, t } from './messages.ts';
import { applyLocale } from '../../shared/i18n.ts';

describe('task translations', () => {
  it('covers the same semantic keys and interpolation arguments in both languages', () => {
    expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
    const argumentsIn = (value: string) =>
      [...value.matchAll(/\{\{(\w+)/g)].map((match) => match[1]).sort();
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      // Arabic plural grammar can omit the numeral for one and two.
      const actual = argumentsIn(arabic[key]);
      const expected = argumentsIn(english[key]);
      expect(actual.filter((name) => name !== 'count')).toEqual(
        expected.filter((name) => name !== 'count'),
      );
      expect(arabic[key].trim()).not.toBe('');
    }
  });
  it('uses Arabic plural rules for selection feedback', () => {
    applyLocale('ar');
    expect(t('actions.selected', { count: 1 })).toBe('مهمة واحدة محددة');
    expect(t('actions.selected', { count: 2 })).toBe('مهمتان محددتان');
    expect(t('actions.selected', { count: 3 })).toBe('٣ مهام محددة');
    expect(t('actions.selected', { count: 11 })).toBe('١١ مهمة محددة');
  });
});
