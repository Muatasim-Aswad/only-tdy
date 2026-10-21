import type { ReactNode } from 'react';

export function PageShell({ children }: { readonly children: ReactNode }) {
  return (
    <main className="focus-shell mx-auto flex min-h-svh w-full max-w-column flex-col ps-[max(16px,env(safe-area-inset-left))] pe-[max(16px,env(safe-area-inset-right))] pt-[max(20px,env(safe-area-inset-top))] min-[480px]:ps-[max(24px,env(safe-area-inset-left))] min-[480px]:pe-[max(24px,env(safe-area-inset-right))] md:ps-[max(32px,env(safe-area-inset-left))] md:pe-[max(32px,env(safe-area-inset-right))] md:pt-[clamp(40px,8vh,88px)]">
      {children}
    </main>
  );
}
