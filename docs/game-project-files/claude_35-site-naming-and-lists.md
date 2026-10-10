# 35: Telling sites apart, and screens that list many sites (design thread, 9 Oct 2026)

Presentation only: no game-rule changes. Works from 1024 px; no sideways page scroll; all text through the string table; design-system components and tokens only. (DT) = design thread's call, the owner can overrule.

## 1. Naming rule

- **Short name** = type label + serial: "Own site 3", "Warehouse 2", "Texas site 1". For Act II scouted sites, the type label is the category: "Powered shell 2", "Distressed miner 1", "Greenfield 4". The garage is just "Garage", since there's only ever one. Max ~18 characters; this is the button and log form.
- **Long name** = short name · region · energized MW: "Own site 3 · Georgia · 20 MW". Dialogs, the site card and tooltips use it.
- **Serial:** a new stored field site.serial, assigned at acquisition as 1 + the highest serial ever given to that type label in this career (a per-type counter, state.siteSerials[label]). It never changes. A left, sold or foreclosed site retires its number: the next one gets a new number, so "Own site 3" always means the same place in logs and reports.
- **Old saves (migration):** at load, sites without a serial get one per type label in acquisition order (1, 2, 3 …), and the counter is set to the highest. Sites left before the migration can't be recovered, so numbering starts fresh. That's acceptable.
- **No renaming in this pass** (§6).
- Strings: `site.name.short` = "{type} {n}", `site.name.garage` = "Garage", `site.name.long` = "{short} · {region} · {mw} MW". The type labels already exist; the category labels get a short form (`site.type.powered_shell` = "Powered shell", etc.).

## 2. Where each form appears, and what sits beside it

- **Short name:** buttons, to-do rows, log lines, Live alerts, quarter report lines, the League, table cells.
- **Long name:** dialog titles ("Leave Own site 3 · Georgia · 20 MW?"), the site card header, tooltips on any short name.
- **Beside the name, in pickers and lists only** (as small tokens after the name, in DM Mono):
  - free MW ("4 MW free");
  - a Heat chip when Heat ≥ 30, using the existing heat colours and the hatch at ≥ 70 ("Heat 42");
  - a flag icon for a due power renewal or a flaw.
  - Nothing else; the rest lives on the site card.
- **Every short name is a link** that opens the site card (§4).

## 3. Patterns for many sites (one pattern each)

**A. One action, many possible sites → one button + the site picker.** One button ("Build a ground station…", "Leave a site…", "Buy machines…"). It opens the site picker, a dialog with one table:

| Column | Content |
|---|---|
| Site | short name (link) |
| Region | region |
| Free | free MW |
| Heat | value (chip if ≥ 30) |
| Action fact | the one number that matters for this action (station cost, leave penalty, renewal price, mitigation cost …) |
| (button) | the action, or a greyed reason ("No free power", "Already has a station") |

- Eligible sites first, ineligible ones below them, greyed with their reason.
- Sort by any column (default: the action fact's natural order, e.g. cheapest first).
- A filter box above the table appears once there are more than 8 rows.
- One component (SitePicker) with props: rows, action column, eligibility function, default sort. It's used by every per-site action.

**B. Per-site to-do rows → one grouped row per action kind.**
- With 1 site: a single row naming it ("Leave Own site 3 · free · −$0 penalty").
- With 2+ sites: one row "Leave a site · 10 sites eligible ›", which opens the SitePicker filtered to them.
- The same applies to power renewals ("Power renewal due · 3 sites ›", with the earliest due quarter shown), transformer upgrades, noise mitigation, talk to the neighbours and hosting.
- Order within the to-do list is unchanged.

**C. Long site lists (Fleet & Sites, New project) → group, sort, filter.**
- Group by type label, each group with a header: "Own site · 12 · 240 MW · 31 MW free".
- Groups with ≤ 3 sites open by default; larger groups start folded and show their header summary. Folding is remembered per screen for the session.
- Sort within groups: acquired (default), free MW, Heat, region.
- Filter chips above the list: "Has free power", "Heat ≥ 30", "Renewal due", "Has projects". The chips combine.
- The New project dialog keeps its sort by free power, applied within groups, and its "small ones folded".

## 4. Site card

Yes: one site card for all acts. It opens from any site link, as a side drawer at ≥ 1280 px and a dialog below that. It shows:
- **Header:** the long name, type, acquired quarter.
- **Power:** capacity, energized and free kW; power price and contract (renewal due quarter); region.
- **Uses:** machines (count and model mix), hosting, projects (name, kind, stage, tenant), ground station (Act IV).
- **Money:** rent, leave penalty.
- **Heat:** value with the M21.2 breakdown, and flaws.
- **Actions available for this site:** the same actions as patterns A/B, each going straight to its own confirm. This gives every per-site action a second, site-first route.

## 5. Wireframe notes (1024 px, 15+ sites)

**Orbit board, "Links to the ground"**
```
Links to the ground                          3 stations · 16 sites
Own site 3 · Georgia     station ✓  Heat 22
Own site 7 · ERCOT       station ✓
Texas site 1 · ERCOT     station ✓  Heat 41
[ Build a ground station… ]   cheapest: $12.0M at Own site 9
```
- Existing stations are listed as rows; the 16 per-site buttons are replaced by one button that opens the SitePicker.
- Action fact: station cost. Greyed reasons: "Already has a station", "No free power".

**Plan to-do, site actions**
```
□ Leave a site · 10 sites eligible            ›
□ Power renewal due · 3 sites · first 2031Q2  ›
□ Talk to the neighbours · 4 sites at Heat ≥ 30 · 1 BW each ›
□ Upgrade the transformer at Own site 5 · $2.1M
```
- Grouped rows (pattern B); a single site is named inline.

**Fleet & Sites**
```
[Has free power] [Heat ≥ 30] [Renewal due] [Has projects]   Sort: Acquired ▾
▾ Own site · 12 · 240 MW · 31 MW free
   Own site 1 · Georgia   20 MW · 0 free   mining      Heat 18
   Own site 3 · Georgia   20 MW · 4 free   AI shell    Heat 42
   …
▸ Warehouse · 4 · 4 MW · 1 MW free
▸ Texas site · 2 · 200 MW · 12 MW free
```
- Grouped (pattern C).
- Row columns: short name · region | MW · free | main use | Heat chip (≥ 30) | flag icons. They fit 1024 px; long names truncate with a tooltip, numbers never truncate.

## 6. Out of scope, and build order

**Out of scope (defer):**
- player renaming (a later add: site.customName overriding the short name);
- a map view;
- bulk actions (leave or renew several sites at once);
- site icons or illustrations;
- per-site colours.

**Build order (smallest useful first):**
1. Naming: the serial field, migration, short and long name helpers, and every screen switched to them, with links. This alone fixes "16 identical buttons" in meaning.
2. The SitePicker plus pattern B (grouped to-do rows), applied to the Orbit links panel, Leave a site, power renewals and the other per-site to-dos.
3. The site card.
4. Fleet & Sites and New project grouping, sort and filter chips.

**Tests:**
- serial assignment and retirement (a left site's number is never reused);
- migration of an old save (serials by acquisition order, per type);
- unique short names across a 20-site fixture;
- the SitePicker's eligible-first sort and greyed reasons;
- a grouped to-do row with one site versus many;
- the Fleet & Sites grouping;
- a browser check at 1024 and 1440 px with a 20-site save.
