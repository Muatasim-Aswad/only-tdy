import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const run = (cmd, args = [], options = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', ...options });
export const output = (cmd, args = [], options = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
export const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const digest = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
export const lines = (path) => readFileSync(path, 'utf8').trim().split('\n');
export function files(root, prefix = '', skip = () => false) {
  return readdirSync(join(root, prefix))
    .sort()
    .flatMap((name) => {
      const path = prefix ? `${prefix}/${name}` : name;
      if (skip(path)) return [];
      const stat = lstatSync(join(root, path));
      if (stat.isSymbolicLink()) throw new Error(`Symlink forbidden: ${path}`);
      return stat.isDirectory() ? files(root, path, skip) : [path];
    });
}
export function same(actual, expected, label) {
  const a = [...actual].sort();
  const b = [...expected].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(
      `${label} inventory mismatch; added: ${a.filter((x) => !b.includes(x)).join(', ')}; missing: ${b.filter((x) => !a.includes(x)).join(', ')}`,
    );
  }
}
export const sourceSkip = (path) =>
  /^(?:\.git|node_modules|dist|coverage|test-results|playwright-report|blob-report|local)(?:\/|$)/.test(
    path,
  ) ||
  /^docs\/plans(?:\/|$)/.test(path) ||
  /^release\/out(?:\/|$)/.test(path) ||
  (/(?:^|\/)\.env(?:\..*)?$/.test(path) && path !== '.env.example') ||
  /(?:\.local\.(?:md|toml)|\.tsbuildinfo)$/.test(path);
export const sourceFiles = (root) => files(root, '', sourceSkip);
export function inventory(root, expected) {
  const actual = files(root);
  same(
    actual.map((p) =>
      p.replace(/-[A-Za-z0-9_-]{8}(?=\.(?:js|css|woff2)$)/g, '-{hash}'),
    ),
    lines(expected),
    'Static',
  );
  return Object.fromEntries(
    actual.map((path) => [path, digest(join(root, path))]),
  );
}
