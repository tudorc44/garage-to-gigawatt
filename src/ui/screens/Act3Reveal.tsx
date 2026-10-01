// The Act III chapter report with the scenario reveal (M13.3; wireframe A3-11), bare-bones. This is the
// ONLY file in src/ui allowed to show the scenario (its name, the trigger, the decoy, the rivals' fates):
// it is shown only at the end of Act III, when the scenario is no longer a secret (a grep test whitelists
// exactly this file). It is part of the test-build preview module (loaded behind ACT3_PREVIEW).
// The authored reveal text (scenario name, decoy reason and tell, rival fates) is content, like card text;
// the labels around it are in en.json. Fates flagged for the D15 editorial review are withheld (doc 27 §15).
import { CONTENT } from '../../content/index.ts'
import { t, tDynamic } from '../../i18n/t.ts'
import { signalsPanel } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { act3Outcome } from '../../sim/systems/act3End.ts'
import { fmt } from '../format.ts'

const MARK = { match: '✓', opposite: '✗', decoy: '✗', neutral: '–' } as const

/** The timing of a move against the trigger: "N quarters before", "In the trigger quarter", "N after". */
function timing(fromTrigger: number): string {
  if (fromTrigger === 0) return t('act3.reveal.timing.at')
  const n = Math.abs(fromTrigger)
  if (fromTrigger < 0)
    return n === 1
      ? t('act3.reveal.timing.before_one')
      : t('act3.reveal.timing.before', { n })
  return n === 1
    ? t('act3.reveal.timing.after_one')
    : t('act3.reveal.timing.after', { n })
}

/**
 * The reading panel (M14.4, bare-bones; the full screen is M15): the reading score and title with its
 * wording, the career title, the growth multiple and survival, then each big move with its timing against
 * the trigger and its mark, and the decoy penalty.
 */
function ReadingPanel({ state }: { state: GameState }) {
  const o = act3Outcome(state)
  const r = o.end.reading
  const moves = o.details.moves
  return (
    <div class="panel p">
      <span class="label">{t('act3.reveal.reading')}</span>
      <div class="row-between">
        <span class="num-xl">
          {r.score === null ? t('act3.reveal.reading_none') : r.score}
        </span>
        {o.readingTitle && (
          <strong>{tDynamic(`act3.reveal.title.${o.readingTitle}`, '')}</strong>
        )}
      </div>
      {o.wording && (
        <p style={{ margin: 0 }}>
          {tDynamic(`act3.reveal.wording.${o.wording}`, '')}
        </p>
      )}
      <span class="num-s muted">{t('act3.reveal.description')}</span>
      <table class="num-s">
        <tbody>
          <tr>
            <td>{t('act3.reveal.career')}</td>
            <td>{tDynamic(`ui.chapter2.title.${o.title}`, o.title)}</td>
          </tr>
          <tr>
            <td>{t('act3.reveal.growth')}</td>
            <td>
              {o.growth === null
                ? '—'
                : t('act3.reveal.growth_value', { x: o.growth.toFixed(1) })}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              {o.survived
                ? t('act3.reveal.survived')
                : t('act3.reveal.out', { quarter: fmt.quarter(o.endQuarter) })}
            </td>
          </tr>
        </tbody>
      </table>
      <span class="label">{t('act3.reveal.moves_title')}</span>
      {moves.length === 0 ? (
        <p class="num-s" style={{ margin: 0 }}>
          {t('act3.reveal.no_moves')}
        </p>
      ) : (
        <table class="num-s">
          <tbody>
            {moves.map((m, i) => (
              <tr key={i}>
                <td>{fmt.quarter(m.quarter)}</td>
                <td>{tDynamic(`act3.moves.${m.kind}`, m.kind)}</td>
                <td class="muted">{timing(m.fromTrigger)}</td>
                <td>
                  {MARK[m.mark]}
                  {m.mark === 'decoy' && ` ${t('act3.reveal.decoy_reacted')}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.penalty > 0 && (
        <span class="num-s">
          {t('act3.reveal.penalty', { penalty: r.penalty })}
        </span>
      )}
    </div>
  )
}

export function Act3Reveal(props: { state: GameState; onNew: () => void }) {
  const s = props.state
  const o = act3Outcome(s)
  const e = o.end
  const labelOf = (id: string) =>
    CONTENT.signals[e.scenarioId].find((i) => i.id === id)?.label ?? id
  const reads = (signalsPanel(s)?.indicators ?? [])
    .flatMap((i) => i.reads.map((r) => ({ ...r, label: i.label })))
    .sort((a, b) => (a.quarter < b.quarter ? -1 : 1))
  const window =
    e.decoy.quarters.length > 0
      ? `${fmt.quarter(e.decoy.quarters[0])}–${fmt.quarter(e.decoy.quarters.at(-1)!)}`
      : ''
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">{t('ui.act3.chapter.label')}</div>
          <h1 class="screen-title">
            {t('ui.act3.reveal.market', { name: e.scenarioName })}
          </h1>
          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.happened')}</span>
            <p style={{ margin: 0 }}>
              {t('ui.act3.reveal.trigger', {
                quarter: fmt.quarter(e.triggerQuarter),
                card: tDynamic(`event.${o.details.triggerCard}.title`, ''),
              })}
            </p>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.decoy')}</span>
            <strong>
              {labelOf(e.decoy.indicator)}, {window}
            </strong>
            <p class="num-s" style={{ margin: 0 }}>
              {o.details.decoyReason}
            </p>
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.act3.reveal.tell', { tell: o.details.decoyTell })}
            </p>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.reads')}</span>
            {reads.length === 0 ? (
              <p class="num-s muted" style={{ margin: 0 }}>
                {t('ui.act3.reveal.no_reads')}
              </p>
            ) : (
              reads.map((r, i) => (
                <div key={i} class="num-s">
                  {t('ui.act3.signals.read_line', {
                    quarter: fmt.quarter(r.quarter),
                    indicator: r.label,
                    low: r.low,
                    high: r.high,
                  })}
                </div>
              ))
            )}
          </div>

          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.net_worth')}</span>
              <span class="num-xl">{fmt.money(o.netWorthUsd)}</span>
              <span class="num-s muted">
                {t('ui.act3.reveal.at_entry', {
                  value: fmt.money(o.entryNetWorthUsd),
                })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.growth')}</span>
              <span class="num-xl">
                {o.growth === null
                  ? '—'
                  : t('act3.reveal.growth_value', { x: o.growth.toFixed(1) })}
              </span>
              <span class="num-s muted">
                {t('ui.act3.reveal.valuation', {
                  from: fmt.money(o.entryValuationUsd),
                  to: fmt.money(o.valuationUsd),
                })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.act3.reveal.survival')}</span>
              <span class="num-s">
                {o.survived
                  ? t('act3.reveal.survived')
                  : t('act3.reveal.out', { quarter: fmt.quarter(o.endQuarter) })}
              </span>
            </div>
          </div>

          <div class="panel p">
            <span class="label">{t('ui.act3.reveal.rivals')}</span>
            <table class="num-s">
              <tbody>
                {e.rivalFates.map((r) => (
                  <tr key={r.rival}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>
                      {o.details.withheldRivals.includes(r.rival)
                        ? t('ui.act3.reveal.withheld')
                        : r.fate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ReadingPanel state={s} />

          <p class="num-s muted">{t('ui.act3.reveal.continues')}</p>
          <button
            type="button"
            class="btn btn-primary"
            onClick={props.onNew}
          >
            {t('ui.act3.chapter.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
