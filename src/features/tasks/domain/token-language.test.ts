import { describe, expect, it } from 'vitest';
import { parseQuickEntry } from './quick-entry.ts';
import { parseSearch, resolveSearch } from './task-search.ts';
import { resolveDate } from './task-dates.ts';
import { commandValue } from './token-language.ts';

const context = {
  now: new Date('2026-10-27T12:00:00Z'),
  timezone: 'UTC',
  allowRepeating: true,
};

describe('Arabic command arguments', () => {
  it('accepts localized commands and digits without changing user content', () => {
    const result = parseQuickEntry(
      'اتصل ٣ مرات +منزل #مشاوير *تفاصيل !٣ /اليوم',
      [],
      context,
    );
    expect(result).toMatchObject({
      ok: true,
      draft: {
        title: 'اتصل ٣ مرات',
        tags: ['مشاوير'],
        note: 'تفاصيل',
        priority: 'high',
        status: 'planned',
        newProjectName: 'منزل',
      },
    });
  });
  it.each(['غدا', 'غدًا', 'tomorrow', '+١', '+۱'])(
    'resolves %s as the same account calendar day',
    (value) => {
      expect(resolveDate(value, context)).toBe('2026-10-28');
    },
  );
  it('supports Arabic and Persian digits in dates and priority search', () => {
    expect(resolveDate('٢٩-١٠-٢٠٢٦', context)).toBe('2026-10-29');
    expect(resolveDate('۲۹-۱۰-۲۰۲۶', context)).toBe('2026-10-29');
    expect(resolveSearch(parseSearch('!٣'), [], true)).toEqual({
      kind: 'priority',
      priority: 'high',
    });
    expect(resolveSearch(parseSearch('!۳'), [], true)).toEqual({
      kind: 'priority',
      priority: 'high',
    });
  });
  it('keeps English commands and restricts repeating to Add fields', () => {
    expect(parseQuickEntry('Call /today', [], context)).toMatchObject({
      ok: true,
      draft: { status: 'planned' },
    });
    expect(parseQuickEntry('تنظيف /تكرار', [], context)).toMatchObject({
      ok: true,
      repeating: true,
    });
    expect(
      parseQuickEntry('تنظيف /تكرار', [], {
        ...context,
        allowRepeating: false,
      }),
    ).toMatchObject({ ok: false, error: { kind: 'unknown-command' } });
    expect(commandValue('استحقاق:غدًا')).toBe('due:غدًا');
  });
});
