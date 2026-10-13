# Project rules

Use the pinned mise tools and frozen pnpm lockfile. Run `mise run check` before handing off shipped changes; Docker and the pinned Playwright Chromium runtime are required. Use `MISE_TRUSTED_CONFIG_PATHS=$PWD/.mise.toml` for noninteractive mise calls without changing global trust.

Keep task behavior in `src/features/tasks/`, shell/composition in `src/app/`, platform transport/storage in `src/infra/`, and reusable primitives in `src/shared/`. Follow [architecture](docs/architecture.md). Preserve the refined UI, accessibility, planning invariants, draft recovery and neutral default settings. Use synthetic data and screenshots.

Keep operational/private overlays ignored. Never add credentials, private host paths or live task data. Update exact inventories under `release/` only after reviewing every added file; an inventory failure is not permission to regenerate blindly. Follow [contributing](CONTRIBUTING.md) and [security](SECURITY.md).

Product version belongs to `package.json`; release tags must match it. Rehearse releases from clean committed source. Never move published tags or replace immutable release assets. Do not publish, push or alter external services without explicit authorization. Commit messages explain the change; no signature or coauthor line is needed unless requested.
