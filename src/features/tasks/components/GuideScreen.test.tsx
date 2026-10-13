import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GuideScreen } from './GuideScreen.tsx';

describe('GuideScreen', () => {
  it('explains capture and search under their own headings', () => {
    render(<GuideScreen />);

    expect(
      screen.getByRole('heading', { name: 'Capturing a task' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Searching' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Date tokens' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Back to the list' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guide' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('pairs each mark with what it does', () => {
    render(<GuideScreen />);

    const capture = screen.getByRole('region', { name: 'Capturing a task' });
    const typed = within(capture).getByText('/today', {
      ignore: '.focus-chips, .focus-chips *',
    });
    expect(typed.closest('dt')?.nextElementSibling).toHaveTextContent(
      'Put it on Today instead of the backlog.',
    );
  });

  it('highlights token names and whole date placeholders', () => {
    const { container } = render(<GuideScreen />);

    const chips = [...container.querySelectorAll('.focus-chip')].map(
      (chip) => chip.textContent,
    );
    expect(chips).toContain('+project');
    expect(chips).toContain('#tag');
    expect(chips).toContain('*note');
    expect(chips).toContain('(multiple words)');
    expect(chips).toContain('/due:<date token>');
    expect(chips).toContain('/hide:<date token>');
    expect(chips).toContain('dd-mm-yyyy');
    expect(chips).not.toContain('Ship it!');
  });
});
