# Release preparation and publication

[README](../README.md) · [Deployment](deployment.md) · [Development](development.md)

[Deployment](deployment.md) covers ordinary Docker use. This guide covers maintainer release workflows.

## Distribution and release rehearsal

`mise run release:rehearse` requires clean committed source. It checks tracked filenames, exports `HEAD` with `git archive`, installs locked dependencies and runs the full gate. Output in `release/out/v<version>-<revision>/` contains four public assets: source/static archives, `SHA256SUMS` and `provenance.json`. The CI bundle also contains internal `container.tar.gz`, excluded from GitHub assets and public checksums. GHCR is the sole published image source; existing immutable releases keep their original image archives and verification format.

GNU tar fixes order, owner/group and timestamps; gzip omits wall-clock metadata. Each container build uses fresh digest-pinned BuildKit, normalizes context timestamps to the commit epoch, and rewrites archive timestamps before loading. Verification compares direct exports, avoiding host-specific `docker save` formats and warm-cache effects. Builders and caches are removed after each build. Repeated rehearsals must produce identical bundle bytes.

## Verify downloaded assets

Download the complete asset set from the same release, then verify and install in a disposable environment:

```sh
sha256sum -c SHA256SUMS
# From the matching release tag checkout with the pinned tools and Docker available:
mise exec -- node scripts/verify-assets.mjs /path/to/downloaded-assets
```

The verifier accepts the public set or complete CI bundle; rejects extra/missing assets and archive links; checks checksums/provenance; and scans extracted source/static files. Before loading or running the container, it independently rebuilds matching reviewed source and compares the normalized export hash with provenance. It also compares static bytes and uncached identity. Docker/BuildKit drift can cause mismatches; investigate rather than bypassing them. It uses loopback port `33003` and removes disposable containers/images.

Deploy the [published image](deployment.md#published-image), or extract static assets into an existing web root, preserving licenses and `deploy/nginx.conf` routing/cache rules.

## Inventories and provenance

`release/source-files.txt` lists reviewed source files. Static/runtime inventories list logical files, replacing only eight-character Vite digests with `{hash}`; provenance records actual filenames and SHA-256 values. Runtime inventory includes the pinned base filesystem except Docker-injected host records and tmpfs scratch files. `release/release-files.txt` lists public GitHub assets; internal image validation is separate. Review additions before refreshing inventories; generated lists never authorize files.

Provenance schema 3 separates the internal container hash from public checksums, and source filenames from their hashes. Source/artifact scans are mandatory. Failed local rehearsals retain synthetic screenshots/traces and a summary in `release/out/failures/<tag>-<revision>/`, excluded from releases; remove after diagnosis.

## Publication and recovery

Before tagging, enable and verify [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) and set repository variable `IMMUTABLE_RELEASES_ENABLED=true`. This is manual: GitHub's settings API requires Administration read permission, absent from the least-privilege Actions token. The workflow checks the published immutable flag.

A version tag alone triggers the workflow:

1. Validate tag/version/event/remote commit, rehearse the export and upload the complete verified bundle.
2. Download and install it in a separate read-only job.
3. Publish the tested internal container export to GHCR with version/full-commit tags, without rebuilding. This dependent job alone needs Packages write permission; existing versioned tags must match.
4. Upload public assets to a draft, download/compare their bytes, then publish. This final job waits for GHCR and alone has Contents write permission.

On failure, rerun the failed publication job with its retained verified Actions artifact; never move tags or rebuild from `main`. Preparation retries rehearse trusted committed source and compare every existing remote asset; mutable drafts and their checksums are not build evidence. Assets must match exactly and are never overwritten; completed immutable releases are downloaded and verified on retry. An incomplete draft blocks new preparation: recover from the original artifact. Actions retains artifacts for 30 days; keep the complete checked bundle independently until publication succeeds.
