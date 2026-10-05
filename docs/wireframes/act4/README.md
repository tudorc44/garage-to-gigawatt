# Act IV screens: layout notes (no wireframes)

No Act IV wireframes exist (`docs/act4-scope.md` §3). Each doc 33 §17 screen is built by extending the nearest built
screen with the design-system tokens and components (`docs/design-system/`). This file records the layout of each, as
it is built. All screens: desktop from 1024 px, no sideways page scroll, nothing cut off; Act IV's screens load as their
own lazy chunk(s).

## Era theme

`[data-theme='orbit']` in `src/ui/styles/tokens.css` (M27.6): a light theme in the paper-ledger family (owner default
13, not doc 33 §2's dark paper): cool white paper `#eef1f1`, deep navy ink `#131c2c`, teal accent `#1d5d73`; the
gain/loss/warn colours are unchanged. Applied by `themeOf` in `app.tsx` to every Act IV screen.

## A4-01 Act IV intro (M27.6, `screens/Act4Entry.tsx` › `Act4Intro`)

The Act III intro's layout (A3-01), unchanged in structure: the end-card chapter panel with the label ("Act IV ·
2031–2035"), the title ("The Race to Orbit"), a one-paragraph lead; a box "What you carry in" (the `act4Entry` table:
valuation, founder net worth, cash, debt, energized MW, contracted MW, rating, with the scoring note); a box "Three
theatres, one balance sheet" (Ground, Orbit, Moon, one line each); the foot ("20 quarters, 2031Q1 to 2035Q4") and
"Enter 2031 →".

## Act IV chapter report (M27.6 stub, `screens/Act4Entry.tsx` › `Act4Chapter`; M32 builds A4-11 and A4-12)

The end-card chapter panel: label, title ("2035: the race is run", or "Out of the race" after a game over), a short table
(last quarter, founder net worth, growth since 2031) and "Back to the title screen". It shows nothing of the future.

## "Continue to Act IV" (M27.6, `screens/Act3Reveal.tsx`)

The Act III chapter report's last row: for a company that survived Act III, "Back to the title screen" (secondary) and
"Continue to Act IV" (primary, `data-continue-act4`) replace "The story continues in a future update." + "Continue".

## Test builds only: "Act IV preview (test build)" (M27.6, `screens/Act4Preview.tsx`)

A start card under Act III's quick start on the title screen, the same shape: a ghost button that opens three company
rows (name, one-line note, "Go"), each playing a bot from 2017 through Act III, then the Act IV intro. The top bar shows
"Future forced (test)" when `?future=` forced the future.

## Screens shared with Act III, shown in Act IV (M27.6)

Renewals due (Plan), the Contracts and Government nav sections, Racks and idle rigs (Sites & Fleet), the covenant and
standby panels (Capital), political capital (top bar) and the report's "Contracts and events this quarter" block. The
Plan screen's right column (Act III's Signals panel) is empty in Act IV until M28 adds Act IV's Signals; Read the market
stays hidden (Signals replace it).

## A4-03 Orbit board, A4-04, A4-05, A4-08 (M29.5, `screens/Act4Panels.tsx` › `OrbitSection`, nav "Orbit")

One column of panels (the Contracts section's `section single` layout), top to bottom:
- **Orbit**: a lead line (blocks live and under way, the space multiple, a hard insurance market if any) and the
  "Open a block" row: four selects (kind, size, shell, available generation) and the primary button (0 Bandwidth).
- **Launch exposure** (A4-02), when any launch's uninsured value is over 15% of equity (also on the Plan screen, under
  Renewals due): one warning line per launch with the cash left after its launch bill, and a one-line hint.
- **One deal card per block (A4-05)**, planning and under way first, then live: title (number, size, kind, shell,
  generation) and a stage tag; mass and the design life (never the true life). In planning, three dashed slot boxes
  side by side: Launch (provider × quarter select, the deposit, Book with a Bandwidth pip; or the booking, with Give
  up), Tenant (this quarter's offers: name, workload, price, term, prepayment, Sign; or Sell on spot), Capital (the build
  cost, Pay from cash with a pip, licence room). After that a progress line (built, launch, live, capex spent,
  capacity). Then insurance (cover and until when, or "Not insured", and the quote button) with the block's exposure
  line, and for live blocks the fleet telemetry line (the last four readings, the average, the 8% everyone planned on,
  GPU health and spares for clouds, last quarter's EBITDA). Drop the block (planning) or Sell (live, 1 Bandwidth).
- **Launch manifest (A4-04)**: a table, this quarter to 6 ahead: third-party slots (t), booked by you (t), your launches.
- **Licences and registry (A4-08)**: the filing terms in one line; a table per shell (licensed, in use, pending, File
  with a pip, Fast-track); the two registry states with their terms, Current or Choose.
- **Links to the ground**: units now and next quarter against what live interactive work needs; − / + rented units;
  a ground-station line and one Build button per site.
- **Gone**: deorbited and sold blocks, one muted line.

## The orbit alerts (M29.5, `screens/Live.tsx` › `OrbitAlertCard`)

The spot alert's card shape: eyebrow (quarter, week) and alert count, the orbit icon, title, a one-line body naming the
block (conjunction) or the fleet (storm), two choice buttons with the default marked.
