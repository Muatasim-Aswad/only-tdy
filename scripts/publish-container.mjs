import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, files, json, lines, same } from './lib.mjs';
import { CONTAINER_EXPORT, verifiedContainerExport } from './provenance.mjs';

export function publishContainer(context, execute = docker) {
  const { assets, repository, tag, revision, version } = context;
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '') ||
    !/^\d+\.\d+\.\d+$/.test(version || '') ||
    tag !== `v${version}` ||
    !/^[a-f0-9]{40}$/.test(revision || '')
  )
    throw new Error('Invalid container publication context');
  const provenance = json(join(assets, 'provenance.json'));
  const local = `only-tdy:${tag}-${revision}`;
  if (
    provenance.version !== version ||
    provenance.tag !== tag ||
    provenance.revision !== revision ||
    provenance.image !== local
  )
    throw new Error('Container publication identity mismatch');
  const names = [
    'SHA256SUMS',
    `only-tdy-${tag}-source.tar.gz`,
    `only-tdy-${tag}-static.tar.gz`,
    'provenance.json',
  ];
  same(files(assets), [...names, CONTAINER_EXPORT], 'Container publication');
  const checksums = lines(join(assets, 'SHA256SUMS')).map((line) =>
    line.split('  '),
  );
  same(
    checksums.map(([, name]) => name),
    names.filter((name) => name !== 'SHA256SUMS'),
    'Container checksums',
  );
  for (const [hash, name] of checksums)
    if (digest(join(assets, name)) !== hash)
      throw new Error('Container publication checksum mismatch');

  const checked = (args) => {
    const result = execute(args);
    if (result.status !== 0) throw new Error(`Container ${args[0]} failed`);
    return result.stdout.trim();
  };
  const remoteConfig = (ref) => {
    const result = execute(['manifest', 'inspect', ref]);
    if (result.status !== 0) {
      if (/no such manifest|manifest unknown|not found/i.test(result.stderr))
        return null;
      throw new Error('Registry inspection failed; refusing publication');
    }
    const config = JSON.parse(result.stdout).config?.digest;
    if (!/^sha256:[a-f0-9]{64}$/.test(config || ''))
      throw new Error('Registry image has an unexpected manifest');
    return config;
  };
  checked(['load', '--input', verifiedContainerExport(assets, provenance)]);
  const config = checked(['image', 'inspect', local, '--format', '{{.Id}}']);
  if (!/^sha256:[a-f0-9]{64}$/.test(config))
    throw new Error('Loaded image has an invalid identity');
  const image = `ghcr.io/${repository.toLowerCase()}`;
  const targets = [`${image}:${tag}`, `${image}:sha-${revision}`];
  const existing = targets.map((ref) => remoteConfig(ref));
  for (const previous of existing)
    if (previous !== null && previous !== config)
      throw new Error('Refusing to replace an existing versioned image');
  targets.forEach((ref, index) => {
    if (existing[index] === config) return;
    checked(['tag', local, ref]);
    checked(['push', ref]);
    if (remoteConfig(ref) !== config)
      throw new Error('Published image differs from the verified archive');
  });
  return targets;
}

function docker(args) {
  return spawnSync('docker', args, { encoding: 'utf8' });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const targets = publishContainer({
    assets: 'release/out/assets',
    repository: process.env.GITHUB_REPOSITORY,
    tag: process.env.GITHUB_REF_NAME,
    revision: process.env.GITHUB_SHA,
    version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  });
  console.log(`Published verified container: ${targets.join(', ')}`);
}
