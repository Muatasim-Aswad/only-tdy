import { SubmitButton } from '../../../shared/SubmitButton.tsx';
import type { Ref } from 'react';
import { InputAction } from './InputAction.tsx';
import type { KeyboardEvent } from 'react';

import { SuggestionList } from './SuggestionList.tsx';
import { TokenChips } from './TokenChips.tsx';
import { useSuggestions } from './useSuggestions.ts';
import { useFocusWithin } from '../../../shared/useFocusWithin.ts';

/**
 * At rest the field is a quiet + on the rail and five dots — no rule, no box,
 * no word. The accessible name still asks the question in words, because
 * neither the marker nor a run of periods reaches a screen reader.
 */
const CAPTURE_LABEL = 'What needs doing?';
const CAPTURE_PLACEHOLDER = '.....';
const SUGGESTION_LABEL = 'Suggestions';

export interface CaptureFieldProps {
  readonly formRef?: Ref<HTMLFormElement>;
  readonly value: string;
  readonly onToggleMode?: (() => void) | undefined;
  readonly onValueChange: (value: string) => void;
  /** Called only when the trimmed value is non-empty and the field is enabled. */
  readonly onSubmit: () => void;
  /**
   * Project names to offer after `+`. Absent until the list has been fetched;
   * once present, a name not on it is offered as a new project.
   */
  readonly projects?: readonly string[] | undefined;
  /** Tag names to offer after `#`. */
  readonly tags?: readonly string[] | undefined;
  /**
   * Nothing can be saved right now — offline, or the session is gone. Only Add
   * is disabled: the field stays editable so a thought in progress survives,
   * and so the value is still there when saving becomes possible again.
   */
  readonly disabled?: boolean;
}

/**
 * The hero, and the first thing on the page. An empty field is nothing but its
 * placeholder — Add appears once the field has focus, and can be pressed only
 * once there is something to add, so the resting screen asks one question and
 * offers no buttons to read past.
 *
 * Enter submits, and what is typed stays text. The grammar is read back in two
 * ways that never touch the value: a pill painted behind each token, so a line
 * can be scanned for what it filed the task under, and a list of the names
 * that would finish the token being typed. Neither turns a token into an
 * object — the caret still goes anywhere in the line, and the line is still
 * exactly what the parser reads.
 *
 * The control is a textarea rather than an input so a long line wraps into
 * view instead of scrolling out of it sideways, which is also what keeps the
 * painted chips lined up with the characters they sit behind. It stays a
 * single-line field in every way that matters: Enter submits it, and a new
 * line is never inserted.
 */
export function CaptureField({
  value,
  formRef,
  onToggleMode,
  onValueChange,
  onSubmit,
  projects,
  tags,
  disabled = false,
}: CaptureFieldProps) {
  const hasText = value.trim() !== '';
  const canSubmit = hasText && !disabled;
  const focusWithin = useFocusWithin();
  const suggestions = useSuggestions<HTMLTextAreaElement>({
    grammar: 'entry',
    allowRepeating: true,
    value,
    onValueChange,
    ...(projects === undefined ? {} : { projects }),
    ...(tags === undefined ? {} : { tags }),
    offersNewProject: projects !== undefined,
  });

  const handleSubmit = () => {
    if (!canSubmit) return;
    suggestions.ref.current?.blur();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    suggestions.fieldProps.onKeyDown(event);
    /* The list had it: an arrow walked the rows, or return took one. */
    if (event.defaultPrevented) return;

    if (event.key !== 'Enter') return;
    // A new line is never what this field is for, whatever else happens.
    event.preventDefault();
    handleSubmit();
  };

  return (
    <form
      ref={formRef}
      className="focus-capture flex items-center min-h-15 bg-transparent"
      {...focusWithin.containerProps}
      onSubmit={(event) => {
        // The form exists so Enter submits natively; the page must not reload.
        event.preventDefault();
        handleSubmit();
      }}
    >
      <InputAction
        value={value}
        mode="add"
        onClear={() => {
          onValueChange('');
        }}
        onToggle={onToggleMode}
      />
      <div className="focus-capture__field relative flex-auto min-w-0">
        <div className="focus-tokens text-capture" data-value={value}>
          <TokenChips value={value} spans={suggestions.spans} />
          <textarea
            {...suggestions.fieldProps}
            className="focus-capture__input placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder bg-transparent text-ink resize-none"
            value={value}
            rows={1}
            placeholder={CAPTURE_PLACEHOLDER}
            onChange={(event) => {
              onValueChange(event.target.value);
              suggestions.noteCaret(event);
            }}
            onKeyDown={handleKeyDown}
            aria-label={CAPTURE_LABEL}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
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
      {/*
        Present while the field has focus or holds something; disabled until
        there is something to add. Offline it still appears and still says
        Add — disabled, the same as every other target, so the row does not
        quietly lose its affordance.
      */}
      {hasText || focusWithin.focused ? (
        <SubmitButton
          className="focus-capture__submit"
          disabled={!canSubmit}
          onMouseDown={(event) => {
            // Keep the field focused so the button stays mounted until the click lands.
            event.preventDefault();
          }}
        >
          Add
        </SubmitButton>
      ) : null}
    </form>
  );
}
