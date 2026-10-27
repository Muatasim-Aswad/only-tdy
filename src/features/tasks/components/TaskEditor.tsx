import { appLocale } from '../../../shared/i18n.ts';
import { textDirection } from '../../../shared/text-direction.ts';
import { t } from '../messages.ts';
import { RailButton } from '../../../shared/RailButton.tsx';
import { PageFooter } from '../../../shared/PageFooter.tsx';
import { FieldRow } from '../../../shared/FieldRow.tsx';
import { Select } from '../../../shared/Select.tsx';
import { taskErrorMessage } from '../data/errors.ts';
import { readBrowserStorage } from '../../../infra/browser-storage.ts';
import { preferencesStore } from '../preferences/store.ts';

import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import type {
  Project,
  SaveFeedback,
  TaskDetail,
  TaskEdit,
  TaskPriority,
  TaskStatus,
  Recurrence,
} from '../contracts.ts';
import { useDateTimezone } from '../date-timezone.ts';
import { parseQuickEntry } from '../domain/quick-entry.ts';
import { scanEntryTokens, isNamedToken } from '../domain/entry-tokens.ts';
import {
  applyDateRules,
  validateHideDate,
  currentDate,
} from '../domain/task-dates.ts';
import { RecurrenceFields } from './RecurrenceFields.tsx';
import { formatTagList, parseTagList } from '../domain/tag-list.ts';

import { COPY, PRIORITY_NAME } from './copy.ts';
import { classNames } from '../../../shared/classNames.ts';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';
import { SuggestionList } from './SuggestionList.tsx';
import { TokenChips } from './TokenChips.tsx';
import { useSuggestions } from './useSuggestions.ts';

/**
 * Status, in only-tdy's words rather than Tududi's. The two open statuses only-tdy
 * writes are the two lists it shows, so they are named after those lists: a
 * planned task is on Today and a not-started one is in Backlog. Naming them
 * anything else would mean the page that sets the field and the screen that
 * obeys it disagree about what was set.
 *
 * Tududi also has archived and cancelled. only-tdy has no name for either and
 * shows neither, so neither is offered here.
 */
const STATUS_NAME: Readonly<Record<TaskStatus, string>> = {
  get planned() {
    return t('taskEditor.planned');
  },
  get not_started() {
    return t('taskEditor.not_started');
  },
  get in_progress() {
    return t('taskEditor.in_progress');
  },
  get waiting() {
    return t('taskEditor.waiting');
  },
  get done() {
    return t('taskEditor.done');
  },
};

/**
 * The statuses the form offers, in order: the list the task is on, then
 * whether it is finished.
 *
 * Tududi's `in_progress` and `waiting` are read and named — a task already in
 * one keeps it, and its page still says so — but neither is offered here.
 * only-tdy has two lists and a done pile, and a status that puts a task on Today
 * without saying Today is a third vocabulary for the same fact.
 */
const STATUS_ORDER: readonly TaskStatus[] = ['planned', 'not_started', 'done'];

const PRIORITY_ORDER: readonly TaskPriority[] = ['low', 'medium', 'high'];

/** The form as it is typed: every value a string the control can hold. */
interface Fields {
  readonly recurrence: Recurrence | null;
  readonly title: string;
  readonly note: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly projectUid: string;
  readonly dueDate: string;
  readonly deferUntil: string;
  /** Comma separated, exactly as typed, until the moment it is saved. */
  readonly tags: string;
}

function toFields(task: TaskDetail): Fields {
  return {
    recurrence: task.recurrence ?? null,
    title: task.title,
    note: task.note,
    status: task.status,
    priority: task.priority,
    projectUid: task.projectUid,
    dueDate: task.dueDate,
    deferUntil: task.deferUntil,
    tags: formatTagList(task.tags),
  };
}

function toEdit(fields: Fields): TaskEdit {
  return {
    ...(fields.recurrence === null ? {} : { recurrence: fields.recurrence }),
    title: fields.title.trim(),
    note: fields.note,
    status: fields.status,
    priority: fields.priority,
    projectUid: fields.projectUid,
    dueDate: fields.dueDate,
    deferUntil: fields.deferUntil,
    tags: parseTagList(fields.tags),
  };
}

/*
 * Compared as saves rather than as text, so re-typing a tag list with
 * different spacing is not a change and a title with a trailing space is not
 * one either. What counts as unsaved is exactly what a save would send.
 */
function sameEdit(a: TaskEdit, b: TaskEdit): boolean {
  return (
    JSON.stringify(a.recurrence ?? null) ===
      JSON.stringify(b.recurrence ?? null) &&
    a.title === b.title &&
    a.note === b.note &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.projectUid === b.projectUid &&
    a.dueDate === b.dueDate &&
    a.deferUntil === b.deferUntil &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
  );
}

export interface TaskEditorProps {
  readonly task: TaskDetail;
  /** Every project the account can file a task under. */
  readonly projects: readonly Project[];
  /** Every tag name the account has used, offered as the field is typed in. */
  readonly tags?: readonly string[] | undefined;
  /** Resolves with the saved task, or `undefined` when nothing was saved. */
  readonly onSave: (edit: TaskEdit) => Promise<TaskDetail | undefined>;
  readonly feedback: SaveFeedback;
  readonly onDismissFeedback?: (() => void) | undefined;
  readonly saving?: boolean;
  /** Deleting is asked for at the head of the page; it only holds Save here. */
  readonly deleting?: boolean;
  readonly onSkip?: (() => void) | undefined;
  readonly skipping?: boolean;
  readonly creating?: boolean;
  /** Offline or expired: the fields stay editable, the writes do not. */
  readonly disabled?: boolean;
  /** The form's id, so a Save drawn outside it can still submit it. */
  readonly formId?: string;
  /** Told whenever the form gains or loses unsaved changes. */
  readonly onDirtyChange?: (dirty: boolean) => void;
}

/**
 * The task, open.
 *
 * It is the capture field's bargain kept on a second screen: the title is
 * typed where the title is, at the size a title is read at, with no box drawn
 * around it. The note follows in the size the rows use. Underneath, the facts
 * a row would have shown on its metadata line are unfolded one to a line and
 * joined by the three Tududi keeps that a row has no space for, each labelled
 * in the muted weight that line was already set in.
 *
 * Save is mounted only once something has changed, the same rule that keeps
 * Add off the capture field until there is something to add — and it is not
 * drawn here: the page puts it at its head, in the place Delete held, so the
 * one verb that matters right now is always the one at the top. A save that fails changes nothing here:
 * every character stays exactly where it was typed, which is the only reason
 * it is safe not to be optimistic.
 */
export function TaskEditor({
  task,
  projects,
  tags,
  onSave,
  feedback,
  onDismissFeedback,
  saving = false,
  deleting = false,
  onSkip,
  skipping = false,
  creating = false,
  disabled = false,
  formId,
  onDirtyChange,
}: TaskEditorProps) {
  /*
   * The form owns what is typed, and the loaded task is only its starting
   * point. A refetch behind the page must never overwrite a half-finished
   * edit, so the baseline moves on exactly one event: a save that succeeded.
   * The page above remounts this component when the uid changes, which is
   * what starts a different task from its own values.
   */
  const timezone = useDateTimezone();
  const [feedbackAttempt, setFeedbackAttempt] = useState(0);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const dismissFeedback = useCallback(() => {
    setLocalError(undefined);
    onDismissFeedback?.();
  }, [onDismissFeedback]);
  const [baseline, setBaseline] = useState(task);
  const [compact, setCompact] = useState(
    () => readBrowserStorage('only-tdy:editor-layout:v1') === 'compact',
  );
  const [fields, setFields] = useState(() => ({
    ...toFields(task),
    tags: compact
      ? compactTags(formatTagList(task.tags))
      : formatTagList(task.tags),
  }));

  const edit = useMemo<TaskEdit>(
    () => ({
      ...toEdit(fields),
      ...(baseline.recurrence && !fields.recurrence
        ? { recurrence: null }
        : {}),
    }),
    [fields, baseline.recurrence],
  );
  const dirty = !sameEdit(edit, toEdit(toFields(baseline)));
  const busy = saving || deleting || skipping;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  /*
   * The tag field completes what is typed against the names already in use.
   * It is the capture field's `#` in the one other place tags are written, so
   * it is the same list and the same keyboard: return saves the task until an
   * arrow key moves onto a row.
   */
  const tagSuggestions = useSuggestions<HTMLTextAreaElement>({
    grammar: 'tag-list',
    value: fields.tags,
    onValueChange: (value) => {
      setFields((current) => ({ ...current, tags: value }));
    },
    ...(tags === undefined ? {} : { tags }),
  });

  const titleSuggestions = useSuggestions<HTMLTextAreaElement>({
    grammar: 'entry',
    value: fields.title,
    onValueChange: (title) => {
      setFields((current) => ({ ...current, title }));
    },
    projects: projects.map((project) => project.name),
    ...(tags === undefined ? {} : { tags }),
    offersNewProject: true,
  });

  const update = useCallback(
    <K extends keyof Fields>(key: K, value: Fields[K]) => {
      setFields((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (disabled || busy) return;

    setFeedbackAttempt((current) => current + 1);
    setLocalError(undefined);
    let resolved = edit;
    if (
      resolved.recurrence?.type === 'weekly' &&
      resolved.recurrence.weekdays.length === 0
    )
      return;
    if (fields.title !== baseline.title) {
      const parsed = parseQuickEntry(fields.title, projects, {
        timezone,
        capitalize: false,
      });
      if (!parsed.ok) {
        setLocalError(
          parsed.error.kind === 'empty-title'
            ? COPY.titleRequired
            : parsed.error.message,
        );
        return;
      }
      const tokens = scanEntryTokens(fields.title).filter(isNamedToken);
      const has = (kind: string) => tokens.some((token) => token.kind === kind);
      const draft = parsed.draft;
      resolved = {
        ...edit,
        title: draft.title,
        ...(has('priority') ? { priority: draft.priority } : {}),
        ...(has('tag')
          ? { tags: [...new Set([...edit.tags, ...draft.tags])] }
          : {}),
        ...(has('note') ? { note: draft.note ?? '' } : {}),
        ...(has('project')
          ? {
              projectUid: draft.projectUid ?? '',
              ...(draft.newProjectName === undefined
                ? {}
                : { newProjectName: draft.newProjectName }),
            }
          : {}),
        ...(tokens.some(
          (token) => token.kind === 'command' && token.value === 'today',
        )
          ? { status: 'planned' as const }
          : {}),
        ...(draft.dueDate === undefined ? {} : { dueDate: draft.dueDate }),
        ...(draft.deferUntil === undefined
          ? {}
          : { deferUntil: draft.deferUntil }),
      };
    }
    if (resolved.title === '') {
      setLocalError(COPY.titleRequired);
      return;
    }
    resolved = applyDateRules(
      resolved,
      baseline.dueDate,
      { timezone },
      baseline.status,
    );
    try {
      validateHideDate(resolved.dueDate, resolved.deferUntil);
    } catch (error) {
      setLocalError(taskErrorMessage(error, COPY.saveFailed));
      return;
    }
    const saved = await onSave(resolved);
    if (saved === undefined) return;
    setBaseline(saved);
    setFields({
      ...toFields(saved),
      tags: compact
        ? compactTags(formatTagList(saved.tags))
        : formatTagList(saved.tags),
    });
  }, [
    busy,
    disabled,
    edit,
    onSave,
    fields.title,
    baseline,
    projects,
    timezone,
    compact,
  ]);

  /* Enter ends a title, the same as it does in capture. It only opens a new
     line in the note, which is the one field a new line belongs in. */
  const handleTitleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      titleSuggestions.fieldProps.onKeyDown(event);
      if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey)
        return;
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    },
    [titleSuggestions.fieldProps],
  );

  /*
   * A task can sit in a project the account cannot list — one shared with it,
   * for instance. Offering only the listed projects would quietly move the
   * task out of that one on the next save, so the project it is actually in
   * is always among the choices.
   */
  const listed = projects.some((project) => project.uid === task.projectUid);
  const options =
    listed || task.projectUid === ''
      ? projects
      : [
          ...projects,
          { uid: task.projectUid, name: task.projectName ?? task.projectUid },
        ];

  /*
   * The same bargain for status. only-tdy offers Today, Backlog and Done, but a
   * task can arrive already in progress or waiting, set in Tududi itself.
   * Dropping that status from the list would leave the control showing the
   * first option instead, and the next save would silently write it — so the
   * status the task is actually in is always among the choices, and stops
   * being offered the moment it is changed away from.
   */
  const statusChoices = fields.recurrence
    ? STATUS_ORDER.filter((status) => status !== 'done')
    : STATUS_ORDER;
  const statuses = statusChoices.includes(fields.status)
    ? statusChoices
    : [fields.status, ...statusChoices];
  const showNote = !creating || task.note !== '';
  const showTags = !creating || task.tags.length > 0;
  const showProject = !creating || task.projectUid !== '';

  return (
    <>
      <form
        id={formId}
        onKeyDownCapture={(event) => {
          if (
            event.key !== 'Enter' ||
            !(event.ctrlKey || event.metaKey) ||
            event.altKey ||
            event.shiftKey ||
            event.nativeEvent.isComposing
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) event.currentTarget.requestSubmit();
        }}
        className={classNames(
          'focus-detail flex flex-col',
          compact && 'focus-detail--compact',
        )}
        onSubmit={(event) => {
          // The form exists so Enter submits natively; the page must not reload.
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="focus-detail__fields mt-1">
          {/* What the task is. */}
          <div className="focus-group [.focus-group_+_&]:mt-7">
            <FieldRow block>
              <label
                className={
                  compact
                    ? 'sr-only'
                    : 'focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta'
                }
                htmlFor="task-title"
              >
                {COPY.titleLabel}
              </label>
              <div className="focus-capture__field relative flex-auto min-w-0">
                <div
                  className="focus-grow min-w-0 min-[360px]:flex-auto focus-detail__title pt-0.5 focus-tokens text-capture"
                  data-value={fields.title}
                  dir={textDirection(
                    fields.title,
                    appLocale() === 'ar' ? 'rtl' : 'ltr',
                  )}
                >
                  <TokenChips
                    value={fields.title}
                    spans={titleSuggestions.spans}
                  />
                  <textarea
                    dir="auto"
                    {...titleSuggestions.fieldProps}
                    id="task-title"
                    className="focus-detail__input placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder w-full resize-none bg-transparent text-ink"
                    value={fields.title}
                    onChange={(event) => {
                      update('title', event.target.value);
                      titleSuggestions.noteCaret(event);
                    }}
                    onKeyDown={handleTitleKeyDown}
                    rows={1}
                    enterKeyHint="done"
                  />
                </div>
                {titleSuggestions.open ? (
                  <SuggestionList
                    id={titleSuggestions.listId}
                    items={titleSuggestions.items}
                    activeIndex={titleSuggestions.activeIndex}
                    optionId={titleSuggestions.optionId}
                    onPick={titleSuggestions.pick}
                    label={t('taskEditor.titleSuggestionsLabel')}
                  />
                ) : null}
              </div>
            </FieldRow>

            {showNote ? (
              <FieldRow block>
                <label
                  className={
                    compact
                      ? 'focus-field__symbol flex-none text-muted text-meta'
                      : 'focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta'
                  }
                  htmlFor="task-note"
                >
                  {compact ? (
                    <>
                      <span aria-hidden="true">!</span>
                      <span className="sr-only">{COPY.noteLabel}</span>
                    </>
                  ) : (
                    COPY.noteLabel
                  )}
                </label>
                <div
                  className="focus-grow min-w-0 min-[360px]:flex-auto focus-detail__note group/note pt-0.5 text-task"
                  data-value={fields.note}
                  dir={textDirection(
                    fields.note,
                    appLocale() === 'ar' ? 'rtl' : 'ltr',
                  )}
                >
                  <textarea
                    dir="auto"
                    id="task-note"
                    className="focus-detail__input placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder w-full resize-none bg-transparent text-muted group-focus-within/note:text-ink"
                    value={fields.note}
                    onChange={(event) => {
                      update('note', event.target.value);
                    }}
                    placeholder={COPY.placeholder}
                    rows={1}
                  />
                </div>
              </FieldRow>
            ) : null}
          </div>

          {/* Where it is filed. */}
          {showTags || showProject ? (
            <div className="focus-group [.focus-group_+_&]:mt-7">
              {showTags ? (
                <Field
                  id="task-tags"
                  label={t('taskEditor.tagsLabel')}
                  compact={compact}
                >
                  <div className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none min-[360px]:flex-auto focus-capture__field relative flex-auto min-w-0">
                    <div
                      className="focus-tokens focus-tokens--compact text-task"
                      data-value={fields.tags}
                      dir={textDirection(
                        fields.tags,
                        appLocale() === 'ar' ? 'rtl' : 'ltr',
                      )}
                    >
                      <TokenChips
                        value={fields.tags}
                        spans={tagSuggestions.spans}
                      />
                      <textarea
                        dir="auto"
                        {...tagSuggestions.fieldProps}
                        id="task-tags"
                        className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent text-ink resize-none min-[360px]:flex-auto"
                        rows={1}
                        value={fields.tags}
                        onBlur={() => {
                          tagSuggestions.fieldProps.onBlur();
                          if (compact) update('tags', compactTags(fields.tags));
                        }}
                        onChange={(event) => {
                          update('tags', event.target.value);
                          tagSuggestions.noteCaret(event);
                        }}
                        onKeyDown={(event) => {
                          if (event.nativeEvent.isComposing) return;
                          tagSuggestions.fieldProps.onKeyDown(event);
                          if (event.defaultPrevented || event.key !== 'Enter')
                            return;
                          /* A tag list is one line however long it gets: return
                       means save here, exactly as it does in the title. */
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }}
                        placeholder={COPY.placeholder}
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </div>
                    {tagSuggestions.open ? (
                      <SuggestionList
                        id={tagSuggestions.listId}
                        items={tagSuggestions.items}
                        activeIndex={tagSuggestions.activeIndex}
                        optionId={tagSuggestions.optionId}
                        onPick={tagSuggestions.pick}
                        label={t('taskEditor.tagsAlreadyInUseLabel')}
                      />
                    ) : null}
                  </div>
                </Field>
              ) : null}

              {showProject ? (
                <Field
                  id="task-project"
                  label={t('taskEditor.projectLabel')}
                  compact={compact}
                >
                  <Select
                    id="task-project"
                    value={fields.projectUid}
                    onChange={(value) => {
                      update('projectUid', value);
                    }}
                  >
                    <option value="" aria-label={COPY.noValueName}>
                      {COPY.noValue}
                    </option>
                    {options.map((project) => (
                      <option key={project.uid} value={project.uid}>
                        {compact ? `+${project.name}` : project.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : null}

          {/* What it asks of the day. */}
          <div className="focus-group [.focus-group_+_&]:mt-7">
            {!creating ? (
              <Field
                id="task-status"
                label={t('taskEditor.statusLabel')}
                compact={compact}
              >
                <Select
                  id="task-status"
                  value={fields.status}
                  onChange={(value) => {
                    update('status', value as TaskStatus);
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'not_started' && fields.recurrence
                        ? t('taskEditor.scheduled')
                        : STATUS_NAME[status]}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field
              id="task-priority"
              label={t('taskEditor.priorityLabel')}
              compact={compact}
            >
              <Select
                id="task-priority"
                value={fields.priority}
                onChange={(value) => {
                  update('priority', value as TaskPriority);
                }}
              >
                {PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {compact
                      ? `!${PRIORITY_NAME[priority]}`
                      : PRIORITY_NAME[priority]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="task-due" label={t('taskEditor.dueDateLabel')}>
              <DateValue
                id="task-due"
                type="date"
                value={fields.dueDate}
                placeholder={COPY.datePlaceholder}
                onChange={(value) => {
                  update('dueDate', value);
                }}
              />
            </Field>

            {fields.status === 'not_started' && !fields.recurrence ? (
              <Field id="task-defer" label={t('taskEditor.hideUntilLabel')}>
                <DateValue
                  id="task-defer"
                  type="date"
                  value={fields.deferUntil}
                  placeholder={COPY.datePlaceholder}
                  onChange={(value) => {
                    update('deferUntil', value);
                  }}
                />
              </Field>
            ) : null}
          </div>
          <RecurrenceFields
            value={fields.recurrence}
            dueDate={fields.dueDate || currentDate({ timezone })}
            onChange={(recurrence) => {
              setFields((current) => ({
                ...current,
                recurrence,
                ...(recurrence
                  ? {
                      dueDate: current.dueDate || currentDate({ timezone }),
                      deferUntil: '',
                    }
                  : {}),
              }));
            }}
          />
        </div>

        <FeedbackToast
          key={feedbackAttempt}
          className="focus-detail__feedback"
          onDismiss={dismissFeedback}
          message={localError ?? feedbackMessage(feedback)}
          tone={
            localError !== undefined || feedback.kind === 'error'
              ? 'error'
              : 'neutral'
          }
        />
      </form>
      <PageFooter>
        <RailButton
          active={compact}
          aria-label={t('taskEditor.compactFormLabel')}
          title={
            compact
              ? t('taskEditor.useFullForm')
              : t('taskEditor.useCompactForm')
          }
          aria-pressed={compact}
          onClick={() => {
            const next = !compact;
            setCompact(next);
            preferencesStore.update({
              editorLayout: next ? 'compact' : 'full',
            });
            update(
              'tags',
              next
                ? compactTags(fields.tags)
                : formatTagList(parseTagList(fields.tags)),
            );
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
            <path d="M12 9v11M3.5 9h17M3.5 14.5h17" />
          </svg>
        </RailButton>
        {onSkip ? (
          <button
            type="button"
            className="focus-repeat-skip focus-visible:underline focus-visible:underline-offset-[3px] hover:underline hover:underline-offset-[3px] disabled:cursor-default disabled:opacity-50 min-h-11 ms-auto px-2.5 text-muted cursor-pointer text-action"
            onClick={onSkip}
            disabled={disabled || busy}
            aria-busy={skipping}
          >
            {skipping
              ? t('taskEditor.skipping')
              : t('taskEditor.skipThisOccurrence')}
          </button>
        ) : null}
      </PageFooter>
    </>
  );
}

function feedbackMessage(feedback: SaveFeedback): string | undefined {
  switch (feedback.kind) {
    case 'none':
      return undefined;
    case 'offline':
      return COPY.saveOffline;
    case 'error':
      return feedback.message;
  }
}

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly compact?: boolean;
  readonly children: ReactNode;
}

/**
 * One fact about the task: its name in the muted weight the metadata line
 * uses, then its value in the weight a row title uses. Stacked on a phone and
 * paired on a wider screen, so the label never squeezes the control down to
 * something a date picker cannot open in.
 */
function Field({ id, label, compact = false, children }: FieldProps) {
  return (
    <FieldRow>
      <label
        className={
          compact
            ? 'sr-only'
            : 'focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta'
        }
        htmlFor={id}
      >
        {label}
      </label>
      {children}
    </FieldRow>
  );
}

interface DateValueProps {
  readonly id: string;
  readonly type: 'date';
  readonly value: string;
  /** What the page says while the field is empty, in place of the platform's. */
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

/**
 * A native date control with the page's own prompt laid over it.
 *
 * The platform's empty text cannot be styled or relied on: desktop Chrome
 * writes `mm/dd/yyyy` at full ink, so nothing said the field was empty rather
 * than filled, and Android Chrome writes nothing at all, leaving a labelled
 * row with a picker mark and no field in sight. So the control keeps the
 * picker and the keyboard, and the prompt is a word of the page's own, in the
 * weight every placeholder here is set in. It is taken down the moment the
 * field is focused, where the platform's own segments are what is being typed
 * into, and the moment there is a date to read instead.
 */
function DateValue({ id, type, value, placeholder, onChange }: DateValueProps) {
  const empty = value === '';
  return (
    <span
      className="focus-date [&_>_*]:[grid-area:1_/_1] [&_>_*]:min-w-0 grid [grid-template-columns:minmax(0,_1fr)] items-center w-max max-w-full min-[360px]:flex-auto min-[360px]:w-auto"
      data-empty={empty ? '' : undefined}
    >
      <input
        id={id}
        className="focus-detail__value placeholder:text-muted placeholder:opacity-55 placeholder:font-placeholder min-w-0 max-w-full border-0 p-0 bg-transparent resize-none min-[360px]:flex-auto focus-detail__value--date w-full text-task"
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {empty ? (
        <span
          className="focus-date__prompt [.focus-date[data-empty]:focus-within_&]:opacity-0 pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis text-muted text-task"
          aria-hidden="true"
        >
          {placeholder}
        </span>
      ) : null}
    </span>
  );
}

function compactTags(value: string): string {
  return parseTagList(value)
    .map((tag) => `#${tag}`)
    .join(', ');
}
