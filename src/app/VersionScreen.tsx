import { formattingLocale, t as commonT } from '../shared/i18n.ts';
import { t } from './messages-about.ts';
import { FieldRow } from '../shared/FieldRow.tsx';
import { PageShell } from '../shared/PageShell.tsx';
import {
  FocusFooter,
  type FocusDestination,
} from '../features/tasks/navigation-ui.ts';
import { navigate } from '../infra/navigation.ts';
import { routePath } from '../config/routes.ts';

import {
  buildLabel,
  shortRevision,
  type BuildInfo,
} from '../infra/build-info.ts';

import { InlineMessage } from '../shared/InlineMessage.tsx';

/** What the server answered about the deployed build. */
export type DeployedState =
  | { readonly kind: 'checking' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'known'; readonly build: BuildInfo };

export interface VersionScreenProps {
  readonly running: BuildInfo;
  readonly deployed: DeployedState;
  readonly onReload: () => void;
}

/** About the app, its running build, and any available update. */
export function VersionScreen({
  running,
  deployed,
  onReload,
}: VersionScreenProps) {
  const update =
    deployed.kind === 'known' && deployed.build.revision !== running.revision
      ? deployed.build
      : null;

  return (
    <PageShell>
      <section
        className="focus-about mb-7 ps-rail"
        aria-labelledby="about-heading"
      >
        <h1
          id="about-heading"
          className="focus-about__heading m-0 text-section"
        >
          {t('versionScreen.aboutOnlyTdy')}
        </h1>
        <p className="focus-about__intro mt-2 me-0 mb-0 ms-0 text-task">
          {t('versionScreen.captureTasksQuicklyChooseWhatMatters')}
        </p>
      </section>
      <dl className="focus-version m-0">
        {running.version === null ? null : (
          <Fact label={t('copy.versionApp')} value={running.version} />
        )}
        <Fact
          label={t('copy.versionReleased')}
          value={formatTime(running.committedAt)}
        />
        <Fact
          label={t('copy.versionBuilt')}
          value={formatTime(running.builtAt)}
        />
        <Fact
          label={t('copy.versionRevision')}
          value={shortRevision(running.revision)}
        />
      </dl>
      <div className="focus-version__status flex items-baseline flex-wrap gap-y-0 gap-x-3 mt-2">
        <InlineMessage message={statusMessage(deployed, update)} kind="hint" />
        {update === null ? null : (
          <button
            type="button"
            className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer text-action"
            onClick={onReload}
          >
            {t('copy.versionReload')}
          </button>
        )}
      </div>
      <FocusFooter current="version" onNavigate={navigateFromFooter} />
    </PageShell>
  );
}

function Fact({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <FieldRow>
      <dt className="focus-field__label text-muted min-[360px]:flex-none min-[360px]:w-24 text-meta">
        {label}
      </dt>
      <dd className="focus-version__value flex-auto min-w-0 m-0 tabular-nums wrap-anywhere text-task">
        {value}
      </dd>
    </FieldRow>
  );
}

function statusMessage(
  deployed: DeployedState,
  update: BuildInfo | null,
): string {
  if (update !== null)
    return t('copy.versionAvailable', { label: buildLabel(update) });
  switch (deployed.kind) {
    case 'checking':
      return t('copy.versionChecking');
    case 'unknown':
      return t('copy.versionUnknown');
    case 'known':
      return t('copy.versionCurrent');
  }
}

function formatTime(iso: string | null): string {
  if (iso === null) return commonT('display.noValue');
  const time = new Date(iso);
  return Number.isNaN(time.getTime())
    ? iso
    : new Intl.DateTimeFormat(formattingLocale(), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(time);
}

function navigateFromFooter(destination: FocusDestination) {
  navigate(
    routePath({ kind: destination === 'version' ? 'tasks' : destination }),
  );
}
