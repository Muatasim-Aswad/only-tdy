import { run } from './lib.mjs';

const [mode, ...args] = process.argv.slice(2);
if (mode === 'dir' && args.length === 1)
  run('gitleaks', ['dir', args[0], '--redact=100', '--no-banner']);
else if (
  mode === 'range' &&
  args.length === 1 &&
  /^[a-f0-9]{40}(?:\.\.[a-f0-9]{40})?$/.test(args[0])
)
  run('gitleaks', [
    'git',
    '.',
    '--redact=100',
    '--no-banner',
    `--log-opts=${args[0]}`,
  ]);
else throw new Error('Use scan.mjs dir <path> or range <commit-or-range>');
