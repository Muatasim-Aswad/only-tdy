import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary.tsx';

function BrokenPage(): never {
  throw new Error('private task contents');
}

it('offers reload recovery without rendering exception contents', () => {
  const onReload = vi.fn();
  render(
    <ErrorBoundary onReload={onReload}>
      <BrokenPage />
    </ErrorBoundary>,
    { onCaughtError: () => undefined },
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unsaved drafts will be lost.',
  );
  expect(screen.queryByText('private task contents')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
  expect(onReload).toHaveBeenCalledOnce();
});
