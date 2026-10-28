# Changelog

Notable changes follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. The version in `package.json` is authoritative.

## [0.2.0] - Unreleased

### Added

- Direct sign-in through Tududi, with same-account draft recovery and isolation between authenticated accounts.
- English and Arabic language selection, localized dates and task-entry commands, and right-to-left layouts.
- Contextual tips enabled by default, an optional guided tour, and account-synced progress and controls.
- An empty-account development mode for first-use walkthroughs.

### Changed

- Arabic copy uses natural phrasing, and translated messages live in focused catalogs with direct typed access.
- Settings group general and planning preferences; navigation and task actions provide clearer labels and feedback.
- Guided lessons distinguish commands, keyboard keys, and interface names, with visible spotlight outlines and arrows in both themes.

### Fixed

- Empty Arabic capture, search, and editor fields place the cursor on the right.

## [0.1.4] - 2026-10-21

### Fixed

- Static provenance uses digest/path records so generated chunk filenames and checksums are not mistaken for API keys; secret scanning remains mandatory.

## [0.1.3] - 2026-10-21

Source tag only: packaged publication stopped on a generated-provenance scanner false positive.

### Added

- Repeating page with Add/Search, recurrence editing, due occurrences in Today, read-only occurrence records and Skip in the editor footer.
- Settings page with synced preferences and configurable Backlog visibility for dated tasks.
- Typing focuses the current list input; Ctrl+/ (Cmd+/ on Mac) switches Add/Search while preserving separate drafts. Ctrl+Enter (Cmd+Enter on Mac) saves from any task-editor field.

### Fixed

- Task saves preserve Tududi due times, including when moving a deadline to another day; removing a deadline clears its time.
- Tag suggestions close when clicking or tapping outside the field; compact tag formatting still runs on blur.

### Changed

- Due tasks move from Backlog to Today during list sync by default; Settings can disable this and remembers that choice.
- The documented Tududi backend baseline is pinned to 1.9.4 by digest, with the verified API scope and deployment limits recorded.
- Future image releases use GHCR only; the verified CI container export is excluded from GitHub release downloads and their checksum manifest.
- Component styling uses Tailwind utilities and shared layout, field-row and button primitives, preserving the existing appearance and interaction states.

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
