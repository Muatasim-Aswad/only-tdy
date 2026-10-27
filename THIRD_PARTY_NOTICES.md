# Third-party notices

This file covers committed third-party assets. `package.json` and `pnpm-lock.yaml` declare and pin build/runtime dependencies. Static and container artifacts preserve `DEPENDENCY_LICENSES.txt` (runtime packages and Workbox), `FONT_LICENSE.txt`, [LICENSE](LICENSE) and this notice.

## Atkinson Hyperlegible Next

The bundled font is `src/assets/fonts/AtkinsonHyperlegibleNext-Variable.woff2`; runtime uses no external font service.

| Field | Value |
| --- | --- |
| Upstream | https://github.com/googlefonts/atkinson-hyperlegible-next |
| Source file | `fonts/webfonts/AtkinsonHyperlegibleNext[wght].woff2` |
| Commit | `7925f50f649b3813257faf2f4c0b381011f434f1` |
| SHA-256 | `abde1ad5cf78b9ac575ef90d991f2e9101eb0b3b6668bde9a00e2e1e27d99afd` |
| License | SIL Open Font License 1.1 |
| License text | [src/assets/fonts/OFL.txt](src/assets/fonts/OFL.txt) |

Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors. The unmodified file includes the full character set and `200..800` weight axis; only-tdy uses `400`, `500` and `600`. Replace its source revision, hash and license together:

```sh
sha256sum src/assets/fonts/AtkinsonHyperlegibleNext-Variable.woff2
```

## Noto Sans Arabic

`src/assets/fonts/NotoSansArabic-Variable.woff2` is the unmodified Arabic weight-variable subset from [Fontsource’s Noto Sans Arabic 5.3.0 package](https://registry.npmjs.org/@fontsource-variable/noto-sans-arabic/-/noto-sans-arabic-5.3.0.tgz), file `files/noto-sans-arabic-arabic-wght-normal.woff2`. Upstream: [Noto Arabic](https://github.com/notofonts/arabic). SHA-256: `ce85091f020920b65762b387b194ef59457ea5b25b760f2dcc35240a94bb8669`. Copyright 2022 The Noto Project Authors; SIL Open Font License 1.1, preserved in [OFL-NotoSansArabic.txt](src/assets/fonts/OFL-NotoSansArabic.txt) and combined into distributed `FONT_LICENSE.txt`. Atkinson continues to supply Latin glyphs; no external font service is used.

React Joyride and its runtime dependencies use MIT or ISC licenses, preserved in distributed `DEPENDENCY_LICENSES.txt`. The tour renderer loads after sign-in.

## Original artwork and screenshots

`public/icons/` contains original artwork under the repository license; see [icon notes](public/icons/README.md). Images in `docs/images/` use synthetic data, including visual-test baselines; none contain live account data.

The container archive preserves nginx/Alpine copyright files in `/usr/share/licenses/` and package/license metadata in `/lib/apk/db/installed`. Static-only distributions contain no server binaries. [nginx-unprivileged](https://github.com/nginx/docker-nginx-unprivileged) and [Alpine Linux](https://pkgs.alpinelinux.org/) maintain the runtime base and dependency sources; review redistribution notices and the runtime inventory when updating images.
