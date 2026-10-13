export const COPY = {
  noValue: '—',
  versionApp: 'App version',
  versionReleased: 'Released',
  versionBuilt: 'Built',
  versionRevision: 'Revision',
  versionChecking: 'Checking for updates…',
  versionCurrent: 'Up to date.',
  versionAvailable: (label: string) => `Update available: ${label}.`,
  versionUnknown: 'Couldn’t check for updates.',
  versionReload: 'Reload',
  updated: (label: string) => `Updated to ${label}`,
};
