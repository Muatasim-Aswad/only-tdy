/**
 * Joins class names, dropping anything falsy. Small on purpose: the components
 * combine at most a handful of classes and a dependency would outweigh it.
 */
export function classNames(
  ...values: readonly (string | false | null | undefined)[]
): string {
  let result = '';
  for (const value of values) {
    if (typeof value === 'string' && value !== '') {
      result = result === '' ? value : `${result} ${value}`;
    }
  }
  return result;
}
