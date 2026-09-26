# Icon

One of the system's 61 line icons, drawn inline so it takes the current era's `ink` through `currentColor`.

- **Props:** `name` (see `G2G.iconNames`), `size` (20 by default; 16 only in dense tables), `label` (give one when the icon stands alone; without it the icon is decorative and hidden from screen readers), `className`.
- Always pair an icon with a word, except for icon-only buttons (close, pause, settings). Those need an `aria-label` on the button.
- Colour it by setting `color` on the parent: `ink` by default, `ink-muted` in nav, `loss` or `warn` only on alert rows. Never fill icons.
- The same drawings are in the Icons asset group as SVG files (ink #1E2A44) for places where an inline component can't go.
