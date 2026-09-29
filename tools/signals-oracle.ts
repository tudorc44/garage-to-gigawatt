// ORACLE SCRIPT (M11.2), for the design thread only: prints, per Act III scenario, each Signals
// indicator's displayed values by quarter, the trigger quarter and the decoy window. It reads the
// hidden authoring fields, so no game code, UI or bot may use it or import signalsHidden.ts.
//   node tools/signals-oracle.ts
import { SCENARIO_IDS } from '../src/content/index.ts'
import { signalsHidden } from '../src/content/signalsHidden.ts'

for (const id of SCENARIO_IDS) {
  const h = signalsHidden(id)
  console.log(`\n=== ${id}: ${h.scenario_name} ===`)
  console.log(
    `trigger: ${h.trigger.quarter} (${h.trigger.title}), card ${h.trigger.card_id}, ` +
      `signals from ${h.trigger.signals_start_quarter} (${h.trigger.quarters_of_warning} quarters of warning)`,
  )
  console.log(
    `decoy: ${h.decoy.indicator}, ${h.decoy.quarters.join(' ')}, peak ${h.decoy.peak_quarter}`,
  )
  const quarters = h.indicators[0].series.map((p) => p.quarter)
  console.log(
    ['indicator'.padEnd(20), ...quarters.map((q) => q.slice(2))].join(' '),
  )
  for (const ind of h.indicators)
    console.log(
      [
        ind.id.padEnd(20),
        ...ind.series.map((p) => String(p.displayed).padStart(5)),
      ].join(' '),
    )
}
