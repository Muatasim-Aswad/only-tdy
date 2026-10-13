import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HomeToggle } from './HomeToggle.tsx';

describe('HomeToggle', () => {
  it('says nothing in words and reports its state to assistive technology', () => {
    const { container } = render(
      <HomeToggle active={false} onToggle={vi.fn()} />,
    );

    const button = screen.getByRole('button', { name: 'Today' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveClass('focus-history--active');
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('stays lit while the open list is the page on screen', () => {
    render(<HomeToggle active onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Today' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('focus-history--active');
  });

  /* The same drawn weight as the marks beside it, so the rail reads as one
     row of marks rather than as a home mark and two imitations of it. */
  it('is the same control as the other marks, in a different shape', () => {
    render(<HomeToggle active={false} onToggle={vi.fn()} />);

    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toHaveClass('focus-home__icon');
    expect(icon).toHaveAttribute('width', '20');
    expect(icon).toHaveAttribute('stroke-width', '1.5');
  });

  it('asks for its page on every press, lit or not', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn<() => void>();
    render(<HomeToggle active onToggle={onToggle} />);

    await user.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
