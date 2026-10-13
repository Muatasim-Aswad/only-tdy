import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  api,
  assetBytes,
  exactRemoteTag,
  release,
  tag,
} from './github-release.mjs';
import { json, lines, run, same } from './lib.mjs';
const version = json('package.json').version;
if (tag !== `v${version}`) throw new Error('Tag/version mismatch');
await exactRemoteTag();
const assets = 'release/out/assets';
mkdirSync(assets, { recursive: true });
const existing = await release();
if (existing) {
  const remoteAssets = await api(`releases/${existing.id}/assets?per_page=100`);
  same(
    remoteAssets.map((a) => a.name),
    lines('release/release-files.txt').map((p) => p.replace('{tag}', tag)),
    'Existing release',
  );
  for (const asset of remoteAssets)
    writeFileSync(join(assets, asset.name), await assetBytes(asset));
  const { GH_TOKEN, ...env } = process.env;
  void GH_TOKEN;
  run('node', ['scripts/verify-assets.mjs', assets], { env });
} else {
  const { GH_TOKEN, ...env } = process.env;
  void GH_TOKEN;
  run('node', ['scripts/release.mjs'], { env });
  cpSync(`release/out/${tag}-${process.env.GITHUB_SHA}`, assets, {
    recursive: true,
  });
}
