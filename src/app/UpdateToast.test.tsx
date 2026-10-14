import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { UpdateToast } from './UpdateToast.tsx';

it('dismisses the update notice without opening its details', () => {
  const onOpen = vi.fn();
  const onDismiss = vi.fn();
  render(
    <UpdateToast
      label="1.2"
      href="/about"
      onOpen={onOpen}
      onDismiss={onDismiss}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('Updated to 1.2')).toBeNull();
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onOpen).not.toHaveBeenCalled();
});
