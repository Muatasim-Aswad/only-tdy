import { PageShell } from '../shared/PageShell.tsx';
import { Component, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
  readonly onReload?: () => void;
}

export class ErrorBoundary extends Component<
  Props,
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <PageShell>
        <section className="focus-listing mt-0 min-h-30" role="alert">
          <h1 className="text-section">only-tdy couldn’t display this page.</h1>
          <p className="text-task">
            Reload to try again. Unsaved drafts will be lost.
          </p>
          <button
            type="button"
            className="focus-state__action inline-block py-3 -my-3 focus-visible:underline focus-visible:underline-offset-[3px] text-accent no-underline cursor-pointer text-action"
            onClick={
              this.props.onReload ??
              (() => {
                window.location.reload();
              })
            }
          >
            Reload
          </button>
        </section>
      </PageShell>
    );
  }
}
