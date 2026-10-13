import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DeleteTaskAction } from './DeleteTaskAction.tsx';

function renderAction(
  props: Partial<{ pending: boolean; disabled: boolean }> = {},
) {
  const onDelete = vi.fn<() => void>();
  render(<DeleteTaskAction onDelete={onDelete} {...props} />);
  return { onDelete };
}

const del = () => screen.getByRole('button', { name: 'Delete' });
const yes = () => screen.getByRole('button', { name: 'Yes' });

describe('DeleteTaskAction', () => {
  it('does not delete on the first press', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderAction();

    await user.click(del());

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete?')).toBeInTheDocument();
  });

  it('deletes on the second, and asks in place rather than in a dialog', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderAction();

    await user.click(del());
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(yes());

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('takes the answer back', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderAction();

    await user.click(del());
    await user.click(screen.getByRole('button', { name: 'Keep' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete?')).toBeNull();
    expect(del()).toBeInTheDocument();
  });

  it('follows the question and comes back with the answer', async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(del());
    expect(yes()).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(del()).toHaveFocus();
  });

  it('asks and answers from the keyboard alone', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderAction();

    await user.tab();
    expect(del()).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('recedes rather than disappearing when nothing can be written', () => {
    renderAction({ disabled: true });

    expect(del()).toBeInTheDocument();
    expect(del()).toBeDisabled();
  });

  it('cannot be pressed twice while the request is out', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderAction({ pending: true });

    expect(del()).toBeDisabled();
    await user.click(del());

    expect(onDelete).not.toHaveBeenCalled();
  });
});
