import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { writeArchive } from './archive.mjs';
import { identityEnv, readBuildIdentity } from './build-identity.ts';
import { CONTAINER_EXPORT, sourceManifest } from './provenance.mjs';
import {
  digest,
  files,
  inventory,
  json,
  lines,
  output,
  run,
  same,
} from './lib.mjs';

const root = process.cwd();
if (output('git', ['status', '--porcelain', '--untracked-files=all']))
  throw new Error('Release rehearsal requires clean committed source');
const identity = readBuildIdentity(root);
if (identity.revision === 'dev')
  throw new Error('Release needs an exact committed revision');
const tag = `v${identity.version}`;
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== tag)
  throw new Error('Tag/version mismatch');
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== identity.revision)
  throw new Error('Event/checkout commit mismatch');
if (
  process.env.GITHUB_REF_NAME &&
  output('git', ['rev-parse', `${tag}^{commit}`]) !== identity.revision
)
  throw new Error('Tag/checkout commit mismatch');
same(
  output('git', ['ls-tree', '-r', '--name-only', 'HEAD']).split('\n'),
  lines('release/source-files.txt'),
  'Tracked source',
);
const destination = resolve('release/out', `${tag}-${identity.revision}`);
const temp = mkdtempSync(join(tmpdir(), 'only-tdy-release-'));
const source = join(temp, 'source');
const image = `only-tdy:${tag}-${identity.revision}`;
let created = false;
try {
  mkdirSync(source);
  run('git', [
    'archive',
    '--format=tar',
    '-o',
    join(temp, 'source.tar'),
    identity.revision,
  ]);
  run('tar', ['-xf', join(temp, 'source.tar'), '-C', source]);
  same(files(source), lines('release/source-files.txt'), 'Archived source');
  const env = { ...process.env, ...identityEnv(identity) };
  run('pnpm', ['install', '--frozen-lockfile'], { cwd: source, env });
  run('pnpm', ['run', 'check'], { cwd: source, env });
  const staticInventory = inventory(
    join(source, 'dist'),
    join(source, 'release/static-files.txt'),
  );
  run('node', ['scripts/container-build.mjs'], {
    cwd: source,
    env: {
      ...env,
      ONLY_TDY_IMAGE: image,
      ONLY_TDY_CONTAINER_ARCHIVE: join(temp, 'image.tar'),
    },
  });
  created = true;
  const assets = join(temp, 'assets');
  mkdirSync(assets);
  const archive = (folder, name, list) =>
    writeArchive(folder, join(assets, name), env.SOURCE_DATE_EPOCH, list);
  archive(
    source,
    `only-tdy-${tag}-source.tar.gz`,
    lines('release/source-files.txt'),
  );
  archive(join(source, 'dist'), `only-tdy-${tag}-static.tar.gz`);
  const imageContents = join(temp, 'image');
  mkdirSync(imageContents);
  run('tar', ['-xf', join(temp, 'image.tar'), '-C', imageContents]);
  archive(imageContents, CONTAINER_EXPORT);
  const provenance = {
    schema: 3,
    ...identity,
    tag,
    sourceDateEpoch: Number(env.SOURCE_DATE_EPOCH),
    platform: 'linux/amd64',
    image,
    containerExportSha256: digest(join(assets, CONTAINER_EXPORT)),
    source: sourceManifest(source, lines('release/source-files.txt')),
    static: staticInventory,
    artifacts: Object.fromEntries(
      files(assets)
        .filter((path) => path !== CONTAINER_EXPORT)
        .map((path) => [path, digest(join(assets, path))]),
    ),
    toolchain: json(join(source, 'release/toolchain.json')),
    validation:
      'Full local/CI gate and disposable downloaded-asset installation; synthetic Chromium/Linux fixtures, no claimed real-backend compatibility',
  };
  writeFileSync(
    join(assets, 'provenance.json'),
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  writeFileSync(
    join(assets, 'SHA256SUMS'),
    files(assets)
      .filter((path) => path !== CONTAINER_EXPORT)
      .map((path) => `${digest(join(assets, path))}  ${path}\n`)
      .join(''),
  );
  same(
    files(assets),
    [
      ...lines('release/release-files.txt').map((p) => p.replace('{tag}', tag)),
      CONTAINER_EXPORT,
    ],
    'Release',
  );
  run('gitleaks', ['dir', assets, '--redact=100', '--no-banner']);
  run('node', [join(root, 'scripts/verify-assets.mjs'), assets]);
  // A previous output is compared rather than silently replaced.
  try {
    same(files(destination), files(assets), 'Prior release');
    for (const path of files(assets))
      if (digest(join(destination, path)) !== digest(join(assets, path)))
        throw new Error(`Rehearsal is not reproducible: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    mkdirSync(destination, { recursive: true });
    cpSync(assets, destination, { recursive: true });
  }
  console.log(`Verified no-publish release: ${destination}`);
} catch (error) {
  const diagnostics = resolve(
    'release/out/failures',
    `${tag}-${identity.revision}`,
  );
  mkdirSync(diagnostics, { recursive: true });
  const browserResults = join(source, 'test-results');
  if (existsSync(browserResults))
    cpSync(browserResults, join(diagnostics, 'browser'), { recursive: true });
  writeFileSync(
    join(diagnostics, 'failure.json'),
    `${JSON.stringify({ tag, revision: identity.revision, message: error.message }, null, 2)}\n`,
  );
  console.error(`Rehearsal failure evidence: ${diagnostics}`);
  throw error;
} finally {
  if (created)
    try {
      run('docker', ['image', 'rm', image], { stdio: 'ignore' });
    } catch {
      /* Verification may already remove the disposable image. */
    }
  rmSync(temp, { recursive: true, force: true });
}
