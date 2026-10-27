import { i18n } from '../../shared/i18n.ts';
import type { TOptions } from 'i18next';

export const english = {
  'taskDetailScreen.tourExample': 'Tour example · changes stay in this example',
  'repeatingCreatePage.message': 'Choose a repeat schedule.',
  'repeatingCreatePage.couldnTSaveThisRepeatingTask':
    'Couldn’t save this repeating task. Try again.',
  'repeatingPage.message': 'Couldn’t load projects. Try again.',
  'settingsPage.tips': 'Tips as you go',
  'settingsPage.tipsHelp':
    'Explain unfamiliar controls when they become useful.',
  'settingsPage.tipsOn': 'On',
  'settingsPage.tipsOff': 'Off',
  'settingsPage.automaticallyMovesDueAndOverdueTasks':
    'Automatically moves due and overdue tasks when the task lists refresh. Due-date rules still apply when adding or saving tasks.',
  'settingsPage.hiddenTasksRemainAvailableInAll':
    'Hidden tasks remain available in All. A task’s Hide until date takes precedence. This setting does not move tasks to Today.',
  'settingsPage.backLabel': 'Back',
  'settingsPage.notSaved': 'Not saved',
  'settingsPage.saved': 'Saved',
  'settingsPage.saving': 'Saving…',
  'settingsPage.loading': 'Loading…',
  'settingsPage.notSynced': 'Not synced',
  'settingsPage.retrySync': 'Retry sync',
  'settingsPage.appearanceLabel': 'Appearance',
  'settingsPage.theme': 'Theme',
  'settingsPage.system': 'System',
  'settingsPage.light': 'Light',
  'settingsPage.dark': 'Dark',
  'settingsPage.planningLabel': 'Planning',
  'settingsPage.moveDueTasksToToday': 'Move due tasks to Today',
  'settingsPage.aboutMovingDueTasksToTodayLabel':
    'About moving due tasks to Today',
  'settingsPage.automatically': 'Automatically',
  'settingsPage.manually': 'Manually',
  'settingsPage.showDatedTasksInBacklog': 'Show dated tasks in Backlog',
  'settingsPage.aboutDatedTasksInBacklogLabel': 'About dated tasks in Backlog',
  'settingsPage.daysBeforeDueLabel': 'Days before due',
  'settingsPage.always': 'Always',
  'settingsPage.daysBeforeDueText': 'days before due',
  'settingsPage.nDaysBeforeDue': 'N days before due',
  'settingsPage.onTheDueDate': 'On the due date',
  'settingsPage.enterAWholeNumberFrom1':
    'Enter a whole number from 1 to 365000.',
  'settingsPage.resetSettings': 'Reset settings',
  'settingsPage.syncMessage.saved': 'Saved.',
  'settingsPage.syncMessage.savedToYourAccountBrowserStorage':
    'Saved to your account. Browser storage is unavailable.',
  'settingsPage.syncMessage.saving': 'Saving…',
  'settingsPage.syncMessage.usingBrowserSettingsChangesHavenT':
    'Using browser settings. Changes haven’t synced.',
  'settingsPage.syncMessage.changesAreOnlyAvailableInThis':
    'Changes are only available in this session. Sync failed and browser storage is unavailable.',
  'settingsPage.syncMessage.couldnTLoadYourSettingsConnect':
    'Couldn’t load your settings. Connect to Tududi and try again.',
  'settingsPage.syncMessage.loadingSettings': 'Loading settings…',
  'taskDetailPage.couldnTSkipThisOccurrenceTry':
    'Couldn’t skip this occurrence. Try again.',
  'taskProvider.loading': 'Loading…',
  'captureFeedbackMessage.editTaskLabel': 'Edit task',
  'captureField.whatNeedsDoing': 'What needs doing?',
  'captureField.suggestions': 'Suggestions',
  'captureField.add': 'Add',
  'focusFooter.repeating': 'Repeating',
  'focusFooter.history': 'Completed tasks',
  'focusFooter.guide': 'Guide',
  'focusScreen.repeating': 'Repeating',
  'focusScreen.all': 'All',
  'focusScreen.completed': 'Completed',
  'focusScreen.today': 'Today',
  'focusScreen.searchRepeatingTasks': 'Search repeating tasks',
  'focusScreen.searchToday': 'Search Today',
  'focusScreen.noMatchingRepeatingTasks': 'No matching repeating tasks.',
  'focusScreen.noRepeatingTasks': 'No repeating tasks.',
  'focusScreen.nothingOnTodayMatchesThat': 'Nothing on Today matches that.',
  'inputAction.clearInput': 'Clear input',
  'inputAction.switchToSearch': 'Switch to search',
  'inputAction.switchToAdd': 'Switch to add',
  'morePanel.repeating': 'Repeating',
  'morePanel.settings': 'Settings',
  'morePanel.signingOut': 'Signing out…',
  'morePanel.signOut': 'Sign out',
  'morePanel.couldNotSignOutTryAgain': 'Could not sign out. Try again.',
  'priorityMarker.high': 'High priority',
  'recurrenceFields.repeat': 'Repeat',
  'recurrenceFields.off': 'Off',
  'recurrenceFields.daily': 'Daily',
  'recurrenceFields.weekly': 'Weekly',
  'recurrenceFields.monthly': 'Monthly',
  'recurrenceFields.monthlyOnAWeekday': 'Monthly on a weekday',
  'recurrenceFields.lastDayOfTheMonth': 'Last day of the month',
  'recurrenceFields.every': 'Every',
  'recurrenceFields.daysText': 'days',
  'recurrenceFields.weeksText': 'weeks',
  'recurrenceFields.monthsText': 'months',
  'recurrenceFields.on': 'On',
  'recurrenceFields.chooseAtLeastOneDay': 'Choose at least one day.',
  'recurrenceFields.dayOfMonth': 'Day of month',
  'recurrenceFields.week': 'Week',
  'recurrenceFields.first': 'First',
  'recurrenceFields.second': 'Second',
  'recurrenceFields.third': 'Third',
  'recurrenceFields.fourth': 'Fourth',
  'recurrenceFields.fifth': 'Fifth',
  'recurrenceFields.last': 'Last',
  'recurrenceFields.weekday': 'Weekday',
  'recurrenceFields.basedOn': 'Based on',
  'recurrenceFields.scheduledDate': 'Scheduled date',
  'recurrenceFields.completionDate': 'Completion date',
  'recurrenceFields.endsOnOptional': 'Ends on (optional)',
  'searchField.suggestions': 'Suggestions',
  'searchField.backlog': 'Backlog',
  'taskDetailScreen.saveCtrlEnterCmdEnterOnLabel':
    'Save (Ctrl+Enter; Cmd+Enter on Mac)',
  'taskEditor.planned': 'Today',
  'taskEditor.not_started': 'Backlog',
  'taskEditor.in_progress': 'In progress',
  'taskEditor.waiting': 'Waiting',
  'taskEditor.done': 'Done',
  'taskEditor.titleSuggestionsLabel': 'Title suggestions',
  'taskEditor.tagsLabel': 'Tags',
  'taskEditor.tagsAlreadyInUseLabel': 'Tags already in use',
  'taskEditor.projectLabel': 'Project',
  'taskEditor.statusLabel': 'Status',
  'taskEditor.scheduled': 'Scheduled',
  'taskEditor.priorityLabel': 'Priority',
  'taskEditor.dueDateLabel': 'Due date',
  'taskEditor.hideUntilLabel': 'Hide until',
  'taskEditor.compactFormLabel': 'Compact form',
  'taskEditor.useFullForm': 'Use full form',
  'taskEditor.useCompactForm': 'Use compact form',
  'taskEditor.skipping': 'Skipping…',
  'taskEditor.skipThisOccurrence': 'Skip this occurrence',
  'taskRow.repeatingLabel': 'Repeating',
  'taskRow.scheduled': 'Scheduled',
  'taskRow.backlog': 'Backlog',
  'taskRow.today': 'Today',
  'taskRow.hideUntil': 'Hide until',
  'taskRow.due': 'Due',
  'copy.loading': 'Loading tasks…',
  'copy.empty': 'Nothing waiting. Capture the next thing above.',
  'copy.todayClear': 'Today is clear.',
  'copy.planFromBacklog': 'Plan from Backlog',
  'copy.offline': 'You’re offline. Reconnect to load and save tasks.',
  'copy.loadFailed': 'Tasks couldn’t load.',
  'copy.retry': 'Try again',
  'copy.addedToBacklog': 'Added to Backlog',
  'copy.newProjectText': 'new project',
  'copy.completionFailed': 'Task wasn’t completed. Try again.',
  'copy.reopenFailed': 'Task wasn’t reopened. Try again.',
  'copy.home': 'Today',
  'copy.history': 'Completed tasks',
  'copy.allTasks': 'All tasks',
  'copy.allEmpty': 'No tasks yet.',
  'copy.allSearchEmpty': 'No tasks match that.',
  'copy.allSearchLabel': 'Search all tasks',
  'copy.more': 'More',
  'copy.historyEmpty': 'Nothing completed yet.',
  'copy.searchSubmit': 'Search',
  'copy.backlogSearchLabel': 'Search the backlog',
  'copy.backlogSearchEmpty': 'Nothing in the backlog matches that.',
  'copy.historySearchLabel': 'Search completed tasks',
  'copy.historySearchEmpty': 'Nothing completed matches that.',
  'copy.backlog': 'Backlog',
  'copy.backlogEmpty': 'Nothing waiting in the backlog.',
  'copy.moveToToday': 'Move to Today',
  'copy.moveFailed': 'Nothing moved. Try again.',
  'copy.movePartlyFailed': 'Some tasks didn’t move. Try again.',
  'copy.moveOffline': 'You’re offline. Reconnect to move tasks to Today.',
  'copy.sessionExpired': 'Your Tududi session expired.',
  'copy.signIn': 'Open Tududi to sign in',
  'copy.themeSystem': 'Theme: system',
  'copy.themeLight': 'Theme: light',
  'copy.themeDark': 'Theme: dark',
  'copy.taskLoading': 'Loading the task…',
  'copy.taskLoadFailed': 'The task couldn’t load.',
  'copy.taskMissing': 'That task is gone.',
  'copy.backToList': 'Back to the list',
  'copy.titleRequired': 'Type a task before saving it.',
  'copy.titleLabel': 'Title',
  'copy.noteLabel': 'Notes',
  'copy.save': 'Save',
  'copy.saveFailed': 'The task wasn’t saved. Try again.',
  'copy.saveOffline': 'You’re offline. Reconnect to save this task.',
  'copy.delete': 'Delete',
  'copy.deleteConfirm': 'Delete?',
  'copy.deleteYes': 'Yes',
  'copy.deleteKeep': 'Keep',
  'copy.deleteFailed': 'The task wasn’t deleted. Try again.',
  'copy.noValueName': 'None',
  'copy.about': 'About',
  'copy.guide': 'Guide',
  'copy.low': 'Low',
  'copy.medium': 'Medium',
  'copy.high': 'High',
  'guideCopy.guideCaptureHeading': 'Capturing a task',
  'guideCopy.guideCaptureIntro':
    'Use these in quick entry or a task’s title. /repeating is for Add fields only.',
  'guideCopy.guideCaptureExampleText': 'call plumber +Home #errand !3 /today',
  'guideCopy.guideSearchHeading': 'Searching',
  'guideCopy.guideSearchIntro':
    'Toggle the empty field’s icon to search this page. Search titles and notes, or filter with #tag, +project or !priority. The clear icon resets the field.',
  'guideCopy.guideDatesHeading': 'Date tokens',
  'guideCopy.guideDatesIntro': 'Use a date token after /due: or /hide:.',
  'guideCopy.projectMeaning': 'Project. One per task; a new name creates it.',
  'guideCopy.tagMeaning': 'Tag. As many as you like.',
  'guideCopy.noteMeaning': 'Note. One per task.',
  'guideCopy.priorityMeaning':
    'Priority: !1 low, !2 medium, !3 high. Low if left out.',
  'guideCopy.commandtodayMeaning': 'Put it on Today instead of the backlog.',
  'guideCopy.commandrepeatingMeaning':
    'Open the repeating task form before saving.',
  'guideCopy.commandduedatetokenMeaning':
    'Due date. Due or overdue tasks move to Today.',
  'guideCopy.commandhidedatetokenMeaning':
    'Hide from Backlog until that day. Today clears it.',
  'guideCopy.multiplewordsMeaning':
    'Wrap a project, tag or note with several words: +(Big move), #(next week), *(call first).',
  'guideCopy.todayMeaning': 'Today’s date.',
  'guideCopy.tomorrowMeaning': 'Tomorrow’s date.',
  'guideCopy.ddmmyyyyMeaning':
    'Day-month-year. Month and year autocomplete from today if omitted. Tab accepts the suggested full date.',
  'guideCopy.NMeaning':
    'N calendar days from today. +3 means three days; +3d and +3days also work.',
  'taskSync.promoteDueTasks.tududiReturnedOverlappingTaskPagesRefresh':
    'Tududi returned overlapping task pages. Refresh to retry.',
  'taskSync.promoteDueTasks.aDueTaskCouldNotBe':
    'A due task could not be moved to Today.',
  'quickEntry.parseQuickEntry.priorityIs12Or3': 'Priority is !1, !2, or !3.',
  'quickEntry.parseQuickEntry.useAValidDateDdMm':
    'Use a valid date: DD-MM-YYYY, tomorrow, or +N.',
  'quickEntry.parseQuickEntry.chooseOneDueDate': 'Choose one due date.',
  'quickEntry.parseQuickEntry.chooseOneHideUntilDate':
    'Choose one Hide until date.',
  'quickEntry.parseQuickEntry.commandsAreTodayDueDateHide':
    'Commands are /today, /due:date, /hide:date, and /repeating.',
  'quickEntry.parseQuickEntry.commandsAreTodayDueDateAnd':
    'Commands are /today, /due:date, and /hide:date.',
  'quickEntry.parseQuickEntry.chooseOnePriority12Or':
    'Choose one priority: !1, !2, or !3.',
  'quickEntry.parseQuickEntry.chooseOneProject': 'Choose one project.',
  'quickEntry.parseQuickEntry.chooseOneNote': 'Choose one note.',
  'quickEntry.parseQuickEntry.addATaskTitle': 'Add a task title.',
  'taskDates.dateAtMidnight.chooseAValidDate': 'Choose a valid date.',
  'taskDates.validateHideDate.hideUntilCannotBeAfterThe':
    'Hide until cannot be after the due date.',
  'taskSearch.resolveSearch.message': 'Priority is !1, !2, or !3.',
  'useTaskCapture.couldNotLoadProjectsTryAgain':
    'Could not load projects. Try again.',
  'useTaskCapture.couldNotLoadTheAccountTimezone':
    'Could not load the account timezone.',
  'useTaskCapture.theTaskCouldNotBeAdded': 'The task could not be added.',
  'copy.planFromBacklogCount': 'Plan from Backlog ({{count, number}})',
  'copy.datePlaceholder': 'dd-mm-yyyy',
  'priorityMarker.medium': 'Medium priority',
  'actions.reopen': 'Reopen “{{title}}”',
  'actions.complete': 'Complete “{{title}}”',
  'actions.completed': 'Completed “{{title}}”',
  'actions.leaveBacklog': 'Leave “{{title}}” in Backlog',
  'actions.addToday': 'Add “{{title}}” to Today',
  'inputAction.shortcut': '{{label}}. Switch Add/Search: Ctrl+/ (Cmd+/ on Mac)',
  'searchField.submitPage': 'Search {{page}}',
  'row.hideUntil': 'Hide until {{date}}',
  'row.due': 'Due {{date}}',
  'search.unknownProject': 'No project named “{{name}}”.',
  'search.ambiguousProject': 'More than one project is named “{{name}}”.',
  'suggestions.today': 'today',
  'suggestions.tomorrow': 'tomorrow',
  'priority.label_low': 'Low priority',
  'priority.label_medium': 'Medium priority',
  'priority.label_high': 'High priority',
  'actions.selected_zero': '{{count, number}} selected',
  'actions.selected_one': '{{count, number}} selected',
  'actions.selected_two': '{{count, number}} selected',
  'actions.selected_few': '{{count, number}} selected',
  'actions.selected_many': '{{count, number}} selected',
  'actions.selected_other': '{{count, number}} selected',
  'actions.selected': '{{count, number}} selected',
  'guideTokens.project': '+project',
  'guideTokens.tag': '#tag',
  'guideTokens.note': '*note',
  'guideTokens.priority': '!priority',
  'guideTokens.today': '/today',
  'guideTokens.repeating': '/repeating',
  'guideTokens.due': '/due:<date token>',
  'guideTokens.hide': '/hide:<date token>',
  'guideTokens.multiple': '(multiple words)',
  'guideTokens.dateToday': 'today',
  'guideTokens.dateTomorrow': 'tomorrow',
  'guideTokens.dateFormat': 'dd-mm-yyyy',
  'guideTokens.relative': '+N',
  'recurrence.ordinal.first': 'first',
  'recurrence.ordinal.second': 'second',
  'recurrence.ordinal.third': 'third',
  'recurrence.ordinal.fourth': 'fourth',
  'recurrence.ordinal.fifth': 'fifth',
  'recurrence.ordinal.last': 'last',
  'recurrence.daily': 'Every {{count, number}} days',
  'recurrence.daily_zero': 'Every {{count, number}} days',
  'recurrence.daily_one': 'Every day',
  'recurrence.daily_two': 'Every {{count, number}} days',
  'recurrence.daily_few': 'Every {{count, number}} days',
  'recurrence.daily_many': 'Every {{count, number}} days',
  'recurrence.daily_other': 'Every {{count, number}} days',
  'recurrence.daily_completion':
    'Every {{count, number}} days after completion',
  'recurrence.daily_completion_zero':
    'Every {{count, number}} days after completion',
  'recurrence.daily_completion_one': 'Every day after completion',
  'recurrence.daily_completion_two':
    'Every {{count, number}} days after completion',
  'recurrence.daily_completion_few':
    'Every {{count, number}} days after completion',
  'recurrence.daily_completion_many':
    'Every {{count, number}} days after completion',
  'recurrence.daily_completion_other':
    'Every {{count, number}} days after completion',
  'recurrence.weekly': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_zero': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_one': 'Every week on {{days}}',
  'recurrence.weekly_two': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_few': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_many': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_other': 'Every {{count, number}} weeks on {{days}}',
  'recurrence.weekly_completion':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.weekly_completion_zero':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.weekly_completion_one': 'Every week on {{days}} after completion',
  'recurrence.weekly_completion_two':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.weekly_completion_few':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.weekly_completion_many':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.weekly_completion_other':
    'Every {{count, number}} weeks on {{days}} after completion',
  'recurrence.monthly': 'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_zero':
    'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_one': 'Every month on day {{day, number}}',
  'recurrence.monthly_two':
    'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_few':
    'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_many':
    'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_other':
    'Every {{count, number}} months on day {{day, number}}',
  'recurrence.monthly_completion':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_completion_zero':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_completion_one':
    'Every month on day {{day, number}} after completion',
  'recurrence.monthly_completion_two':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_completion_few':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_completion_many':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_completion_other':
    'Every {{count, number}} months on day {{day, number}} after completion',
  'recurrence.monthly_last_day':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_zero':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_one': 'Every month on the last day',
  'recurrence.monthly_last_day_two':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_few':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_many':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_other':
    'Every {{count, number}} months on the last day',
  'recurrence.monthly_last_day_completion':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_last_day_completion_zero':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_last_day_completion_one':
    'Every month on the last day after completion',
  'recurrence.monthly_last_day_completion_two':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_last_day_completion_few':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_last_day_completion_many':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_last_day_completion_other':
    'Every {{count, number}} months on the last day after completion',
  'recurrence.monthly_weekday':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_zero':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_one': 'Every month on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_two':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_few':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_many':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_other':
    'Every {{count, number}} months on {{week}} {{weekday}}',
  'recurrence.monthly_weekday_completion':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_zero':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_one':
    'Every month on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_two':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_few':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_many':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
  'recurrence.monthly_weekday_completion_other':
    'Every {{count, number}} months on {{week}} {{weekday}} after completion',
} as const;
export const arabic: Readonly<Record<keyof typeof english, string>> = {
  'taskDetailScreen.tourExample': 'مثال الجولة · التغييرات تبقى في هذا المثال',
  'repeatingCreatePage.message': 'اختر جدول التكرار.',
  'repeatingCreatePage.couldnTSaveThisRepeatingTask':
    'تعذّر حفظ المهمة المتكرّرة. حاول مجددًا.',
  'repeatingPage.message': 'تعذّر تحميل المشاريع. حاول مجددًا.',
  'settingsPage.tips': 'إرشادات أثناء الاستخدام',
  'settingsPage.tipsHelp': 'شرح عناصر التحكم غير المألوفة عندما تحتاج إليها.',
  'settingsPage.tipsOn': 'مفعّلة',
  'settingsPage.tipsOff': 'متوقفة',
  'settingsPage.automaticallyMovesDueAndOverdueTasks':
    'ينقل المهام المستحقة والمتأخرة تلقائيًا عند تحديث القوائم. تبقى قواعد تاريخ الاستحقاق سارية عند إضافة المهام أو حفظها.',
  'settingsPage.hiddenTasksRemainAvailableInAll':
    'تبقى المهام المخفية متاحة في «الكل». لتاريخ «إخفاء حتى» الأولوية. لا ينقل هذا الإعداد المهام إلى «اليوم».',
  'settingsPage.backLabel': 'رجوع',
  'settingsPage.notSaved': 'غير محفوظ',
  'settingsPage.saved': 'محفوظ',
  'settingsPage.saving': 'جارٍ الحفظ…',
  'settingsPage.loading': 'جارٍ التحميل…',
  'settingsPage.notSynced': 'غير متزامن',
  'settingsPage.retrySync': 'إعادة المزامنة',
  'settingsPage.appearanceLabel': 'المظهر',
  'settingsPage.theme': 'السمة',
  'settingsPage.system': 'النظام',
  'settingsPage.light': 'فاتحة',
  'settingsPage.dark': 'داكنة',
  'settingsPage.planningLabel': 'التخطيط',
  'settingsPage.moveDueTasksToToday': 'نقل المهام المستحقة إلى اليوم',
  'settingsPage.aboutMovingDueTasksToTodayLabel':
    'عن نقل المهام المستحقة إلى اليوم',
  'settingsPage.automatically': 'تلقائيًا',
  'settingsPage.manually': 'يدويًا',
  'settingsPage.showDatedTasksInBacklog':
    'عرض المهام المؤرخة في قائمة الانتظار',
  'settingsPage.aboutDatedTasksInBacklogLabel':
    'عن المهام المؤرخة في قائمة الانتظار',
  'settingsPage.daysBeforeDueLabel': 'الأيام قبل الاستحقاق',
  'settingsPage.always': 'دائمًا',
  'settingsPage.daysBeforeDueText': 'أيام قبل الاستحقاق',
  'settingsPage.nDaysBeforeDue': 'عدد أيام قبل الاستحقاق',
  'settingsPage.onTheDueDate': 'في تاريخ الاستحقاق',
  'settingsPage.enterAWholeNumberFrom1': 'أدخل عددًا صحيحًا من 1 إلى 365000.',
  'settingsPage.resetSettings': 'إعادة ضبط الإعدادات',
  'settingsPage.syncMessage.saved': 'تم الحفظ.',
  'settingsPage.syncMessage.savedToYourAccountBrowserStorage':
    'حُفظت في حسابك. تخزين المتصفح غير متاح.',
  'settingsPage.syncMessage.saving': 'جارٍ الحفظ…',
  'settingsPage.syncMessage.usingBrowserSettingsChangesHavenT':
    'تُستخدم إعدادات المتصفح. لم تتزامن التغييرات.',
  'settingsPage.syncMessage.changesAreOnlyAvailableInThis':
    'التغييرات متاحة في هذه الجلسة فقط. فشلت المزامنة وتخزين المتصفح غير متاح.',
  'settingsPage.syncMessage.couldnTLoadYourSettingsConnect':
    'تعذّر تحميل إعداداتك. اتصل بـ Tududi وحاول مجددًا.',
  'settingsPage.syncMessage.loadingSettings': 'جارٍ تحميل الإعدادات…',
  'taskDetailPage.couldnTSkipThisOccurrenceTry':
    'تعذّر تجاوز هذا الموعد. حاول مجددًا.',
  'taskProvider.loading': 'جارٍ التحميل…',
  'captureFeedbackMessage.editTaskLabel': 'تعديل المهمة',
  'captureField.whatNeedsDoing': 'ما الذي تريد إنجازه؟',
  'captureField.suggestions': 'الاقتراحات',
  'captureField.add': 'إضافة',
  'focusFooter.repeating': 'المهام المتكرّرة',
  'focusFooter.history': 'المهام المكتملة',
  'focusFooter.guide': 'الدليل',
  'focusScreen.repeating': 'المهام المتكرّرة',
  'focusScreen.all': 'الكل',
  'focusScreen.completed': 'المكتملة',
  'focusScreen.today': 'اليوم',
  'focusScreen.searchRepeatingTasks': 'البحث في المهام المتكرّرة',
  'focusScreen.searchToday': 'البحث في اليوم',
  'focusScreen.noMatchingRepeatingTasks': 'لا توجد مهام متكرّرة مطابقة.',
  'focusScreen.noRepeatingTasks': 'لا توجد مهام متكرّرة.',
  'focusScreen.nothingOnTodayMatchesThat': 'لا توجد مهام مطابقة في اليوم.',
  'inputAction.clearInput': 'مسح الحقل',
  'inputAction.switchToSearch': 'التبديل إلى البحث',
  'inputAction.switchToAdd': 'التبديل إلى الإضافة',
  'morePanel.repeating': 'المهام المتكرّرة',
  'morePanel.settings': 'الإعدادات',
  'morePanel.signingOut': 'جارٍ تسجيل الخروج…',
  'morePanel.signOut': 'تسجيل الخروج',
  'morePanel.couldNotSignOutTryAgain': 'تعذّر تسجيل الخروج. حاول مجددًا.',
  'priorityMarker.high': 'أولوية عالية',
  'recurrenceFields.repeat': 'التكرار',
  'recurrenceFields.off': 'إيقاف',
  'recurrenceFields.daily': 'يوميًا',
  'recurrenceFields.weekly': 'أسبوعيًا',
  'recurrenceFields.monthly': 'شهريًا',
  'recurrenceFields.monthlyOnAWeekday': 'شهريًا في يوم من الأسبوع',
  'recurrenceFields.lastDayOfTheMonth': 'آخر يوم من الشهر',
  'recurrenceFields.every': 'كل',
  'recurrenceFields.daysText': 'أيام',
  'recurrenceFields.weeksText': 'أسابيع',
  'recurrenceFields.monthsText': 'أشهر',
  'recurrenceFields.on': 'في',
  'recurrenceFields.chooseAtLeastOneDay': 'اختر يومًا واحدًا على الأقل.',
  'recurrenceFields.dayOfMonth': 'اليوم من الشهر',
  'recurrenceFields.week': 'الأسبوع',
  'recurrenceFields.first': 'الأول',
  'recurrenceFields.second': 'الثاني',
  'recurrenceFields.third': 'الثالث',
  'recurrenceFields.fourth': 'الرابع',
  'recurrenceFields.fifth': 'الخامس',
  'recurrenceFields.last': 'الأخير',
  'recurrenceFields.weekday': 'يوم الأسبوع',
  'recurrenceFields.basedOn': 'بناءً على',
  'recurrenceFields.scheduledDate': 'الموعد المحدّد',
  'recurrenceFields.completionDate': 'تاريخ الإكمال',
  'recurrenceFields.endsOnOptional': 'ينتهي في (اختياري)',
  'searchField.suggestions': 'الاقتراحات',
  'searchField.backlog': 'قائمة الانتظار',
  'taskDetailScreen.saveCtrlEnterCmdEnterOnLabel':
    'حفظ (Ctrl+Enter؛ Cmd+Enter على Mac)',
  'taskEditor.planned': 'اليوم',
  'taskEditor.not_started': 'قائمة الانتظار',
  'taskEditor.in_progress': 'قيد التنفيذ',
  'taskEditor.waiting': 'بانتظار إجراء',
  'taskEditor.done': 'مكتملة',
  'taskEditor.titleSuggestionsLabel': 'اقتراحات العنوان',
  'taskEditor.tagsLabel': 'الوسوم',
  'taskEditor.tagsAlreadyInUseLabel': 'الوسوم المستخدمة',
  'taskEditor.projectLabel': 'المشروع',
  'taskEditor.statusLabel': 'الحالة',
  'taskEditor.scheduled': 'مجدولة',
  'taskEditor.priorityLabel': 'الأولوية',
  'taskEditor.dueDateLabel': 'تاريخ الاستحقاق',
  'taskEditor.hideUntilLabel': 'إخفاء حتى',
  'taskEditor.compactFormLabel': 'النموذج المختصر',
  'taskEditor.useFullForm': 'استخدام النموذج الكامل',
  'taskEditor.useCompactForm': 'استخدام النموذج المختصر',
  'taskEditor.skipping': 'جارٍ التجاوز…',
  'taskEditor.skipThisOccurrence': 'تجاوز هذا الموعد',
  'taskRow.repeatingLabel': 'المهام المتكرّرة',
  'taskRow.scheduled': 'مجدولة',
  'taskRow.backlog': 'قائمة الانتظار',
  'taskRow.today': 'اليوم',
  'taskRow.hideUntil': 'إخفاء حتى',
  'taskRow.due': 'الاستحقاق',
  'copy.loading': 'جارٍ تحميل المهام…',
  'copy.empty': 'لا توجد مهام بانتظارك. دوّن المهمة التالية أعلاه.',
  'copy.todayClear': 'قائمة اليوم خالية.',
  'copy.planFromBacklog': 'اختر من قائمة الانتظار',
  'copy.offline': 'أنت غير متصل. اتصل بالشبكة لتحميل المهام وحفظها.',
  'copy.loadFailed': 'تعذّر تحميل المهام.',
  'copy.retry': 'حاول مجددًا',
  'copy.addedToBacklog': 'أُضيفت إلى قائمة الانتظار',
  'copy.newProjectText': 'مشروع جديد',
  'copy.completionFailed': 'لم تُكتمل المهمة. حاول مجددًا.',
  'copy.reopenFailed': 'لم تُفتح المهمة مجددًا. حاول مجددًا.',
  'copy.home': 'اليوم',
  'copy.history': 'المهام المكتملة',
  'copy.allTasks': 'كل المهام',
  'copy.allEmpty': 'لا توجد مهام بعد.',
  'copy.allSearchEmpty': 'لا توجد مهام مطابقة.',
  'copy.allSearchLabel': 'البحث في كل المهام',
  'copy.more': 'المزيد',
  'copy.historyEmpty': 'لا توجد مهام مكتملة بعد.',
  'copy.searchSubmit': 'بحث',
  'copy.backlogSearchLabel': 'البحث في قائمة الانتظار',
  'copy.backlogSearchEmpty': 'لا توجد مهام مطابقة في قائمة الانتظار.',
  'copy.historySearchLabel': 'البحث في المهام المكتملة',
  'copy.historySearchEmpty': 'لا توجد مهام مكتملة مطابقة.',
  'copy.backlog': 'قائمة الانتظار',
  'copy.backlogEmpty': 'لا توجد مهام في قائمة الانتظار.',
  'copy.moveToToday': 'نقل إلى اليوم',
  'copy.moveFailed': 'لم تُنقل أي مهمة. حاول مجددًا.',
  'copy.movePartlyFailed': 'لم تُنقل بعض المهام. حاول مجددًا.',
  'copy.moveOffline': 'أنت غير متصل. اتصل بالشبكة لنقل المهام إلى اليوم.',
  'copy.sessionExpired': 'انتهت جلسة Tududi. سجّل الدخول مجددًا.',
  'copy.signIn': 'فتح Tududi لتسجيل الدخول',
  'copy.themeSystem': 'السمة: النظام',
  'copy.themeLight': 'السمة: فاتحة',
  'copy.themeDark': 'السمة: داكنة',
  'copy.taskLoading': 'جارٍ تحميل المهمة…',
  'copy.taskLoadFailed': 'تعذّر تحميل المهمة.',
  'copy.taskMissing': 'لم تعد هذه المهمة موجودة.',
  'copy.backToList': 'العودة إلى القائمة',
  'copy.titleRequired': 'اكتب مهمة قبل حفظها.',
  'copy.titleLabel': 'العنوان',
  'copy.noteLabel': 'الملاحظات',
  'copy.save': 'حفظ',
  'copy.saveFailed': 'لم تُحفظ المهمة. حاول مجددًا.',
  'copy.saveOffline': 'أنت غير متصل. اتصل بالشبكة لحفظ هذه المهمة.',
  'copy.delete': 'حذف',
  'copy.deleteConfirm': 'حذف؟',
  'copy.deleteYes': 'نعم',
  'copy.deleteKeep': 'إبقاء',
  'copy.deleteFailed': 'لم تُحذف المهمة. حاول مجددًا.',
  'copy.noValueName': 'بدون',
  'copy.about': 'عن التطبيق',
  'copy.guide': 'الدليل',
  'copy.low': 'منخفضة',
  'copy.medium': 'متوسطة',
  'copy.high': 'عالية',
  'guideCopy.guideCaptureHeading': 'تدوين مهمة',
  'guideCopy.guideCaptureIntro':
    'استخدم هذه الرموز في الإدخال السريع أو عنوان المهمة. الأمر /تكرار متاح في حقول الإضافة فقط. الأوامر الإنجليزية مقبولة دائمًا أيضًا.',
  'guideCopy.guideCaptureExampleText':
    'اتصل بالسبّاك +المنزل #مشاوير !٣ /اليوم',
  'guideCopy.guideSearchHeading': 'البحث',
  'guideCopy.guideSearchIntro':
    'بدّل أيقونة الحقل الفارغ للبحث في هذه الصفحة. ابحث في العناوين والملاحظات، أو رشّح باستخدام #وسم أو +مشروع أو !أولوية. أيقونة المسح تفرّغ الحقل.',
  'guideCopy.guideDatesHeading': 'رموز التاريخ',
  'guideCopy.guideDatesIntro':
    'اكتب رمز تاريخ بعد /استحقاق: أو /إخفاء:. ويمكنك أيضًا استخدام /due: و /hide:.',
  'guideCopy.projectMeaning': 'مشروع واحد لكل مهمة. الاسم الجديد ينشئ مشروعًا.',
  'guideCopy.tagMeaning': 'وسم. أضف ما تشاء من الوسوم.',
  'guideCopy.noteMeaning': 'ملاحظة واحدة لكل مهمة.',
  'guideCopy.priorityMeaning':
    'الأولوية: !١ منخفضة، !٢ متوسطة، !٣ عالية. الافتراضي منخفضة.',
  'guideCopy.commandtodayMeaning':
    'ضع المهمة في اليوم بدلًا من قائمة الانتظار.',
  'guideCopy.commandrepeatingMeaning': 'افتح نموذج المهمة المتكرّرة قبل الحفظ.',
  'guideCopy.commandduedatetokenMeaning':
    'تاريخ الاستحقاق. تنتقل المهام المستحقة والمتأخرة إلى اليوم.',
  'guideCopy.commandhidedatetokenMeaning':
    'إخفاء من قائمة الانتظار حتى ذلك اليوم. النقل إلى اليوم يزيل الإخفاء.',
  'guideCopy.multiplewordsMeaning':
    'ضع المشروع أو الوسم أو الملاحظة متعددة الكلمات بين قوسين: +(نقل المنزل)، #(الأسبوع القادم)، *(اتصل أولًا).',
  'guideCopy.todayMeaning': 'تاريخ اليوم.',
  'guideCopy.tomorrowMeaning': 'تاريخ الغد.',
  'guideCopy.ddmmyyyyMeaning':
    'يوم-شهر-سنة. يُكمل الشهر والسنة تلقائيًا من تاريخ اليوم عند عدم كتابتهما. يقبل Tab التاريخ الكامل المقترح.',
  'guideCopy.NMeaning':
    'عدد أيام تقويمية من اليوم. +٣ تعني ثلاثة أيام؛ وتُقبل أيضًا +3d و +3days.',
  'taskSync.promoteDueTasks.tududiReturnedOverlappingTaskPagesRefresh':
    'أرسل Tududi صفحات مهام متداخلة. حدّث الصفحة للمحاولة مجددًا.',
  'taskSync.promoteDueTasks.aDueTaskCouldNotBe':
    'تعذّر نقل مهمة مستحقة إلى اليوم.',
  'quickEntry.parseQuickEntry.priorityIs12Or3': 'الأولوية هي !١ أو !٢ أو !٣.',
  'quickEntry.parseQuickEntry.useAValidDateDdMm':
    'استخدم تاريخًا صحيحًا: يوم-شهر-سنة، أو غدًا، أو +عدد.',
  'quickEntry.parseQuickEntry.chooseOneDueDate': 'اختر تاريخ استحقاق واحدًا.',
  'quickEntry.parseQuickEntry.chooseOneHideUntilDate':
    'اختر تاريخ إخفاء واحدًا.',
  'quickEntry.parseQuickEntry.commandsAreTodayDueDateHide':
    'الأوامر هي /اليوم و /استحقاق:تاريخ و /إخفاء:تاريخ و /تكرار. تُقبل الأوامر الإنجليزية أيضًا.',
  'quickEntry.parseQuickEntry.commandsAreTodayDueDateAnd':
    'الأوامر هي /اليوم و /استحقاق:تاريخ و /إخفاء:تاريخ. تُقبل الأوامر الإنجليزية أيضًا.',
  'quickEntry.parseQuickEntry.chooseOnePriority12Or':
    'اختر أولوية واحدة: !١ أو !٢ أو !٣.',
  'quickEntry.parseQuickEntry.chooseOneProject': 'اختر مشروعًا واحدًا.',
  'quickEntry.parseQuickEntry.chooseOneNote': 'اختر ملاحظة واحدة.',
  'quickEntry.parseQuickEntry.addATaskTitle': 'أضف عنوانًا للمهمة.',
  'taskDates.dateAtMidnight.chooseAValidDate': 'اختر تاريخًا صحيحًا.',
  'taskDates.validateHideDate.hideUntilCannotBeAfterThe':
    'لا يمكن أن يكون تاريخ الإخفاء بعد تاريخ الاستحقاق.',
  'taskSearch.resolveSearch.message': 'الأولوية هي !١ أو !٢ أو !٣.',
  'useTaskCapture.couldNotLoadProjectsTryAgain':
    'تعذّر تحميل المشاريع. حاول مجددًا.',
  'useTaskCapture.couldNotLoadTheAccountTimezone':
    'تعذّر تحميل المنطقة الزمنية للحساب.',
  'useTaskCapture.theTaskCouldNotBeAdded': 'تعذّرت إضافة المهمة.',
  'copy.planFromBacklogCount': 'اختر من قائمة الانتظار ({{count, number}})',
  'copy.datePlaceholder': 'يوم-شهر-سنة',
  'priorityMarker.medium': 'أولوية متوسطة',
  'actions.reopen': 'إعادة فتح «⁨{{title}}⁩»',
  'actions.complete': 'إكمال «⁨{{title}}⁩»',
  'actions.completed': 'اكتملت «⁨{{title}}⁩»',
  'actions.leaveBacklog': 'إبقاء «⁨{{title}}⁩» في قائمة الانتظار',
  'actions.addToday': 'إضافة «⁨{{title}}⁩» إلى اليوم',
  'inputAction.shortcut':
    '{{label}}. التبديل بين الإضافة والبحث: Ctrl+/ ‏(Cmd+/ على Mac)',
  'searchField.submitPage': 'بحث في {{page}}',
  'row.hideUntil': 'إخفاء حتى {{date}}',
  'row.due': 'الاستحقاق {{date}}',
  'search.unknownProject': 'لا يوجد مشروع باسم «⁨{{name}}⁩».',
  'search.ambiguousProject': 'يوجد أكثر من مشروع باسم «⁨{{name}}⁩».',
  'suggestions.today': 'اليوم',
  'suggestions.tomorrow': 'غدًا',
  'priority.label_low': 'أولوية منخفضة',
  'priority.label_medium': 'أولوية متوسطة',
  'priority.label_high': 'أولوية عالية',
  'actions.selected_zero': 'لا توجد مهام محددة',
  'actions.selected_one': 'مهمة واحدة محددة',
  'actions.selected_two': 'مهمتان محددتان',
  'actions.selected_few': '{{count, number}} مهام محددة',
  'actions.selected_many': '{{count, number}} مهمة محددة',
  'actions.selected_other': '{{count, number}} مهمة محددة',
  'actions.selected': '{{count, number}} مهمة محددة',
  'guideTokens.project': '+مشروع',
  'guideTokens.tag': '#وسم',
  'guideTokens.note': '*ملاحظة',
  'guideTokens.priority': '!أولوية',
  'guideTokens.today': '/اليوم',
  'guideTokens.repeating': '/تكرار',
  'guideTokens.due': '/استحقاق:<تاريخ>',
  'guideTokens.hide': '/إخفاء:<تاريخ>',
  'guideTokens.multiple': '(عدة كلمات)',
  'guideTokens.dateToday': 'اليوم',
  'guideTokens.dateTomorrow': 'غدًا',
  'guideTokens.dateFormat': 'يوم-شهر-سنة',
  'guideTokens.relative': '+عدد',
  'recurrence.ordinal.first': 'الأول',
  'recurrence.ordinal.second': 'الثاني',
  'recurrence.ordinal.third': 'الثالث',
  'recurrence.ordinal.fourth': 'الرابع',
  'recurrence.ordinal.fifth': 'الخامس',
  'recurrence.ordinal.last': 'الأخير',
  'recurrence.daily': 'كل {{count, number}} يوم',
  'recurrence.daily_zero': 'كل {{count, number}} يوم',
  'recurrence.daily_one': 'كل يوم',
  'recurrence.daily_two': 'كل يومين',
  'recurrence.daily_few': 'كل {{count, number}} أيام',
  'recurrence.daily_many': 'كل {{count, number}} يوم',
  'recurrence.daily_other': 'كل {{count, number}} يوم',
  'recurrence.daily_completion': 'كل {{count, number}} يوم بعد الإكمال',
  'recurrence.daily_completion_zero': 'كل {{count, number}} يوم بعد الإكمال',
  'recurrence.daily_completion_one': 'كل يوم بعد الإكمال',
  'recurrence.daily_completion_two': 'كل يومين بعد الإكمال',
  'recurrence.daily_completion_few': 'كل {{count, number}} أيام بعد الإكمال',
  'recurrence.daily_completion_many': 'كل {{count, number}} يوم بعد الإكمال',
  'recurrence.daily_completion_other': 'كل {{count, number}} يوم بعد الإكمال',
  'recurrence.weekly': 'كل {{count, number}} أسبوع في {{days}}',
  'recurrence.weekly_zero': 'كل {{count, number}} أسبوع في {{days}}',
  'recurrence.weekly_one': 'كل أسبوع في {{days}}',
  'recurrence.weekly_two': 'كل أسبوعين في {{days}}',
  'recurrence.weekly_few': 'كل {{count, number}} أسابيع في {{days}}',
  'recurrence.weekly_many': 'كل {{count, number}} أسبوع في {{days}}',
  'recurrence.weekly_other': 'كل {{count, number}} أسبوع في {{days}}',
  'recurrence.weekly_completion':
    'كل {{count, number}} أسبوع في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_zero':
    'كل {{count, number}} أسبوع في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_one': 'كل أسبوع في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_two': 'كل أسبوعين في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_few':
    'كل {{count, number}} أسابيع في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_many':
    'كل {{count, number}} أسبوع في {{days}} بعد الإكمال',
  'recurrence.weekly_completion_other':
    'كل {{count, number}} أسبوع في {{days}} بعد الإكمال',
  'recurrence.monthly': 'كل {{count, number}} شهر في اليوم {{day, number}}',
  'recurrence.monthly_zero':
    'كل {{count, number}} شهر في اليوم {{day, number}}',
  'recurrence.monthly_one': 'كل شهر في اليوم {{day, number}}',
  'recurrence.monthly_two': 'كل شهرين في اليوم {{day, number}}',
  'recurrence.monthly_few':
    'كل {{count, number}} أشهر في اليوم {{day, number}}',
  'recurrence.monthly_many':
    'كل {{count, number}} شهر في اليوم {{day, number}}',
  'recurrence.monthly_other':
    'كل {{count, number}} شهر في اليوم {{day, number}}',
  'recurrence.monthly_completion':
    'كل {{count, number}} شهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_zero':
    'كل {{count, number}} شهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_one':
    'كل شهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_two':
    'كل شهرين في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_few':
    'كل {{count, number}} أشهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_many':
    'كل {{count, number}} شهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_completion_other':
    'كل {{count, number}} شهر في اليوم {{day, number}} بعد الإكمال',
  'recurrence.monthly_last_day': 'كل {{count, number}} شهر في اليوم الأخير',
  'recurrence.monthly_last_day_zero':
    'كل {{count, number}} شهر في اليوم الأخير',
  'recurrence.monthly_last_day_one': 'كل شهر في اليوم الأخير',
  'recurrence.monthly_last_day_two': 'كل شهرين في اليوم الأخير',
  'recurrence.monthly_last_day_few':
    'كل {{count, number}} أشهر في اليوم الأخير',
  'recurrence.monthly_last_day_many':
    'كل {{count, number}} شهر في اليوم الأخير',
  'recurrence.monthly_last_day_other':
    'كل {{count, number}} شهر في اليوم الأخير',
  'recurrence.monthly_last_day_completion':
    'كل {{count, number}} شهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_zero':
    'كل {{count, number}} شهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_one':
    'كل شهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_two':
    'كل شهرين في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_few':
    'كل {{count, number}} أشهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_many':
    'كل {{count, number}} شهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_last_day_completion_other':
    'كل {{count, number}} شهر في اليوم الأخير بعد الإكمال',
  'recurrence.monthly_weekday':
    'كل {{count, number}} شهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_zero':
    'كل {{count, number}} شهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_one': 'كل شهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_two': 'كل شهرين في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_few':
    'كل {{count, number}} أشهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_many':
    'كل {{count, number}} شهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_other':
    'كل {{count, number}} شهر في {{weekday}} {{week}}',
  'recurrence.monthly_weekday_completion':
    'كل {{count, number}} شهر في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_zero':
    'كل {{count, number}} شهر في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_one':
    'كل شهر في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_two':
    'كل شهرين في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_few':
    'كل {{count, number}} أشهر في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_many':
    'كل {{count, number}} شهر في {{weekday}} {{week}} بعد الإكمال',
  'recurrence.monthly_weekday_completion_other':
    'كل {{count, number}} شهر في {{weekday}} {{week}} بعد الإكمال',
};

i18n.addResourceBundle('en', 'tasks', english);
i18n.addResourceBundle('ar', 'tasks', arabic);

export const t = i18n.getFixedT(null, 'tasks') as (
  key: keyof typeof english,
  options?: TOptions,
) => string;
