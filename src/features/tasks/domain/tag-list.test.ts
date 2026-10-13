import { describe, expect, it } from 'vitest';

import { formatTagList, parseTagList } from './tag-list.ts';

describe('parseTagList', () => {
  it('splits on commas and trims what is left', () => {
    expect(parseTagList('finance,  urgent ')).toEqual(['finance', 'urgent']);
  });

  it('keeps a tag that contains a space, which is why the comma is the split', () => {
    expect(parseTagList('next quarter, finance')).toEqual([
      'next quarter',
      'finance',
    ]);
  });

  it('accepts the # the rest of only-tdy prints, and drops it', () => {
    expect(parseTagList('#finance, ##urgent')).toEqual(['finance', 'urgent']);
  });

  it('drops empty entries so a trailing comma is not a tag', () => {
    expect(parseTagList('finance, , ')).toEqual(['finance']);
    expect(parseTagList('')).toEqual([]);
  });

  it('de-duplicates without regard to case, keeping the first spelling', () => {
    expect(parseTagList('Finance, finance, FINANCE')).toEqual(['Finance']);
  });
});

describe('formatTagList', () => {
  it('fills the field in the shape the field is read back in', () => {
    expect(parseTagList(formatTagList(['finance', 'next quarter']))).toEqual([
      'finance',
      'next quarter',
    ]);
  });
});
