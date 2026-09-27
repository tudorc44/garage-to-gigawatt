# MachineCard

A 240×160 line drawing of one machine class on the era's paper, with a caption strip for the model name and era. Used on the buy dialog, pre-order and group-buy cards, and failure pop-ups, across the whole campaign.

- **Props:** `name` (see `G2G.machineNames`), `caption` (the model or class name shown in the strip, e.g. "Gaming GPU · 2010"), `era` (optional right-hand figure in the strip, e.g. "2010" or "Act II"), `compact` (drawing only at 120px wide, no border or strip, for tight rows), `className`.
- The drawing uses `currentColor` for its ink and `panel-sunk` for its one flat tint, and sits on `paper` with the `paper-grid` at the era's `grid-pitch`. It re-colours with every era theme: nothing in it is hard-coded.
- The caption is text, never part of the drawing. The drawing itself carries no labels, model numbers, logos or maker marks.
- **No real products.** Each drawing is a machine class (a 2010 dual-slot card, a 2016-class long ASIC chassis), not a copy of any brand's case, fan layout or shroud. If a drawing starts to read as a specific product, change its proportions before shipping.
- Hidden edges are drawn dashed, like an engineer's sketch; the dashed baseline under each machine is the ground line.
- The same drawings are in the Machines asset group as SVG files (ink #1E2A44, tint #EDE5CF) for places where an inline component can't go.
