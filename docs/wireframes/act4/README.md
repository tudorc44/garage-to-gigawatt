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
