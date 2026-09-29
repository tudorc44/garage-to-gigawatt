# Act III renewal worked examples

All numbers computed from `market_sX.csv` at the renewal quarter. Base shell rent = $1.5M/MW-yr at 2027Q1 (designed, flag F-5); H100 1yr base $2.28/GPU-hr (Act II 2026Q4). Index = renewal_shell_index_low..high; GPU index = renewal_h100_gpu_index_vs_2025q4.


## S0 Muddle Through (trigger 2028Q2)

**1. Anchor neocloud master lease, 50 MW, shell at 2028Q3.** Old rent $75M/yr. Offer band 0.72-0.80 -> $54-60M/yr (delta $-21 to $-15M). Offered term 7.0 yrs. Quarterly default prob 0.003; walk prob at renewal 0.06. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.69-0.85).

**2. Hyperscaler lease, 100 MW, shell at 2028Q4.** Old rent $150M/yr. Offer band 0.71-0.80 -> $106-120M/yr (delta $-44 to $-30M). Offered term 7.0 yrs. Quarterly default prob 0.0005; walk prob at renewal 0.03. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.68-0.84).

**3. H100 GPU contract, 8,000 GPUs at 2028Q3.** 1yr H100 rate $1.66/hr vs $2.28 base; annual revenue $159.8M -> $116.3M (-27%). GPU renewal index vs 2025Q4 = 0.85. Offered term 2.0 yrs.


## S1 Great Repricing (trigger 2028Q1)

**1. Anchor neocloud master lease, 50 MW, shell at 2028Q2.** Old rent $75M/yr. Offer band 0.52-0.60 -> $39-45M/yr (delta $-36 to $-30M). Offered term 4.0 yrs. Quarterly default prob 0.1; walk prob at renewal 0.4. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.46-0.62).

**2. Hyperscaler lease, 100 MW, shell at 2028Q3.** Old rent $150M/yr. Offer band 0.44-0.60 -> $66-90M/yr (delta $-84 to $-60M). Offered term 4.0 yrs. Quarterly default prob 0.01; walk prob at renewal 0.1. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.39-0.55).

**3. H100 GPU contract, 8,000 GPUs at 2028Q2.** 1yr H100 rate $1.15/hr vs $2.28 base; annual revenue $159.8M -> $80.6M (-50%). GPU renewal index vs 2025Q4 = 0.59. Offered term 1.0 yrs.


## S2 Lift-Off (trigger 2028Q3)

**1. Anchor neocloud master lease, 50 MW, shell at 2028Q4.** Old rent $75M/yr. Offer band 1.00-1.10 -> $75-82M/yr (delta $+0 to $+8M). Offered term 10.9 yrs. Quarterly default prob 0.0025; walk prob at renewal 0.036. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 1.22-1.38).

**2. Hyperscaler lease, 100 MW, shell at 2029Q1.** Old rent $150M/yr. Offer band 1.00-1.10 -> $150-165M/yr (delta $+0 to $+15M). Offered term 11.1 yrs. Quarterly default prob 0.0004; walk prob at renewal 0.019. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 1.24-1.4).

**3. H100 GPU contract, 8,000 GPUs at 2028Q4.** 1yr H100 rate $2.12/hr vs $2.28 base; annual revenue $159.8M -> $148.6M (-7%). GPU renewal index vs 2025Q4 = 1.09. Offered term 2.5 yrs.


## S3 Efficiency Shock (trigger 2027Q4)

**1. Anchor neocloud master lease, 50 MW, shell at 2028Q1.** Old rent $75M/yr. Offer band 0.65-0.70 -> $49-52M/yr (delta $-26 to $-22M). Offered term 3.5 yrs. Quarterly default prob 0.05; walk prob at renewal 0.3. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.58-0.74).

**2. Hyperscaler lease, 100 MW, shell at 2028Q2.** Old rent $150M/yr. Offer band 0.60-0.70 -> $90-105M/yr (delta $-60 to $-45M). Offered term 3.5 yrs. Quarterly default prob 0.0005; walk prob at renewal 0.05. Player choices: accept, counter (walk risk), re-let via RFP (new-lease index 0.54-0.7).

**3. H100 GPU contract, 8,000 GPUs at 2028Q1.** 1yr H100 rate $1.43/hr vs $2.28 base; annual revenue $159.8M -> $100.2M (-37%). GPU renewal index vs 2025Q4 = 0.73. Offered term 1.0 yrs.


**Flag F-1:** in S0/S2 the GPU renewal band frozen in doc 27 is anchored to 2025Q4, but Act II already has 2026Q4 rents above it, so pre-reset indices exceed 1 (S0 1.17, B200 up to 1.38). The examples show the CSV values; the mechanic should key to the tenant's own contract rate instead.
