import { readBrowserStorage, writeBrowserStorage } from './browser-storage.ts';

/**
 * Which palette the page paints in, and where that answer is kept.
 *
 * There are three answers and only three, because there are only three things
 * a person can mean: light, dark, or whatever the machine already decided.
 * `system` is the resting answer rather than a fourth state bolted on — it is
 * what the page did before there was a control, and taking the choice back is
 * a press away rather than a setting to go and find.
 *
 * The choice is written to the document as `data-theme` and read back out of
 * it, so the CSS in `tokens.css` is the only thing that knows what a palette
 * is. `system` writes no attribute at all, which is what lets the media query
 * answer for itself.
 *
 * Nothing here touches React. The same three functions serve the hook, the
 * tests, and the inline script in `index.html` that runs before first paint.
 */

/** The three answers, in the order the mark rotates through them. */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** First-paint mirror of the active account's cached theme. */
export const THEME_STORAGE_KEY = 'only-tdy:theme';

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * The next answer in the rotation. Three presses come back to where they
 * started, which is what makes the mark a rotation rather than a switch with a
 * state you cannot get out of.
 */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
  const index = THEME_ORDER.indexOf(choice);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'system';
}

/**
 * What was chosen last time, or `system` — which is also the answer when
 * storage is unavailable or holds something this version does not recognise.
 * A browser can refuse `localStorage` outright, so the read cannot throw.
 */
export function readStoredTheme(): ThemeChoice {
  const stored = readBrowserStorage(THEME_STORAGE_KEY);
  return isThemeChoice(stored) ? stored : 'system';
}

/**
 * Puts the choice where the CSS and the next visit can both see it. `system`
 * removes the attribute rather than writing its name, because the absence of
 * an answer is precisely what the media query is there to answer.
 */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);

  applyBrowserChrome(choice);

  writeBrowserStorage(THEME_STORAGE_KEY, choice === 'system' ? null : choice);
}

/**
 * The address bar and the installed app's own furniture, told the same answer
 * as the page.
 *
 * Both colours stay declared in the document; what changes is which of them is
 * in force. `system` hands each back to its own media query, and a choice
 * narrows one to `all` and puts the other out of play — so the chrome is never
 * painted for a scheme the page is not in.
 */
function applyBrowserChrome(choice: ThemeChoice): void {
  const scheme = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  );
  if (scheme !== null)
    scheme.content = choice === 'system' ? 'light dark' : choice;

  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    /* Which scheme this colour was declared for. It is remembered on the
       element because narrowing the media query is what erases it. */
    const declared = meta.dataset.scheme ?? readScheme(meta);
    meta.dataset.scheme = declared;
    meta.setAttribute(
      'media',
      choice === 'system'
        ? `(prefers-color-scheme: ${declared})`
        : declared === choice
          ? 'all'
          : 'not all',
    );
  }
}

/**
 * Which scheme a `theme-color` was declared for, before anything narrowed it.
 * The attribute is read rather than the `media` property, which `<meta>` does
 * not reflect.
 */
function readScheme(meta: HTMLMetaElement): 'light' | 'dark' {
  return meta.getAttribute('media')?.includes('dark') === true
    ? 'dark'
    : 'light';
}
