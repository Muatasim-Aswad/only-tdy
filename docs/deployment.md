# Docker deployment

only-tdy is a static app served by nginx. Tududi owns authentication and task data; install and back it up separately. Configure a prefix-stripping HTTPS proxy on the Tududi origin as described below. Real-backend compatibility remains [unverified](limitations.md#compatibility).

## Published image

Requires Docker with Compose. Download one Compose file and run the matching public image; no clone or build tools are needed:

```sh
mkdir -p only-tdy && cd only-tdy
curl -fsSLO https://raw.githubusercontent.com/Muatasim-Aswad/only-tdy/v0.1.2/compose.yaml
docker compose up -d --no-build
```

Compose pulls `ghcr.io/muatasim-aswad/only-tdy:v0.1.2` if missing. It binds only `127.0.0.1:3003`; the proxy exposes it at `/only-tdy/`. Linux/amd64 only. There are no persistent container volumes or secrets.

## Build from source

Requires Git and Docker with Compose. Docker installs the build tools internally:

```sh
git clone https://github.com/Muatasim-Aswad/only-tdy.git
cd only-tdy
docker build --platform linux/amd64 -t only-tdy:local .
ONLY_TDY_IMAGE=only-tdy:local docker compose up -d --no-build --pull never
```

The same Compose file can build it with `ONLY_TDY_IMAGE=only-tdy:local docker compose build` instead of the plain Docker build command. No host mise, Node, pnpm, identity generation, or release rehearsal is required. Ordinary source builds report revision `dev`; nothing is published.

## Configuration and health

`ONLY_TDY_IMAGE` selects a versioned image, digest, or local build; `ONLY_TDY_PORT` changes the loopback host port. Export overrides for subsequent commands or save them in an ignored mode `0600` `.env` beside `compose.yaml`. [`.env.example`](../.env.example) lists the settings. Preserve `ONLY_TDY_IMAGE=only-tdy:local` for source deployments.

With settings loaded:

```sh
docker compose ps
docker compose logs -f only-tdy
curl -fsS http://127.0.0.1:3003/healthz
curl -fsS http://127.0.0.1:3003/version.json
```

Compose sets a non-root runtime, read-only filesystem, temporary nginx scratch space, dropped capabilities, resource limits, bounded logs and automatic restart. Health checks nginx readiness; they do not verify Tududi or login validity. Build information is available through the proxy at `/only-tdy/version.json` and in About. Reloading to a new build loses unsaved drafts.

## Exposure and routing

Use an HTTPS reverse proxy on the Tududi origin:

| Public route | Destination |
| --- | --- |
| `/api/**`, login and other Tududi routes | Tududi. |
| `/only-tdy` and `/only-tdy/**` | only-tdy on loopback, **stripping the `/only-tdy` prefix** before forwarding. |

The browser retains `/only-tdy/`, while the static server receives `/`, `/assets/...`, and other stripped paths. The app canonicalizes the exact `/only-tdy` URL to `/only-tdy/`. Deep links fall back to the shell. Prefix-preserving proxies and cross-origin APIs are unsupported. Configure Tududi's proxy trust for your trusted proxy according to its own guidance; do not trust arbitrary forwarded headers.

Keep the container loopback-only: `ONLY_TDY_PORT` defaults to `3003` and maps `127.0.0.1:<port>` to container port `8080`. Add only the only-tdy path route; do not replace Tududi's root or API routes. Applications sharing this origin must be trusted. See [Security](../SECURITY.md).

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

For maintainer verification, release archives and registry publication, see [releases](releases.md).
