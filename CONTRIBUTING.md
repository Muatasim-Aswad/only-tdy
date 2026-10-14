# Contributing

Keep the daily flow small: quick capture, deliberate Today/Backlog planning, and accessible editing. Discuss broader planning features before building them. Ask questions in [Discussions](https://github.com/Muatasim-Aswad/only-tdy/discussions); report vulnerabilities through [Security](SECURITY.md).

## Setup and checks

Fork and clone the repository, then use the pinned toolchain:

```sh
mise install node@24.20.0 pnpm@11.24.0 gitleaks@8.30.1
mise exec -- pnpm install --frozen-lockfile
mise run browser:install
mise run hooks:install
mise run dev:seeded
```

The browser bootstrap may require system package installation; review its requested changes. The seeded server uses synthetic, temporary data. Use `mise run dev` only with the same-origin Tududi API arrangement described in [deployment](docs/deployment.md).

Run the same gate used by CI before submitting:

```sh
mise run check
```

The gate checks formatting, lint, types, unit tests, the production build and 100 KiB initial JavaScript gzip budget, browser/visual behavior, the hardened container, and source/artifact exports. Container checks require a working Docker daemon; browser checks run in a digest-pinned Playwright Ubuntu container with the pinned host Node executable. `mise run release:rehearse` additionally prepares deterministic release assets from clean committed source without publishing. Local hooks help catch mistakes; CI remains authoritative.

## Pull requests

Send a focused pull request from your fork. Describe the behavior before and after, tests run, privacy implications, and compatibility or migration effects; mark irrelevant items as such. Include meaningful regression coverage for changed behavior. Use synthetic fixtures and screenshots, and review visual baseline changes. Remove task data, cookies, tokens and private host details from examples and logs.

Follow [architecture](docs/architecture.md), keep domain logic with its feature, and use focused public APIs between areas. Avoid dependencies or scope increases without a concrete need. Commit messages should explain the change; Conventional Commits are not required. Contributions are licensed under the repository's [MIT license](LICENSE).

## Tooling choices

Node, pnpm and Gitleaks versions are pinned in `.mise.toml`; dependencies, Prettier and the Chromium revision selected by Playwright are pinned by `package.json` and `pnpm-lock.yaml`. CI pins action commits and the mise binary checksum; versions/digests are recorded in `release/toolchain.json`. Install only the named project tools to avoid unrelated global tools. No global trust or tool defaults are required.

ESLint/Vite/Vitest remain because they support the established React, PWA and source-graph gates. TypeScript 7 performs type checking; TypeScript 6 remains solely for typescript-eslint compatibility, documented in `pnpm-workspace.yaml`. Existing CSS optimizer and PWA bundling warnings are upstream compatibility limits, not a lowered gate. The initial JavaScript budget remains 100 KiB gzip.

Full checks require Git, Docker with Buildx/Compose, GNU tar, gzip, curl and jq on the host. CI uses Ubuntu 24.04; its Docker/system package patch versions follow GitHub's maintained runner rather than being independently provisioned. The full browser gate requires a Linux amd64 host and runs all browser tests in the same digest-pinned Ubuntu/Chromium image as CI. Direct Playwright runs on other hosts are diagnostic and may differ. Regenerate baselines with `mise run test:e2e -- --update-snapshots` and review changes; update the image digest with the Playwright dependency. Formatting covers public code/config/docs and leaves ignored operational state alone. Hooks run the full gate on commit/push and use no commit-message convention.

Dependabot groups npm, Docker and Actions version/security updates separately, with explicit version cooldowns. Security updates bypass cooldowns according to [GitHub's policy](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/). GitHub's current [ecosystem reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference) lists pnpm through version 10; verify pnpm 11 lockfile update support before relying on automatic lockfile PRs. Frozen-lockfile CI remains mandatory. Tool/image/action updates need reviewed inventory changes and a clean release rehearsal.
