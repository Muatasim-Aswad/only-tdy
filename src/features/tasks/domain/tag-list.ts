/**
 * Tags, as the task page lets them be typed.
 *
 * Quick entry writes `#tag` because it is parsing one line of prose into a
 * whole task. The task page is not parsing prose — it is editing one field —
 * so the separator is a comma, which is the only one that lets a tag contain
 * a space. A leading `#` is accepted and dropped anyway: it is the spelling
 * the rest of only-tdy shows, and refusing it would be pedantry.
 */

/** Splits the field into Tududi tag names: trimmed, de-duplicated, in order. */
export function parseTagList(value: string): readonly string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const part of value.split(',')) {
    const tag = part.trim().replace(/^#+/, '').trim();
    if (tag === '') continue;

    const normalized = tag.toLocaleLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(tag);
  }

  return tags;
}

/** The inverse, for filling the field from a saved task. */
export function formatTagList(tags: readonly string[]): string {
  return tags.join(', ');
}

/** One comma-separated segment of the field, as a span of the raw value. */
export interface TagSegment {
  readonly start: number;
  readonly end: number;
}

/**
 * Every segment the commas divide the field into, including the empty one
 * after a trailing comma — that is where the next tag is about to be typed,
 * which is exactly when a suggestion list is worth opening.
 *
 * Spans cover the separators' insides, whitespace and all, so writing a name
 * back replaces what was typed without disturbing the spacing around it.
 */
export function scanTagSegments(value: string): readonly TagSegment[] {
  const segments: TagSegment[] = [];
  let start = 0;

  for (let index = 0; index <= value.length; index += 1) {
    if (index === value.length || value[index] === ',') {
      segments.push({ start, end: index });
      start = index + 1;
    }
  }

  return segments;
}

/**
 * Whether this field can hold the name at all. The comma is the separator, so
 * a tag containing one cannot be typed here however it is spelled.
 */
export function isTagListWritable(name: string): boolean {
  return !name.includes(',');
}
