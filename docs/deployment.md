# Deployment

only-tdy is a static single-page app served by a hardened nginx container. It stores no persistent data or secrets in the container. Tududi owns authentication and task data; install and back it up separately. Real-backend compatibility is [unverified](limitations.md#compatibility).

## Exposure and routing

Use an HTTPS reverse proxy on the Tududi origin:

| Public route | Destination |
| --- | --- |
| `/api/**`, login and other Tududi routes | Tududi. |
| `/only-tdy` and `/only-tdy/**` | only-tdy on loopback, **stripping the `/only-tdy` prefix** before forwarding. |

The browser retains `/only-tdy/`, while the static server receives `/`, `/assets/...`, and other stripped paths. The app canonicalizes the exact `/only-tdy` URL to `/only-tdy/`. Deep links fall back to the shell. Prefix-preserving proxies and cross-origin APIs are unsupported. Configure Tududi's proxy trust for your trusted proxy according to its own guidance; do not trust arbitrary forwarded headers.

Keep the container loopback-only: `ONLY_TDY_PORT` defaults to `3003` and maps `127.0.0.1:<port>` to container port `8080`. Add only the only-tdy path route; do not replace Tududi's root or API routes. Applications sharing this origin must be trusted. See [Security](../SECURITY.md).

## Verify and prepare

From the exact committed revision you intend to serve, install the pinned tools/dependencies and Chromium runtime as described in [contributing](../CONTRIBUTING.md). Docker must be available. Run:

```sh
mise run check
mise run release:rehearse
git status --short
git rev-parse HEAD
```

`check` is the shared local/CI gate, including browser, bundle, container and export checks. Release preparation needs enough writable temporary storage for dependency installs, browser profiles and container archives. Set `TMPDIR` to a disk-backed directory if the system temporary filesystem or user quota is constrained. `release:rehearse` requires clean committed source and produces deterministic, verified distribution assets without publishing. Retain the revision and checksums with your operator records. Review the rehearsal's artifact inventory before choosing static assets or the container bundle; a registry image is not a declared distribution requirement.

## Build identity and start

Public build tooling supplies `APP_REVISION`, `APP_COMMIT_TIME`, `APP_BUILD_TIME` and `SOURCE_DATE_EPOCH`. `package.json` supplies the version. Use the same identity inputs for local and container builds; do not label a dirty development build as an exact release. The rehearsal records the identity and checksums of its assets.

To build a clean checkout yourself, derive reproducible inputs from that commit:

```sh
eval "$(mise exec -- node scripts/identity.mjs --shell)"
export ONLY_TDY_PORT=3003
docker compose build only-tdy
docker compose up -d only-tdy
curl -fsS "http://127.0.0.1:${ONLY_TDY_PORT}/healthz"
curl -fsS "http://127.0.0.1:${ONLY_TDY_PORT}/version.json"
```

Use `mise run container:build` for a local image with the same inputs. Container builds and release bundles target `linux/amd64`; other architectures are unverified. Missing Git or dirty source reports `dev`. `SOURCE_DATE_EPOCH` is the commit timestamp in seconds; build and commit times normalize to the same UTC second, making identity reproducible rather than recording the current wall clock. Invalid or conflicting inputs fail the build.

Wait for container health to become `healthy`; verify its user is `nginx`, root filesystem is read-only, capabilities are dropped, and the port binds only `127.0.0.1`. Temporary nginx scratch space uses tmpfs; there are no persistent volumes. Health proves static-server readiness, not Tududi availability or session validity.

The same version, revision, commit time and build time are baked into the app and emitted as `version.json`. Through the proxy it is `/only-tdy/version.json`, served uncached. Compare its revision to the chosen commit, rather than trusting an image name. About compares this deployed identity with the running app, offers Reload for a different build, and shows a failed-check state if the comparison cannot complete. A one-time update notice is remembered locally. Reload loses unsaved drafts.

## Smoke checks

Using your own HTTPS origin as `$origin`:

```sh
curl -fsS "$origin/only-tdy/version.json"
curl -fsS "$origin/only-tdy/manifest.webmanifest"
curl -fsS "$origin/only-tdy/sw.js"
```

In a browser signed in through Tududi:

- Confirm Tududi's root, login and API routes still behave correctly.
- Open `/only-tdy`, refresh `/only-tdy/` and a deep task link, and verify scripts, styles, icons and the manifest load without redirects or missing assets.
- Confirm the active worker scope is `/only-tdy/` and `/api/**` requests reach Tududi without service-worker caching.
- Create a disposable synthetic task in Backlog, move it to Today, edit it, complete it, then remove it. Verify these changes in Tududi too; record the backend version you actually tested.
- Verify account timezone behavior, session expiration recovery and the deployed identity in About.
- Check installation where your browser supports it. After an online visit, the offline shell should reopen and explain that task loading/saving needs a connection.

Avoid copying real task data, cookies or private host details into public reports.

## Update, rollback and removal

Prepare and verify the new revision, then replace only the static assets or container and repeat the smoke checks. Keep the prior verified assets/image and identity for rollback. A container rollback does not roll back Tududi task writes or data; manage that through Tududi's backup/recovery procedures. Avoid changing proxy routes during routine updates.

To remove only-tdy, remove only its proxy route and stop its container. Uninstall the PWA and clear only-tdy's browser preferences, worker and caches if desired; [storage clearing](limitations.md#offline-behavior-and-retention) describes shared-origin effects. Tududi's service, routes and data remain independently managed.

Older installations under `/focus/` need a temporary equivalent prefix-stripping route to the same static server until devices have loaded the migration. The old worker removes its legacy caches and unregisters, and the shell moves the address to `/only-tdy/`. Reinstall home-screen shortcuts at the new path before retiring the old route.

## Distribution and release rehearsal

`mise run release:rehearse` accepts only clean committed source. It checks exact tracked filenames, exports `HEAD` with `git archive`, installs locked dependencies, and runs the full gate on that export. It produces `release/out/v<version>-<revision>/` containing source, static and `linux/amd64` container archives, `SHA256SUMS` and `provenance.json`. GNU tar fixes order, owner/group and timestamps; gzip omits wall-clock metadata. Container build inputs use the same fixed epoch and enable BuildKit timestamp rewriting. Repeating a rehearsal compares all output bytes and fails on a difference. No container registry is used.

Download the complete asset set from the same release, then verify and install in a disposable environment:

```sh
sha256sum -c SHA256SUMS
# From a matching source checkout with the pinned tools and Docker available:
mise exec -- node scripts/verify-assets.mjs /path/to/downloaded-assets
```

The verifier rejects extra/missing assets and archive links, checks checksums/provenance, scans extracted source/static files, installs the container bundle and compares its static bytes and uncached identity. It uses loopback port `33003` and removes its disposable containers/images. To use the container bundle, `docker load -i only-tdy-v<version>-container-linux-amd64.tar.gz`, set `ONLY_TDY_IMAGE` to the image reference in `provenance.json`, and use `docker compose up -d --no-build`. To use static assets, extract the static archive into your existing static web root, preserve license files, and reproduce the routing/cache rules in `deploy/nginx.conf`.

`release/source-files.txt` enumerates every reviewed source file. Static/runtime inventories enumerate every logical file, replacing only the eight-character Vite content digest with `{hash}`; provenance records each actual filename and SHA-256. Runtime inventory includes the pinned base filesystem, excluding only Docker-injected host records and tmpfs scratch files. `release/release-files.txt` enumerates the complete distribution. Additions fail checks until explicitly reviewed and refreshed; generated inventories never authorize files by themselves.

A version tag alone triggers the release workflow. It validates tag/version/event/remote commit, rehearses the export, uploads the complete verified bundle, downloads and installs it in a separate read-only job, then uploads all assets to a draft and compares downloaded bytes before publishing. Only that final job has Contents write permission. The maintainer must enable and verify immutable releases and set repository variable `IMMUTABLE_RELEASES_ENABLED=true` before tagging; the workflow checks the published immutable flag. GitHub's settings API needs Administration read permission, which the least-privilege Actions token lacks, so configuration is a maintainer prerequisite. See [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).

A failed local rehearsal retains synthetic browser screenshots/traces and a failure summary under `release/out/failures/<tag>-<revision>/`. These files are local diagnostics, excluded from release assets; remove that failure directory after diagnosis. Provenance schema 2 separates source filenames from SHA-256 values so generated hashes do not resemble credentials, while source and artifact scans remain mandatory.

On failure, rerun the failed publication job using its retained verified Actions artifact. Never move the tag or rebuild from `main`. Existing assets must match exactly and are never overwritten; a completed immutable release is downloaded and verified on retry. An incomplete draft blocks a new preparation job: recover from the original verified Actions artifact. Artifacts are retained for 30 days; keep the complete checked bundle independently until publication succeeds.
