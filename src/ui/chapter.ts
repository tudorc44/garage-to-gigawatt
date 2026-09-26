// The chapter report as text: the key-moment lines (shown on the chapter screen) and the whole
// run as a plain-text summary ("Export run", and the terminal game's ending). Reads the sim's
// chapterReport() facts only; all wording comes from en.json.
import { t, tDynamic } from '../i18n/t.ts'
import { chapterReport } from '../sim/selectors.ts'
import type { GameState } from '../sim/state.ts'
import { fmt } from './format.ts'
import { rivalName, tierName } from './names.ts'

type Chapter = ReturnType<typeof chapterReport>

const list = (names: string[]) =>
  names.length === 0 ? t('ui.chapter.none') : names.join(', ')

/** One line per key moment, in reading order. */
export function momentLines(c: Chapter): string[] {
  const m = c.moments
  const lines: string[] = []
  lines.push(
    m.raised.length
      ? t('ui.chapter.m.raised', {
          rounds: m.raised
            .map((r) =>
              t('ui.chapter.m.raised_item', {
                round: r.round,
                amount: fmt.money(r.amountUsd),
                quarter: fmt.quarter(r.quarter),
              }),
            )
            .join(', '),
        })
      : t('ui.chapter.m.no_raises'),
  )
  if (m.sites.length) {
    lines.push(
      t('ui.chapter.m.sites', {
        sites: m.sites
          .map((x) => `${tierName(x.tier)} (${fmt.quarter(x.quarter)})`)
          .join(', '),
      }),
    )
  }
  if (m.best && m.best.ebitdaUsd > 0) {
    lines.push(
      t('ui.chapter.m.best', {
        quarter: fmt.quarter(m.best.quarter),
        value: fmt.money(m.best.ebitdaUsd),
      }),
    )
  }
  if (m.worst && m.worst.ebitdaUsd < 0) {
    lines.push(
      t('ui.chapter.m.worst', {
        quarter: fmt.quarter(m.worst.quarter),
        value: fmt.money(m.worst.ebitdaUsd),
      }),
    )
  }
  lines.push(
    m.forcedSales.length
      ? t('ui.chapter.m.forced', {
          n: m.forcedSales.length,
          quarters: m.forcedSales.map((q) => fmt.quarter(q)).join(', '),
        })
      : t('ui.chapter.m.no_forced'),
  )
  if (m.marginCalls > 0) {
    lines.push(
      t('ui.chapter.m.margin', {
        n: m.marginCalls,
        defaults: m.marginDefaults,
      }),
    )
  }
  if (m.uri) lines.push(t(`ui.chapter.m.uri_${m.uri}`))
  lines.push(
    m.rivalsDropped.length
      ? t('ui.chapter.m.rivals_dropped', {
          reached: list(m.rivalsReached.map(rivalName)),
          dropped: list(m.rivalsDropped.map(rivalName)),
        })
      : t('ui.chapter.m.rivals_all', {
          reached: list(m.rivalsReached.map(rivalName)),
        }),
  )
  return lines
}

/** The whole run as plain text, for copying ("Export run") or the terminal. */
export function runSummaryText(state: GameState): string {
  const c = chapterReport(state)
  const out = [
    t('ui.chapter.export_title', { seed: String(state.seed) }),
    t(c.bust ? 'ui.chapter.ends_early' : 'ui.chapter.act_done'),
    '',
    t('ui.chapter.export_title_line', { title: c.title }),
    t('ui.chapter.export_net_worth', {
      value: fmt.money(c.netWorthUsd),
      stake: fmt.pct(c.founderStake),
      valuation: fmt.money(c.finalValuationUsd),
    }),
  ]
  if (c.peak) {
    out.push(
      t('ui.chapter.export_peak', {
        value: fmt.money(c.peak.valuationUsd),
        quarter: fmt.quarter(c.peak.quarter),
      }),
    )
  }
  if (c.rank) out.push(t('ui.chapter.export_rank', c.rank))
  if (c.mergeChoice) {
    out.push(
      '',
      t('ui.chapter.export_merge', {
        choice: tDynamic(`merge_choice.${c.mergeChoice.id}`, c.mergeChoice.id),
      }),
      c.mergeChoice.act2Preview,
    )
  }
  out.push('', t('ui.chapter.moments'), ...momentLines(c).map((l) => `- ${l}`))
  out.push(
    '',
    t('ui.chapter.export_curve'),
    ...c.curve.map(
      (p) => `  ${fmt.quarter(p.quarter)}  ${fmt.money(p.valuationUsd)}`,
    ),
  )
  return out.join('\n')
}
