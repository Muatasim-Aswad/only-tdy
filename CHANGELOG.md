# Changelog

Notable changes follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. The version in `package.json` is authoritative.

## Unreleased

### Changed

- Future image releases use GHCR only; the verified CI container export is excluded from GitHub release downloads and their checksum manifest.

## [0.1.2] - 2026-10-14

### Added

- Public GHCR images published from the already verified Docker archive under version and full-commit tags.

### Changed

- One Compose file supports published images and plain Docker source builds; runtime instructions require no host build tools or release preparation.

## [0.1.1] - 2026-10-14

First packaged release.

### Fixed

- Container archives now use a fresh digest-pinned BuildKit instance, normalized context timestamps and direct Docker exports, producing identical bytes across independent builds.
- Downloaded container archives are compared against an independent build before loading; verification preserves any existing image.

## [0.1.0] - 2026-10-14

Initial source publication. No release assets were published for this tag.

### Added

- A minimalist Today/Backlog daily flow with quick capture, contextual suggestions, projects, tags, priorities, notes and date shortcuts.
- Search within task lists, completed-task history, an All tasks view, and a compact task editor.
- Keyboard-accessible controls, system/light/dark themes, and an installable PWA shell.
- Explicit opt-in automatic due-task promotion, with a neutral default off.
- Same-origin Tududi session and CSRF integration, safe reload recovery, and deployed build identity checks in About.
- Portable verification and deterministic release rehearsal, with deployment, architecture, compatibility and security guides.

### Known limitations

- Real-backend version compatibility and non-Chromium/device coverage are unverified. Offline data writes, concurrent revision checks and idempotent write retries are unsupported; see [limitations](docs/limitations.md).
