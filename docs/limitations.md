# Limitations and data handling

## Compatibility

only-tdy is an unofficial Tududi integration. It expects same-origin session authentication, `/api/csrf-token`, `/api/profile`, task lists and task CRUD, projects, tags and search. It does not provide a backend or duplicate Tududi's full planning model. API shape, status, search or pagination changes can break it. Use the exact [Tududi 1.9.4 image pin](deployment.md#tududi-backend-pin); other versions are unverified.

On 2026-10-20, the current API adapter was checked against that image on Linux/amd64 with a disposable SQLite database and synthetic data. Checks covered session/CSRF, account timezone, task CRUD, Today/Backlog, dates and Hide until, projects, tags, search and All pagination over 51 matches, completion/history/reopening, opt-in due promotion and due-time preservation across an Amsterdam daylight-saving transition. This verifies current working source, not previously published images. This is API-level evidence; an existing-database upgrade, the browser/proxy combination against a live backend, and advanced Tududi features remain unverified. Seeded and mocked tests alone are not real-backend compatibility evidence.

The editor remains date-only. Set specific due times and reminders in Tududi. Saving an unchanged date leaves its server value untouched. Changing a nonempty date first reads the current due time and carries it to the new day; clearing the date also clears its time. Reminders are preserved separately and are not rescheduled when the date changes. Concurrent edits can still race between the read and PATCH.

Browser and visual checks cover Chromium on Linux. Firefox, WebKit/Safari, real mobile devices and browser-specific PWA installation remain unverified. A narrow viewport test is not a device test.

## Lists and search

Today, Backlog and Completed are capped at 50 tasks. Filtering after a capped API response may display fewer matches than exist on the server. Counts can exceed visible rows. All tasks and its searches read successive pages, subject to upstream pagination; they are not a transactionally consistent snapshot. Archived and cancelled tasks remain outside this UI. Hidden Backlog tasks are excluded from Backlog and its searches, but can appear in All tasks.

Search accepts one phrase, exact tag, project or priority at a time. It does not combine filters or silently intersect capped results. Typing narrows already loaded rows; submitting queries Tududi on Backlog, All and Completed. Today searches only its displayed rows. Project lookup requires an unambiguous name. A new project created during capture is a separate write and can remain if the following task creation fails.

Automatic due promotion is off by default. Enabling it allows API writes during normal list synchronization, with no polling or background scheduling; it does not guarantee promotion at midnight while the app is closed. Due dates on explicit capture/save still apply planning rules. Relative dates and hiding use account timezone, which can differ from your device timezone.

## Recovery

Tududi's API integration supplies no revision preconditions or idempotency keys. Concurrent edits can overwrite one another, and multi-task actions are not atomic. Optimistic rollback restores the browser view; it cannot undo a write the server already accepted.

A timeout or lost response can leave a write's outcome unknown. Reconnect and inspect the task in only-tdy or Tududi before retrying a create, edit, move or delete. Blind retries can create duplicates or overwrite newer changes. A CSRF rejection can refresh the token and retry once; this is not a general guarantee of safe retry. Partially successful batch actions need inspection of individual tasks.

Failed edits retain the current draft while the page remains open. Capture text stays in the task provider across navigation; editor drafts belong to their screen. Both are in memory and are lost on reload or closing the tab; editor drafts are also lost when leaving the editor. Copy unsaved text before using reload recovery or About's Reload action. Signing in again may be needed after session expiration. Requests and error recovery do not provide a durable write queue.

## Offline behavior and retention

An installed PWA can reopen its cached shell after a successful online visit. API responses are never service-worker cached; fresh task data and every write require a connection. Already loaded data may remain visible in the current tab, but is not a persisted offline task database.

| Browser state | Contents | Retention and clearing |
| --- | --- | --- |
| In-memory state | Loaded tasks, projects, tags, account timezone, CSRF token, searches, selections and unsaved drafts. | Discarded on reload or tab closure; editor draft lifetime also depends on its screen. |
| `localStorage` | Theme (`only-tdy:theme`), editor layout (`only-tdy:editor-layout:v1`), automatic due promotion (`only-tdy:auto-due-promotion:v1`, `on` enables it), and last seen revision (`only-tdy:seen-revision`). | No expiry; retained until changed or cleared. If storage is unavailable, the app remains usable but preferences may not survive reload. |
| Service-worker Cache Storage | Static shell, scripts, styles, icons and bundled fonts under the only-tdy cache namespace. | Updated/retired by the worker; remove only-tdy caches and its worker to clear the offline shell. |
| Tududi session cookie | Login session managed by Tududi. | Lifetime and sign-out belong to Tududi; only-tdy does not own it. |

To reset only-tdy, remove its `only-tdy:` preference keys and unregister its `/only-tdy/` service worker and caches in browser site settings/developer tools. Removing an installed app may leave site storage behind. Clearing all storage for the shared origin can also sign you out of Tududi and remove other applications' data. Local clearing does not delete server tasks or Tududi backups; manage those through Tududi.

There is no analytics or telemetry and no external runtime font request. Task names, notes and related data travel to the same-origin Tududi API. only-tdy serves static assets and an uncached build identity record; normal proxy/server access logs remain the operator's responsibility. Backups, retention and deletion of authoritative task data belong to Tududi and its operator.
