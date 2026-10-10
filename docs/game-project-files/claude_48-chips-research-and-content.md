# 48: Research + content add-on: new chips (the accelerator venture and a mainstream generation) (design thread, 11 Oct 2026)

*(Paste everything below the line into a new chat in the "G2G" project. It runs in one go. The result is doc 49 plus data files under `claude/act5-content/chips/`.)*

---

## Your role and the goal

You are the research lead and content designer for **Garage to Gigawatt**, a grounded, finance-first business simulation (a bedroom bitcoin miner in 2009 to an energy and compute company in 2040). Acts I-IV are built; Act V ("Firm", 2036-2040) is designed (doc 43) and has its content pack (doc 47). The owner has added one feature: **new chips**. You do two things in one pass:
- **Part A, research:** ground the designed numbers in doc 43 §0.10 with sources.
- **Part B, content:** write the data and text for the feature, using Part A's corrected values.

Work in one go without asking questions. Record every choice the docs don't settle as an assumption.

## Read first

1. **Doc 43 §0.10** (`claude/claude_43-act-v-design.md`): the feature as designed. The rest of §0 for context (§0 overrides later sections).
2. **Doc 38 §5** (`claude/claude_38-energy-ventures-design.md`) and the venture format sample `claude/act4-formats/ventures.json`: how ventures work (calendar developer projects from 2027, stakes, cash calls in thirds, pay/dilute/walk, milestone marks, calibrated slips). The accelerator follows the same pattern.
3. **The GPU format sample** `claude/act4-formats/gpus_act3.json` and the Act V market files `claude/act5-content/market_v_v1..v4.csv` (doc 47): how generations, rack kW, density tiers, prices and rents are written.
4. **Doc 47** (`claude/claude_47-act-v-content-pack.md`), for tone and the provenance style.

## Rules (as docs 36, 40, 45)
- Grade every claim: [A] primary or official; [B] reputable reporting or company statement; [C] analyst or forecast; [D] inference or designed. Mark inference separately.
- Ranges with their basis; date every source (published and accessed); never invent a figure (say "not found" and give a labelled proxy).
- **Real company names are reference points only;** game text uses fictional names and generic generation names (no real product names after 2028).
- Every Part A answer ends with a correction table: **doc 43 §0.10's designed value | what the sources say | grade | recommended game value**, in game units.

## Part A: research questions

### Q1. How long does a new AI accelerator take, and how often does it slip?
From design start to tape-out, tape-out to first silicon, first silicon to volume, for AI-accelerator startups and hyperscalers' in-house chips (2016-2026). How often first silicon needs a respin, and what a respin costs in time and money. Recommend calendar dates for a developer starting in 2031 (doc 43 has design sent 2033, silicon 2034, volume 2036) and a respin chance and delay.

### Q2. What share of AI-chip startups reach volume, and what happens to the rest?
Startups founded 2015-2023: how many shipped in volume, were acquired (and at what value against money raised), pivoted or failed. Recommend P(volume by 2038Q4) for a 2031 start (doc 43's working target 0.35) and the shares of "cancelled", "acquired at a loss" and "built".

### Q3. Performance per watt between generations
Typical gains in performance per watt (training and inference) between successive mainstream data-centre GPU generations (2016-2026), and claimed vs measured gains of specialised accelerators against the mainstream GPU of their time. What efficiency trends are expected after 2030 (doc 40 §D2: gains slow from the mid-2030s). Recommend: the mainstream "Gen 2037" gain over the 2036 newest generation, and the accelerator's gain over Gen 2037 if it succeeds.

### Q4. Factory capacity and access
How access to leading-edge foundry capacity and advanced packaging constrains small chip makers (allocation, prepayments, minimum volumes). Recommend whether the game should add a "foundry allocation" risk to the venture (a slip or a volume cap) and its size.

### Q5. Money: development cost, funding rounds, customer prepayments
Typical total cost to reach volume for a leading-edge accelerator; funding round sizes and valuations by stage; examples of customers prepaying or reserving chip supply (structure, deposit size, discounts). Recommend the venture's budget, the stake prices, and the allocation reservation's deposit (doc 43: 10% of the reserved GPUs' price) and discount (10-15%).

### Q6. Chip-company economics after volume
Gross margin per unit and EV/EBITDA (or EV/revenue) for fabless chip companies at volume; what a newcomer's first-generation margin looks like. Recommend the developer's margin per unit and the chip-company multiple for the stake's value after volume.

### Q7. Does better efficiency reduce how much power the world needs?
Evidence on efficiency gains vs total data-centre power demand (rebound effects; IEA and others' efficiency cases). Recommend whether doc 43's "a successful chip trims the MW the world needs by up to 5% in V3 and V4" is reasonable, and its size.

## Part B: content (using Part A's recommended values)

Write these files in `claude/act5-content/chips/`:
1. **`venture_accelerator.json`:** the accelerator venture in the shape of `ventures.json` (id, pitch, budget, roles and menus, milestones with calendar dates, slip draw parameters, respin chance and delay, cancellation rule, cash calls, the allocation reservation's terms, value rules before and after volume, P(volume) target for calibration). Mark every value [A]/[B]/[C]/[D] in a provenance field.
2. **`gpus_v.json`:** two new generations in the shape of `gpus_act3.json`: the mainstream **Gen 2037** (every game) and the **accelerator's chip** (only if the venture succeeds): generic names, rack kW and density tier, GPUs per MW, unit and rack price, available-from rule.
3. **`market_v_chips_v1..v4.csv`:** new columns to merge into doc 47's market files, 2036Q1-2040Q4: hourly rents for Gen 2037 (hyperscaler, neocloud, spot, 1-year contract) and for the accelerator chip (blank until its volume quarter + 1, then filled; the engine shows it only if the venture succeeded), unit prices, and the developer's units shipped and margin per unit. Identical across futures through 2036Q4 (doc 43 V-B14); diverge only where a future's demand would move rents.
4. **Cards (3-4, in `events_chips.json`):** the developer's milestones as news (design sent, first silicon or a respin, volume or cancellation), and one card where a hyperscaler offers to buy the developer (a sale of the player's stake).
5. **Text (`text_chips.en.json`):** the venture dialog strings (pitch, roles, risks, the allocation reservation explained in plain words), the glossary entries (tape-out, first silicon, respin, foundry allocation, performance per watt), the quarter-report lines and two epilogue lines (the chip shipped; the chip never shipped).
6. **Names:** the developer's fictional name and the two generation names; run the name-clash check (search the exact name plus "chip", "semiconductor", "AI"; reject if a real company or product uses it) and report it.

## Output (doc 49)

`claude/claude_49-chips-research-and-content.md`:
1. A headline list: the corrections to doc 43 §0.10 most likely to change the feature.
2. Part A: Q1-Q7, each with its correction table.
3. Part B: the files listed above (complete), with a short note on each.
4. Assumptions ("mine, reversible"); name-clash results; open questions, numbered.
5. A sources table (title, publisher, URL, published, accessed, grade).
