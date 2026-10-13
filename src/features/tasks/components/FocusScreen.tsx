import type { MouseEvent } from 'react';

import type {
  CaptureFeedback,
  FocusDestination,
  FocusView,
  TaskListState,
} from '../contracts.ts';

import { CaptureField } from './CaptureField.tsx';
import { CaptureFeedbackMessage } from './CaptureFeedbackMessage.tsx';
import { COPY } from './copy.ts';
import { FocusFooter } from './FocusFooter.tsx';
import { FeedbackToast } from '../../../shared/FeedbackToast.tsx';
import { SearchField } from './SearchField.tsx';
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

  return (
    <main className="focus-shell">
      {inputMode === 'search' ? (
        <>
          <SearchField
            value={searchValue}
            onToggleMode={onToggleInputMode}
            pageName={all ? 'All' : history ? 'Completed' : 'Today'}
            label={
              all
                ? COPY.allSearchLabel
                : history
                  ? COPY.historySearchLabel
                  : 'Search Today'
            }
            onValueChange={onSearchChange}
            onSubmit={onSearchSubmit}
            projects={projectNames}
            tags={tagNames}
            disabled={disabled}
          />
          <FeedbackToast message={searchMessage} />
        </>
      ) : (
        <>
          <CaptureField
            value={captureValue}
            onToggleMode={onToggleInputMode}
            onValueChange={onCaptureChange}
            onSubmit={onCaptureSubmit}
            projects={projectNames}
            tags={tagNames}
            disabled={disabled}
          />
          <CaptureFeedbackMessage
            feedback={feedback}
            onDismiss={onDismissFeedback}
            onOpenTask={onOpenTask}
          />
        </>
      )}
      {!history && todayClear !== undefined ? (
        <TodayClear {...todayClear} />
      ) : null}
      <TaskList
        state={listState}
        details={all}
        mode={all ? 'view' : 'complete'}
        onToggle={onToggle}
        onOpenTask={onOpenTask}
        onRetry={onRetry}
        emptyMessage={
          history
            ? all
              ? searching
                ? COPY.allSearchEmpty
                : COPY.allEmpty
              : searching
                ? COPY.historySearchEmpty
                : COPY.historyEmpty
            : 'Nothing on Today matches that.'
        }
        ruled={history}
        disabled={disabled}
        rowMotion={rowMotion}
        rowErrors={rowErrors}
      />
      <FocusFooter current={view} onNavigate={onNavigate} />
    </main>
  );
}
