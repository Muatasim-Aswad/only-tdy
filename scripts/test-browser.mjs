import { spawnSync } from 'node:child_process';

if (process.platform !== 'linux' || process.arch !== 'x64')
  throw new Error('The full browser gate requires a Linux amd64 host.');

const image =
  'mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe';
if (process.argv[2] === '--install') {
  const result = spawnSync('docker', ['pull', image], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--platform',
    'linux/amd64',
    '--shm-size',
    '1g',
    '--user',
    `${process.getuid()}:${process.getgid()}`,
    '-e',
    'HOME=/tmp',
    '-e',
    'PATH=/opt/only-tdy-tools:/usr/local/bin:/usr/bin:/bin',
    '-v',
    `${process.cwd()}:/work`,
    '-v',
    `${process.execPath}:/opt/only-tdy-tools/node:ro`,
    '-w',
    '/work',
    image,
    'node',
    'node_modules/@playwright/test/cli.js',
    'test',
    ...process.argv
      .slice(2)
      .filter((arg, index) => index !== 0 || arg !== '--'),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
