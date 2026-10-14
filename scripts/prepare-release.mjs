import { createHash } from 'node:crypto';
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  api,
  assetBytes,
  exactRemoteTag,
  release,
  tag,
} from './github-release.mjs';
import { digest, json, lines, run, same } from './lib.mjs';

const version = json('package.json').version;
if (tag !== `v${version}`) throw new Error('Tag/version mismatch');
const revision = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(revision || ''))
  throw new Error('Invalid release revision');
await exactRemoteTag();
const assets = 'release/out/assets';
mkdirSync(assets, { recursive: true });
const { GH_TOKEN, ...env } = process.env;
void GH_TOKEN;
run('node', ['scripts/release.mjs'], { env });
cpSync(`release/out/${tag}-${revision}`, assets, {
  recursive: true,
});
const existing = await release();
if (existing) {
  const remoteAssets = await api(`releases/${existing.id}/assets?per_page=100`);
  const names = lines('release/release-files.txt').map((path) =>
    path.replace('{tag}', tag),
  );
  const remoteNames = remoteAssets.map((asset) => asset.name);
  if (
    remoteNames.some((name) => !names.includes(name)) ||
    new Set(remoteNames).size !== remoteNames.length
  )
    throw new Error('Unexpected existing release asset');
  if (!existing.draft) same(remoteNames, names, 'Existing release');
  for (const asset of remoteAssets) {
    const hash = createHash('sha256')
      .update(await assetBytes(asset))
      .digest('hex');
    if (hash !== digest(join(assets, asset.name)))
      throw new Error(
        `Existing asset differs from fresh trusted rehearsal: ${asset.name}`,
      );
  }
}
