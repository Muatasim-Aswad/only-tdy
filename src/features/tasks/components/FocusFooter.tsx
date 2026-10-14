import type { FocusDestination } from '../contracts.ts';

import { classNames } from '../../../shared/classNames.ts';
import { COPY } from './copy.ts';
import { BacklogToggle } from './BacklogToggle.tsx';
import { HomeToggle } from './HomeToggle.tsx';
import { MoreMenu } from './MoreMenu.tsx';
import {
  TasksIcon,
  HistoryIcon,
  GuideIcon,
  AboutIcon,
} from './NavigationIcons.tsx';

export interface FocusFooterProps {
  /** Which page is on screen, so the right mark is lit. */
  readonly current: FocusDestination;
  /** Pressing a mark asks for its page; the footer does not decide the rest. */
  readonly onNavigate: (destination: FocusDestination) => void;
}

/** Home, Backlog and All stay on the rail; a selected menu page adds its mark. */
export function FocusFooter({ current, onNavigate }: FocusFooterProps) {
  return (
    <footer className="focus-footer">
      <HomeToggle
        active={current === 'tasks'}
        onToggle={() => {
          onNavigate('tasks');
        }}
      />
      <BacklogToggle
        active={current === 'backlog'}
        onToggle={() => {
          onNavigate('backlog');
        }}
      />
      <button
        type="button"
        className={classNames(
          'focus-history',
          current === 'all' && 'focus-history--active',
        )}
        aria-label={COPY.allTasks}
        title={COPY.allTasks}
        aria-pressed={current === 'all'}
        onClick={() => {
          onNavigate('all');
        }}
      >
        <TasksIcon />
      </button>
      {current !== 'tasks' && current !== 'backlog' && current !== 'all' ? (
        <button
          type="button"
          className="focus-history focus-history--active"
          aria-label={PAGE_LABEL[current]}
          title={PAGE_LABEL[current]}
          aria-pressed="true"
          onClick={() => {
            onNavigate(current);
          }}
        >
          {current === 'history' ? (
            <HistoryIcon />
          ) : current === 'guide' ? (
            <GuideIcon />
          ) : (
            <AboutIcon />
          )}
        </button>
      ) : null}
      <MoreMenu
        historyActive={current === 'history'}
        onOpenHistory={() => {
          onNavigate('history');
        }}
      />
    </footer>
  );
}

const PAGE_LABEL = {
  history: 'Completed tasks',
  guide: 'Guide',
  version: COPY.about,
};
