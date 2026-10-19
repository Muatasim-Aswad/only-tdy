import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CaptureFeedbackMessage } from './CaptureFeedbackMessage.tsx';
import { FEEDBACK } from './testing/fixtures.ts';

function liveRegion() {
  return document.querySelector('[aria-live="polite"]');
}

describe('CaptureFeedbackMessage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the live region in the document while saying nothing', () => {
    render(<CaptureFeedbackMessage feedback={FEEDBACK.none} />);

    expect(liveRegion()).toBeInTheDocument();
    expect(liveRegion()).toBeEmptyDOMElement();
  });

  it('announces a validation failure in the words the caller chose', () => {
    render(<CaptureFeedbackMessage feedback={FEEDBACK.unknownProject} />);

    const message = screen.getByText(FEEDBACK.unknownProject.message);
    expect(liveRegion()).toContainElement(message);
    expect(message).toHaveClass('focus-message--error');
  });

  it('confirms an addition the visible list cannot show', () => {
    render(<CaptureFeedbackMessage feedback={FEEDBACK.addedToBacklog} />);

    expect(screen.getByText('Added to Backlog')).toBeInTheDocument();
  });

  it('keeps the addition and Edit action visible for eight seconds', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <CaptureFeedbackMessage
        feedback={FEEDBACK.addedToBacklog}
        onDismiss={onDismiss}
      />,
    );

    await act(() => vi.advanceTimersByTimeAsync(7999));
    expect(screen.getByText('Added to Backlog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit task' })).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText('Added to Backlog')).toBeNull();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('links Edit to the newly added task and reports the click to the page', () => {
    const onOpenTask = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
    });
    const onDismiss = vi.fn();
    render(
      <CaptureFeedbackMessage
        feedback={FEEDBACK.addedToBacklog}
        onOpenTask={onOpenTask}
        onDismiss={onDismiss}
      />,
    );

    const edit = screen.getByRole('link', { name: 'Edit task' });
    expect(edit).toHaveAttribute('href', '/only-tdy/task/task-created');
    fireEvent.click(edit);
    expect(onOpenTask).toHaveBeenCalledWith(expect.anything(), 'task-created');
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('shows Edit for the next added task even after dismissing the previous one', () => {
    const { rerender } = render(
      <CaptureFeedbackMessage feedback={FEEDBACK.addedToBacklog} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    rerender(
      <CaptureFeedbackMessage
        feedback={{ kind: 'added-to-backlog', uid: 'another-task' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Edit task' })).toHaveAttribute(
      'href',
      '/only-tdy/task/another-task',
    );
  });

  it('states the offline condition and what it prevents', () => {
    render(<CaptureFeedbackMessage feedback={FEEDBACK.offline} />);

    expect(
      screen.getByText('You’re offline. Reconnect to load and save tasks.'),
    ).toBeInTheDocument();
  });

  it('never demands attention with an alert', () => {
    render(<CaptureFeedbackMessage feedback={FEEDBACK.unknownProject} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
