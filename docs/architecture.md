# Architecture

[README](../README.md) · [Development](development.md)

only-tdy is a static React frontend. Tududi owns tasks, projects, tags, account timezone, authorization and persistence. only-tdy has no backend, database, migrations or telemetry. Server data is cached in memory; UI state holds drafts, selections and presentation choices.

## Ownership and dependency direction

| Area | Owns |
| --- | --- |
| `src/app/` | Shell, routing, providers, composition and reload recovery boundary. |
| `src/features/` | Task contracts, domain rules, components, state, queries, mutations and Tududi payload adapters. |
| `src/infra/` | Generic same-origin HTTP/session/CSRF transport and safe browser storage. |
| `src/shared/` | Reusable primitives with no feature owner. |
| `src/config/` | Base path, app identity and configuration. |
| `src/assets/` | Bundled fonts and other static assets. |

Dependencies flow from app to features, infrastructure, configuration and shared code. Features may use infrastructure, configuration and shared code; infrastructure may use configuration and shared code; configuration may use shared code. Shared code imports none of these areas; nothing imports app internals.

Use focused public APIs, including task page/provider entrypoints. Task-specific code and tests stay with their owner; production imports exclude fixtures. `src/app/architecture.test.ts` enforces direction, cycles, entrypoints and fixture isolation. `src/features/tasks/data/tududi-api.ts` adapts raw Tududi payloads.

## API authority

Tududi controls the API schema and guarantees. The task feature owns internal models and payload adaptation; generic transport has no task-model dependency. Update adapters and contract fixtures together, then verify a real backend before declaring support. Mocks verify client expectations only.

HTTP calls use same-origin `/api/`, session cookies and CSRF tokens for writes. Requests and body reads have a 15-second deadline; public errors hide task payloads. Tests inject dependencies and time. See [limitations](limitations.md) for unsupported server guarantees.

## Planning invariants

- Today includes planned, in-progress and waiting tasks; Backlog contains not-started tasks. Completed tasks require explicit reopening. Archived/cancelled tasks are excluded.
- Capture without `/today` normally enters Backlog; an already due date can move it to Today. Explicit saves apply date rules independently of list-sync promotion.
- Due/overdue Backlog promotion is opt-in and off by default. List sync scans due-ordered pages through the account's current day, then writes promotions. There is no polling or background worker.
- Moving or saving a task to Today clears Hide until. Changing an existing Today task's due date to a future date returns it to Backlog; clearing the date or leaving an unchanged future date retains its status. Hide until cannot exceed the due date.
- Dates use the account timezone from `/api/profile`. Relative tokens use calendar days; Hide until uses account midnight. Labels use day-month-year.
- The date-only editor omits unchanged due dates from PATCH. Changed nonempty dates carry the server's current due time; clearing a date clears its time. Reminders stay unchanged.
- Unfinished tasks sort by priority, then `#urgent`, then oldest creation; completed rows sink. Completed history uses newest completion first.
- Search submits one phrase, exact tag, resolved project or priority; unknown/ambiguous projects are refused. Typing narrows loaded rows; Today search stays local.

## Runtime and recovery

The PWA precaches the shell and bundled assets, including lazy screens and fonts; `/api/` stays network-only. The static server and worker resolve `/only-tdy/` navigation to the shell. No external font service is used.

Failed optimistic updates restore the prior view and retain editable drafts. Reloading loses drafts; server write outcomes may remain ambiguous. About compares the running identity with uncached `version.json`, offers Reload for a different build, shows check failures and records a one-time update notice. See [recovery](limitations.md#recovery) before reloading.
