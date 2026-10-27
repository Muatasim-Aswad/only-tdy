/** Normalize command arguments only; user-authored names and prose stay untouched. */
export function tokenDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)),
  );
}

export function commandValue(value: string): string {
  const separator = value.indexOf(':');
  const name = separator < 0 ? value : value.slice(0, separator);
  const canonical =
    (
      {
        اليوم: 'today',
        استحقاق: 'due',
        إخفاء: 'hide',
        اخفاء: 'hide',
        تكرار: 'repeating',
      } as Readonly<Record<string, string>>
    )[name] ?? name;
  return separator < 0
    ? canonical
    : `${canonical}:${value.slice(separator + 1)}`;
}

export function dateValue(value: string): string {
  const word = value.replace(/[\u064b-\u065f\u0670]/g, '');
  if (word === 'اليوم') return 'today';
  if (word === 'غدا' || word === 'غد') return 'tomorrow';
  return tokenDigits(value);
}
