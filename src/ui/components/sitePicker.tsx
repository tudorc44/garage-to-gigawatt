// M33.2 (design thread, doc 35): one action, many sites. A dialog with one table: Site | Region | Free | Heat | the fact
// that matters for this action (a cost, a penalty, a price) | the action, or why not. Eligible rows first, the
// ineligible greyed below with their reason; sortable columns (default: the action's fact); a filter box from 9 rows.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { siteFacts } from '../../sim/selectors.ts'
import type { GameState, Site } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { siteLong, siteName } from '../names.ts'
import { Dialog, Pips } from './basics.tsx'
import { HeatChip, SiteName } from './siteName.tsx'

/** One site's row: the fact shown (and its sort value), and why it can't be picked (greyed), if so. */
export interface PickRow {
  site: Site
  fact: string
  factSort: number
  /** Why this site can't take the action now; the row is greyed and shows this instead of the button. */
  why?: string
  /** A different button label for this row (e.g. "Done" states), else the picker's. */
  label?: string
}

type SortKey = 'site' | 'region' | 'free' | 'heat' | 'fact'

/** Rows over which the filter box shows (doc 35: "more than 8"). */
const FILTER_FROM = 9

export function SitePicker(props: {
  state: GameState
  title: string
  /** A line under the title (what the action does), optional. */
  intro?: ComponentChildren
  factLabel: string
  actionLabel: string
  /** Bandwidth the action costs, shown as pips on each button. */
  bw?: number
  rows: PickRow[]
  /** The default sort: the fact, cheapest first, unless said otherwise. */
  defaultSort?: SortKey
  defaultDesc?: boolean
  onPick: (site: Site) => void
  onClose: () => void
  /**
   * Playtest fix (owner, 10 Oct 2026): one action for many sites ("Talk at every site at Heat 30+"), with one confirm
   * for the whole batch. Absent: no bulk button.
   */
  bulk?: { label: string; confirm: string; run: () => void }
}) {
  const { state } = props
  const [confirming, setConfirming] = useState(false)
  const [sort, setSort] = useState<SortKey>(props.defaultSort ?? 'fact')
  const [desc, setDesc] = useState(props.defaultDesc ?? false)
  const [filter, setFilter] = useState('')
  const rows = props.rows.map((r) => ({ ...r, facts: siteFacts(state, r.site) }))
  const key = (r: (typeof rows)[number]): number | string => {
    switch (sort) {
      case 'site':
        return siteName(r.site)
      case 'region':
        return r.facts.region ?? ''
      case 'free':
        return r.facts.freeKw
      case 'heat':
        return r.facts.heat
      default:
        return r.factSort
    }
  }
  const needle = filter.trim().toLowerCase()
  const shown = rows
    .filter(
      (r) =>
        !needle ||
        siteLong(state, r.site).toLowerCase().includes(needle),
    )
    .sort((a, b) => {
      // Eligible rows first, whatever the sort.
      if (!a.why !== !b.why) return a.why ? 1 : -1
      const ka = key(a)
      const kb = key(b)
      const c =
        typeof ka === 'number' && typeof kb === 'number'
          ? ka - kb
          : String(ka).localeCompare(String(kb), 'en', { numeric: true })
      return desc ? -c : c
    })
  const head = (k: SortKey, label: string, right = false) => (
    <th class={right ? 'r' : undefined} aria-sort={sort === k ? (desc ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        class="sort-btn"
        data-sort={k}
        onClick={() => {
          if (sort === k) setDesc(!desc)
          else {
            setSort(k)
            setDesc(k === 'heat' || k === 'free')
          }
        }}
      >
        {label}
        {sort === k ? (desc ? ' ▼' : ' ▲') : ''}
      </button>
    </th>
  )
  return (
    <Dialog title={props.title} onClose={props.onClose}>
      {props.intro && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {props.intro}
        </p>
      )}
      {props.bulk &&
        (confirming ? (
          <div class="picker-bulk" data-picker-bulk-confirm>
            <span class="num-s">{props.bulk.confirm}</span>
            <button type="button" class="btn" onClick={() => setConfirming(false)}>
              {t('site.confirm.cancel')}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                props.bulk!.run()
                setConfirming(false)
              }}
            >
              {t('site.confirm.go')}
            </button>
          </div>
        ) : (
          <div class="picker-bulk">
            <button type="button" class="btn" data-picker-bulk onClick={() => setConfirming(true)}>
              {props.bulk.label}
            </button>
          </div>
        ))}
      {rows.length >= FILTER_FROM && (
        <input
          type="search"
          class="picker-filter"
          placeholder={t('site.picker.filter')}
          aria-label={t('site.picker.filter')}
          value={filter}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
        />
      )}
      <div class="picker-scroll">
        <table class="site-picker" data-site-picker>
          <thead>
            <tr>
              {head('site', t('site.picker.col.site'))}
              {head('region', t('site.picker.col.region'))}
              {head('free', t('site.picker.col.free'), true)}
              {head('heat', t('site.picker.col.heat'), true)}
              {head('fact', props.factLabel, true)}
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.site.id} class={r.why ? 'locked' : undefined} data-pick-row={r.site.id}>
                <td>
                  <SiteName state={state} site={r.site} />
                </td>
                <td class="num-s">
                  {r.facts.region
                    ? tDynamic(`ui.region.${r.facts.region}`, r.facts.region)
                    : '—'}
                </td>
                <td class="num r">{fmt.power(r.facts.freeKw)}</td>
                <td class="r">
                  {r.facts.heat >= 30 ? (
                    <HeatChip heat={r.facts.heat} />
                  ) : (
                    <span class="num muted">{Math.round(r.facts.heat)}</span>
                  )}
                </td>
                <td class="num r">{r.fact}</td>
                <td class="r picker-action">
                  {r.why ? (
                    <span class="num-s muted">{r.why}</span>
                  ) : (
                    <button
                      type="button"
                      class="btn"
                      onClick={() => props.onPick(r.site)}
                    >
                      {r.label ?? props.actionLabel}
                      {!!props.bw && (
                        <Pips
                          total={props.bw}
                          filled={props.bw}
                          label={t('ui.plan.costs_bandwidth', { n: props.bw })}
                        />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} class="num-s muted">
                  {t('site.picker.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Dialog>
  )
}
