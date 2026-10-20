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
    <div className="focus-more__panel" id={id}>
      <button
        type="button"
        className="focus-more__item text-action"
        aria-current={historyActive ? 'page' : undefined}
        onClick={() => {
          onClose(false);
          onOpenHistory();
        }}
      >
        <HistoryIcon />
        {COPY.history}
      </button>
      <a
        className="focus-more__item text-action"
        href={routePath({ kind: 'repeating' })}
        onClick={(event) => {
          onClose(false);
          handleLinkNavigation(event, routePath({ kind: 'repeating' }));
        }}
      >
        <RepeatIcon />
        Repeating
      </a>
      <a
        className="focus-more__item text-action"
        href={SETTINGS_PATH}
        onClick={(event) => {
          onClose(false);
          handleLinkNavigation(event, SETTINGS_PATH);
        }}
      >
        <SettingsIcon />
        Settings
      </a>
      <a
        className="focus-more__item text-action"
        href={GUIDE_PATH}
        onClick={(event) => {
          onClose(false);
          handleLinkNavigation(event, GUIDE_PATH);
        }}
      >
        <GuideIcon />
        {COPY.guide}
      </a>
      <a
        className="focus-more__item text-action"
        href={ABOUT_PATH}
        onClick={(event) => {
          onClose(false);
          handleLinkNavigation(event, ABOUT_PATH);
        }}
      >
        <AboutIcon />
        {COPY.about}
      </a>
    </div>
  );
}
