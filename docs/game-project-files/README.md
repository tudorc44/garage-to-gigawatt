# docs/game-project-files: the design project's snapshot

Reference copies of the design project's documents and content packs, kept as the design thread wrote them. Read
them; don't edit them. Where a corrected copy exists elsewhere in the repo, the corrected copy is the one that counts.

## The Act II market CSVs here are superseded (v1)

`claude_act2-content_market_weekly.csv` and `claude_act2-content_market_quarterly.csv` are the content pack's original
**v1** files. **The build does not load them.**

- The build loads the corrected **v2** files: `src/content/market_weekly_act2.csv` and
  `src/content/market_quarterly_act2.csv`, byte-identical to `docs/act2-content/market_weekly.csv` and
  `docs/act2-content/market_quarterly.csv` (`tests/content.test.ts` checks both pairs; the game imports the JSON
  generated from them by `npm run content:market`).
- What changed from v1 to v2, and why: the fix log in `docs/act2-content/README.md` ("market_weekly.csv /
  market_quarterly.csv: fixes of 27 Sep 2026", the owner decisions above it, and the M22 real SOFR and high-yield
  spread section). The column-by-column diff of v1 against v2 is in `docs/dev-notes.md` › Milestone M25 › M25.2.

The other `claude_act2-content_*` files are also the pack's originals; `docs/act2-content/` holds the corrected copies
of those that changed (see its README).
