import { expect, it } from 'vitest';
import { applyLocale, appLocale } from '../shared/i18n.ts';
import {
  applyAccountLocale,
  confirmLocale,
  takeLocaleIntent,
} from './locale.ts';

it('retains an explicit choice until the verified account can adopt it', () => {
  applyLocale('en');
  confirmLocale('ar');
  applyAccountLocale('en');
  expect(appLocale()).toBe('ar');
  expect(takeLocaleIntent()).toBe('ar');
  expect(takeLocaleIntent()).toBeNull();
  applyAccountLocale('en');
  expect(appLocale()).toBe('en');
});
