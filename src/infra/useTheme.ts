import { useCallback, useState } from 'react';

import {
  applyTheme,
  nextTheme,
  readStoredTheme,
  type ThemeChoice,
} from './theme.ts';

export interface Theme {
  readonly choice: ThemeChoice;
  /** Moves to the next answer and writes it to the document. */
  readonly rotate: () => void;
}

/**
 * The palette choice, read once and then held.
 *
 * It is initialised from storage rather than from an effect, because the
 * inline script in `index.html` has already put the same answer on the
 * document before React mounted — reading it again here is what keeps the mark
 * showing the palette the page is actually painted in, with no first render
 * that claims otherwise and no flash to correct.
 *
 * There is no listener on the system preference. `system` writes no attribute
 * at all, so the media query in `tokens.css` is still the thing answering, and
 * it repaints on its own the moment the machine changes its mind.
 */
export function useTheme(): Theme {
  const [choice, setChoice] = useState<ThemeChoice>(readStoredTheme);

  const rotate = useCallback(() => {
    setChoice((current) => {
      const next = nextTheme(current);
      applyTheme(next);
      return next;
    });
  }, []);

  return { choice, rotate };
}
