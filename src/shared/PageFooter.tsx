import type { ReactNode } from 'react';

export function PageFooter({ children }: { readonly children: ReactNode }) {
  return (
    <footer className="focus-footer sticky bottom-0 mt-auto flex items-center gap-1 bg-[linear-gradient(to_bottom,transparent_0,var(--canvas)_32px)] pt-8 pb-[max(32px,env(safe-area-inset-bottom))] forced-colors:bg-none forced-colors:bg-[Canvas]">
      {children}
    </footer>
  );
}
