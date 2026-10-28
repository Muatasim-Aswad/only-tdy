function Icon({ children }: { readonly children: React.ReactNode }) {
  return (
    <svg
      className="focus-more__icon flex-none block text-[var(--menu-icon-color,_currentColor)]"
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

export function TasksIcon() {
  return (
    <Icon>
      <path d="m3.5 6 1.5 1.5 2.5-3" />
      <path d="m3.5 13 1.5 1.5 2.5-3" />
      <path d="M11 6h9M11 13h9M11 20h9" />
      <path d="M4 20h3" />
    </Icon>
  );
}

export function RepeatIcon() {
  return (
    <Icon>
      <path d="m16 3 4 4-4 4M20 7H8a4 4 0 0 0-4 4m4 10-4-4 4-4M4 17h12a4 4 0 0 0 4-4" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <path d="M8 3.5v5M16 9.5v5M10 15.5v5" />
    </Icon>
  );
}

export function SignOutIcon() {
  return (
    <Icon>
      <g className="origin-center rtl:-scale-x-100">
        <path d="M9 4H4v16h5" />
        <path d="M9 12h11m-4-4 4 4-4 4" />
      </g>
    </Icon>
  );
}

export function HistoryIcon() {
  return (
    <Icon>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3.5 4v4h4" />
      <path d="M12 7.5V12l3.2 1.9" />
    </Icon>
  );
}

/** An open book: what the fields read. */
export function GuideIcon() {
  return (
    <Icon>
      <path d="M12 6.5C10.2 5.2 7.6 4.5 3.5 4.5v13c4.1 0 6.7.7 8.5 2 1.8-1.3 4.4-2 8.5-2v-13c-4.1 0-6.7.7-8.5 2Z" />
      <path d="M12 6.5v13" />
    </Icon>
  );
}

/** Information about the app. */
export function AboutIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.5v.5" />
    </Icon>
  );
}
