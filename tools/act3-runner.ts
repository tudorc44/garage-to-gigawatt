// Act III step 7's tools (M18.3, M18.5): `npm run sim -- --act3-presets` scans for the three presets and prints each
// choice with its real figures; `npm run sim -- --act3-anchors` plays the anchor harness (act3-anchors.ts).
import {
  PRESET_BANDS,
  presetCompany,
  presetFigures,
  scanPreset,
  type PresetId,
} from './act3Presets.ts'

const args = process.argv.slice(2)
const usd = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : `$${(n / 1e6).toFixed(1)}M`)

const show = args.indexOf('--show')
if (args.includes('--act3-presets') && show >= 0) {
  // `--show bot:seed,…`: just those companies' figures.
  for (const pair of args[show + 1].split(',')) {
    const [bot, seed] = pair.split(':')
    const s = presetCompany(bot, Number(seed))
    console.log(`  ${pair}: ${s ? JSON.stringify(presetFigures(s)) : 'did not reach 2026Q4'}`)
  }
  process.exit(0)
}

if (args.includes('--act3-presets')) {
  const t0 = performance.now()
  for (const id of Object.keys(PRESET_BANDS) as PresetId[]) {
    const { band } = PRESET_BANDS[id]
    // Good: the first 3 fits (A7 may need the next candidate); the others: the first fit.
    const runs = scanPreset(id, 50, id === 'good' ? 3 : 1)
    const fits = runs.filter((r) => r.fits)
    console.log(`\n  Preset ${id}: band ${usd(band[0])}–${usd(band[1])}, scanned ${runs.length} companies`)
    if (fits.length === 0) {
      const closest = [...runs].sort(
        (a, b) =>
          Math.min(Math.abs(a.valuationUsd - band[0]), Math.abs(a.valuationUsd - band[1])) -
          Math.min(Math.abs(b.valuationUsd - band[0]), Math.abs(b.valuationUsd - band[1])),
      )[0]
      console.log(`    none in the band; closest: ${closest.bot} seed ${closest.seed} at ${usd(closest.valuationUsd)}`)
      console.log(`    ${JSON.stringify(presetFigures(closest.state))}`)
      continue
    }
    for (const r of fits) {
      console.log(`    ${r.bot} seed ${r.seed}: ${usd(r.valuationUsd)}`)
      console.log(`    ${JSON.stringify(presetFigures(r.state))}`)
    }
  }
  console.log(`\n  (${((performance.now() - t0) / 1000).toFixed(0)} s)`)
  process.exit(0)
}

if (args.includes('--act3-anchors')) {
  await import('./act3-anchors.ts')
  process.exit(0)
}
