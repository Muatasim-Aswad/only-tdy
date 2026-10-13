import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  handleLinkNavigation,
  navigate,
  taskReturnPath,
  useRoute,
} from './navigation.ts';

afterEach(() => {
  window.history.replaceState(null, '', '/only-tdy/');
});

function clickEvent(overrides: Record<string, unknown> = {}) {
  const preventDefault = vi.fn();
  const event = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: { target: '' },
    preventDefault,
    ...overrides,
  };
  return { event, preventDefault };
}

describe('useRoute', () => {
  it('reads the address on the first render, with no second pass', () => {
    window.history.replaceState(null, '', '/only-tdy/task/abc');
    const { result } = renderHook(() => useRoute());

    expect(result.current).toEqual({ kind: 'task', uid: 'abc' });
  });

  it('follows a push and leaves an entry for Back', () => {
    window.history.replaceState(null, '', '/only-tdy/');
    const { result } = renderHook(() => useRoute());

    act(() => {
      navigate('/only-tdy/task/abc');
    });

    expect(result.current).toEqual({ kind: 'task', uid: 'abc' });
    expect(window.location.pathname).toBe('/only-tdy/task/abc');
  });

  it('follows the back button', () => {
    window.history.replaceState(null, '', '/only-tdy/');
    const { result } = renderHook(() => useRoute());
    act(() => {
      navigate('/only-tdy/history');
    });

    act(() => {
      window.history.replaceState(null, '', '/only-tdy/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current).toEqual({ kind: 'tasks' });
  });

  it('stops listening once the screen is gone', () => {
    const { result, unmount } = renderHook(() => useRoute());
    unmount();

    window.history.replaceState(null, '', '/only-tdy/history');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(result.current).toEqual({ kind: 'tasks' });
  });
});

describe('navigate', () => {
  it('replaces the entry when asked, so Back skips what was left', () => {
    window.history.replaceState(null, '', '/only-tdy/task/abc');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');

    navigate('/only-tdy/', { replace: true });

    expect(replaceState).toHaveBeenCalledOnce();
    expect(pushState).not.toHaveBeenCalled();
  });

  it('does nothing when the address is already the one asked for', () => {
    window.history.replaceState(null, '', '/only-tdy/history');
    const pushState = vi.spyOn(window.history, 'pushState');

    navigate('/only-tdy/history');

    expect(pushState).not.toHaveBeenCalled();
  });
});

describe('handleLinkNavigation', () => {
  it('takes an ordinary click so the app is not reloaded', () => {
    const { event, preventDefault } = clickEvent();

    handleLinkNavigation(event as never, '/only-tdy/task/abc');

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/only-tdy/task/abc');
  });

  it('leaves to the browser every click the browser does better', () => {
    const cases = [
      { button: 1 },
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { defaultPrevented: true },
      { currentTarget: { target: '_blank' } },
    ];

    for (const overrides of cases) {
      window.history.replaceState(null, '', '/only-tdy/');
      const { event, preventDefault } = clickEvent(overrides);

      handleLinkNavigation(event as never, '/only-tdy/task/abc');

      expect(preventDefault).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/only-tdy/');
    }
  });
});

it('remembers the latest page and its query when opening an edit', () => {
  window.history.replaceState(null, '', '/only-tdy/all?q=invoice');
  navigate('/only-tdy/task/abc');
  expect(taskReturnPath('/only-tdy/')).toBe('/only-tdy/all?q=invoice');
  navigate('/only-tdy/backlog');
  navigate('/only-tdy/task/abc');
  expect(taskReturnPath('/only-tdy/')).toBe('/only-tdy/backlog');
});

it('uses a fallback for a directly opened task', () => {
  window.history.replaceState(null, '', '/only-tdy/task/abc');
  expect(taskReturnPath('/only-tdy/history')).toBe('/only-tdy/history');
});
