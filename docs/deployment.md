# Docker deployment

[README](../README.md) · [Limitations](limitations.md) · [Releases](releases.md)

only-tdy is a static app served by nginx. Install and back up Tududi separately; it owns authentication and tasks. Use a prefix-stripping HTTPS proxy on its origin. See [API compatibility](limitations.md#compatibility).

## Tududi backend pin

Pin your existing Tududi service to the tested **1.9.4** image:

```yaml
image: chrisvel/tududi:1.9.4@sha256:dd930f0fb48988e03e199b1c22016dcd95dad9eade073e8f45c2a0d250106bcf
```

Keep Tududi's environment, volumes and proxy settings. only-tdy's Compose file serves just the frontend. Back up Tududi before upgrading, then run the smoke checks below. The pin verifies an API baseline, not your database upgrade or HTTPS deployment.

## Published image

With Docker Compose, download and run the matching published image; no clone or build tools are needed:

```sh
mkdir -p only-tdy && cd only-tdy
curl -fsSLO https://raw.githubusercontent.com/Muatasim-Aswad/only-tdy/v0.1.3/compose.yaml
docker compose up -d --no-build
```

Compose pulls `ghcr.io/muatasim-aswad/only-tdy:v0.1.3` if missing and binds `127.0.0.1:3003`; the proxy exposes `/only-tdy/`. Linux/amd64 only, with no persistent volumes or secrets.

## Build from source

Requires Git and Docker Compose; build tools run inside Docker:

```sh
git clone https://github.com/Muatasim-Aswad/only-tdy.git
cd only-tdy
export ONLY_TDY_IMAGE=only-tdy:local
docker compose build
docker compose up -d --no-build --pull never
```

[`compose.yaml`](../compose.yaml) defines the build; `ONLY_TDY_IMAGE` names the local image. No host mise/Node/pnpm, identity generation or release rehearsal is needed; nothing is published. Ordinary builds report revision `dev`; deployment tools can supply [build identity](development.md#build-identity).

## Deploy with srvr

[Install srvr](https://github.com/Muatasim-Aswad/srvr/blob/main/docs/install.md) and prepare the published-image directory or source checkout above. From that directory, register either mode using the existing Compose file.

For published images:

```sh
srvr add only-tdy --kind image --workdir "$PWD" \
  --compose-file compose.yaml --update-component only-tdy \
  --health http://127.0.0.1:3003/healthz
```

For source builds, use a clean checkout containing `main`, with `ONLY_TDY_IMAGE=only-tdy:local` in its ignored `.env`:

```sh
srvr add only-tdy --kind git --branch main --workdir "$PWD" \
  --compose-file compose.yaml --health http://127.0.0.1:3003/healthz \
  --version-url http://127.0.0.1:3003/version.json
```

Registration leaves running containers alone; add `--start` for a stopped project. Keep project name `only-tdy`, or pass an existing override with `--project`. Adjust loopback URLs for `ONLY_TDY_PORT`. The project's `.env` is automatic; register external settings with `--env-file`. Existing Compose arguments carry srvr's source commit/build identity.

For a running source image built directly with Compose (`dev`), first run `srvr update only-tdy --force` to rebuild with commit identity. Then inspect:

```sh
srvr info only-tdy
srvr health only-tdy
srvr logs only-tdy -f
```

For image updates, replace `IMAGE` with a published `ghcr.io/muatasim-aswad/only-tdy` version tag or digest. Review, then apply:

```sh
srvr update only-tdy --image IMAGE --check
srvr update only-tdy --image IMAGE
```

For source updates, run `srvr update only-tdy --check`, then `srvr update only-tdy`; `--ref` selects a release tag or commit. `srvr rollback only-tdy` undoes the last successful update. See [srvr update/recovery rules](https://github.com/Muatasim-Aswad/srvr/blob/main/docs/updates.md).

only-tdy needs no data registration or migration job. Manage Tududi's pin/backups separately; frontend rollback cannot undo task writes. Preserve [proxy routing](#exposure-and-routing) and run the [smoke checks](#smoke-checks); srvr health does not verify login or routing.

## Configuration and health

`ONLY_TDY_IMAGE` selects a versioned image, digest or local build; `ONLY_TDY_PORT` sets the loopback port. Export overrides or save them in an ignored mode `0600` `.env` beside `compose.yaml`; see [`.env.example`](../.env.example). Keep `ONLY_TDY_IMAGE=only-tdy:local` for source deployments.

With settings loaded:

```sh
docker compose ps
docker compose logs -f only-tdy
curl -fsS http://127.0.0.1:3003/healthz
curl -fsS http://127.0.0.1:3003/version.json
```

Compose enforces non-root execution, a read-only filesystem, temporary nginx scratch space, dropped capabilities, resource limits, bounded logs and automatic restart. Health checks nginx readiness only, not Tududi or login. Build identity is at `/only-tdy/version.json` and in About. Reloading a new build loses drafts.

## Exposure and routing

Use an HTTPS reverse proxy on the Tududi origin:

| Public route | Destination |
| --- | --- |
| `/api/**`, login and other Tududi routes | Tududi. |
| `/only-tdy` and `/only-tdy/**` | only-tdy on loopback, **stripping the `/only-tdy` prefix** before forwarding. |

The browser keeps `/only-tdy/`; the static server receives `/`, `/assets/...` and other stripped paths. The app canonicalizes `/only-tdy` to `/only-tdy/`; deep links fall back to the shell. Prefix-preserving proxies and cross-origin APIs are unsupported. Follow Tududi's proxy-trust guidance; never trust arbitrary forwarded headers.

Keep `127.0.0.1:<ONLY_TDY_PORT>` (default `3003`) mapped to container port `8080`. Add only the only-tdy path route; retain Tududi's root/API routes. Trust every app sharing this origin; see [Security](../SECURITY.md).

## Smoke checks

Using your own HTTPS origin as `$origin`:

```sh
curl -fsS "$origin/only-tdy/version.json"
curl -fsS "$origin/only-tdy/manifest.webmanifest"
curl -fsS "$origin/only-tdy/sw.js"
```

In a browser signed in through Tududi:

- Confirm Tududi's root, login and API routes still work.
- Open `/only-tdy`, refresh `/only-tdy/` and a deep task link. Check scripts, styles, icons and manifest for redirects/missing assets.
- Confirm worker scope `/only-tdy/` and uncached `/api/**` requests reaching Tududi.
- Create a synthetic Backlog task, move it to Today, edit, complete and delete it. Check changes in Tududi and record its tested version.
- Verify account timezone, session-expiry recovery and deployed identity in About.
- Check installation where supported. After an online visit, the offline shell should reopen and explain that loading/saving needs a connection.

Keep real task data, cookies and private host details out of public reports.

## Update, rollback and removal

Verify the new revision, replace only the static assets/container, and repeat smoke checks. Keep prior verified assets/image and identity for rollback. This cannot undo task writes or restore data; use Tududi's backup/recovery procedures. Keep proxy routes unchanged during routine updates.

To remove only-tdy, remove its proxy route and stop its container. Optionally uninstall the PWA and clear its preferences, worker and caches; see [shared-origin effects](limitations.md#offline-behavior-and-retention). Leave Tududi's service, routes and data independently managed.

For older `/focus/` installations, keep a temporary prefix-stripping route to the same server until devices load the migration. The old worker removes legacy caches and unregisters; the shell moves to `/only-tdy/`. Reinstall home-screen shortcuts before retiring the old route.

For release verification, archives and publication, see [releases](releases.md).
