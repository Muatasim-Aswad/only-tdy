# only-tdy icons

Original repository artwork; no third-party icon library, template or asset needs attribution.

The mark enlarges a task row: a completion circle interrupts the focus rail beside a task. The ground uses the light-theme accent `#315E65`; marks use the light canvas `#F4F6F5`.

| File | Purpose |
| --- | --- |
| `only-tdy.svg` | Source mark with rounded ground; renders the `any` PNGs. |
| `only-tdy-maskable.svg` | Full-bleed variant; all marks inside the 80% safe circle. |
| `favicon.svg` | Tab mark: no rail and heavier strokes to stay legible at 16px. |
| `icon-192.png`, `icon-512.png` | Manifest icons, `purpose: any`. |
| `maskable-512.png` | Manifest icon, `purpose: maskable`. |
| `apple-touch-icon-180.png` | iOS home screen. |

Regenerate the PNGs after editing an SVG:

```sh
rsvg-convert -w 192 -h 192 public/icons/only-tdy.svg -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 public/icons/only-tdy.svg -o public/icons/icon-512.png
rsvg-convert -w 180 -h 180 public/icons/only-tdy.svg -o public/icons/apple-touch-icon-180.png
rsvg-convert -w 512 -h 512 public/icons/only-tdy-maskable.svg -o public/icons/maskable-512.png
```
