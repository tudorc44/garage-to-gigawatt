// Shared parts of the Finances screens (M37.3-M37.5): a period's name, a line's name, what a ledger ref names, money
// with a true minus, and the change cell. Used by the Finances tabs and the reports' summaries.
import { CONTENT } from '../../content/index.ts'
import { t, tDynamic } from '../../i18n/t.ts'
import { isSoFar, type Period, type PnlRowId } from '../../sim/financeViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { projectName, siteName } from '../names.ts'

const label = (q: number) => CONTENT.quarters[q]

/** A period's name: "Q2 2021", "Q3 2024 so far", "2021", "Act II", "Career". */
export function periodName(state: GameState, p: Period): string {
  switch (p.kind) {
    case 'quarter':
      return isSoFar(state, p) ? t('ui.fin.so_far', { quarter: fmt.quarter(label(p.q)) }) : fmt.quarter(label(p.q))
    case 'year':
      return String(p.year)
    case 'act':
      return tDynamic(`ui.fin.act_name.${p.act}`, `Act ${p.act}`)
    case 'career':
      return t('ui.fin.career')
  }
}

export const lineName = (id: PnlRowId | 'mined') => tDynamic(`ui.fin.cat.${id}`, id)

/** What a ledger ref names on screen: a site, a project, an orbital block, a venture. */
export function refName(state: GameState, key: string): string {
  const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
  if (kind === 'site') {
    const site = state.sites.find((s) => s.id === id)
    return site ? siteName(site) : t('ui.fin.ref.former_site')
  }
  if (kind === 'project') {
    const p = state.projects.find((x) => x.id === id)
    const site = p && state.sites.find((s) => s.id === p.siteId)
    return p && site ? projectName(site, p.n) : t('ui.fin.ref.former_project')
  }
  if (kind === 'block') {
    const b = state.act4Orbit?.blocks.find((x) => x.id === id)
    return t('ui.fin.ref.block', { n: b?.n ?? 0 })
  }
  if (kind === 'venture') {
    const v = state.ventures?.find((x) => x.id === id)
    return tDynamic(`ui.ventures.type.${v?.type ?? ''}`, id)
  }
  if (key === 'orbit') return t('ui.fin.site.orbit')
  return key
}

/** A money cell: costs negative, with a true minus (a floating-point leftover under half a cent is $0). */
export const money = (usd: number) =>
  Math.abs(usd) < 0.005 ? fmt.money(0) : usd < 0 ? '−' + fmt.money(-usd) : fmt.money(usd)

/** The change cell: ▲/▼ with the sign, in the gain or loss colour (a cost that grew is a loss). */
export function Change(props: { now: number; prev: number | null }) {
  if (props.prev === null) return <span class="muted">—</span>
  const d = props.now - props.prev
  const tone = d > 0 ? 'gain' : d < 0 ? 'loss' : 'muted'
  return <span class={tone}>{d === 0 ? fmt.delta(0, 'money') : (d > 0 ? '▲+' : '▼−') + fmt.money(Math.abs(d))}</span>
}
