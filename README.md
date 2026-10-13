# only-tdy

Capture tasks quickly, choose what matters today, and leave the rest in Backlog.

only-tdy makes organizing todos approachable through a minimalist, distraction-free daily flow. A quiet capture/search bar stays out of the way until you use it; suggestions and shortcuts reveal projects, tags, priorities and dates as you type. Pick tasks from Backlog, work through Today, and edit details without leaving that flow.

| At rest | In use |
| --- | --- |
| ![Today with an unobtrusive capture bar and synthetic tasks](docs/images/capture-at-rest.png) | ![The focused capture bar reveals its Add control](docs/images/capture-in-use.png) |

These screenshots use synthetic test fixtures. Focus reveals the capture control; typing also offers contextual suggestions. The in-app Guide explains the grammar.

## Try it locally

Install [mise](https://mise.jdx.dev), then:

```sh
git clone https://github.com/Muatasim-Aswad/only-tdy.git
cd only-tdy
mise install node@24.20.0 pnpm@11.24.0 gitleaks@8.30.1
mise exec -- pnpm install --frozen-lockfile
mise run dev:seeded
```

Open the `/only-tdy/` URL printed by the server. The seeded demo needs no Tududi installation: it uses synthetic data, supports edits, and forgets changes when the server stops. It is excluded from production builds.

## Use with your tasks

A current Tududi installation providing the expected `/api/` session, CSRF, profile, task, project, tag and search endpoints is required for real data. Serve only-tdy at `/only-tdy/` on the **same HTTPS origin** as Tududi and sign in through Tududi. Tududi owns your tasks and remains available as an optional fuller UI for complex planning. See [deployment](docs/deployment.md) and [API compatibility limits](docs/limitations.md#compatibility).

This is an unofficial integration, unaffiliated with Tududi. Upstream API changes may break it; use it in accordance with Tududi's license and applicable service terms. No real-backend version is currently verified.

- Capture `Call plumber +Home #errand !3 /today`; omit `/today` to leave an undated task in Backlog. A new project name can create a project.
- Use `/due:tomorrow` or `/hide:+3`, or edit dates and notes in the task editor.
- Switch the empty bar between capture and search. Search one phrase, tag, project or priority at a time.
- Automatic promotion of existing due tasks is an explicit opt-in setting, off by default.
- Install as a PWA where your browser supports it. The shell can reopen offline after a successful online visit; task loading and saving require a connection.

## Coverage and development

Verification covers Chromium on Linux, including narrow layouts, keyboard interaction, themes, reduced motion and forced colors. Firefox, WebKit/Safari, real mobile devices and their installation flows are unverified; viewport tests do not establish device support.

`mise run check` is the full local and CI gate: format, lint, types, unit tests, production build, bundle budget, browser/visual tests, container verification and export scans. `mise run release:rehearse` prepares verified deterministic assets without publishing. See [contributing](CONTRIBUTING.md) for browser setup and local hooks.

Read [architecture](docs/architecture.md) for ownership and planning rules, [limitations](docs/limitations.md) for data handling and recovery, [security](SECURITY.md) for vulnerability reporting, and [the changelog](CHANGELOG.md) for release changes. Ask questions in [Discussions](https://github.com/Muatasim-Aswad/only-tdy/discussions).

Licensed under [MIT](LICENSE). Bundled asset attribution is in [third-party notices](THIRD_PARTY_NOTICES.md).
