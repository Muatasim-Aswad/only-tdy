import { t } from '../messages.ts';
import type { TaskPriority } from '../contracts.ts';

/** Task feedback, labels and field names. */
export const COPY = {
  get loading() {
    return t('copy.loading');
  },
  get empty() {
    return t('copy.empty');
  },
  get todayClear() {
    return t('copy.todayClear');
  },
  planFromBacklog: (count?: number) =>
    count === undefined
      ? t('copy.planFromBacklog')
      : t('copy.planFromBacklogCount', { count }),
  get offline() {
    return t('copy.offline');
  },
  get loadFailed() {
    return t('copy.loadFailed');
  },
  get retry() {
    return t('copy.retry');
  },
  get addedToBacklog() {
    return t('copy.addedToBacklog');
  },
  /* Said beside a `+` name nobody has yet: capturing it creates the project. */
  get newProject() {
    return t('copy.newProjectText');
  },
  get completionFailed() {
    return t('copy.completionFailed');
  },
  get reopenFailed() {
    return t('copy.reopenFailed');
  },
  /* The mark for the page only-tdy opens on, which is always Today. */
  get home() {
    return t('copy.home');
  },
  get history() {
    return t('copy.history');
  },
  get allTasks() {
    return t('copy.allTasks');
  },
  get allEmpty() {
    return t('copy.allEmpty');
  },
  get allSearchEmpty() {
    return t('copy.allSearchEmpty');
  },
  get allSearchLabel() {
    return t('copy.allSearchLabel');
  },
  /* The three dots at the end of the rail, which hold the record and the
     palette. */
  get more() {
    return t('copy.more');
  },
  get historyEmpty() {
    return t('copy.historyEmpty');
  },

  /* The field both long lists carry. It asks and answers the same way on each,
     so only the name it gives itself and the nothing it finds differ. */
  searchPlaceholder: '.....',
  get searchSubmit() {
    return t('copy.searchSubmit');
  },
  get backlogSearchLabel() {
    return t('copy.backlogSearchLabel');
  },
  get backlogSearchEmpty() {
    return t('copy.backlogSearchEmpty');
  },
  get historySearchLabel() {
    return t('copy.historySearchLabel');
  },
  get historySearchEmpty() {
    return t('copy.historySearchEmpty');
  },

  /* The backlog's own page. */
  get backlog() {
    return t('copy.backlog');
  },
  get backlogEmpty() {
    return t('copy.backlogEmpty');
  },
  get moveToToday() {
    return t('copy.moveToToday');
  },
  get moveFailed() {
    return t('copy.moveFailed');
  },
  get movePartlyFailed() {
    return t('copy.movePartlyFailed');
  },
  get moveOffline() {
    return t('copy.moveOffline');
  },
  get sessionExpired() {
    return t('copy.sessionExpired');
  },
  get signIn() {
    return t('copy.signIn');
  },

  /* The palette mark says which of the three answers is in force, not which
     one the next press would reach. */
  get themeSystem() {
    return t('copy.themeSystem');
  },
  get themeLight() {
    return t('copy.themeLight');
  },
  get themeDark() {
    return t('copy.themeDark');
  },

  /* The task's own page. */
  get taskLoading() {
    return t('copy.taskLoading');
  },
  get taskLoadFailed() {
    return t('copy.taskLoadFailed');
  },
  get taskMissing() {
    return t('copy.taskMissing');
  },
  get backToList() {
    return t('copy.backToList');
  },
  get titleRequired() {
    return t('copy.titleRequired');
  },
  get titleLabel() {
    return t('copy.titleLabel');
  },
  get noteLabel() {
    return t('copy.noteLabel');
  },
  /* The one placeholder the page uses, in both fields that have one: four
     dots that say a line is empty without naming anything to put in it. */
  placeholder: '....',
  get save() {
    return t('copy.save');
  },
  get saveFailed() {
    return t('copy.saveFailed');
  },
  get saveOffline() {
    return t('copy.saveOffline');
  },
  get delete() {
    return t('copy.delete');
  },
  get deleteConfirm() {
    return t('copy.deleteConfirm');
  },
  get deleteYes() {
    return t('copy.deleteYes');
  },
  get deleteKeep() {
    return t('copy.deleteKeep');
  },
  get deleteFailed() {
    return t('copy.deleteFailed');
  },
  /* The empty choice, said twice: a mark for the eye, and a word for a screen
     reader, which can make nothing of a dash. The word is only the choice —
     the field it belongs to is already named beside it. */
  noValue: '—',
  get noValueName() {
    return t('copy.noValueName');
  },
  /* What an empty date field says. The platform's own empty text is a format
     to obey and, on a phone, is often nothing at all; this is the shape of a
     date, said once, in the weight the page keeps for a prompt. */
  get datePlaceholder() {
    return t('copy.datePlaceholder');
  },

  get about() {
    return t('copy.about');
  },

  /* The guide page, reached only from the three dots. */
  get guide() {
    return t('copy.guide');
  },
} as const;

export const PRIORITY_NAME: Readonly<Record<TaskPriority, string>> = {
  get low() {
    return t('copy.low');
  },
  get medium() {
    return t('copy.medium');
  },
  get high() {
    return t('copy.high');
  },
};
