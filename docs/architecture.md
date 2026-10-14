# Architecture

only-tdy is a static React frontend. Tududi is the authoritative owner of tasks, projects, tags, account timezone, authorization and persistence. only-tdy has no backend, database, migrations or telemetry. Server state is queried and cached in memory; local UI state holds drafts, selections and presentation choices.

## Ownership and dependency direction

| Area | Owns |
| --- | --- |
| `src/app/` | Shell, routing, providers, composition and reload recovery boundary. |
| `src/features/` | Task contracts, domain rules, components, state, queries, mutations and Tududi payload adapters. |
| `src/infra/` | Generic same-origin HTTP/session/CSRF transport and safe browser storage. |
| `src/shared/` | Reusable primitives with no feature owner. |
| `src/config/` | Base path, app identity and configuration. |
| `src/assets/` | Bundled fonts and other static assets. |

App composes features, infrastructure, shared code and configuration. Features may use infrastructure, configuration and shared code; infrastructure may use configuration and shared code. Configuration may use shared code. Shared code imports none of these areas, and nothing imports app internals. Cross-area imports use focused public APIs; task-specific code stays with tasks. Tests and fixtures live with their narrow owner and do not enter production imports. `src/app/architecture.test.ts` enforces import direction, cycles, feature entrypoints and fixture isolation. Task composition uses focused page/provider entrypoints; raw Tududi payloads are adapted through `src/features/tasks/data/tududi-api.ts`.

## API authority

Tududi owns the upstream API; only-tdy cannot change its schema or guarantees. The task feature owns its internal models and adapts raw API payloads at that boundary. Generic transport has no task-model dependency. Refresh adapters and contract fixtures together when upstream changes, then verify against an actual backend before declaring a supported version. Mock tests prove client expectations, not upstream compatibility.

HTTP calls remain under same-origin `/api/`, include the session cookie, and obtain a CSRF token for writes. Requests and response-body reads have a 15-second deadline and public errors avoid exposing task payloads. Dependency and time injection support tests at meaningful boundaries. See [limitations](limitations.md) for unsupported server guarantees.

## Planning invariants

- Today includes planned, in-progress and waiting tasks; Backlog contains not-started tasks. Completed tasks stay completed until explicitly reopened. Archived and cancelled tasks are outside this UI.
- Capture without `/today` normally enters Backlog; an already due date can move the newly saved task to Today. Explicit saves apply date rules independently of automatic list-sync promotion.
- Automatic promotion of existing due/overdue Backlog tasks is an opt-in preference, off by default. When enabled, existing list synchronization scans due-ordered pages through the account's current day and then writes promotions. There is no polling timer or background worker.
- Moving or saving a task to Today clears Hide until. Changing an existing Today task's due date to a future date returns it to Backlog; clearing the date or leaving an unchanged future date retains its status. Hide until cannot exceed the due date.
- Dates use the Tududi account timezone from `/api/profile`. Relative tokens use calendar days; Hide until is represented at account midnight. Date labels use day-month-year.
- Unfinished tasks sort by priority, then `#urgent`, then oldest creation; completed rows sink. Completed history uses newest completion first.
- Search submits one phrase, exact tag, resolved project, or priority. Unknown/ambiguous projects are refused rather than accidentally requesting an unfiltered list. Local typing narrows loaded rows; Today search stays local.

## Runtime and recovery

The PWA precaches the shell and bundled assets, including lazy screens; `/api/` remains network-only. Navigation below `/only-tdy/` resolves to the shell on the static server and service worker. The app uses bundled fonts and does not call external font services.

Optimistic updates recover their visible prior state on failure, while editable drafts remain available for correction or retry. Reload recovery loses in-memory drafts; backend write outcomes may still be ambiguous. About compares the running identity with uncached deployed `version.json`, offers Reload when different, shows a failed-check state, and records a one-time update notice. See [recovery and retention](limitations.md#recovery) before reloading unsaved work.
