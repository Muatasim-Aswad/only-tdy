import { readBuildIdentity, identityEnv } from './build-identity.ts';
import { inventory, run } from './lib.mjs';

const identity = readBuildIdentity(process.cwd());
const env = { ...process.env, ...identityEnv(identity) };
run('node', ['scripts/check-source.mjs'], { env });
for (const script of [
  'format:check',
  'lint',
  'typecheck',
  'test',
  'test:tooling',
  'build',
  'check:bundle',
  'test:e2e',
])
  run('pnpm', ['run', script], { env });
inventory('dist', 'release/static-files.txt');
run('node', ['scripts/scan.mjs', 'dir', 'dist'], { env });
run('bash', ['scripts/verify-container.sh', '--skip-local-build'], { env });
console.log(`Full gate passed (${identity.version}, ${identity.revision})`);
