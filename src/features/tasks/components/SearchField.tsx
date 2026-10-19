import { InputAction } from './InputAction.tsx';
import { COPY } from './copy.ts';
import { SuggestionList } from './SuggestionList.tsx';
import { TokenChips } from './TokenChips.tsx';
import { useSuggestions } from './useSuggestions.ts';
import { useFocusWithin } from '../../../shared/useFocusWithin.ts';

export interface SearchFieldProps {
  readonly value: string;
  readonly onToggleMode?: (() => void) | undefined;
  readonly pageName?: string;
  /** What this field searches, said in words for anyone who cannot see it. */
  readonly label?: string;
  readonly onValueChange: (value: string) => void;
  /** Called only when the trimmed value is non-empty and the field is enabled. */
  readonly onSubmit: () => void;
  /** Project names to offer while the term starts with `+`. */
  readonly projects?: readonly string[] | undefined;
  /** Tag names to offer while it starts with `#`. */
  readonly tags?: readonly string[] | undefined;
  /** Offline: the field stays editable, only searching is withheld. */
  readonly disabled?: boolean;
}

const SUGGESTION_LABEL = 'Suggestions';

/**
 * The field the backlog and the record both carry, and the first thing on each
 * page — the capture field read backwards.
 *
 * It is deliberately the same object: no rule, no box, no fill, a mark on the
 * rail that comes up to the accent while the field has focus, and a plain word
 * mounted at the trailing edge while the field has focus or holds something. Only two
 * things differ: the mark is a glass rather than a plus, and the action says
 * Search rather than Add. Both empty fields show five dots.
 *
 * Searching happens on submit rather than on every character. Each term is a
 * real request to Tududi, and a request per keystroke would be a request per
 * keystroke — the return key is already how this field's twin is used, and
 * `enterKeyHint` makes a phone keyboard say so.
 *
 * Only the label changes between the two pages. What the field searches is
 * carried in the accessible name for a screen reader.
 */
export function SearchField({
  value,
  onToggleMode,
  pageName = 'Backlog',
  label = COPY.backlogSearchLabel,
  onValueChange,
  onSubmit,
  projects,
  tags,
  disabled = false,
}: SearchFieldProps) {
  const hasText = value.trim() !== '';
  const canSubmit = hasText && !disabled;
  const focusWithin = useFocusWithin();
  const suggestions = useSuggestions<HTMLInputElement>({
    grammar: 'search',
    value,
    onValueChange,
    ...(projects === undefined ? {} : { projects }),
    ...(tags === undefined ? {} : { tags }),
  });

  return (
    <form
      className="focus-capture"
      {...focusWithin.containerProps}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          suggestions.ref.current?.blur();
          onSubmit();
        }
      }}
    >
      <InputAction
        value={value}
        mode="search"
        onClear={() => {
          onValueChange('');
        }}
        onToggle={onToggleMode}
      />
      <div className="focus-capture__field">
        <div
          className="focus-tokens focus-tokens--line text-capture"
          data-value={value}
        >
          <TokenChips value={value} spans={suggestions.spans} />
          <input
            {...suggestions.fieldProps}
            className="focus-capture__input focus-search__input"
            type="search"
            value={value}
            placeholder={COPY.searchPlaceholder}
            onChange={(event) => {
              onValueChange(event.target.value);
              suggestions.noteCaret(event);
            }}
            onKeyDown={(event) => {
              suggestions.fieldProps.onKeyDown(event);
            }}
            aria-label={label}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>
        {suggestions.open ? (
          <SuggestionList
            id={suggestions.listId}
            items={suggestions.items}
            activeIndex={suggestions.activeIndex}
            optionId={suggestions.optionId}
            onPick={suggestions.pick}
            label={SUGGESTION_LABEL}
          />
        ) : null}
      </div>
      {hasText || focusWithin.focused ? (
        <button
          type="submit"
          className="focus-capture__submit text-action"
          disabled={!canSubmit}
          onMouseDown={(event) => {
            // Keep the field focused so the button stays mounted until the click lands.
            event.preventDefault();
          }}
        >
          {`${COPY.searchSubmit} ${pageName}`}
        </button>
      ) : null}
    </form>
  );
}
