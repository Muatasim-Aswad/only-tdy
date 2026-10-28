import { i18n } from '../../../shared/i18n.ts';
export const english = {
  starting: 'Starting tour…',
  'tokens.intro': 'Tokens let you add details directly in the field.',
  fullBacklog:
    'Tasks added without <token>/today</token> wait in <name>Backlog</name>. Use this icon to open it.',
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
  shortcut:
    'Shortcut: <keycap>Ctrl+/</keycap> or <keycap>Cmd+/</keycap> switches <name>Add</name> and <name>Search</name>.',
  suggestion:
    'Choose a suggestion with <keycap>Tab</keycap>, <keycap>Enter</keycap>, or a tap.',
  tokenToday: 'put the task in <name>Today</name>',
  tokenTag: 'add a tag',
  tokenPriority: 'set high priority',
  tokenDue: 'set tomorrow’s due date',
  tokenRepeating: 'set up a repeating task',
  tokenNote: 'add a note',
  tokenReference: 'Find the full token reference in the <name>Guide</name>.',
  guideLink: 'Open the Guide',
  'capture.title': 'Add your first task',
  'capture.body':
    'Start typing here. Press <keycap>Enter</keycap> or choose <name>Add</name> to save.',
  'backlog.title': 'Find it in Backlog',
  'backlog.body':
    'Your task is waiting in <name>Backlog</name>. Use this icon to open it.',
  'backlog-tools.title': 'Select, move, and search',
  'backlog-tools.body': 'In <name>Backlog</name>, the circles select tasks.',
  select: 'Select one or more tasks with the circles.',
  move: 'Choose <name>Move to Today</name> to plan the selected tasks.',
  search: 'Use search to find tasks by their titles or notes.',
  'today.title': 'Complete tasks in Today',
  'today.body':
    'Here, the square completes a task. Completed tasks stay below your unfinished ones for the rest of the day.',
  'editor.title': 'Open the task editor',
  'editor.body':
    'Click any task, anywhere in the app, to open its editing form.',
  'compact.title': 'Try the compact form',
  'compact.body':
    'Use this control to switch between normal and compact forms. Both let you edit the same task details.',
  'switch.title': 'Switch between Add and Search',
  'switch.body':
    'This icon switches the empty field between <name>adding tasks</name> and <name>searching</name>. Your text is kept separately for each mode.',
  'tokens.title': 'Add details as you type',
  'tokens.body':
    'Tokens let you add details directly in the field. Choose suggestions as they appear.',
  'more.title': 'Explore More',
  'more.body':
    'The three dots open <name>More</name>. Find these pages and <name>Settings</name> here.',
  'all.title': 'Find earlier completed tasks',
  'all.body':
    'Completed tasks from earlier days leave <name>Today</name>. You can still find them in <name>All</name>, alongside open and hidden tasks.',
  'reference.title': 'Return whenever you need',
  'reference.body':
    'Open the <name>Guide</name> from <name>More</name> to review tokens or take the full tour.',
} as const;
export const arabic: Record<keyof typeof english, string> = {
  starting: 'جارٍ بدء الجولة…',
  'tokens.intro': 'استخدم الرموز لإضافة التفاصيل أثناء كتابة المهمة.',
  fullBacklog:
    'المهام التي تضيفها دون <token>/اليوم</token> تُحفظ في <name>قائمة الانتظار</name>. افتحها من هذه الأيقونة.',
  gotIt: 'فهمت',
  later: 'ذكّرني لاحقًا',
  next: 'التالي',
  back: 'السابق',
  finish: 'إنهاء',
  endTour: 'إنهاء الجولة',
  deferred: 'سنذكّرك في زيارة قادمة.',
  ended: 'انتهت الجولة.',
  completed: 'أكملت الجولة. يمكنك الرجوع إلى الدليل في أي وقت.',
  start: 'ابدأ الجولة',
  tourDetail: 'تعرّف على أدوات التطبيق واختصاراته.',
  options: 'إرشادات التطبيق',
  exampleTitle: 'اتصل بالمكتبة',
  exampleNote: 'اسأل عن مواعيد العمل.',
  shortcut:
    'الاختصار: <keycap>Ctrl+/</keycap> أو <keycap>Cmd+/</keycap> للتبديل بين <name>الإضافة</name> و<name>البحث</name>.',
  suggestion:
    'اختر اقتراحًا بالضغط على <keycap>Tab</keycap> أو <keycap>Enter</keycap> أو بالنقر عليه.',
  tokenToday: 'أضف المهمة إلى قائمة «<name>اليوم</name>»',
  tokenTag: 'أضف وسمًا',
  tokenPriority: 'اجعل أولوية المهمة عالية',
  tokenDue: 'اجعل موعد استحقاق المهمة غدًا',
  tokenRepeating: 'أنشئ مهمة متكرّرة',
  tokenNote: 'أضف ملاحظة',
  tokenReference: 'تجد شرح جميع الرموز في <name>الدليل</name>.',
  guideLink: 'افتح الدليل',
  'capture.title': 'أضف مهمتك الأولى',
  'capture.body':
    'اكتب مهمتك هنا، ثم اضغط <keycap>Enter</keycap> أو زر «<name>إضافة</name>» لحفظها.',
  'backlog.title': 'ستجدها في قائمة الانتظار',
  'backlog.body':
    'حُفظت مهمتك في <name>قائمة الانتظار</name>. افتحها من هذه الأيقونة.',
  'backlog-tools.title': 'اختر مهامك لليوم',
  'backlog-tools.body':
    'اضغط على الدوائر في <name>قائمة الانتظار</name> لتحديد المهام.',
  select: 'حدّد مهمة أو أكثر بالضغط على الدوائر.',
  move: 'اضغط «<name>نقل إلى اليوم</name>» لإضافة المهام المحدّدة إلى خطة يومك.',
  search: 'ابحث بكلمات من عنوان المهمة أو ملاحظاتها.',
  'today.title': 'أنجز مهام اليوم',
  'today.body':
    'اضغط على المربّع بجانب المهمة عند إنجازها. ستبقى المهام التي أنجزتها أسفل بقية المهام حتى نهاية اليوم.',
  'editor.title': 'عدّل تفاصيل المهمة',
  'editor.body': 'اضغط على أي مهمة في التطبيق لتعديل تفاصيلها.',
  'compact.title': 'جرّب العرض المختصر',
  'compact.body':
    'بدّل من هنا بين العرض الكامل والمختصر. يمكنك تعديل التفاصيل نفسها في كليهما.',
  'switch.title': 'بدّل بين الإضافة والبحث',
  'switch.body':
    'عندما يكون الحقل فارغًا، اضغط على هذه الأيقونة للتبديل بين <name>الإضافة</name> و<name>البحث</name>. يحتفظ كل وضع بالنصّ الذي كتبته فيه.',
  'tokens.title': 'أضف التفاصيل أثناء الكتابة',
  'tokens.body':
    'استخدم الرموز لإضافة التفاصيل أثناء كتابة المهمة، واختر من الاقتراحات التي تظهر لك.',
  'more.title': 'افتح قائمة «المزيد»',
  'more.body':
    'اضغط على النقاط الثلاث للوصول إلى بقية الصفحات و<name>الإعدادات</name>.',
  'all.title': 'راجع ما أنجزته في الأيام السابقة',
  'all.body':
    'بعد انتهاء اليوم، لن تظهر مهامه المكتملة في قائمة «<name>اليوم</name>». ستجدها في «<name>كل المهام</name>»، إلى جانب المهام غير المكتملة والمخفية.',
  'reference.title': 'الدليل متاح لك دائمًا',
  'reference.body':
    'افتح «<name>الدليل</name>» من قائمة «<name>المزيد</name>» لمراجعة الرموز أو بدء الجولة الكاملة.',
};
i18n.addResourceBundle('en', 'guidance', english);
i18n.addResourceBundle('ar', 'guidance', arabic);
export const t = i18n.getFixedT(null, 'guidance') as (
  key: keyof typeof english,
) => string;
