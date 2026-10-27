import { i18n } from '../../../shared/i18n.ts';
export const english = {
  starting: 'Starting tour…',
  'tokens.intro': 'Tokens let you add details directly in the field.',
  fullBacklog:
    'Tasks added without /today wait in Backlog. Use this icon to open it.',
  gotIt: 'Got it',
  later: 'Remind me later',
  next: 'Next',
  back: 'Back',
  finish: 'Finish',
  endTour: 'End tour',
  deferred: 'We’ll remind you on a future visit.',
  ended: 'Tour ended.',
  completed: 'Tour complete. Return to the Guide whenever you need.',
  start: 'Start tour',
  tourDetail: 'Explore the icons, controls, and shortcuts.',
  options: 'App guidance',
  exampleTitle: 'Call the library',
  exampleNote: 'Ask about opening hours.',
  shortcut: 'Shortcut: Ctrl+/ or Cmd+/ switches Add and Search.',
  suggestion: 'Choose a suggestion with Tab, Enter, or a tap.',
  tokenToday: 'put the task in Today',
  tokenTag: 'add a tag',
  tokenPriority: 'set high priority',
  tokenDue: 'set tomorrow’s due date',
  tokenReference: 'Find the full token reference in the Guide.',
  guideLink: 'Open the Guide',
  'capture.title': 'Add your first task',
  'capture.body': 'Start typing here. Press Enter or choose Add to save.',
  'backlog.title': 'Find it in Backlog',
  'backlog.body': 'Your task is waiting in Backlog. Use this icon to open it.',
  'backlog-tools.title': 'Select, move, and search',
  'backlog-tools.body': 'In Backlog, the circles select tasks.',
  select: 'Select one or more tasks with the circles.',
  move: 'Choose Move to Today to plan the selected tasks.',
  search: 'Use search to find tasks by their titles or notes.',
  'today.title': 'Complete tasks in Today',
  'today.body':
    'Here, the square completes a task. Completed tasks stay below your unfinished ones for the rest of the day.',
  'editor.title': 'Open the task editor',
  'editor.body': 'Select a task’s text to open this form.',
  'compact.title': 'Try the compact form',
  'compact.body':
    'Use this control to switch between normal and compact forms. Both let you edit the same task details.',
  'switch.title': 'Switch between Add and Search',
  'switch.body':
    'This icon switches the empty field between adding tasks and searching. Your text is kept separately for each mode.',
  'tokens.title': 'Add details as you type',
  'tokens.body':
    'Tokens let you add details directly in the field. Choose suggestions as they appear.',
  'more.title': 'Explore More',
  'more.body':
    'The three dots open More. Find additional pages, Settings, and the Guide here.',
  'all.title': 'Find earlier completed tasks',
  'all.body':
    'Completed tasks from earlier days leave Today. You can still find them in All, alongside open and hidden tasks. All is a read-only view.',
  'repeating.title': 'Set up repeating tasks',
  'repeating.body':
    'Create repeating schedules here, separate from Backlog. Choose when a task repeats, then complete its due occurrences in Today.',
  'reference.title': 'Return whenever you need',
  'reference.body':
    'Open the Guide from More to review tokens or take the full tour.',
} as const;
export const arabic: Record<keyof typeof english, string> = {
  starting: 'جارٍ بدء الجولة…',
  'tokens.intro': 'تتيح الرموز إضافة التفاصيل داخل الحقل مباشرة.',
  fullBacklog:
    'تنتظر المهام التي تضيفها دون /اليوم في قائمة الانتظار. استخدم هذه الأيقونة لفتحها.',
  gotIt: 'فهمت',
  later: 'ذكّرني لاحقًا',
  next: 'التالي',
  back: 'السابق',
  finish: 'إنهاء',
  endTour: 'إنهاء الجولة',
  deferred: 'سنذكّرك في زيارة قادمة.',
  ended: 'انتهت الجولة.',
  completed: 'اكتملت الجولة. ارجع إلى الدليل متى احتجت إليه.',
  start: 'ابدأ الجولة',
  tourDetail: 'تعرّف على الأيقونات وعناصر التحكم والاختصارات.',
  options: 'إرشادات التطبيق',
  exampleTitle: 'اتصل بالمكتبة',
  exampleNote: 'اسأل عن ساعات العمل.',
  shortcut: 'الاختصار: Ctrl+/ أو Cmd+/ للتبديل بين الإضافة والبحث.',
  suggestion: 'اختر اقتراحًا بزر Tab أو Enter أو بالنقر.',
  tokenToday: 'ضع المهمة في اليوم',
  tokenTag: 'أضف وسمًا',
  tokenPriority: 'حدّد أولوية عالية',
  tokenDue: 'حدّد تاريخ الاستحقاق غدًا',
  tokenReference: 'تجد مرجع الرموز الكامل في الدليل.',
  guideLink: 'افتح الدليل',
  'capture.title': 'أضف مهمتك الأولى',
  'capture.body': 'ابدأ الكتابة هنا. اضغط Enter أو اختر إضافة للحفظ.',
  'backlog.title': 'ستجدها في قائمة الانتظار',
  'backlog.body': 'مهمتك في قائمة الانتظار. استخدم هذه الأيقونة لفتحها.',
  'backlog-tools.title': 'حدّد وانقل وابحث',
  'backlog-tools.body': 'في قائمة الانتظار، الدوائر لتحديد المهام.',
  select: 'حدّد مهمة أو أكثر باستخدام الدوائر.',
  move: 'اختر النقل إلى اليوم لتخطيط المهام المحدّدة.',
  search: 'ابحث عن المهام بعناوينها أو ملاحظاتها.',
  'today.title': 'أكمل المهام في اليوم',
  'today.body':
    'هنا، المربّع يُكمل المهمة. تبقى المهام المكتملة أسفل مهامك غير المكتملة لبقية اليوم.',
  'editor.title': 'افتح محرّر المهمة',
  'editor.body': 'اختر نص المهمة لفتح هذا النموذج.',
  'compact.title': 'جرّب النموذج المختصر',
  'compact.body':
    'استخدم هذا الزر للتبديل بين النموذجين العادي والمختصر. كلاهما يتيح تعديل تفاصيل المهمة نفسها.',
  'switch.title': 'بدّل بين الإضافة والبحث',
  'switch.body':
    'تبدّل هذه الأيقونة الحقل الفارغ بين إضافة المهام والبحث. يُحفظ نصّك لكل وضع على حدة.',
  'tokens.title': 'أضف التفاصيل أثناء الكتابة',
  'tokens.body':
    'تتيح الرموز إضافة التفاصيل داخل الحقل مباشرة. اختر الاقتراحات عند ظهورها.',
  'more.title': 'استكشف المزيد',
  'more.body':
    'تفتح النقاط الثلاث قائمة المزيد. ستجد فيها صفحات إضافية والإعدادات والدليل.',
  'all.title': 'اعثر على المهام المكتملة سابقًا',
  'all.body':
    'تغادر المهام المكتملة في الأيام السابقة صفحة اليوم. ستجدها في الكل، مع المهام المفتوحة والمخفية. صفحة الكل للعرض فقط.',
  'repeating.title': 'أنشئ مهام متكرّرة',
  'repeating.body':
    'أنشئ جداول التكرار هنا، بشكل مستقل عن قائمة الانتظار. حدّد موعد التكرار، ثم أكمل مرات الاستحقاق في اليوم.',
  'reference.title': 'ارجع متى احتجت',
  'reference.body':
    'افتح الدليل من المزيد لمراجعة الرموز أو بدء الجولة الكاملة.',
};
i18n.addResourceBundle('en', 'guidance', english);
i18n.addResourceBundle('ar', 'guidance', arabic);
export const t = i18n.getFixedT(null, 'guidance') as (
  key: keyof typeof english,
) => string;
