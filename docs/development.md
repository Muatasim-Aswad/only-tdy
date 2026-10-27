# Development and testing

[README](../README.md) · [Contributing](../CONTRIBUTING.md) · [Architecture](architecture.md)

## Setup and checks

Install [mise](https://mise.jdx.dev), then run from the cloned repository root. [`.mise.toml`](../.mise.toml) pins tools; `pnpm-lock.yaml` pins dependencies.

```sh
mise install
mise exec -- pnpm install --frozen-lockfile
mise run browser:install
mise run hooks:install
mise run dev:seeded
```

Review any system package changes requested by the browser bootstrap. The seeded server uses temporary synthetic data. `mise run dev` requires the same-origin Tududi setup in [deployment](deployment.md).

Before submitting, run the CI gate:

```sh
mise run check
```

It checks formatting, lint, types, unit tests, build, the 100 KiB initial JavaScript gzip budget, browser/visual behavior, container hardening and source/artifact exports. Hooks run the full gate on commit/push, impose no message convention, and supplement authoritative CI.

Full checks require Linux amd64, Git, a working Docker daemon with Buildx/Compose, GNU tar, gzip, curl and jq. CI uses Ubuntu 24.04; host Docker/system patch versions follow its maintained runner. Builds use a fresh isolated builder, normalized source context and the pinned BuildKit image. Browser checks use the same digest-pinned Playwright Ubuntu/Chromium container as CI with the pinned host Node executable; direct runs elsewhere are diagnostic and may differ.

Regenerate baselines with `mise run test:e2e -- --update-snapshots` and review changes. Update the browser image digest with Playwright. Formatting covers public code/config/docs and excludes ignored operational state.

## Tooling choices

The [mise tasks](../.mise.toml) and [package scripts](../package.json) define commands and checks. The lockfile selects Playwright's Chromium. CI pins action commits and the mise checksum; [release/toolchain.json](../release/toolchain.json) records release tools and image digests. No global trust or tool defaults are needed.

ESLint/Vite/Vitest support the React, PWA and source-graph checks. TypeScript 7 checks types; TypeScript 6 serves only typescript-eslint compatibility (see `pnpm-workspace.yaml`). Existing CSS optimizer and PWA bundling warnings reflect upstream compatibility limits; the gate remains unchanged.

Dependabot groups npm, Docker and Actions version/security updates separately, with explicit version cooldowns; [security updates bypass cooldowns](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/). GitHub's [ecosystem reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference) lists pnpm through 10; verify pnpm 11 lockfile support before relying on automatic PRs. Frozen-lockfile CI remains mandatory. Tool/image/action updates require reviewed inventories and a clean release rehearsal.

## Build identity

[Compose](../compose.yaml) defines the build context, platform and arguments. Ordinary Docker builds report revision `dev`. Deployment tools such as [srvr](deployment.md#deploy-with-srvr) supply `APP_REVISION`, `APP_COMMIT_TIME` and `APP_BUILD_TIME`. Default `SOURCE_DATE_EPOCH=0` allows separate commit/build times; release builds use a nonzero commit epoch and require matching timestamps.

`mise run release:rehearse` prepares deterministic assets from clean committed source without publishing. See [releases](releases.md) for artifact verification and publication.

The synthetic server starts signed out. Use `demo@example.com` / `only-tdy-demo`; these credentials exist only in the dev fixture. Its data and sessions disappear when the server stops.

English and Arabic use i18next/react-i18next with typed, contextual catalogs owned by the app, auth and task feature. Keep whole messages, interpolation and plural forms together; do not translate backend strings or user content. Use the selected locale for display formatting, logical CSS for layout, and matching bidi behavior in editable fields and token mirrors. Test both languages, translation arguments, Arabic token aliases/digits, narrow layouts and draft retention.
