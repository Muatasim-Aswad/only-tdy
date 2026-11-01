import type { Step } from 'react-joyride';

type FloatingOptions = NonNullable<Step['floatingOptions']>;
const MARGIN = 16;

export function visibleViewport() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

export function visibleTarget(selector: string): HTMLElement | null {
  const viewport = visibleViewport();
  return (
    [...document.querySelectorAll<HTMLElement>(selector)].find((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > viewport.left &&
        rect.left < viewport.right &&
        rect.bottom > viewport.top &&
        rect.top < viewport.bottom
      );
    }) ?? null
  );
}

export function lessonPlacement(center: boolean): FloatingOptions {
  return {
    strategy: 'fixed',
    middleware: [
      {
        name: 'lessonViewport',
        fn({ x, y, rects, elements }) {
          const viewport = visibleViewport();
          const floating = elements.floating;
          floating.style.setProperty(
            '--guidance-width',
            `${String(Math.max(0, viewport.width - MARGIN * 2))}px`,
          );
          floating.style.setProperty(
            '--guidance-height',
            `${String(Math.max(0, viewport.height - MARGIN * 2))}px`,
          );
          if (
            Math.abs(floating.offsetWidth - rects.floating.width) > 1 ||
            Math.abs(floating.offsetHeight - rects.floating.height) > 1
          ) {
            return { reset: { rects: true } };
          }
          const reference = elements.reference.getBoundingClientRect();
          const detached =
            reference.bottom <= viewport.top ||
            reference.top >= viewport.bottom ||
            reference.right <= viewport.left ||
            reference.left >= viewport.right;
          const fallback =
            center ||
            detached ||
            x < viewport.left + MARGIN ||
            y < viewport.top + MARGIN ||
            x + rects.floating.width > viewport.right - MARGIN ||
            y + rects.floating.height > viewport.bottom - MARGIN;
          floating.dataset.guidanceCentered = String(fallback);
          return fallback
            ? {
                x: viewport.left + (viewport.width - rects.floating.width) / 2,
                y: viewport.top + (viewport.height - rects.floating.height) / 2,
              }
            : {};
        },
      },
    ],
  };
}

export function reachablePopup(dialog: HTMLElement): boolean {
  const viewport = visibleViewport();
  const popup = dialog.getBoundingClientRect();
  if (
    popup.width <= 0 ||
    popup.height <= 0 ||
    popup.left < viewport.left ||
    popup.top < viewport.top ||
    popup.right > viewport.right ||
    popup.bottom > viewport.bottom
  )
    return false;
  return [...dialog.querySelectorAll('button')].every((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.left >= popup.left &&
      rect.top >= popup.top &&
      rect.right <= popup.right &&
      rect.bottom <= popup.bottom
    );
  });
}
