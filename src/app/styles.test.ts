/**
 * The visual system's contract, checked against the stylesheet Tailwind
 * actually produces rather than against the sources.
 *
 * jsdom does not evaluate media queries or cascade layers, so a rendered
 * component cannot prove that the dark palette, the reduced-motion rules, or
 * the forced-colors rules exist. Compiling the real stylesheet can.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { compile } from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(resolve(process.cwd(), 'package.json'));
const ENTRY = resolve(process.cwd(), 'src/app/styles.css');

/** Utilities the components use; the compiler only emits what is asked for. */
const USED_UTILITIES = [
  'sr-only',
  'bg-canvas',
  'text-ink',
  'text-muted',
  'text-accent',
  'text-product',
  'text-capture',
  'text-section',
  'text-task',
  'text-meta',
  'text-action',
];

let css = '';
let sourceRoot:
  string | { readonly base: string; readonly pattern: string } | null = null;
let sources: readonly {
  readonly base: string;
  readonly pattern: string;
  readonly negated: boolean;
}[] = [];

beforeAll(async () => {
  const compiler = await compile(await readFile(ENTRY, 'utf8'), {
    base: dirname(ENTRY),
    loadStylesheet: async (id, base) => {
      const path = id.startsWith('tailwindcss')
        ? require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id)
        : resolve(base, id);
      return {
        path,
        base: dirname(path),
        content: await readFile(path, 'utf8'),
      };
    },
  });
  sourceRoot = compiler.root;
  sources = compiler.sources;
  css = compiler.build(USED_UTILITIES);
});

describe('source discovery', () => {
  it('scans only the shipped source tree in every build context', () => {
    expect(sourceRoot).toBe('none');
    expect(sources).toEqual([
      { base: dirname(ENTRY), pattern: '.', negated: false },
      { base: dirname(ENTRY), pattern: '../features', negated: false },
      { base: dirname(ENTRY), pattern: '../shared', negated: false },
      { base: dirname(ENTRY), pattern: '../**/*.test.ts', negated: true },
      { base: dirname(ENTRY), pattern: '../**/*.test.tsx', negated: true },
      { base: dirname(ENTRY), pattern: '../**/testing', negated: true },
    ]);
  });
});

/** The declarations inside the first rule whose selector text matches. */
function block(pattern: RegExp): string {
  const match = pattern.exec(css);
  expect(match, `no rule matched ${pattern.source}`).not.toBeNull();
  return match?.[0] ?? '';
}

/**
 * The at-rule preludes enclosing each occurrence of `needle`, outermost first.
 * A brace walk is enough here and keeps the assertions honest about nesting,
 * which is the whole point of the theme, motion, and hover rules.
 */
function enclosures(needle: string): string[][] {
  const found: string[][] = [];
  const stack: string[] = [];
  let prelude = '';
  let index = 0;

  while (index < css.length) {
    const char = css.charAt(index);

    if (char === '{') {
      stack.push(prelude.trim().startsWith('@') ? prelude.trim() : '');
      prelude = '';
    } else if (char === '}') {
      stack.pop();
      prelude = '';
    } else if (char === ';') {
      prelude = '';
    } else {
      prelude += char;
    }

    if (css.startsWith(needle, index)) {
      found.push(stack.filter((entry) => entry !== ''));
    }
    index += 1;
  }

  return found;
}

const DARK = '@media (prefers-color-scheme: dark)';
const REDUCED = '@media (prefers-reduced-motion: reduce)';
const HOVER = '@media (hover: hover)';

describe('colour system', () => {
  it('defines the light palette exactly as specified', () => {
    const light = block(/:root \{[^}]*--canvas:[^}]*\}/);

    expect(light).toContain('color-scheme: light dark;');
    for (const [token, value] of [
      ['--canvas', '#f4f6f5'],
      ['--surface', '#fcfdfc'],
      ['--ink', '#1c2520'],
      ['--muted', '#667169'],
      ['--line', '#d8deda'],
      ['--accent', '#315e65'],
      ['--priority-medium', '#d0ad25'],
      ['--priority-high', '#b42336'],
      ['--selection', '#d9e7e8'],
    ]) {
      expect(light).toContain(`${String(token)}: ${String(value)};`);
    }
  });

  it('gives the system preference the dark palette, unless asked for light', () => {
    const dark = block(
      /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme=('|")light\1\]\) \{[^}]*\}/,
    );

    for (const [token, value] of [
      ['--canvas', '#151a17'],
      ['--surface', '#1b211d'],
      ['--ink', '#e7ece8'],
      ['--muted', '#9aa59e'],
      ['--line', '#343d37'],
      ['--accent', '#7cb3ba'],
      ['--priority-medium', '#d4a457'],
      ['--priority-high', '#d8756e'],
      ['--selection', '#294348'],
    ]) {
      expect(dark).toContain(`${String(token)}: ${String(value)};`);
    }
  });

  /*
   * The mark at the foot of the page writes `data-theme`, and it has to win
   * both ways round: a page asked for dark on a light machine, and a page
   * asked for light on a dark one. The first needs a palette of its own; the
   * second needs the media query above to stand down, which is what the
   * `:not()` in it is for.
   */
  it('lets a chosen palette outrank the system in both directions', () => {
    const chosen = block(/:root\[data-theme=('|")dark\1\] \{[^}]*\}/);

    for (const [token, value] of [
      ['--canvas', '#151a17'],
      ['--surface', '#1b211d'],
      ['--ink', '#e7ece8'],
      ['--muted', '#9aa59e'],
      ['--line', '#343d37'],
      ['--accent', '#7cb3ba'],
      ['--priority-medium', '#d4a457'],
      ['--priority-high', '#d8756e'],
      ['--selection', '#294348'],
    ]) {
      expect(chosen).toContain(`${String(token)}: ${String(value)};`);
    }
    expect(chosen).toContain('color-scheme: dark;');
    expect(block(/:root\[data-theme=('|")light\1\] \{[^}]*\}/)).toContain(
      'color-scheme: light;',
    );

    /* The dark palette is written in exactly those two places and nowhere
       else: the system's answer, and the page's. */
    const homes = enclosures('--canvas: #151a17');
    expect(homes).toHaveLength(2);
    expect(homes.some((enclosure) => enclosure.includes(DARK))).toBe(true);
  });

  it('resolves every colour utility through the live variable', () => {
    for (const [utility, property, token] of [
      ['bg-canvas', 'background-color', '--canvas'],
      ['text-ink', 'color', '--ink'],
      ['text-muted', 'color', '--muted'],
      ['text-accent', 'color', '--accent'],
    ]) {
      expect(css).toMatch(
        new RegExp(
          `\\.${String(utility)} \\{\\s*${String(property)}: var\\(${String(token)}\\);`,
        ),
      );
    }
  });

  /*
   * The palette is switched by one attribute on the document and nothing else.
   * A class would be a second vocabulary for the same fact, and a utility that
   * baked a colour in would be a third.
   */
  it('carries one theme hook, on the document and nowhere else', () => {
    expect(css).not.toMatch(/\.dark\b/);
    expect(css).not.toMatch(/:root\.(light|dark)/);

    /* Every mention of the attribute is a mention of the document's own. */
    for (const [, before] of css.matchAll(/(.{0,12})\[data-theme/g)) {
      expect(before).toMatch(/:root(:not\()?$/);
    }
  });

  /*
   * Flat still means flat: no surface is shaded, and nothing is lifted off
   * the page. The one gradient in the sheet is not shading — it is the foot
   * of the page fading in its own canvas, so a row scrolling under it thins
   * out instead of being cut off at a line. It introduces no second colour.
   */
  it('uses no gradient and no shadow, bar the foot fading into its own canvas', () => {
    const gradients = [
      ...css.matchAll(/[\w-]*gradient\([\s\S]*?\)\s*\)?/g),
    ].map(([match]) => match);

    expect(gradients).toHaveLength(1);
    expect(gradients[0]).toContain('transparent');
    expect(gradients[0]).toContain('var(--canvas)');
    expect(css).not.toContain('radial-gradient');
    // The only shadows are the capture rule's inset lines and the reset.
    expect(css).not.toMatch(/box-shadow: (?!inset|none)/);
  });
});

describe('typography', () => {
  it('self-hosts the variable face and lets text render while it loads', () => {
    const face = block(/@font-face \{[^}]*\}/);

    expect(face).toContain("font-family: 'Atkinson Hyperlegible Next'");
    expect(face).toContain('font-weight: 200 800');
    expect(face).toContain('font-display: swap');
    expect(face).toMatch(/AtkinsonHyperlegibleNext-Variable\.woff2/);
    // Self-hosted: nothing is fetched from a font CDN.
    expect(css).not.toContain('fonts.googleapis.com');
    expect(css).not.toContain('fonts.gstatic.com');
  });

  it('falls back through one installed sans before the platform default', () => {
    expect(css).toContain(
      "--font-sans: 'Atkinson Hyperlegible Next', 'Segoe UI', sans-serif;",
    );
  });

  it('sets each type role to its specified size, leading, and tracking', () => {
    for (const [role, size, leading, weight, tracking] of [
      ['product', '22px', '26px', '600', '-0.015em'],
      ['capture', '19px', '28px', '400', '-0.01em'],
      ['section', '15px', '20px', '600', '0'],
      ['task', '16px', '24px', '400', '0'],
      ['meta', '13px', '18px', '400', '0'],
      ['action', '14px', '20px', '500', '0'],
    ]) {
      expect(css).toContain(`--text-${String(role)}: ${String(size)};`);
      expect(css).toContain(
        `--text-${String(role)}--line-height: ${String(leading)};`,
      );
      expect(css).toContain(
        `--text-${String(role)}--font-weight: ${String(weight)};`,
      );
      expect(css).toContain(
        `--text-${String(role)}--letter-spacing: ${String(tracking)};`,
      );
    }
  });

  it('uses no tracked uppercase, serif display, or monospace metadata', () => {
    expect(css).not.toMatch(/text-transform: uppercase/);
    expect(css).not.toMatch(/font-family:[^;]*serif(?!,)/);
    expect(css).not.toMatch(/\.focus-[\w-]*\s*\{[^}]*monospace/);
  });
});

describe('geometry', () => {
  it('shares one rail width between the marker, targets, and content edge', () => {
    expect(css).toContain('--spacing-rail: 44px;');
    expect(block(/\.focus-rail \{[^}]*\}/)).toContain(
      'width: var(--spacing-rail);',
    );

    const complete = block(/\.focus-complete \{[^}]*\}/);
    expect(complete).toContain('width: var(--spacing-rail);');
    expect(complete).toContain('height: var(--spacing-rail);');

    expect(block(/\.focus-state \{[^}]*\}/)).toContain(
      'padding-left: var(--spacing-rail);',
    );
    expect(block(/\.focus-message \{[^}]*\}/)).toContain(
      'margin-left: var(--spacing-rail);',
    );
  });

  it('keeps the visible box at 20px inside the 44px target', () => {
    const box = block(/\.focus-complete__box \{[^}]*\}/);
    expect(box).toContain('width: 20px;');
    expect(box).toContain('height: 20px;');
    // A checkbox, not a circle: the corner is the functional radius.
    expect(box).toContain('border-radius: var(--radius-fill);');
    expect(box).not.toContain('border-radius: 9999px;');
  });

  it('shows priority as the colour of the empty box, not a second mark', () => {
    expect(block(/\.focus-complete__box--high \{[^}]*\}/)).toContain(
      'border-color: var(--priority-high);',
    );
    expect(block(/\.focus-complete__box--medium \{[^}]*\}/)).toContain(
      'border-color: var(--priority-medium);',
    );
    // Low priority is the plain box: there is no third rule to opt out of.
    expect(css).not.toContain('focus-complete__box--low');
    // The trailing slot and the two shapes it held are gone with it.
    expect(css).not.toContain('.focus-priority');
  });

  it('gives visible backlog controls a full tap height', () => {
    const actions = block(/\.focus-backlog__actions \{[^}]*\}/);
    expect(actions).toContain('min-height: 44px;');
    expect(actions).toContain('padding-left: var(--spacing-rail);');
  });

  it('draws a chosen row in the palette’s own selection colour', () => {
    expect(block(/\.focus-row--selected \{[^}]*\}/)).toContain(
      'background-color: var(--selection);',
    );
    // The tick is the same tick: one rule fills the box for done and chosen.
    expect(css).toMatch(
      /\.focus-row--done \.focus-complete__box,\s*\.focus-row--selected \.focus-complete__box \{[^}]*background-color: var\(--accent\);/,
    );
  });

  it('gives text links a 44px target without moving their baseline', () => {
    const links = block(/\.focus-state__action \{[^}]*\}/);
    expect(links).toContain('padding-block: 12px;');
    expect(links).toContain('margin-block: -12px;');
  });

  it('holds the row and list heights so no state shifts the page', () => {
    expect(block(/\.focus-row \{[^}]*\}/)).toContain('min-height: 56px;');
    expect(block(/\.focus-row--metadata \{[^}]*\}/)).toContain(
      'min-height: 64px;',
    );
    expect(block(/\.focus-capture \{[^}]*\}/)).toContain('min-height: 60px;');
    expect(block(/\.focus-listing \{[^}]*\}/)).toMatch(/min-height: \d+px;/);
  });

  it('separates rows by space alone, never a card', () => {
    const row = block(/\.focus-row \{[^}]*\}/);
    expect(row).toContain('background-color: transparent;');
    expect(row).not.toContain('border');
    expect(row).toContain('cursor: default;');
    expect(css).not.toContain('.focus-row:last-child');
  });

  it('rules the gaps of a ruled list, and only the gaps', () => {
    expect(
      block(/\.focus-list--ruled \.focus-row \+ \.focus-row \{[^}]*\}/),
    ).toContain('border-top: 1px solid var(--line);');
    // The rule belongs to the pages that ask for it, never to the row itself.
    expect(css).not.toMatch(/\.focus-list \.focus-row \+ \.focus-row/);
  });

  it('applies the specified gutters at each width', () => {
    expect(css).toMatch(
      /\.focus-shell \{[^}]*max\(16px, env\(safe-area-inset-left\)\)/,
    );
    expect(css).toMatch(
      /@media \(min-width: 480px\) \{\s*\.focus-shell \{[^}]*max\(24px/,
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\) \{\s*\.focus-shell \{[^}]*max\(32px/,
    );
    expect(css).toContain('padding-top: clamp(40px, 8vh, 88px);');
  });
});

describe('motion and platform behaviour', () => {
  it('uses one easing curve everywhere', () => {
    expect(css).toContain('--ease-focus: cubic-bezier(0.22, 1, 0.36, 1);');

    const literals = css.match(/cubic-bezier\([^)]*\)/g) ?? [];
    expect(new Set(literals).size).toBe(1);
  });

  it('times each interaction as specified', () => {
    expect(block(/\.focus-row--inserted \{[^}]*\}/)).toContain(
      'animation: focus-row-insert 180ms var(--ease-focus) both;',
    );
    expect(block(/\.focus-row--restoring \{[^}]*\}/)).toContain(
      'animation: focus-row-restore 120ms var(--ease-focus) both;',
    );
    // Completion is not a moment any more: the row is marked done and sorts
    // down, so nothing collapses and nothing is animated away.
    expect(css).not.toContain('focus-row-collapse');
    expect(css).not.toContain('focus-row--completing');
  });

  it('animates nothing on load and never translates a row on hover', () => {
    for (const enclosure of enclosures('transform: translateY')) {
      expect(enclosure.join(' ')).toMatch(/@keyframes focus-row-insert/);
    }
    expect(css).not.toContain('scale(');
    expect(css).not.toMatch(/animation:[^;]*infinite/);
  });

  it('drops travel under reduced motion, keeping colour', () => {
    const reduced = [
      ...css.matchAll(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n {2}\}/g,
      ),
    ]
      .map(([value]) => value)
      .join('\n');

    expect(reduced).toContain('.focus-row--inserted');
    expect(reduced).toContain('.focus-row--restoring');
    expect(reduced).toContain('animation: none;');

    for (const enclosure of enclosures('animation: none;')) {
      expect(enclosure).toContain(REDUCED);
    }
  });

  it('confines hover treatment to devices that hover', () => {
    const hovers = enclosures(':hover');
    expect(hovers.length).toBeGreaterThan(0);
    for (const enclosure of hovers) {
      expect(enclosure).toContain(HOVER);
    }
  });

  /*
   * No control draws a focus box. The obligation that replaces it is that every
   * focusable thing changes some mark of its own, so this checks each one.
   */
  it('gives every focusable control a focus state that is not a box', () => {
    expect(block(/:focus-visible \{[^}]*\}/)).toContain('outline: none;');

    for (const selector of [
      /\.focus-capture__submit:focus-visible \{[^}]*\}/,
      /\.focus-state__action:focus-visible \{[^}]*\}/,
    ]) {
      expect(block(selector)).toContain('text-decoration: underline;');
    }
    expect(block(/\.focus-home:focus-visible \{[^}]*\}/)).toContain(
      'color: var(--accent);',
    );
    expect(block(/\.focus-back:focus-visible \{[^}]*\}/)).toContain(
      'color: var(--accent);',
    );
    expect(block(/\.focus-history:focus-visible,[^{]*\{[^}]*\}/)).toContain(
      'color: var(--accent);',
    );
    expect(
      block(/\.focus-complete:focus-visible \.focus-complete__box \{[^}]*\}/),
    ).toContain('border-color: var(--accent);');
  });

  it('keeps the tick visible in forced colours', () => {
    const forced = block(/@media \(forced-colors: active\) \{[\s\S]*?\n {2}\}/);

    expect(forced).toContain('.focus-complete__box');
    expect(forced).toContain('forced-color-adjust: none;');
    // The row tint is discarded there, so the chosen row leans on the box.
    expect(forced).toContain('.focus-row--selected');
    // And the foot's fade is a gradient, not ink: it would paint the
    // palette's own canvas over the system's.
    expect(forced).toContain('background-image: none;');
  });

  /*
   * The warning colour says one thing on this control: this press deletes.
   * Reaching a word is not choosing it, so hover and focus are the underline
   * alone — Keep above all, which is the answer that changes nothing.
   */
  it('never lends the warning colour to reaching a delete answer', () => {
    for (const selector of [
      /\.focus-delete:focus-visible[^{]*\{[^}]*\}/,
      /\.focus-delete:hover[^{]*\{[^}]*\}/,
    ]) {
      const rule = block(selector);
      expect(rule).toContain('text-decoration: underline;');
      expect(rule).not.toContain('color:');
    }
    // Only the press that deletes wears it, and only at rest.
    expect(block(/\.focus-delete--danger \{[^}]*\}/)).toContain(
      'color: var(--priority-high);',
    );
  });

  it('sizes the column with the viewport that cannot exceed the screen', () => {
    expect(block(/\.focus-shell \{[^}]*\}/)).toContain('min-height: 100svh;');
    /*
     * `dvh` is the size of the viewport right now, and CSS explicitly allows
     * that to be larger than what is on screen while a phone's toolbars
     * animate. A column that starts taller than the screen puts its own foot
     * below the fold, which is the defect this replaced.
     */
    expect(css).not.toContain('dvh');
    expect(css).toContain('env(safe-area-inset-top)');
    expect(css).toContain('env(safe-area-inset-bottom)');
  });

  it('pins the foot of the page to the foot of the screen', () => {
    const footer = block(/\.focus-footer \{[^}]*\}/);

    expect(footer).toContain('position: sticky;');
    expect(footer).toContain('bottom: 0;');
    // Its own bottom space, so the safe area is held below the marks rather
    // than below a column the screen already ended above.
    expect(footer).toContain(
      'padding-bottom: max(32px, env(safe-area-inset-bottom));',
    );
    expect(block(/\.focus-shell \{[^}]*\}/)).not.toContain('padding-bottom');
    // Still nothing drawn: no rule, no bar, no shadow, no second surface —
    // the fill is the page's own canvas. It arrives as a fade rather than an
    // edge, so a row passing under it thins out into the foot of the page
    // instead of being cut off at a line, and it is at full canvas by the
    // top of the marks so they never sit over a row.
    expect(footer).toContain('linear-gradient(');
    expect(footer).toContain('transparent 0,');
    expect(footer).toContain('var(--canvas) 32px');
    expect(footer).not.toContain('border');
    expect(footer).not.toContain('box-shadow');
  });

  it('stops anything scrolled into view above the pinned foot', () => {
    expect(block(/html \{[^}]*\}/)).toContain('scroll-padding-bottom');
  });
});

describe('unavailable controls', () => {
  it('recedes rather than disappears when saving is impossible', () => {
    expect(block(/\.focus-complete:disabled \{[^}]*\}/)).toContain(
      'opacity: 0.5;',
    );
    expect(block(/\.focus-capture__submit:disabled \{[^}]*\}/)).toContain(
      'color: var(--muted);',
    );
    expect(css).not.toMatch(/\.focus-complete:disabled \{[^}]*display: none/);
  });
});
