import { appLocale } from '../../../shared/i18n.ts';
import { textDirection } from '../../../shared/text-direction.ts';
import { t } from '../messages.ts';
import { SubmitButton } from '../../../shared/SubmitButton.tsx';
import type { Ref } from 'react';
import { InputAction } from './InputAction.tsx';
import { SuggestionList } from './SuggestionList.tsx';
import { TokenChips } from './TokenChips.tsx';
import { useSuggestions } from './useSuggestions.ts';
import { useFocusWithin } from '../../../shared/useFocusWithin.ts';

export interface SearchFieldProps {
  readonly formRef?: Ref<HTMLFormElement>;
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
  formRef,
  onToggleMode,
  pageName = t('searchField.backlog'),
  label = t('copy.backlogSearchLabel'),
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
      ref={formRef}
      className="focus-capture flex items-center min-h-15 bg-transparent"
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
      <div className="focus-capture__field relative flex-auto min-w-0">
        <div
          className="focus-tokens focus-tokens--line text-capture"
          data-value={value}
          dir={textDirection(value, appLocale() === 'ar' ? 'rtl' : 'ltr')}
        >
          <TokenChips value={value} spans={suggestions.spans} />
          <input
            {...suggestions.fieldProps}
            className="focus-capture__input placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder bg-transparent text-ink resize-none focus-search__input"
            type="search"
            value={value}
            placeholder={t('input.promptPlaceholder')}
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
            label={t('searchField.suggestions')}
          />
        ) : null}
      </div>
      {hasText || focusWithin.focused ? (
        <SubmitButton
          className="focus-capture__submit"
          disabled={!canSubmit}
          onMouseDown={(event) => {
            // Keep the field focused so the button stays mounted until the click lands.
            event.preventDefault();
          }}
        >
          {t('searchField.submitPage', { page: pageName })}
        </SubmitButton>
      ) : null}
    </form>
  );
}
