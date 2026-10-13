import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BacklogToggle } from './BacklogToggle.tsx';

describe('BacklogToggle', () => {
  it('says nothing in words and reports its state to assistive technology', () => {
    const { container } = render(
      <BacklogToggle active={false} onToggle={vi.fn()} />,
    );

    const button = screen.getByRole('button', { name: 'Backlog' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveClass('focus-history--active');
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('stays lit while the backlog is the page on screen', () => {
    render(<BacklogToggle active onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Backlog' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('focus-history--active');
  });

  /* The same drawn weight as the marks either side of it, so three marks read
     as one rail rather than as one mark and two imitations of it. */
  it('is the same control as the record’s mark, in a different shape', () => {
    render(<BacklogToggle active={false} onToggle={vi.fn()} />);

    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toHaveClass('focus-home__icon');
    expect(icon).toHaveAttribute('width', '20');
    expect(icon).toHaveAttribute('stroke-width', '1.5');
  });

  it('asks for its page on every press', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn<() => void>();
    render(<BacklogToggle active onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
