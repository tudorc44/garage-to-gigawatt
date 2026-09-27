# 15: Design System (Phase 1, steps 6–7): decisions and where it lives

*Updated 26 Sep 2026*

- **Direction chosen:** B · Engineer's ledger for the game UI, with A's density for tables and numbers (DM Mono, tabular figures, right-aligned). Logo and store art borrowed from C (Barlow Condensed 800, black and safety yellow, hazard stripe), used for marketing and the title screen only.
- **Where it lives:**
  - The Design System artifact "Garage to Gigawatt": https://claude.ai/artifact/Dpe6457JUTj3z71zV1R9aa
  - The three explored directions: https://claude.ai/artifact/531DcwAP5opCnwTjbiUZjj
  - The wireframes: https://claude.ai/artifact/FsqxUeQtHZESBTh1fQePZq
- **Eras are themes:** `garage` (2017–19, default), `industrial` (2020–22), `campus` (Act II preview). They are set with `data-theme` on the game root.
- **Colour-blind choice:** gain is teal-blue (#15646F), loss is brick red (#A8361A), and every delta also carries ▲▼ or +/−. Heat ≥70 and LTV ≥70% are hatched.
- **Fonts (all OFL):** Fraunces, Public Sans, DM Mono, Caveat (tape notes), Barlow Condensed (logo only).
- **Icons (step 7):** 61 line icons with an `<Icon name>` component that follows each era's ink. Weakest drawings: bid, ipo, and eth (a diamond close to Ethereum's symbol; "Ξ" is the safer alternative).
- **Logo and title kit (step 7):**
  - Logo lockups: stacked, horizontal, reversed, one-colour, with minimum sizes and clear space.
  - **Mark:** a squared G with a bolt cut out of its stem, chosen over "G2G" and "pylon" because it's the only one that reads at 16px.
  - App icons: 16/32/48/180/192/512 and a maskable 512, in the Logos asset group.
  - Steam templates: header 920×430, small 462×174, main 1232×706, vertical 748×896, library 600×900, hero 3840×1240, library logo 1280×720; plus an itch.io cover 630×500.
  - The title screen in both Act I eras.
- **Steam rule applied:** capsules carry only the logo and art (the tagline was removed).
- **Open:**
  1. The name check (prompt 2A in doc 16) hasn't been run yet. Run it before paying for any art.
  2. PNG exports need the repo: Playwright plus self-hosted Barlow Condensed, since the sandbox can't download fonts.
- **Next:**
  1. The sound bank (doc 16, prompt 3).
  2. Phase 0, step 4: repo setup.
  3. Copy `tokens.css` and `bundle.css` into `src/ui/styles/`, and port `G2G.fmt` to `src/ui/format.ts`.
