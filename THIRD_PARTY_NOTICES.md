# Third-party notices

This file covers third-party assets committed directly to the repository. Build and runtime dependencies are declared in `package.json` and pinned in `pnpm-lock.yaml`; static and container artifacts include `DEPENDENCY_LICENSES.txt` for runtime packages and Workbox, `FONT_LICENSE.txt`, `LICENSE` and this notice; distribution tooling preserves their required license notices as well as this file and [LICENSE](LICENSE).

## Atkinson Hyperlegible Next

The locally bundled font is `src/assets/fonts/AtkinsonHyperlegibleNext-Variable.woff2`; no external font service is used at runtime.

| Field | Value |
| --- | --- |
| Upstream | https://github.com/googlefonts/atkinson-hyperlegible-next |
| Source file | `fonts/webfonts/AtkinsonHyperlegibleNext[wght].woff2` |
| Commit | `7925f50f649b3813257faf2f4c0b381011f434f1` |
| SHA-256 | `abde1ad5cf78b9ac575ef90d991f2e9101eb0b3b6668bde9a00e2e1e27d99afd` |
| License | SIL Open Font License 1.1 |
| License text | [src/assets/fonts/OFL.txt](src/assets/fonts/OFL.txt) |

Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors. The file is committed unmodified, with the full character set and a `200..800` weight axis; only-tdy uses `400`, `500` and `600`. When replacing it, refresh the source revision, hash and license together:

```sh
sha256sum src/assets/fonts/AtkinsonHyperlegibleNext-Variable.woff2
```

## Original artwork and screenshots

`public/icons/` contains original repository artwork under the repository license; see [the icon notes](public/icons/README.md). The screenshots in `docs/images/` are copies of synthetic visual-test baselines and contain no live account data.

The container archive also preserves the pinned nginx/Alpine image’s upstream copyright files under `/usr/share/licenses/` and package/license metadata in `/lib/apk/db/installed`. Static-only distribution contains no server binaries. The runtime base and its dependency sources are maintained by [nginx-unprivileged](https://github.com/nginx/docker-nginx-unprivileged) and [Alpine Linux](https://pkgs.alpinelinux.org/); image updates require reviewing those redistribution notices together with the runtime inventory.
