import { ActionButton } from '../../../shared/ActionButton.tsx';
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Joyride,
  EVENTS,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import { appLocale, i18n } from '../../../shared/i18n.ts';
import { navigate } from '../../../infra/navigation.ts';
import { routePath } from '../../../config/routes.ts';
import {
  GuideIcon,
  HistoryIcon,
  RepeatIcon,
} from '../components/NavigationIcons.tsx';
import { t as taskText } from '../messages.ts';
import { usePreferences } from '../preferences/usePreferences.ts';
import { preferencesStore } from '../preferences/store.ts';
import { guidancePage, subscribeGuidance, subscribeTour } from './events.ts';
import {
  LESSONS,
  nextLesson,
  observe,
  readProgress,
  resolveLesson,
  type Lesson,
  type Progress,
  type Signal,
} from './model.ts';
import { t } from './messages-guidance.ts';
import './styles.css';

interface Active {
  readonly lesson: Lesson;
  readonly type: 'full' | 'timed';
  readonly index: number;
}
interface Actions {
  readonly active: Active;
  readonly progress: Progress;
  readonly dismiss: (later?: boolean) => void;
  readonly next: () => void;
  readonly back: () => void;
}
const TourContext = createContext<Actions | null>(null);
const SELECTORS: Record<Lesson, string> = {
  capture: '.focus-capture',
  backlog: '[data-tour="nav-backlog"]',
  'backlog-tools': '.focus-listing',
  today: '.focus-complete',
  editor: '[data-tour-editor] textarea',
  compact: '[data-tour="compact"]',
  switch: '.focus-capture__marker',
  tokens: '.focus-capture',
  more: '[data-tour="more"]',
  all: '[data-tour="nav-all"]',
  reference: 'main',
};
const ROUTES = {
  capture: 'tasks',
  backlog: 'tasks',
  'backlog-tools': 'backlog',
  today: 'tasks',
  editor: 'task-tour',
  compact: 'task-tour',
  switch: 'tasks',
  tokens: 'tasks',
  more: 'tasks',
  all: 'all',
  reference: 'guide',
} as const;
const VISIBLE = (selector: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(selector)].find(
    (el) => el.getClientRects().length > 0,
  ) ?? null;
function target(active: Active): HTMLElement | null {
  // Full tours open the ordinary editor with a temporary task.
  const selector =
    active.type === 'timed' && active.lesson === 'editor'
      ? '.focus-row__title'
      : SELECTORS[active.lesson];
  return (
    VISIBLE(selector) ??
    (active.type === 'full'
      ? (VISIBLE('.focus-capture') ?? VISIBLE('main'))
      : null)
  );
}
function busy(): boolean {
  return (
    !!document.querySelector(
      '[role="menu"], [role="dialog"], [aria-modal="true"], dialog[open], [data-tour-editor][data-dirty="true"], [data-tour-editor][data-busy="true"]',
    ) ||
    [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        '.focus-capture input, .focus-capture textarea',
      ),
    ].some((el) => el.value.trim() !== '')
  );
}
export function Guidance() {
  useTranslation('guidance');
  const { settings } = usePreferences();
  const parsed = useMemo(
    () => readProgress(settings.guidance),
    [settings.guidance],
  );
  const progress = useRef(parsed);
  const [active, setActive] = useState<Active | null>(null);
  const [notice, setNotice] = useState('');
  const [visit] = useState(() =>
    Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) =>
      value.toString(36),
    ).join('-'),
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressed = useRef(false);
  const save = (value: Progress) => {
    progress.current = value;
    const serialized = JSON.stringify(value);
    if (preferencesStore.getSnapshot().settings.guidance !== serialized)
      preferencesStore.update({ guidance: serialized });
  };
  const receive = useEffectEvent((signal: Signal) => {
    if (active?.type === 'full') return;
    const updated = observe(progress.current, signal);
    if (JSON.stringify(updated) !== JSON.stringify(progress.current))
      save(updated);
    if (active || !settings.guidanceTips || suppressed.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const page = guidancePage();
      if (
        !page ||
        busy() ||
        suppressed.current ||
        !preferencesStore.getSnapshot().settings.guidanceTips
      )
        return;
      const lesson = nextLesson(progress.current, page, signal, visit);
      if (!lesson) return;
      const candidate: Active = {
        lesson,
        type: 'timed',
        index: LESSONS.indexOf(lesson),
      };
      if (target(candidate)) setActive(candidate);
    }, 250);
  });
  const control = useEffectEvent(() => {
    suppressed.current = true;
    clearTimeout(timer.current);
    setActive({ type: 'full', index: 0, lesson: 'capture' });
  });
  useEffect(() => {
    progress.current = parsed;
    if (!parsed.startedVisit) save({ ...parsed, startedVisit: visit });
  }, [parsed, visit]);
  useEffect(() => {
    const unsubscribe = subscribeGuidance(receive);
    const fresh = (event: Event) => {
      if (
        event.target instanceof Element &&
        !event.target.closest('[data-guidance]')
      )
        suppressed.current = false;
    };
    document.addEventListener('pointerdown', fresh, true);
    document.addEventListener('keydown', fresh, true);
    const stopCommands = subscribeTour(control);
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
      document.removeEventListener('pointerdown', fresh, true);
      document.removeEventListener('keydown', fresh, true);
      stopCommands();
    };
  }, []);
  const dismiss = (later = false) => {
    if (!active) return;
    suppressed.current = true;
    clearTimeout(timer.current);
    if (active.type === 'full') {
      setNotice(t('ended'));
    } else {
      save(resolveLesson(progress.current, active.lesson, visit, later));
      setNotice(later ? t('deferred') : '');
    }
    setActive(null);
  };
  const go = (index: number) => {
    if (!active) return;
    if (active.type === 'timed') {
      dismiss();
      return;
    }
    if (index >= LESSONS.length) {
      suppressed.current = true;
      setActive(null);
      setNotice(t('completed'));
      return;
    }
    setActive({ type: 'full', index, lesson: LESSONS[index] ?? 'capture' });
  };
  const locale = appLocale();
  const step = useMemo<Step | null>(
    () =>
      active === null
        ? null
        : {
            id: active.lesson,
            target: () => target(active),
            title: t(`${active.lesson}.title`),
            ...(active.lesson === 'compact'
              ? { blockTargetInteraction: false }
              : {}),
            content: (
              <LessonContent key={locale} active={active} progress={parsed} />
            ),
            placement:
              active.type === 'full' &&
              (['reference'] as readonly Lesson[]).includes(active.lesson)
                ? 'center'
                : 'auto',
            before: async () => {
              if (active.type !== 'full') return;
              navigate(routePath({ kind: ROUTES[active.lesson] }));
              await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                  resolve();
                });
              });
              const selector =
                active.lesson === 'reference'
                  ? '#guidance-controls'
                  : active.lesson === 'editor' || active.lesson === 'compact'
                    ? '[data-tour-editor]'
                    : '.focus-capture';
              const end = Date.now() + 5000;
              while (!VISIBLE(selector) && Date.now() < end)
                await new Promise<void>((resolve) => {
                  setTimeout(resolve, 30);
                });
            },
          },
    [active, parsed, locale],
  );
  useEffect(() => {
    if (!notice) return;
    const hide = setTimeout(() => {
      setNotice('');
    }, 5000);
    return () => {
      clearTimeout(hide);
    };
  }, [notice]);
  return (
    <>
      {notice && (
        <div className="guidance-notice text-meta" role="status">
          {notice}
        </div>
      )}
      {active && step && (active.type === 'full' || settings.guidanceTips) && (
        <TourContext
          value={{
            active,
            progress: parsed,
            dismiss,
            next: () => {
              go(active.index + 1);
            },
            back: () => {
              go(Math.max(0, active.index - 1));
            },
          }}
        >
          <Joyride
            key={`${active.type}-${active.lesson}`}
            run
            continuous
            steps={[step]}
            tooltipComponent={Tooltip}
            styles={{
              spotlight: { stroke: 'var(--accent)', strokeWidth: 1.5 },
            }}
            options={{
              skipBeacon: true,
              blockTargetInteraction: true,
              overlayClickAction: false,
              dismissKeyAction: 'close',
              closeButtonAction: 'skip',
              scrollDuration: 0,
              spotlightRadius: 6,
              zIndex: 10000,
              overlayColor: 'rgba(10, 20, 15, 0.32)',
              arrowColor: 'var(--accent)',
              backgroundColor: 'var(--surface)',
            }}
            onEvent={(data) => {
              if (
                active.type === 'full' &&
                data.type === EVENTS.TOOLTIP &&
                !progress.current.done.includes(active.lesson)
              )
                save(
                  resolveLesson(progress.current, active.lesson, visit, false),
                );
              if (
                data.type === EVENTS.ERROR ||
                data.type === EVENTS.TARGET_NOT_FOUND
              )
                dismiss(true);
              if (data.type === EVENTS.STEP_AFTER && data.action === 'close')
                dismiss();
            }}
          />
        </TourContext>
      )}
    </>
  );
}
function Tooltip({ tooltipProps, step }: TooltipRenderProps) {
  const context = useContext(TourContext);
  if (!context) return null;
  const { active, dismiss, next, back } = context;
  const full = active.type === 'full';
  return (
    <div
      {...tooltipProps}
      data-guidance
      className="guidance-tooltip"
      dir={appLocale() === 'ar' ? 'rtl' : 'ltr'}
      aria-labelledby={`guidance-${active.lesson}`}
    >
      <h2 id={`guidance-${active.lesson}`} className="text-section mb-2">
        {step.title}
      </h2>
      <div className="text-action leading-relaxed">{step.content}</div>
      <div className="guidance-actions mt-4">
        {full ? (
          <>
            <ActionButton
              type="button"

              onClick={() => {
                dismiss();
              }}
            >
              {t('endTour')}
            </ActionButton>
            {active.index > 0 && (
              <ActionButton type="button" onClick={back}>
                {t('back')}
              </ActionButton>
            )}
            <ActionButton
              type="button"
              data-action="primary"
              primary
              onClick={next}
            >
              {t(active.index === LESSONS.length - 1 ? 'finish' : 'next')}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton
              type="button"

              onClick={() => {
                dismiss(true);
              }}
            >
              {t('later')}
            </ActionButton>
            <ActionButton
              type="button"
              data-action="primary"
              primary
              onClick={next}
            >
              {t('gotIt')}
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
}
const LESSON_MARKUP = {
  token: (
    <code
      dir="auto"
      className="rounded-[3px] bg-selection px-1 py-0.5 text-accent [font-family:inherit] [unicode-bidi:isolate]"
    />
  ),
  keycap: (
    <kbd
      dir="ltr"
      className="rounded-[3px] border border-line px-1 text-ink [font-family:inherit] [unicode-bidi:isolate]"
    />
  ),
  name: <strong className="font-semibold text-ink" />,
};

function LessonText({
  message,
}: {
  readonly message: Parameters<typeof t>[0];
}) {
  return (
    <Trans
      i18n={i18n}
      ns="guidance"
      i18nKey={message}
      components={LESSON_MARKUP}
    />
  );
}

function LessonContent({
  active,
  progress,
}: {
  readonly active: Active;
  readonly progress: Progress;
}) {
  const full = active.type === 'full';
  const unused = (fact: Progress['used'][number]) =>
    full || !progress.used.includes(fact);
  const arabic = appLocale() === 'ar';
  const id = active.lesson;
  return (
    <>
      {!(id === 'backlog-tools' && !unused('selected')) && (
        <p>
          <LessonText
            message={
              full && id === 'backlog'
                ? 'fullBacklog'
                : id === 'tokens' && !unused('suggestion')
                  ? 'tokens.intro'
                  : `${id}.body`
            }
          />
        </p>
      )}
      {id === 'backlog-tools' && (
        <ul className="mt-2 space-y-2 list-disc ps-5">
          {unused('selected') && (
            <li>
              <LessonText message="select" />
            </li>
          )}
          {unused('moved') && (
            <li>
              <LessonText message="move" />
            </li>
          )}
          {unused('searched') && (
            <li>
              <LessonText message="search" />
            </li>
          )}
        </ul>
      )}
      {id === 'switch' && (
        <p className="text-meta text-muted mt-2" dir="auto">
          <LessonText message="shortcut" />
        </p>
      )}
      {id === 'more' && (
        <ul className="mt-3 space-y-2">
          <li className="flex items-center gap-3">
            <HistoryIcon />
            {taskText('copy.history')}
          </li>
          <li className="flex items-center gap-3">
            <RepeatIcon />
            {taskText('morePanel.repeating')}
          </li>
          <li className="flex items-center gap-3">
            <GuideIcon />
            {taskText('copy.guide')}
          </li>
        </ul>
      )}
      {id === 'tokens' && (
        <>
          <dl className="guidance-token-list mt-3">
            {unused('token-today') && (
              <>
                <dt>
                  <bdi>{arabic ? '/اليوم' : '/today'}</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenToday" />
                </dd>
              </>
            )}
            {unused('token-tag') && (
              <>
                <dt>
                  <bdi>{arabic ? '#وسم' : '#tag'}</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenTag" />
                </dd>
              </>
            )}
            {unused('token-priority') && (
              <>
                <dt>
                  <bdi>!3</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenPriority" />
                </dd>
              </>
            )}
            {unused('token-due') && (
              <>
                <dt>
                  <bdi>{arabic ? '/استحقاق:غدا' : '/due:tomorrow'}</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenDue" />
                </dd>
              </>
            )}
            {unused('token-repeating') && (
              <>
                <dt>
                  <bdi>{arabic ? '/تكرار' : '/repeating'}</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenRepeating" />
                </dd>
              </>
            )}
            {unused('token-note') && (
              <>
                <dt>
                  <bdi>{arabic ? '*(ملاحظة)' : '*(note)'}</bdi>
                </dt>
                <dd>
                  <LessonText message="tokenNote" />
                </dd>
              </>
            )}
          </dl>
          {unused('suggestion') && (
            <p className="text-meta mt-3">
              <LessonText message="suggestion" />
            </p>
          )}
          <p className="text-meta text-muted mt-2">
            <LessonText message="tokenReference" />
          </p>
        </>
      )}
    </>
  );
}
