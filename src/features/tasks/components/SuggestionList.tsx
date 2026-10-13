import type { Suggestion } from '../domain/token-suggest.ts';

export interface SuggestionListProps {
  readonly id: string;
  readonly items: readonly Suggestion[];
  /** Which row return and tab take, or `-1` when they belong to the field. */
  readonly activeIndex: number;
  readonly optionId: (index: number) => string;
  readonly onPick: (name: string) => void;
  /** Named for anyone who cannot see which field the list belongs to. */
  readonly label: string;
}

/**
 * The names on offer for the token being typed.
 *
 * While a name is half typed its first row is active, so tab — or return,
 * on a phone that has no tab — finishes it without reaching for the list.
 * Nothing is active once there is nothing left to finish, and return goes
 * back to adding the task.
 *
 * Focus never leaves the field. The list is pointed at by
 * `aria-activedescendant` from there, which is what lets the arrow keys walk
 * it while the caret stays where it was typed, and pressing the pointer down
 * on a row is refused so the field is never blurred out from under it.
 *
 * It floats over the list of tasks rather than pushing it down: what is being
 * typed is not a reason for everything already written to move.
 */
export function SuggestionList({
  id,
  items,
  activeIndex,
  optionId,
  onPick,
  label,
}: SuggestionListProps) {
  return (
    <ul className="focus-suggestions" id={id} role="listbox" aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item.name}
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          className="focus-suggestions__option text-task"
          onMouseDown={(event) => {
            // Keep the field focused: a blur here would close the list first.
            event.preventDefault();
          }}
          onClick={() => {
            onPick(item.name);
          }}
        >
          <SuggestionName suggestion={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The name, with the part already typed lifted out of the muted weight. It
 * answers the question the list is really being read for: why is this one
 * here, and how much more of it is there to type.
 */
function SuggestionName({ suggestion }: { readonly suggestion: Suggestion }) {
  const { name, matchStart, matchEnd, mark = '', detail } = suggestion;
  const said =
    detail === undefined ? null : (
      <span className="focus-suggestions__detail"> {detail}</span>
    );
  if (matchEnd === matchStart) {
    return (
      <>
        {mark}
        {name}
        {said}
      </>
    );
  }

  return (
    <>
      {mark}
      {name.slice(0, matchStart)}
      <mark className="focus-suggestions__match">
        {name.slice(matchStart, matchEnd)}
      </mark>
      {name.slice(matchEnd)}
      {said}
    </>
  );
}
