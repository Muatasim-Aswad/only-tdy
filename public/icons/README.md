# only-tdy icons

Original repository artwork; no third-party icon library, template or asset needs attribution.

The full brand mark pairs a completion circle and task stroke with two focus-rail segments. Use it for larger brand treatments, including the social preview. A simplified version omits the rail and thickens the shapes for app icons, sign-in and other small spaces. Both use the light-theme accent `#315E65` and light canvas `#F4F6F5`.

| File | Purpose |
| --- | --- |
| `only-tdy.svg` | Full brand mark for larger treatments. |
| `only-tdy-maskable.svg` | Simplified full-bleed mark; all shapes inside the 80% safe circle. |
| `favicon.svg` | Simplified mark for browser tabs, sign-in and the `any` PNGs. |
| `icon-192.png`, `icon-512.png` | Manifest icons, `purpose: any`. |
| `maskable-512.png` | Manifest icon, `purpose: maskable`. |
| `apple-touch-icon-180.png` | iOS home screen. |

Regenerate the PNGs after editing an SVG:

```sh
rsvg-convert -w 192 -h 192 public/icons/favicon.svg -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 public/icons/favicon.svg -o public/icons/icon-512.png
rsvg-convert -w 180 -h 180 public/icons/favicon.svg -o public/icons/apple-touch-icon-180.png
rsvg-convert -w 512 -h 512 public/icons/only-tdy-maskable.svg -o public/icons/maskable-512.png
```

The selected social preview is `docs/images/social-preview-stacked-selected.png`. GitHub uses an uploaded copy; website metadata references the repository-hosted image so self-hosted builds need no fixed public origin. The adjacent `social-preview-stacked-selected-new-logo.png` is the comparison variant, not the selected preview.
