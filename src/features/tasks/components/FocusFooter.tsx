import { t } from '../messages.ts';
import { RailButton } from '../../../shared/RailButton.tsx';
import { PageFooter } from '../../../shared/PageFooter.tsx';
import type { FocusDestination } from '../contracts.ts';

import { BacklogToggle } from './BacklogToggle.tsx';
import { HomeToggle } from './HomeToggle.tsx';
import { MoreMenu } from './MoreMenu.tsx';
import {
  TasksIcon,
  HistoryIcon,
  GuideIcon,
  AboutIcon,
  RepeatIcon,
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
    <PageFooter>
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
      <RailButton
        data-tour="nav-all"
        active={current === 'all'}
        aria-label={t('copy.allTasks')}
        title={t('copy.allTasks')}
        aria-pressed={current === 'all'}
        onClick={() => {
          onNavigate('all');
        }}
      >
        <TasksIcon />
      </RailButton>
      {current !== 'tasks' && current !== 'backlog' && current !== 'all' ? (
        <RailButton
          active
          aria-label={PAGE_LABEL[current]}
          title={PAGE_LABEL[current]}
          aria-pressed="true"
          onClick={() => {
            onNavigate(current);
          }}
        >
          {current === 'repeating' ? (
            <RepeatIcon />
          ) : current === 'history' ? (
            <HistoryIcon />
          ) : current === 'guide' ? (
            <GuideIcon />
          ) : (
            <AboutIcon />
          )}
        </RailButton>
      ) : null}
      <MoreMenu
        historyActive={current === 'history'}
        onOpenHistory={() => {
          onNavigate('history');
        }}
      />
    </PageFooter>
  );
}

const PAGE_LABEL = {
  get repeating() {
    return t('focusFooter.repeating');
  },
  get history() {
    return t('focusFooter.history');
  },
  get guide() {
    return t('focusFooter.guide');
  },
  get version() {
    return t('copy.about');
  },
};
