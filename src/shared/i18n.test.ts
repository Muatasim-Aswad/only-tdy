import { describe, expect, it } from 'vitest';
import { appLocale, applyLocale, suggestedLocale } from './i18n.ts';
import { textDirection } from './text-direction.ts';

describe('English and Arabic locale selection', () => {
  it('uses supported browser preferences and falls back to English', () => {
    expect(suggestedLocale(['ar-EG', 'en'])).toBe('ar');
    expect(suggestedLocale(['en-GB', 'ar'])).toBe('en');
    expect(suggestedLocale(['fr-FR'])).toBe('en');
    expect(suggestedLocale([])).toBe('en');
  });
  it('updates the document language and direction together', () => {
    applyLocale('ar');
    expect(appLocale()).toBe('ar');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    applyLocale('en');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });
  it('gives native fields and mirrors the same first-strong direction', () => {
    expect(textDirection('اتصل بـ Alex /today', 'ltr')).toBe('rtl');
    expect(textDirection('/today اتصل بـ Alex', 'rtl')).toBe('ltr');
    expect(textDirection('!٣ #مشاوير', 'ltr')).toBe('rtl');
    expect(textDirection('', 'rtl')).toBe('rtl');
  });
});
