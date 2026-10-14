# only-tdy icons

Original artwork for this repository. No icon library, template, or third-party asset is involved, so nothing here needs a licence notice.

The mark is one task row from the interface, magnified: a completion circle sitting on the focus rail, the task beside it, and the rail breaking around the circle exactly as it does on screen. Ground `#315E65` is the light-theme accent; the marks are `#F4F6F5`, the light canvas.

| File | Purpose |
| --- | --- |
| `focus.svg` | Source mark, rounded ground. Renders the `any` PNGs. |
| `only-tdy-maskable.svg` | Full-bleed variant; all marks inside the 80% safe circle. |
| `favicon.svg` | Tab-sized mark. The rail segments are dropped and the remaining marks drawn heavier, because at 16px the full mark closes up. |
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
