import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { classNames } from './classNames.ts';

export interface FeedbackToastProps {
  readonly message?: string | undefined;
  readonly tone?: 'neutral' | 'error';
  readonly className?: string;
  readonly action?: ReactNode;
  readonly onDismiss?: (() => void) | undefined;
  readonly duration?: number;
}

export function FeedbackToast({
  message,
  className = 'focus-feedback',
  ...props
}: FeedbackToastProps) {
  return createPortal(
    <div className={className} aria-live="polite">
      {message === undefined || message === '' ? null : (
        <ToastContent key={message} message={message} {...props} />
      )}
    </div>,
    document.getElementById('toast-root') ?? document.body,
  );
}

function ToastContent({
  message,
  tone = 'neutral',
  action,
  onDismiss,
  duration = 5000,
}: FeedbackToastProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (dismissed || paused) return;
    const timer = window.setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, duration);
    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissed, paused, duration, onDismiss]);

  if (dismissed) return null;

  return (
    <div
      className="focus-toast text-action"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <p
        className={classNames(
          'focus-toast__message',
          tone === 'error' && 'focus-message--error',
        )}
      >
        {message}
      </p>
      {action}
      <button
        type="button"
        className="focus-toast__icon"
        aria-label="Dismiss notification"
        title="Dismiss"
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
