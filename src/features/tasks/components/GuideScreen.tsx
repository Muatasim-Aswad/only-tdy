import type { FocusDestination } from '../contracts.ts';
import { navigate } from '../../../infra/navigation.ts';
import { routePath } from '../../../config/routes.ts';
import { FocusFooter } from './FocusFooter.tsx';

import { isNamedToken, scanEntryTokens } from '../domain/entry-tokens.ts';

import { classNames } from '../../../shared/classNames.ts';
import {
  GUIDE_COPY,
  GUIDE_CAPTURE,
  GUIDE_DATES,
  type GuideEntry,
} from './guide-copy.ts';
import { TokenChips, type ChipSpan } from './TokenChips.tsx';

/**
 * What the capture and search fields read, said once for the person typing.
 *
 * Each example wears the chips its field would paint, so the page teaches the
 * marks the way the fields show them.
 */
export function GuideScreen() {
  return (
    <main className="focus-shell">
      <GuideSection
        id="focus-guide-capture"
        heading={GUIDE_COPY.guideCaptureHeading}
        intro={GUIDE_COPY.guideCaptureIntro}
        example={GUIDE_COPY.guideCaptureExample}
        entries={GUIDE_CAPTURE}
      />
      <GuideSection
        id="focus-guide-dates"
        heading={GUIDE_COPY.guideDatesHeading}
        intro={GUIDE_COPY.guideDatesIntro}
        entries={GUIDE_DATES}
      />
      <GuideSection
        id="focus-guide-search"
        heading={GUIDE_COPY.guideSearchHeading}
        intro={GUIDE_COPY.guideSearchIntro}
      />
      <FocusFooter current="guide" onNavigate={navigateFromFooter} />
    </main>
  );
}

interface GuideSectionProps {
  readonly id: string;
  readonly heading: string;
  readonly intro: string;
  readonly example?: string;
  readonly entries?: readonly GuideEntry[];
}

function GuideSection({
  id,
  heading,
  intro,
  example,
  entries = [],
}: GuideSectionProps) {
  return (
    <section className="focus-guide" aria-labelledby={id}>
      <h2 id={id} className="focus-guide__heading text-section">
        {heading}
      </h2>
      <p className="focus-guide__intro text-meta">{intro}</p>
      {example === undefined ? null : (
        <Typed
          className="focus-guide__example"
          value={example}
          spans={captureChips(example)}
        />
      )}
      {entries.length === 0 ? null : (
        <dl className="focus-guide__list">
          {entries.map((entry) => (
            <div key={entry.typed} className="focus-field">
              <dt className="focus-guide__typed">
                <Typed
                  value={entry.typed}
                  spans={
                    entry.chipKind === undefined
                      ? captureChips(entry.typed)
                      : [
                          {
                            start: 0,
                            end: entry.typed.length,
                            kind: entry.chipKind,
                          },
                        ]
                  }
                />
              </dt>
              <dd className="focus-guide__meaning text-task">
                {entry.meaning}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Typed text with its chips drawn behind it, the way the fields draw them. */
function Typed({
  value,
  spans,
  className,
}: {
  readonly value: string;
  readonly spans: readonly ChipSpan[];
  readonly className?: string;
}) {
  return (
    <div className={classNames('focus-guide__line text-task', className)}>
      <TokenChips value={value} spans={spans} />
      <span>{value}</span>
    </div>
  );
}

function captureChips(typed: string): readonly ChipSpan[] {
  return scanEntryTokens(typed).flatMap((token) =>
    token.kind !== 'word' && isNamedToken(token)
      ? [{ start: token.start, end: token.end, kind: token.kind }]
      : [],
  );
}

function navigateFromFooter(destination: FocusDestination) {
  navigate(
    routePath({ kind: destination === 'guide' ? 'tasks' : destination }),
  );
}
