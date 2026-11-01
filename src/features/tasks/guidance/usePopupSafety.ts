import { useEffect, useEffectEvent, useRef } from 'react';
import type { Step } from 'react-joyride';
import { reachablePopup } from './placement.ts';

export function usePopupSafety(
  resolveTarget: Step['target'],
  onPresented: () => void,
  onUnavailable: () => void,
) {
  const root = useRef<HTMLDivElement>(null);
  const presented = useEffectEvent(() => {
    onPresented();
  });
  const unavailable = useEffectEvent(() => {
    onUnavailable();
  });
  useEffect(() => {
    const dialog = root.current;
    const anchor = typeof resolveTarget === 'function' ? resolveTarget() : null;
    if (!dialog) return;
    let frame = 0;
    let shown = false;
    const check = (finalAttempt = false) => {
      if (
        anchor instanceof Element &&
        (!anchor.isConnected || anchor.getClientRects().length === 0)
      ) {
        unavailable();
        return;
      }
      if (getComputedStyle(dialog.parentElement ?? dialog).opacity === '0') {
        if (finalAttempt) unavailable();
        return;
      }
      if (!reachablePopup(dialog)) {
        unavailable();
        return;
      }
      shown = true;
      presented();
    };
    const validate = () => {
      if (frame) return;
      // Let floating placement commit before checking visibility.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = 0;
          check();
        });
      });
    };
    const timeout = setTimeout(() => {
      if (!shown) check(true);
    }, 1500);
    const resize = new ResizeObserver(validate);
    resize.observe(dialog);
    if (anchor instanceof Element) resize.observe(anchor);
    const changes = new MutationObserver(validate);
    changes.observe(document.body, { childList: true, subtree: true });
    changes.observe(dialog.parentElement ?? dialog, {
      attributes: true,
      attributeFilter: ['style'],
    });
    window.addEventListener('scroll', validate, true);
    window.addEventListener('resize', validate);
    window.visualViewport?.addEventListener('scroll', validate);
    window.visualViewport?.addEventListener('resize', validate);
    validate();
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      resize.disconnect();
      changes.disconnect();
      window.removeEventListener('scroll', validate, true);
      window.removeEventListener('resize', validate);
      window.visualViewport?.removeEventListener('scroll', validate);
      window.visualViewport?.removeEventListener('resize', validate);
    };
  }, [resolveTarget]);
  return root;
}
