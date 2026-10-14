import { identityEnv } from './build-identity.ts';
import { writeArchive } from './archive.mjs';
import {
  CONTAINER_EXPORT,
  readArtifactManifest,
  readSourceManifest,
  verifiedContainerExport,
} from './provenance.mjs';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(process.argv[2] || '');
const provenance = json(join(assets, 'provenance.json'));
const expectedTag = `v${json(join(root, 'package.json')).version}`;
if (provenance.schema !== 3) throw new Error('Unsupported provenance schema');
const sourceProvenance = readSourceManifest(provenance.source);
if (
  provenance.revision === 'dev' ||
  !/^[a-f0-9]{40}$/.test(provenance.revision) ||
  provenance.tag !== expectedTag ||
  provenance.version !== expectedTag.slice(1)
)
  throw new Error('Invalid release identity');
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== provenance.revision)
  throw new Error('Unexpected release commit');
if (
  process.env.GITHUB_REF_NAME &&
  process.env.GITHUB_REF_NAME !== provenance.tag
)
  throw new Error('Unexpected release tag');
const publicNames = lines(join(root, 'release/release-files.txt')).map((p) =>
  p.replace('{tag}', provenance.tag),
);
const hasContainerExport = existsSync(join(assets, CONTAINER_EXPORT));
same(
  files(assets),
  hasContainerExport ? [...publicNames, CONTAINER_EXPORT] : publicNames,
  'Downloaded release',
);
if (hasContainerExport) verifiedContainerExport(assets, provenance);
const checksums = lines(join(assets, 'SHA256SUMS')).map((line) => {
  const match = /^([a-f0-9]{64}) {2}([A-Za-z0-9._-]+)$/.exec(line);
  if (!match) throw new Error('Malformed checksum');
  return [match[2], match[1]];
});
same(
  checksums.map(([p]) => p),
  publicNames.filter((p) => p !== 'SHA256SUMS'),
  'Checksums',
);
for (const [path, hash] of checksums)
  if (digest(join(assets, path)) !== hash)
    throw new Error(`Checksum mismatch: ${path}`);
const artifactProvenance = readArtifactManifest(
  provenance.artifacts,
  lines(join(root, 'release/release-files.txt'))
    .filter((path) => path.endsWith('.tar.gz'))
    .map((path) => path.replace('{tag}', expectedTag)),
);
for (const [path, hash] of artifactProvenance)
  if (digest(join(assets, path)) !== hash)
    throw new Error(`Provenance mismatch: ${path}`);
if (
  provenance.image !== `only-tdy:${provenance.tag}-${provenance.revision}` ||
  provenance.platform !== 'linux/amd64'
)
  throw new Error('Invalid image distribution reference');
run('gitleaks', ['dir', assets, '--redact=100', '--no-banner']);
const temp = mkdtempSync(join(tmpdir(), 'only-tdy-install-'));
const name = `only-tdy-install-${process.pid}`;
const previousImage = `only-tdy-verify:previous-${basename(temp)}`;
let rebound = false;
let previousSaved = false;
let previousId = null;
let existed = false;
try {
  previousId = output('docker', [
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    provenance.image,
  ]);
  existed = true;
} catch {
  /* Disposable image is absent. */
}
try {
  for (const kind of ['source', 'static']) {
    const dest = join(temp, kind);
    mkdirSync(dest);
    const archive = join(assets, `only-tdy-${provenance.tag}-${kind}.tar.gz`);
    const members = output('tar', ['-tzf', archive]).split('\n');
    if (members.some((p) => p.startsWith('/') || p.split('/').includes('..')))
      throw new Error('Unsafe archive member');
    if (
      output('tar', ['-tvzf', archive])
        .split('\n')
        .some((line) => !['-', 'd'].includes(line[0]))
    )
      throw new Error('Archive links/special files are forbidden');
    run('tar', ['-xzf', archive, '-C', dest, '--no-same-owner']);
    const expected = kind === 'source' ? sourceProvenance : provenance[kind];
    same(files(dest), Object.keys(expected), `${kind} installed`);
    for (const [path, hash] of Object.entries(expected))
      if (digest(join(dest, path)) !== hash)
        throw new Error(`Installed ${kind} mismatch: ${path}`);
    run('gitleaks', ['dir', dest, '--redact=100', '--no-banner']);
  }
  same(
    files(join(temp, 'source')),
    lines(join(root, 'release/source-files.txt')),
    'Installed source allowlist',
  );
  for (const [path, hash] of Object.entries(sourceProvenance))
    if (digest(join(root, path)) !== hash)
      throw new Error(
        `Downloaded source differs from the matching reviewed checkout: ${path}`,
      );
  inventory(join(temp, 'static'), join(root, 'release/static-files.txt'));
  const actualIdentity = json(join(temp, 'static/version.json'));
  for (const key of ['version', 'revision', 'committedAt', 'builtAt'])
    if (actualIdentity[key] !== provenance[key])
      throw new Error(`Static identity differs: ${key}`);
  const installedSource = join(temp, 'source');
  const sourceEnv = { ...process.env, ...identityEnv(actualIdentity) };
  run('pnpm', ['install', '--frozen-lockfile'], {
    cwd: installedSource,
    env: sourceEnv,
  });
  run('pnpm', ['run', 'build'], { cwd: installedSource, env: sourceEnv });
  const sourceBuild = inventory(
    join(installedSource, 'dist'),
    join(root, 'release/static-files.txt'),
  );
  if (JSON.stringify(sourceBuild) !== JSON.stringify(provenance.static))
    throw new Error('Downloaded source rebuild differs from static assets');
  const trustedTar = join(temp, 'trusted-image.tar');
  const trustedContents = join(temp, 'trusted-image');
  run('node', [join(root, 'scripts/container-build.mjs')], {
    cwd: installedSource,
    env: {
      ...sourceEnv,
      ONLY_TDY_IMAGE: provenance.image,
      ONLY_TDY_CONTAINER_ARCHIVE: trustedTar,
      ONLY_TDY_LOAD_IMAGE: '0',
    },
  });
  mkdirSync(trustedContents);
  run('tar', ['-xf', trustedTar, '-C', trustedContents]);
  const trustedArchive = join(temp, CONTAINER_EXPORT);
  writeArchive(trustedContents, trustedArchive, sourceEnv.SOURCE_DATE_EPOCH);
  verifiedContainerExport(temp, provenance);
  const checkedContainer = hasContainerExport
    ? verifiedContainerExport(assets, provenance)
    : trustedArchive;
  if (existed) {
    run('docker', ['tag', previousId, previousImage]);
    previousSaved = true;
  }
  rebound = true;
  run('docker', ['load', '-i', checkedContainer]);
  run('docker', [
    'run',
    '-d',
    '--name',
    name,
    '--read-only',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=16m',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--memory=128m',
    '--cpus=0.5',
    '--pids-limit=64',
    '--publish',
    '127.0.0.1:33003:8080',
    provenance.image,
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch('http://127.0.0.1:33003/healthz')).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Startup remains bounded. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('Installed container did not become ready');
  const response = await fetch('http://127.0.0.1:33003/version.json', {
    cache: 'no-store',
  });
  if (
    response.headers.get('cache-control') !== 'no-store' ||
    JSON.stringify(await response.json()) !== JSON.stringify(actualIdentity)
  )
    throw new Error('Installed deployed identity mismatch');
  const served = join(temp, 'served');
  mkdirSync(served);
  run('docker', ['cp', `${name}:/usr/share/nginx/html/.`, served]);
  const extracted = inventory(served, join(root, 'release/static-files.txt'));
  if (JSON.stringify(extracted) !== JSON.stringify(provenance.static))
    throw new Error('Container/static bytes differ');
  if (output('docker', ['exec', name, 'id', '-u']) !== '101')
    throw new Error('Runtime is root or unexpected UID');
  run('gitleaks', ['dir', served, '--redact=100', '--no-banner']);
  run('node', [join(root, 'scripts/runtime-inventory.mjs'), name]);
  run('docker', ['rm', '-f', name], { stdio: 'ignore' });
  run('docker', [
    'run',
    '-d',
    '--name',
    name,
    '--read-only',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=16m',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--publish',
    '127.0.0.1:33003:8080',
    '--mount',
    `type=bind,src=${join(temp, 'static')},dst=/usr/share/nginx/html,readonly`,
    '--mount',
    `type=bind,src=${join(installedSource, 'deploy/nginx.conf')},dst=/etc/nginx/nginx.conf,readonly`,
    provenance.image,
  ]);
  let staticReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch('http://127.0.0.1:33003/healthz')).ok) {
        staticReady = true;
        break;
      }
    } catch {
      /* Startup remains bounded. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!staticReady)
    throw new Error('Installed static archive did not become ready');
  const staticResponse = await fetch('http://127.0.0.1:33003/version.json');
  if (
    JSON.stringify(await staticResponse.json()) !==
      JSON.stringify(actualIdentity) ||
    staticResponse.headers.get('cache-control') !== 'no-store'
  )
    throw new Error('Installed static identity differs');
  const deepLink = await fetch('http://127.0.0.1:33003/today/deep/link');
  if (
    !deepLink.ok ||
    (await deepLink.text()) !==
      readFileSync(join(temp, 'static/index.html'), 'utf8')
  )
    throw new Error('Static deep-link shell fallback failed');
  console.log(
    'Downloaded source/static assets and trusted image rebuild: checksums, exact inventories, installation, health and identity passed',
  );
} finally {
  try {
    run('docker', ['rm', '-f', name], { stdio: 'ignore' });
  } catch {
    /* Container may not exist. */
  }
  if (rebound && existed && previousSaved)
    run('docker', ['tag', previousImage, provenance.image]);
  else if (rebound)
    try {
      run('docker', ['image', 'rm', provenance.image], { stdio: 'ignore' });
    } catch {
      /* A concurrent operator may still reference the verified image. */
    }
  for (const image of [previousImage])
    try {
      run('docker', ['image', 'rm', image], { stdio: 'ignore' });
    } catch {
      /* Disposable tag may not exist. */
    }
  rmSync(temp, { recursive: true, force: true });
}
