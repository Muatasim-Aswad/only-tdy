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

import { COPY } from './copy.ts';
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

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

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
    <main className="focus-shell">
      <section className="focus-about" aria-labelledby="about-heading">
        <h1 id="about-heading" className="focus-about__heading text-section">
          About only-tdy
        </h1>
        <p className="focus-about__intro text-task">
          Capture tasks quickly, choose what matters today, and leave the rest
          in Backlog. A minimalist daily flow, with projects, tags, priorities
          and dates available as you type.
        </p>
      </section>
      <dl className="focus-version">
        {running.version === null ? null : (
          <Fact label={COPY.versionApp} value={running.version} />
        )}
        <Fact
          label={COPY.versionReleased}
          value={formatTime(running.committedAt)}
        />
        <Fact label={COPY.versionBuilt} value={formatTime(running.builtAt)} />
        <Fact
          label={COPY.versionRevision}
          value={shortRevision(running.revision)}
        />
      </dl>
      <div className="focus-version__status">
        <InlineMessage message={statusMessage(deployed, update)} kind="hint" />
        {update === null ? null : (
          <button
            type="button"
            className="focus-state__action text-action"
            onClick={onReload}
          >
            {COPY.versionReload}
          </button>
        )}
      </div>
      <FocusFooter current="version" onNavigate={navigateFromFooter} />
    </main>
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
    <div className="focus-field">
      <dt className="focus-field__label text-meta">{label}</dt>
      <dd className="focus-version__value text-task">{value}</dd>
    </div>
  );
}

function statusMessage(
  deployed: DeployedState,
  update: BuildInfo | null,
): string {
  if (update !== null) return COPY.versionAvailable(buildLabel(update));
  switch (deployed.kind) {
    case 'checking':
      return COPY.versionChecking;
    case 'unknown':
      return COPY.versionUnknown;
    case 'known':
      return COPY.versionCurrent;
  }
}

function formatTime(iso: string | null): string {
  if (iso === null) return COPY.noValue;
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? iso : TIME_FORMAT.format(time);
}

function navigateFromFooter(destination: FocusDestination) {
  navigate(
    routePath({ kind: destination === 'version' ? 'tasks' : destination }),
  );
}
