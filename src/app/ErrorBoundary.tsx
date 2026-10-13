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
      <main className="focus-shell">
        <section className="focus-listing" role="alert">
          <h1 className="text-section">only-tdy couldn’t display this page.</h1>
          <p className="text-task">
            Reload to try again. Unsaved drafts will be lost.
          </p>
          <button
            type="button"
            className="focus-state__action text-action"
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
      </main>
    );
  }
}
