import { mkdtempSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { files, lines, run, same, sourceFiles } from './lib.mjs';

const list = sourceFiles('.');
same(list, lines('release/source-files.txt'), 'Source');
const textFiles = list.filter(
  (p) =>
    /\.(?:ts|tsx|mjs|js|css|md|json|ya?ml|toml|html|sh|txt)$/.test(p) ||
    ['Dockerfile', 'AGENTS.md'].includes(p),
);
const privateMarker = /(?:\/home\/[A-Za-z0-9_-]+|\bPhase [A-Z][1-9]\b)/;
for (const path of textFiles) {
  if (privateMarker.test(readFileSync(path, 'utf8')))
    throw new Error(`Private marker in ${path}`);
}
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (!readFileSync('CHANGELOG.md', 'utf8').includes(`## [${version}]`))
  throw new Error('Changelog version differs from package.json');
const temp = mkdtempSync(join(tmpdir(), 'only-tdy-source-'));
try {
  for (const path of list) cpSync(path, join(temp, path), { recursive: true });
  same(files(temp), list, 'Export');
  run('node', ['scripts/scan.mjs', 'dir', temp]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
console.log(
  `Reviewed working-source inventory and redacted scan passed (${list.length} files)`,
);
