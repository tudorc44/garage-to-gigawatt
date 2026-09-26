# EventCard

A Reigns-style decision card for scripted events and live-quarter interrupts: an illustration, a title, a body of at most 60 words, and 2–3 choices.

- **Props:** `eyebrow` (date · week · site), `stamp` (optional tape label), `illustration` (an image element or placeholder text), `title`, `body`, `choices`: `{ label, effect, isDefault }[]`, `source` (the real-world basis, one line).
- The default choice (used if the player skips) is filled `ink` and tagged "Default". There is exactly one.
- Each effect line is written as formatted numbers: "+$6.3M · offline 1 week · Heat −5". Say what happens, not whether it's good.
- Show the card on a `scrim` over the paused screen, with `shadow-card`.
