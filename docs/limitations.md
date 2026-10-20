# Limitations and data handling

[README](../README.md) · [Deployment](deployment.md) · [Security](../SECURITY.md)

## Compatibility

only-tdy unofficially integrates Tududi's same-origin session, `/api/csrf-token`, `/api/profile`, task lists/CRUD, projects, tags and search. It has no backend and covers only part of Tududi's planning model. API shape, status, search or pagination changes can break it. Use the exact [Tududi 1.9.4 pin](deployment.md#tududi-backend-pin); other versions are unverified.

On 2026-10-20, the API adapter was checked against that image on Linux/amd64 with disposable SQLite and synthetic data. Coverage: session/CSRF, account timezone, task CRUD, Today/Backlog, dates/Hide until, projects, tags, search and All pagination over 51 matches, completion/history/reopening, promotion and due-time preservation across Amsterdam's daylight-saving transition. A separate profile API check verified `ui_settings.onlyTdy` read/write and preservation through profile and dedicated UI-settings saves. This verifies API behavior in that source revision, not previously published images. Existing-database upgrades, live browser/proxy integration and advanced Tududi features remain unverified. Seeded/mocked tests alone do not establish backend compatibility.

Set times and reminders in Tududi; only-tdy's editor is date-only. Unchanged dates keep their server value. A changed nonempty date carries the freshly read due time to the new day; clearing it also clears its time. Reminders stay unchanged, including after date changes. Concurrent edits can race between the read and PATCH.

Browser/visual checks cover Chromium on Linux: narrow layouts, keyboard use, themes, reduced motion and forced colors. Firefox, WebKit/Safari, real mobile devices and browser-specific PWA installation remain unverified; viewport tests do not establish device support.

## Lists and search

Today, Backlog and Completed are capped at 50 tasks. Filtering capped responses can hide matches; counts may exceed visible rows. All tasks and its searches read successive upstream pages without a transactionally consistent snapshot. Archived/cancelled tasks are excluded.

Search accepts one phrase, exact tag, project or priority, without combining filters or intersecting capped results. Typing narrows loaded rows; submitting queries Tududi on Backlog, All and Completed. Today searches displayed rows only. Projects require unambiguous names. Capture creates new projects separately; they can remain if task creation fails.

Automatic due promotion is on by default and can be disabled in Settings. It writes during list sync, without polling or background scheduling; it cannot guarantee midnight promotion while closed. Explicit capture/save still applies due-date rules. Relative dates and hiding use the account timezone, which may differ from your device's. Dated Backlog tasks remain visible by default; Settings can show them N days before due or on the due date. Explicit Hide until overrides that window. All always includes hidden tasks.

## Recovery

The integration has no revision preconditions or idempotency keys. Concurrent edits can overwrite one another; multi-task actions are not atomic. Optimistic rollback restores the view, not accepted server writes.

After a timeout or lost response, reconnect and inspect the task in either app before retrying a create, edit, move or delete. Blind retries can duplicate tasks or overwrite newer changes. A CSRF rejection can refresh the token and retry once; other retries are not guaranteed safe. Inspect individual tasks after partial batch success.

Failed task saves retain drafts. Capture text survives in-app navigation; editor drafts last only on their screen. Both are in memory and lost on reload or tab closure. Copy unsaved text before reload recovery or About's Reload action. Expired sessions may require signing in again. Task writes have no durable queue; pending preference changes persist in the browser when storage is available.

Preferences prefer Tududi's `ui_settings.onlyTdy`. A missing namespace is restored from the matching account's browser copy, or defaults. Failed requests use the cache without treating the namespace as missing. Preference writes merge pending fields into freshly read UI settings, but simultaneous writes or a stale Tududi profile form can still overwrite changes. Settings shows failures and retries on reconnect, focus or Retry sync. Without browser storage, unsynced changes last only for the session.

## Offline behavior and retention

After an online visit, the installed PWA can reopen its cached shell. The worker never caches API responses; fresh data and all writes require a connection. Loaded data can remain visible in the tab but does not persist as an offline task database.

| Browser state | Contents | Retention and clearing |
| --- | --- | --- |
| In-memory state | Tasks, projects, tags, account timezone, CSRF token, searches, selections and drafts. | Lost on reload/tab closure; editor drafts also end with their screen. |
| `localStorage` | Account-scoped preference copies and pending fields (`only-tdy:settings:v1:*`), last account and migration owner (`only-tdy:settings-account:v1`, `only-tdy:settings-migration:v1`), theme/editor/promotion mirrors (`only-tdy:theme`, `only-tdy:editor-layout:v1`, `only-tdy:auto-due-promotion:v1`), last seen revision (`only-tdy:seen-revision`). | No expiry; retained until changed/cleared. Browser settings contain preferences and an account UID, never tasks or credentials. |
| Tududi profile | Preferences in `ui_settings.onlyTdy`. | Retained with the account; Reset settings writes defaults to both copies. |
| Service-worker Cache Storage | Static shell, scripts, styles, icons and bundled fonts in the only-tdy namespace. | The worker updates/retires caches; remove its caches and registration to clear the offline shell. |
| Tududi session cookie | Tududi login session. | Tududi controls lifetime and sign-out. |

Reset preferences through Settings; removing browser keys alone reloads the account's saved preferences. Clear local app state by removing its `only-tdy:` keys, `/only-tdy/` worker registration and caches in browser site settings/developer tools. Uninstalling may leave site storage behind. Clearing the whole origin can sign you out of Tududi and erase other apps' data. Local clearing does not delete server tasks, preferences or backups; manage those through Tududi.

There is no analytics, telemetry or external runtime font request. Tasks, notes and related data use the same-origin Tududi API. only-tdy serves static assets and uncached build identity; operators manage proxy/server access logs. Tududi and its operator control task backups, retention and deletion.
