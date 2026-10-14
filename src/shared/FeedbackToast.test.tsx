import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedbackToast } from './FeedbackToast.tsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedbackToast', () => {
  it('dismisses immediately and cancels automatic expiry', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<FeedbackToast message="Added" onDismiss={onDismiss} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    expect(screen.queryByText('Added')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('expires automatically and shows the next message after dismissal', () => {
    vi.useFakeTimers();
    const { rerender } = render(<FeedbackToast message="First" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('First')).toBeNull();

    rerender(<FeedbackToast message="Second" />);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('keeps actions available while hovered or keyboard focused', () => {
    vi.useFakeTimers();
    render(<FeedbackToast message="Added" action={<a href="/edit">Edit</a>} />);
    const toast = screen.getByText('Added').parentElement;
    if (toast === null) throw new Error('Missing toast');
    const edit = screen.getByRole('link', { name: 'Edit' });

    fireEvent.mouseEnter(toast);
    fireEvent.focus(edit);
    fireEvent.mouseLeave(toast);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(edit).toBeInTheDocument();

    fireEvent.blur(edit, { relatedTarget: document.body });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Added')).toBeNull();
  });
});
