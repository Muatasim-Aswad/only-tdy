# Contributing

Keep the daily flow small: quick capture, deliberate Today/Backlog planning and accessible editing. Discuss broader features before building them. Use [Discussions](https://github.com/Muatasim-Aswad/only-tdy/discussions) for questions and [Security](SECURITY.md) for vulnerabilities.

## Setup and checks

Fork and clone, then follow [development setup](docs/development.md#setup-and-checks) for the pinned tools, hooks and local/CI gate. Run `mise run check` before submitting; Docker and the pinned browser runtime are required.

## Pull requests

Send a focused pull request from your fork. Describe behavior changes, tests, privacy implications, and compatibility/migration effects; mark inapplicable items. Add meaningful regression coverage, use synthetic fixtures/screenshots, and review baseline changes. Remove real task data, cookies, tokens and private host details from examples and logs.

Follow [architecture](docs/architecture.md): keep domain logic with its feature and use focused public APIs. Add dependencies or scope only for a concrete need. Commit messages should explain the change; Conventional Commits are optional. Contributions use the repository's [MIT license](LICENSE).
