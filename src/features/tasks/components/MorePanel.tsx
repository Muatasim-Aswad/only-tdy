import { handleLinkNavigation } from '../../../infra/navigation.ts';
import { routePath } from '../../../config/routes.ts';
import { COPY } from './copy.ts';
import {
  AboutIcon,
  GuideIcon,
  HistoryIcon,
  SettingsIcon,
  RepeatIcon,
} from './NavigationIcons.tsx';

const ABOUT_PATH = routePath({ kind: 'version' });
const GUIDE_PATH = routePath({ kind: 'guide' });
const SETTINGS_PATH = routePath({ kind: 'settings' });

const MENU_LINKS = [
  {
    href: routePath({ kind: 'repeating' }),
    label: 'Repeating',
    Icon: RepeatIcon,
  },
  { href: SETTINGS_PATH, label: 'Settings', Icon: SettingsIcon },
  { href: GUIDE_PATH, label: COPY.guide, Icon: GuideIcon },
  { href: ABOUT_PATH, label: COPY.about, Icon: AboutIcon },
];

interface MorePanelProps {
  readonly id: string;
  readonly historyActive: boolean;
  readonly onOpenHistory: () => void;
  readonly onClose: (restoreFocus: boolean) => void;
}

export function MorePanel({
  id,
  historyActive,
  onOpenHistory,
  onClose,
}: MorePanelProps) {
  return (
    <div
      className="focus-more__panel absolute z-20 bottom-[calc(100%_+_4px)] left-0 flex flex-col min-w-50 px-0 py-1 bg-surface border border-line rounded-[10px] animate-appear motion-reduce:animate-none"
      id={id}
    >
      <button
        type="button"
        className="focus-more__item aria-[current=page]:text-accent [--menu-icon-color:var(--muted)] flex items-center gap-3 min-h-11 px-4 py-2 text-ink text-left whitespace-nowrap cursor-pointer focus-visible:bg-selection focus-visible:outline-none hover:bg-selection text-action"
        aria-current={historyActive ? 'page' : undefined}
        onClick={() => {
          onClose(false);
          onOpenHistory();
        }}
      >
        <HistoryIcon />
        {COPY.history}
      </button>
      {MENU_LINKS.map(({ href, label, Icon }) => (
        <a
          key={href}
          className="focus-more__item aria-[current=page]:text-accent [--menu-icon-color:var(--muted)] flex items-center gap-3 min-h-11 px-4 py-2 text-ink text-left whitespace-nowrap cursor-pointer focus-visible:bg-selection focus-visible:outline-none hover:bg-selection text-action"
          href={href}
          onClick={(event) => {
            onClose(false);
            handleLinkNavigation(event, href);
          }}
        >
          <Icon />
          {label}
        </a>
      ))}
    </div>
  );
}
