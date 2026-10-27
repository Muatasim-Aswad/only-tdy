import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionButton } from '../../../shared/ActionButton.tsx';
import { requestTour } from './events.ts';
import { t } from './guidance-copy.ts';

export function GuidanceControls() {
  useTranslation('guidance');
  const [starting, setStarting] = useState(false);
  const choose = () => {
    setStarting(true);
    requestTour();
  };
  return (
    <section className="ps-rail mb-8" aria-labelledby="guidance-controls">
      <h2 id="guidance-controls" className="text-section">
        {t('options')}
      </h2>
      <p className="text-meta text-muted mt-2">{t('tourDetail')}</p>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <ActionButton
          primary
          onClick={() => {
            choose();
          }}
        >
          {t('start')}
        </ActionButton>
      </div>
      {starting && (
        <p className="text-meta text-muted mt-3" role="status">
          {t('starting')}
        </p>
      )}
    </section>
  );
}
