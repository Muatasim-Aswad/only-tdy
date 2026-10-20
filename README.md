# only-tdy

Capture tasks quickly, choose what matters today, and leave the rest in Backlog.

only-tdy makes organizing todos approachable through a minimalist, distraction-free daily flow. Pick tasks from Backlog, work through Today, and edit details without leaving that flow.

<p>
  <img width="280" src="docs/images/today-at-rest.png" alt="Today at rest with an unobtrusive capture bar and a completed task">
  <img width="280" src="docs/images/task-editor.png" alt="Edit a task in the normal form, with title, project, tags, status, priority, due date and Hide until">
</p>

## See it in action

The unobtrusive bar stays quiet until you focus it. The same field supports quick task entry and search, with grammar and auto-completion for projects, tags, priorities and dates. The in-app Guide explains the grammar.

Add a task to Backlog quickly using the parser and auto-completion for a project, priority, due date and tag.

<img src="docs/images/capture-add.gif" alt="Add a task using project, priority, due date and tag suggestions, then find it in Backlog" width="280">

Filter Backlog by tag, select tasks across priorities, move them to Today, then search for a moved task.

<img src="docs/images/backlog-move.gif" alt="Search Backlog by tag, select tasks with different priorities, move them to Today, and search for a moved task" width="280">

Try `Call plumber +Renovation #repairs !3 /today`; omit `/today` to leave an undated task in Backlog. Use `/due:tomorrow` or `/hide:+3` for dates, or edit dates and notes in the task editor. A new project name can create a project. Switch the empty bar between capture and search; search one phrase, tag, project or priority at a time.

## Features

- **Quick capture.** Add tasks with projects, tags, priorities, notes and dates, using inline shortcuts and auto-completion.
- **Today and Backlog.** Choose tasks individually or together for Today. Due and overdue tasks move there automatically during sync unless you disable that setting.
- **Backlog visibility.** Hide tasks until a chosen day or show dated tasks only near their due date. Always visible in All page.
- **Search and history.** Search titles and notes, filter by tag, project or priority, and review or reopen completed tasks.
- **Flexible editing.** Update task details in normal or compact forms, with system, light and dark themes and keyboard-accessible controls.

## Try it locally

Install [mise](https://mise.jdx.dev), then:

```sh
git clone https://github.com/Muatasim-Aswad/only-tdy.git
cd only-tdy
mise install
mise exec -- pnpm install --frozen-lockfile
mise run dev:seeded
```

Open the printed `/only-tdy/` URL. The seeded demo uses editable synthetic data, needs no Tududi installation, and forgets changes when stopped. Production builds exclude it.

## Deploy

Requires [Tududi 1.9.4](docs/deployment.md#tududi-backend-pin) as its backend. Serve only-tdy at `/only-tdy/` on the **same HTTPS origin** as Tududi and sign in through Tududi, which owns your tasks and provides fuller planning tools. The same Compose file supports the [published image](docs/deployment.md#published-image), [source builds](docs/deployment.md#build-from-source) and optional [srvr management](docs/deployment.md#deploy-with-srvr).

The current source's core API flow is verified against the pin; your HTTPS deployment still needs smoke checks.

Install as a PWA where supported. After an online visit, the shell can reopen offline; loading and saving tasks require a connection.

## Documentation

| I want to… | Read |
| --- | --- |
| Deploy, update or remove only-tdy | [Deployment](docs/deployment.md) |
| Develop or contribute | [Development](docs/development.md) · [Contributing](CONTRIBUTING.md) |
| Understand code ownership and task rules | [Architecture](docs/architecture.md) |
| Check support, data handling or recovery | [Limitations](docs/limitations.md) · [Security](SECURITY.md) |
| Prepare a release or read changes | [Releases](docs/releases.md) · [Changelog](CHANGELOG.md) |

Ask questions in [Discussions](https://github.com/Muatasim-Aswad/only-tdy/discussions); report vulnerabilities through [Security](SECURITY.md).

Licensed under [MIT](LICENSE). Bundled asset attribution is in [third-party notices](THIRD_PARTY_NOTICES.md).
