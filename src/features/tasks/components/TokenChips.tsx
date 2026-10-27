import { Fragment } from 'react';

/** A run of the field's text that is a token rather than prose. */
export interface ChipSpan {
  readonly start: number;
  readonly end: number;
  readonly kind: 'project' | 'tag' | 'note' | 'priority' | 'command';
}

export interface TokenChipsProps {
  readonly value: string;
  /** In order, and never overlapping — which is what the scanners guarantee. */
  readonly spans: readonly ChipSpan[];
}

/**
 * The chips, painted behind the text rather than in place of it.
 *
 * A chip in only-tdy is not an object you can pick up. The field underneath is
 * an ordinary text control holding ordinary text, and this layer is a copy of
 * that text with the glyphs made invisible and a pill drawn behind each
 * token. The two are stacked in one grid cell in the same face at the same
 * size, so the pill lands exactly under the characters it belongs to and
 * moves with them as the line is edited.
 *
 * Everything that makes a text field a text field therefore survives: the
 * caret goes anywhere, selection and paste and undo are the platform's,
 * a phone's keyboard behaves, and the value is still the literal line that
 * `parseQuickEntry` reads. The chips say what the grammar found; they never
 * become the thing the grammar reads.
 *
 * It is hidden from assistive technology because it says nothing the field
 * does not already say — the same text, twice, would only be read twice.
 */
export function TokenChips({ value, spans }: TokenChipsProps) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      parts.push(
        <Fragment key={`text-${String(cursor)}`}>
          {value.slice(cursor, span.start)}
        </Fragment>,
      );
    }
    parts.push(
      <span
        key={`chip-${String(span.start)}`}
        className={`focus-chip rounded-fill bg-selection box-decoration-clone focus-chip--${span.kind}`}
      >
        {value.slice(span.start, span.end)}
      </span>,
    );
    cursor = span.end;
  }

  parts.push(
    <Fragment key={`text-${String(cursor)}`}>{value.slice(cursor)}</Fragment>,
  );

  return (
    <div
      className="focus-chips text-transparent select-none"
      aria-hidden="true"
    >
      {parts}
    </div>
  );
}
