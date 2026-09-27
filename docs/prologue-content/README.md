# Prologue content (Act 0)

Research pack for the prologue (doc 24 + Revisions 1–2), copied from the G2G project on 28 Sep 2026. The build spec is `docs/alpha-0.3-scope.md`; the design is `docs/game-project-files/claude_23-prologue-design.md`.

Build rules:
- `market_weekly_prologue.csv` is the prologue market. Replace its `eth_hashrate_THs` and `eth_rev_usd_mh_day` columns from `eth_network_weekly_prologue.csv` (Etherscan-based): `eth_rev_usd_mh_day = eth_rev_usd_mh_day_per_usd × eth_usd`. Weeks before the ETH file's first row have no ETH.
- The CSVs have Windows line endings (CRLF); parse accordingly.
- Revision 2's design flag #8 (early ETH rig) is withdrawn; `gpu_eth_2015` stays available from 2015Q3.
- Pre-orders: late = loss (owner decision); keep the 45/35/15/5 split.
- CPU-era mining is literal (P0-13); do not cap it.
- The known seams with Act I's first week (BTC difficulty 0.337T → 0.312T; ETH hashrate) are accepted.
