/**
 * The visual system's contract, checked against the stylesheet Tailwind
 * actually produces rather than against the sources.
 *
 * jsdom does not evaluate media queries or cascade layers, so a rendered
 * component cannot prove that the dark palette, the reduced-motion rules, or
 * the forced-colors rules exist. Compiling the real stylesheet can.
 */

import { readFile, readdir } from 'node:fs/promises';
import ts from 'typescript';
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
  const candidates = new Set(USED_UTILITIES);
  async function scan(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'testing' || entry.name === 'test') continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (/\.tsx?$/.test(path) && !path.includes('.test.')) {
        const source = ts.createSourceFile(
          path,
          await readFile(path, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        );
        function visit(node: ts.Node) {
          if (
            ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            ts.isTemplateHead(node) ||
            ts.isTemplateMiddle(node) ||
            ts.isTemplateTail(node)
          ) {
            for (const candidate of node.text.split(/\s+/))
              candidates.add(candidate);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  await scan(resolve('src'));
  for (const [, classes] of (await readFile('index.html', 'utf8')).matchAll(
    /class="([^"]+)"/g,
  )) {
    for (const candidate of (classes ?? '').split(/\s+/))
      candidates.add(candidate);
  }
  css = compiler.build([...candidates]);
});

describe('source discovery', () => {
  it('scans only the shipped source tree in every build context', () => {
    expect(sourceRoot).toBe('none');
    expect(sources).toEqual([
      { base: dirname(ENTRY), pattern: '../../index.html', negated: false },
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
    expect(css).not.toMatch(/box-shadow: (?!inset|none|var\(--tw-)/);
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

describe('drawn completion states', () => {
  it('keeps the visible box at 20px with functional corners', () => {
    const box = block(/\.focus-complete__box \{[^}]*\}/);
    expect(box).toContain('width: 20px;');
    expect(box).toContain('height: 20px;');
    expect(box).toContain('border-radius: var(--radius-fill);');
  });

  it('shows priority through semantic border colors', () => {
    expect(block(/\.focus-complete__box--high \{[^}]*\}/)).toContain(
      'border-color: var(--priority-high);',
    );
    expect(block(/\.focus-complete__box--medium \{[^}]*\}/)).toContain(
      'border-color: var(--priority-medium);',
    );
  });
});

describe('motion and platform behaviour', () => {
  it('keeps the shared easing and action-triggered animation timings', () => {
    expect(css).toContain('--ease-focus: cubic-bezier(0.22, 1, 0.36, 1);');
    expect(css).toContain('focus-row-insert 180ms var(--ease-focus) both');
    expect(css).toContain('focus-row-restore 120ms var(--ease-focus) both');
    expect(css).not.toMatch(/animation:[^;]*infinite/);
    expect(css).not.toContain('focus-row-collapse');
  });

  it('limits row travel to the insertion animation', () => {
    for (const enclosure of enclosures('transform: translateY')) {
      expect(enclosure.join(' ')).toMatch(/@keyframes focus-row-insert/);
    }
  });

  it('emits reduced-motion overrides from the component utilities', () => {
    const overrides = enclosures('animation: none;');
    expect(overrides.length).toBeGreaterThan(0);
    for (const enclosure of overrides) expect(enclosure).toContain(REDUCED);
    expect(css).toMatch(
      /\.focus-complete__box::after \{\s*transition-duration: 0s;/,
    );
  });

  it('confines hover treatment to devices that hover', () => {
    const hovers = enclosures(':hover');
    expect(hovers.length).toBeGreaterThan(0);
    for (const enclosure of hovers) expect(enclosure).toContain(HOVER);
  });

  it('keeps the tick visible in forced colors', () => {
    const forced = block(
      /@media \(forced-colors: active\) \{\s*\.focus-complete__box[\s\S]*?\n {2}\}/,
    );
    expect(forced).toContain('.focus-complete__box');
    expect(forced).toContain('forced-color-adjust: none;');
    expect(forced).toContain('background-color: Highlight;');
    expect(css).toContain('background-image: none;');
  });

  it('preserves native date fallbacks and synchronized textarea sizing', () => {
    expect(css).toContain('::-webkit-datetime-edit');
    expect(css).toContain('@supports not selector(::-webkit-datetime-edit)');
    expect(css).toContain("content: attr(data-value) ' ';");
    expect(css).toContain('grid-area: 1 / 1 / 2 / 2;');
    expect(css).toContain('scroll-padding-bottom');
  });
});
