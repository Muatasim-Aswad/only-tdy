import { t } from '../messages.ts';
import { PageShell } from '../../../shared/PageShell.tsx';
import type { MouseEvent } from 'react';

import type {
  CaptureFeedback,
  FocusDestination,
  FocusView,
  TaskListState,
} from '../contracts.ts';

import { TaskInput } from './TaskInput.tsx';
import { CaptureFeedbackMessage } from './CaptureFeedbackMessage.tsx';
import { FocusFooter } from './FocusFooter.tsx';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';
import { TaskList } from './TaskList.tsx';
import type { TaskRowMotion } from './TaskRow.tsx';
import { TodayClear, type TodayClearProps } from './TodayClear.tsx';

export interface FocusScreenProps {
  /** `tasks` is the screen proper; `history` is the record, which searches. */
  readonly view?: FocusView;
  readonly inputMode?: 'add' | 'search';
  readonly onToggleInputMode?: (() => void) | undefined;
  /** Where the marks at the foot lead. Pressing the lit one asks for `tasks`. */
  readonly onNavigate: (destination: FocusDestination) => void;
  /**
   * The names both fields complete against: projects for `+`, tags for `#`.
   * They arrive as names rather than records because a name is all either
   * field writes, and all either one is read back as.
   */
  readonly projectNames?: readonly string[] | undefined;
  readonly tagNames?: readonly string[] | undefined;
  readonly captureValue: string;
  readonly onCaptureChange: (value: string) => void;
  readonly onCaptureSubmit: () => void;
  readonly onDismissFeedback?: (() => void) | undefined;
  readonly feedback: CaptureFeedback;
  /* The record's own field, in the capture field's place while `view` is
     `history`. The other view holds them and never reads them, exactly as this
     one holds the capture value it does not show. */
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSearchSubmit: () => void;
  /** True while a term is in force, so an empty record says which kind of empty. */
  readonly searching?: boolean;
  /** A refused search, shown as floating feedback. */
  readonly searchMessage?: string | undefined;
  readonly listState: TaskListState;
  /** Present while Today has nothing open: the way to the backlog. */
  readonly todayClear?: TodayClearProps | undefined;
  readonly onToggle: (uid: string) => void;
  /** Opens a row's own page without leaving and reloading the app. */
  readonly onOpenTask?:
    ((event: MouseEvent<HTMLAnchorElement>, uid: string) => void) | undefined;
  readonly onRetry: () => void;
  /** Offline: capture and completion are disabled, nothing is hidden. */
  readonly disabled?: boolean;
  readonly rowMotion?: Readonly<Record<string, TaskRowMotion>> | undefined;
  readonly rowErrors?: Readonly<Record<string, string>> | undefined;
}

/**
 * The whole screen, with no data layer of its own. Every value arrives as a
 * prop and every action leaves as a callback, so the same component serves the
 * live app, the component tests, and the screenshot matrix.
 *
 * Source order is capture, the list, then the way out. Feedback floats above
 * the page. There is no chrome above the field: the
 * first thing on the page is the one thing the page is for.
 *
 * Each list shares an input that switches between capture and scoped search.
 */
export function FocusScreen({
  view = 'tasks',
  inputMode = view === 'tasks' ? 'add' : 'search',
  onToggleInputMode,
  onNavigate,
  projectNames,
  tagNames,
  captureValue,
  onCaptureChange,
  onCaptureSubmit,
  feedback,
  onDismissFeedback,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searching = false,
  searchMessage,
  listState,
  todayClear,
  onToggle,
  onOpenTask,
  onRetry,
  disabled = false,
  rowMotion,
  rowErrors,
}: FocusScreenProps) {
  const history = view !== 'tasks';
  const all = view === 'all';
  const repeating = view === 'repeating';

  return (
    <PageShell>
      <TaskInput
        mode={inputMode}
        onToggleMode={onToggleInputMode}
        value={inputMode === 'search' ? searchValue : captureValue}
        onValueChange={
          inputMode === 'search' ? onSearchChange : onCaptureChange
        }
        onSubmit={inputMode === 'search' ? onSearchSubmit : onCaptureSubmit}
        pageName={
          repeating
            ? t('focusScreen.repeating')
            : all
              ? t('focusScreen.all')
              : history
                ? t('focusScreen.completed')
                : t('focusScreen.today')
        }
        label={
          repeating
            ? t('focusScreen.searchRepeatingTasks')
            : all
              ? t('copy.allSearchLabel')
              : history
                ? t('copy.historySearchLabel')
                : t('focusScreen.searchToday')
        }
        projects={projectNames}
        tags={tagNames}
        disabled={disabled}
      />
      {inputMode === 'search' ? (
        <FeedbackToast message={searchMessage} />
      ) : (
        <CaptureFeedbackMessage
          feedback={feedback}
          onDismiss={onDismissFeedback}
          onOpenTask={onOpenTask}
        />
      )}
      {!history && todayClear !== undefined ? (
        <TodayClear {...todayClear} />
      ) : null}
      <TaskList
        state={listState}
        details={all || repeating}
        mode={all || repeating ? 'view' : 'complete'}
        onToggle={onToggle}
        onOpenTask={onOpenTask}
        onRetry={onRetry}
        emptyMessage={
          repeating
            ? searching
              ? t('focusScreen.noMatchingRepeatingTasks')
              : t('focusScreen.noRepeatingTasks')
            : history
              ? all
                ? searching
                  ? t('copy.allSearchEmpty')
                  : t('copy.allEmpty')
                : searching
                  ? t('copy.historySearchEmpty')
                  : t('copy.historyEmpty')
              : t('focusScreen.nothingOnTodayMatchesThat')
        }
        ruled={history}
        disabled={disabled}
        rowMotion={rowMotion}
        rowErrors={rowErrors}
      />
      <FocusFooter current={view} onNavigate={onNavigate} />
    </PageShell>
  );
}
