import { identityEnv, readBuildIdentity } from './build-identity.ts';
import { run } from './lib.mjs';
const env = identityEnv(readBuildIdentity(process.cwd()));
run('docker', [
  'buildx',
  'build',
  '--output=type=image,store=true,push=false,rewrite-timestamp=true,unpack=false',
  '--provenance=false',
  '--platform=linux/amd64',
  ...Object.entries(env).flatMap(([key, value]) => [
    '--build-arg',
    `${key}=${value}`,
  ]),
  '--tag',
  process.env.ONLY_TDY_IMAGE || 'only-tdy:local',
  '.',
]);
