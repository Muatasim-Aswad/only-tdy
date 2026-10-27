/** Share one direction between a field and its mirror; empty text uses the UI language. */
export function textDirection(
  value: string,
  fallback: 'ltr' | 'rtl',
): 'ltr' | 'rtl' {
  const letter = /\p{L}/u.exec(value)?.[0];
  return letter === undefined
    ? fallback
    : /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(letter)
      ? 'rtl'
      : 'ltr';
}
