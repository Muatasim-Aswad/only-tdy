import { t } from './about-messages.ts';
export const COPY = {
  noValue: '—',
  get versionApp() {
    return t('copy.versionApp');
  },
  get versionReleased() {
    return t('copy.versionReleased');
  },
  get versionBuilt() {
    return t('copy.versionBuilt');
  },
  get versionRevision() {
    return t('copy.versionRevision');
  },
  get versionChecking() {
    return t('copy.versionChecking');
  },
  get versionCurrent() {
    return t('copy.versionCurrent');
  },
  versionAvailable: (label: string) => t('copy.versionAvailable', { label }),
  get versionUnknown() {
    return t('copy.versionUnknown');
  },
  get versionReload() {
    return t('copy.versionReload');
  },
};
