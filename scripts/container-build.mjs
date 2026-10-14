import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { identityEnv, readBuildIdentity } from './build-identity.ts';
import { json, run } from './lib.mjs';

const env = identityEnv(readBuildIdentity(process.cwd()));
const temp = mkdtempSync(join(tmpdir(), 'only-tdy-builder-'));
const builder = basename(temp).toLowerCase();
const context = join(temp, 'context');
const image = process.env.ONLY_TDY_IMAGE || 'only-tdy:local';
const archive = process.env.ONLY_TDY_CONTAINER_ARCHIVE
  ? resolve(process.env.ONLY_TDY_CONTAINER_ARCHIVE)
  : join(temp, 'image.tar');
const epoch = Number(env.SOURCE_DATE_EPOCH);
const normalize = (path) => {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink())
    throw new Error('Container context links are forbidden');
  if (stat.isDirectory())
    for (const name of readdirSync(path)) normalize(join(path, name));
  utimesSync(path, epoch, epoch);
};
let created = false;
try {
  mkdirSync(context);
  for (const path of [
    'Dockerfile',
    '.dockerignore',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    'vite.config.ts',
    'build-info.ts',
    'index.html',
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
    'scripts',
    'src',
    'public',
    'deploy',
  ])
    cpSync(path, join(context, path), { recursive: true });
  normalize(context);
  run('docker', [
    'buildx',
    'create',
    '--name',
    builder,
    '--driver',
    'docker-container',
    '--driver-opt',
    `image=${json('release/toolchain.json').buildkit}`,
  ]);
  created = true;
  run('docker', [
    'buildx',
    'build',
    '--builder',
    builder,
    `--output=type=docker,dest=${archive},rewrite-timestamp=true`,
    '--provenance=false',
    '--platform=linux/amd64',
    ...Object.entries(env).flatMap(([key, value]) => [
      '--build-arg',
      `${key}=${value}`,
    ]),
    '--tag',
    image,
    context,
  ]);
  if (process.env.ONLY_TDY_LOAD_IMAGE !== '0')
    run('docker', ['load', '-i', archive]);
} finally {
  try {
    if (created) run('docker', ['buildx', 'rm', '--force', builder]);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
