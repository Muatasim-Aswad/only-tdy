import { t } from '../messages.ts';
import type { ReactNode } from 'react';
import { appLocale } from '../../../shared/i18n.ts';
import { textDirection } from '../../../shared/text-direction.ts';
import { FieldRow } from '../../../shared/FieldRow.tsx';
import { PageShell } from '../../../shared/PageShell.tsx';
import type { FocusDestination } from '../contracts.ts';
import { navigate } from '../../../infra/navigation.ts';
import { routePath } from '../../../config/routes.ts';
import { FocusFooter } from './FocusFooter.tsx';

import { isNamedToken, scanEntryTokens } from '../domain/entry-tokens.ts';

import { classNames } from '../../../shared/classNames.ts';
import {
  GUIDE_CAPTURE,
  GUIDE_DATES,
  type GuideEntry,
} from './guide-reference.ts';
import { TokenChips, type ChipSpan } from './TokenChips.tsx';

/**
 * What the capture and search fields read, said once for the person typing.
 *
 * Each example wears the chips its field would paint, so the page teaches the
 * marks the way the fields show them.
 */
export function GuideScreen({ guidance }: { readonly guidance?: ReactNode }) {
  return (
    <PageShell>
      {guidance}
      <GuideSection
        id="focus-guide-capture"
        heading={t('guideCopy.guideCaptureHeading')}
        intro={t('guideCopy.guideCaptureIntro')}
        example={t('guideCopy.guideCaptureExampleText')}
        entries={GUIDE_CAPTURE}
      />
      <GuideSection
        id="focus-guide-dates"
        heading={t('guideCopy.guideDatesHeading')}
        intro={t('guideCopy.guideDatesIntro')}
        entries={GUIDE_DATES}
      />
      <GuideSection
        id="focus-guide-search"
        heading={t('guideCopy.guideSearchHeading')}
        intro={t('guideCopy.guideSearchIntro')}
      />
      <FocusFooter current="guide" onNavigate={navigateFromFooter} />
    </PageShell>
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
    <section
      className="focus-guide [.focus-guide_+_&]:mt-7"
      aria-labelledby={id}
    >
      <h2 id={id} className="focus-guide__heading m-0 ps-rail text-section">
        {heading}
      </h2>
      <p className="focus-guide__intro mt-1 me-0 mb-0 ms-0 ps-rail text-muted text-meta">
        {intro}
      </p>
      {example === undefined ? null : (
        <Typed
          className="focus-guide__example mt-3 ps-rail"
          value={example}
          spans={captureChips(example)}
        />
      )}
      {entries.length === 0 ? null : (
        <dl className="focus-guide__list mt-2 me-0 mb-0 ms-0">
          {entries.map((entry) => {
            const typed = t(entry.typedKey);
            return (
              <FieldRow key={entry.typedKey}>
                <dt className="focus-guide__typed flex-none min-[360px]:w-34">
                  <Typed
                    value={typed}
                    spans={
                      entry.chipKind === undefined
                        ? captureChips(typed)
                        : [
                            {
                              start: 0,
                              end: typed.length,
                              kind: entry.chipKind,
                            },
                          ]
                    }
                  />
                </dt>
                <dd className="focus-guide__meaning flex-auto min-w-0 m-0 text-task">
                  {t(entry.meaningKey)}
                </dd>
              </FieldRow>
            );
          })}
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
    <div
      dir={textDirection(value, appLocale() === 'ar' ? 'rtl' : 'ltr')}
      className={classNames(
        'focus-guide__line [&_>_*]:[grid-area:1_/_1_/_2_/_2] [&_>_*]:whitespace-pre-wrap grid text-task',
        className,
      )}
    >
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
