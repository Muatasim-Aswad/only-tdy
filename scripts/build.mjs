import {
  copyFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { output, run } from './lib.mjs';

run('pnpm', ['exec', 'vite', 'build']);
const groups = JSON.parse(output('pnpm', ['licenses', 'list', '--json']));
const runtime = new Set([
  '@tanstack/query-core',
  '@tanstack/react-query',
  'react',
  'react-dom',
  'scheduler',
  'i18next',
  'react-i18next',
  'html-parse-stringify',
  'use-sync-external-store',
  '@babel/runtime',
]);
const packages = Object.values(groups)
  .flat()
  .filter((p) => runtime.has(p.name) || p.name.startsWith('workbox-'))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
const notices = packages.map((p) => {
  const root = p.paths[0];
  const licenses = readdirSync(root)
    .filter((name) => /^(?:LICENSE|LICENCE|COPYING)(?:\.|$)/i.test(name))
    .sort();
  if (licenses.length === 0) throw new Error(`Missing license: ${p.name}`);
  return `${p.name} ${p.versions.join(', ')} (${p.license})\n${licenses.map((name) => readFileSync(join(root, name), 'utf8')).join('\n')}`;
});
writeFileSync('dist/DEPENDENCY_LICENSES.txt', notices.join('\n\n-----\n\n'));
for (const [source, target] of [
  ['LICENSE', 'LICENSE'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md'],
])
  copyFileSync(source, `dist/${target}`);

writeFileSync(
  'dist/FONT_LICENSE.txt',
  ['src/assets/fonts/OFL.txt', 'src/assets/fonts/OFL-NotoSansArabic.txt']
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n\n-----\n\n'),
);
