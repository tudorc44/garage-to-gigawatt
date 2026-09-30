// RELEASE CHECK (M11.5b, doc 27 §15 / D15): lists every content item flagged d15_review: true. These
// are negative "as-if" fates for real companies that need an editorial/legal review before any public
// release. Nothing blocks the internal build. It reads the hidden rivals view, so no game code may use it.
//   npm run release-check
import { d15Items } from '../src/content/rivalsHidden.ts'

const items = d15Items()
console.log(
  `D15 review needed before any public release: ${items.length} item(s)`,
)
for (const i of items)
  console.log(
    `  rivals_act3.json › ${i.scenario} › ${i.rival} (${i.name}): ${i.fate}`,
  )
process.exitCode = 0
