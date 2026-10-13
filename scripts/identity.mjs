import { identityEnv, readBuildIdentity } from './build-identity.ts';
const identity = readBuildIdentity(process.cwd());
if (process.argv[2] === '--shell') {
  for (const [key, value] of Object.entries(identityEnv(identity)))
    console.log(`export ${key}='${value}'`);
} else console.log(JSON.stringify(identity));
