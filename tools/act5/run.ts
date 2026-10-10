// Act V content (doc 47, with doc 43 §0.11's errata): `npm run content:act5`.
// Runs doc 47's generators (kept in Python, as delivered: a TypeScript port would risk drifting a single byte, mine,
// reversible) into docs/act5-content/ (the source of record), runs check.py, then copies the data files into
// src/content/ where the game reads them (Act IV's pattern: byte-identical copies; a content test checks).
import { execFileSync } from 'node:child_process'
import { copyFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const DOCS = here('../../docs/act5-content')
const SRC = here('../../src/content')
const py = (script: string, ...args: string[]) =>
  process.stdout.write(execFileSync('python3', ['-I', here(script), ...args], { encoding: 'utf8' }))

// market.py reads Act IV's market files (the 2036 baseline is the median of their 2035Q4 values).
py('./market.py', SRC, DOCS)
for (const g of ['./signals.py', './events.py', './content.py', './text.py']) py(g, DOCS)
py('./check.py', DOCS)

/** The Act V data files (everything but the README and the chips add-on, which arrives with its own milestone). */
const ACT5_FILES = readdirSync(DOCS).filter((f) => /\.(json|csv)$/.test(f))
for (const f of ACT5_FILES) copyFileSync(`${DOCS}/${f}`, `${SRC}/${f}`)
console.log(`copied ${ACT5_FILES.length} files to src/content/`)
