// M33.4 (design thread, doc 35): long site lists grouped by type ("Own site · 12 · 240 MW · 31 MW free"). Groups of 3
// or fewer open by default, larger ones folded; a fold is remembered per screen for the session. The Fleet & Sites list
// adds sorts (acquired, free MW, Heat, region) and filter chips that combine.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { siteShortName, t, tDynamic } from '../../i18n/t.ts'
import { siteListRow, type SiteListRow } from '../../sim/selectors.ts'
import type { GameState, Site } from '../../sim/state.ts'
import { siteLabel } from '../../sim/systems/siteSerials.ts'
import { fmt } from '../format.ts'
import { flawName } from '../names.ts'
import { Icon } from './basics.tsx'
import { HEAT_CHIP_FROM, HeatChip, SiteName } from './siteName.tsx'

/** Folds the player set this session, per screen and type (doc 35: "remembered per screen for the session"). */
const folds = new Map<string, boolean>()

/** Groups of more sites than this start folded. */
const OPEN_UP_TO = 3

/** Sites grouped by type, the groups in the order their first site was acquired. */
export function groupSites<T extends { site: Site }>(rows: T[]) {
  const order = (s: Site) => Number(s.id.slice(s.id.lastIndexOf('-') + 1)) || 0
  const groups = new Map<string, T[]>()
  for (const r of [...rows].sort((a, b) => order(a.site) - order(b.site))) {
    const label = siteLabel(r.site)
    groups.set(label, [...(groups.get(label) ?? []), r])
  }
  return [...groups].map(([label, items]) => ({ label, items }))
}

/** Sites grouped by type, keeping the order they come in (New project: most free power first, within and across). */
export function groupInOrder<T extends { site: Site }>(rows: T[]) {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const label = siteLabel(r.site)
    groups.set(label, [...(groups.get(label) ?? []), r])
  }
  return [...groups].map(([label, items]) => ({ label, items }))
}

/** A group's header: "Own site · 12 · 240 MW · 31 MW free", a button that folds it. */
export function SiteGroup(props: {
  screen: string
  label: string
  sites: { facts: { energizedKw: number; freeKw: number } }[]
  /** Open on first show whatever its size (New project: the group holding the picked site). */
  defaultOpen?: boolean
  children: ComponentChildren
}) {
  const key = `${props.screen}:${props.label}`
  const [open, setOpen] = useState(
    folds.get(key) ?? (props.defaultOpen || props.sites.length <= OPEN_UP_TO),
  )
  const mw = props.sites.reduce((kw, s) => kw + s.facts.energizedKw, 0)
  const free = props.sites.reduce((kw, s) => kw + s.facts.freeKw, 0)
  return (
    <div class="site-group" data-site-group={props.label}>
      <button
        type="button"
        class="site-group-head"
        aria-expanded={open}
        onClick={() => {
          folds.set(key, !open)
          setOpen(!open)
        }}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        {t('site.group.header', {
          type: siteShortName(props.label),
          n: props.sites.length,
          mw: fmt.power(mw),
          free: fmt.power(free),
        })}
      </button>
      {open && props.children}
    </div>
  )
}

type Sort = 'acquired' | 'free' | 'heat' | 'region'
type Filter = 'free' | 'heat' | 'renewal' | 'projects'
const SORTS: Sort[] = ['acquired', 'free', 'heat', 'region']
const FILTERS: Filter[] = ['free', 'heat', 'renewal', 'projects']

const keep: Record<Filter, (r: SiteListRow) => boolean> = {
  free: (r) => r.facts.freeKw > 0,
  heat: (r) => r.facts.heat >= HEAT_CHIP_FROM,
  renewal: (r) => r.facts.renewalDue,
  projects: (r) => r.hasProjects,
}

const sortBy: Record<Sort, (a: SiteListRow, b: SiteListRow) => number> = {
  acquired: (a, b) => a.order - b.order,
  free: (a, b) => b.facts.freeKw - a.facts.freeKw,
  heat: (a, b) => b.facts.heat - a.facts.heat,
  region: (a, b) => (a.facts.region ?? '').localeCompare(b.facts.region ?? ''),
}

/** Fleet & Sites: every site, grouped by type, with sorts and filter chips. */
export function SitesList({ state }: { state: GameState }) {
  const [sort, setSort] = useState<Sort>('acquired')
  const [filters, setFilters] = useState<Filter[]>([])
  const rows = state.sites
    .map((s) => siteListRow(state, s))
    .filter((r) => filters.every((f) => keep[f](r)))
  const groups = groupSites(rows)
  return (
    <div class="panel p sites-list" data-sites-list>
      <h2 class="panel-title">{t('site.list.title', { n: state.sites.length })}</h2>
      <div class="sites-list-controls">
        <div class="seg" role="group" aria-label={t('site.list.sort')}>
          {SORTS.map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={sort === s}
              data-site-sort={s}
              onClick={() => setSort(s)}
            >
              {t(`site.list.sort.${s}`)}
            </button>
          ))}
        </div>
        <div class="filter-chips" role="group" aria-label={t('site.list.filters')}>
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f}
              class="filter-chip"
              aria-pressed={filters.includes(f)}
              data-site-filter={f}
              onClick={() =>
                setFilters(filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f])
              }
            >
              {t(`site.list.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>
      {groups.length === 0 && <p class="num-s muted">{t('site.list.none')}</p>}
      {groups.map((g) => (
        <SiteGroup key={g.label} screen="fleet" label={g.label} sites={g.items}>
          <table class="sites-table">
            <tbody>
              {[...g.items].sort(sortBy[sort]).map((r) => (
                <tr key={r.site.id} data-site-row={r.site.id}>
                  <td class="sites-name">
                    <SiteName state={state} site={r.site} />
                    {r.facts.region && (
                      <span class="num-s muted">
                        {' · '}
                        {tDynamic(`ui.region.${r.facts.region}`, r.facts.region)}
                      </span>
                    )}
                  </td>
                  <td class="num r">
                    {t('site.list.mw', {
                      mw: fmt.power(r.facts.energizedKw),
                      free: fmt.power(r.facts.freeKw),
                    })}
                  </td>
                  <td class="num-s">{t(`site.use.${r.mainUse}`)}</td>
                  <td class="r">
                    <HeatChip heat={r.facts.heat} />
                  </td>
                  <td class="sites-flags">
                    {r.facts.renewalDue && (
                      <span class="site-flag" title={t('site.flag.renewal')}>
                        <Icon name="negotiate" size={16} />
                      </span>
                    )}
                    {r.facts.flaw && (
                      <span
                        class="site-flag"
                        title={t('site.flag.flaw', { flaw: flawName(r.facts.flaw) })}
                      >
                        <Icon name="warning" size={16} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SiteGroup>
      ))}
    </div>
  )
}
