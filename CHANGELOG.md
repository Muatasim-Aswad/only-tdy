# Changelog

Notable changes follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. The version in `package.json` is authoritative.

## [0.1.0] - 2026-10-13

Initial release.

### Added

- A minimalist Today/Backlog daily flow with quick capture, contextual suggestions, projects, tags, priorities, notes and date shortcuts.
- Search within task lists, completed-task history, an All tasks view, and a compact task editor.
- Keyboard-accessible controls, system/light/dark themes, and an installable PWA shell.
- Explicit opt-in automatic due-task promotion, with a neutral default off.
- Same-origin Tududi session and CSRF integration, safe reload recovery, and deployed build identity checks in About.
- Portable verification and deterministic release rehearsal, with deployment, architecture, compatibility and security guides.

### Known limitations

- Real-backend version compatibility and non-Chromium/device coverage are unverified. Offline data writes, concurrent revision checks and idempotent write retries are unsupported; see [limitations](docs/limitations.md).
