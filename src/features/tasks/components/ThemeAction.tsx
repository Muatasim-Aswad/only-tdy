import type { ThemeChoice } from '../../../infra/theme.ts';
import { useTheme } from '../../../infra/useTheme.ts';
import { COPY } from './copy.ts';

const THEME_LABEL: Readonly<Record<ThemeChoice, string>> = {
  system: COPY.themeSystem,
  light: COPY.themeLight,
  dark: COPY.themeDark,
};

export function ThemeAction() {
  const { choice, rotate } = useTheme();
  return (
    <button
      type="button"
      className="focus-more__item text-action"
      onClick={rotate}
    >
      <ThemeIcon choice={choice} />
      {THEME_LABEL[choice]}
    </button>
  );
}

function Icon({ children }: { readonly children: React.ReactNode }) {
  return (
    <svg
      className="focus-more__icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A screen while the machine decides, a sun for light, a moon for dark. */
function ThemeIcon({ choice }: { readonly choice: ThemeChoice }) {
  switch (choice) {
    case 'system':
      return (
        <Icon>
          <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
          <path d="M9 19.5h6" />
          <path d="M12 16.5v3" />
        </Icon>
      );
    case 'light':
      return (
        <Icon>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m5.6 5.6 1.4 1.4" />
          <path d="m17 17 1.4 1.4" />
          <path d="m18.4 5.6-1.4 1.4" />
          <path d="m7 17-1.4 1.4" />
        </Icon>
      );
    case 'dark':
      return (
        <Icon>
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2" />
        </Icon>
      );
  }
}
