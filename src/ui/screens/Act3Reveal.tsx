// The Act III chapter report (M15.4; wireframe A3-11 and the Components reveal timeline, look from the design
// system's grid theme). The ONLY file in src/ui allowed to show the scenario: it is shown only at the end of
// Act III, when the scenario is no longer a secret (a grep test whitelists exactly this file). Everything
// comes from the reveal record (act3End, through act3Outcome): numbers and ids; the text is in en.json
// (act3.reveal.<scenario>.*, the trigger card's title under its engine id, the move labels). It never imports
// a hidden content file. Loaded with the Act III entry screens (Act3Entry.tsx, a lazy chunk; every build since M20.2).
import { useState } from 'preact/hooks'
import { BALANCE, CONTENT } from '../../content/index.ts'
import { t, tDynamic } from '../../i18n/t.ts'
import type { Act3End, GameState } from '../../sim/state.ts'
import { act3Outcome } from '../../sim/systems/act3End.ts'
import { fmt } from '../format.ts'
import { Term } from '../components/term.tsx'
import { ActFinances } from '../components/financeSummary.tsx'

const QUARTERS = 16
const FIRST_LABEL = '2027Q1'
/** The Act III quarter label for an index 0–15. */
const quarterOf = (q: number) =>
  CONTENT.quarters[CONTENT.quarters.indexOf(FIRST_LABEL) + q] ?? ''
/** "2027Q3" → "27Q3" for the timeline's axis. */
const shortQ = (label: string) => label.slice(2)

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

const moveLabel = (kind: string) => tDynamic(`act3.moves.${kind}`, kind)

// ---------- the reveal timeline (M15.4 §4) ----------

const W = 1230
const H = 160
const AXIS = 112
const x = (q: number) => 24 + q * 76

/**
 * The reveal timeline: 16 quarter ticks, the trigger rule, the decoy window (hatched), each move as a marker
 * above the axis (several in one quarter stack up), glyphs always (never colour alone). Labels on the graphic
 * only with 4 moves or fewer (DT); after a game over the later ticks are greyed with an "Out" marker.
 */
export function RevealTimeline(props: {
  end: Act3End
  /** The quarter index the game ended in (15 at a normal end). */
  endQ: number
  survived: boolean
}) {
  const { end, endQ, survived } = props
  const trigger = end.trigger
  const triggerTitle = tDynamic(`event.${trigger.cardId}.title`, '')
  const indicator =
    CONTENT.signals[end.scenarioId].find((i) => i.id === end.decoy.indicator)
      ?.label ?? end.decoy.indicator
  const labelled = end.moves.length <= 4
  const stack: Record<number, number> = {}
  const matched = end.moves.filter((m) => m.mark === 'match').length
  return (
    <figure
      class="reveal-timeline"
      aria-label={t('act3.reveal.timeline_summary', {
        n: end.moves.length,
        m: matched,
      })}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        aria-hidden="true"
        data-moves={end.moves.length}
      >
        <defs>
          <pattern
            id="reveal-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="var(--ink-muted)"
              stroke-width="1.5"
              opacity="0.45"
            />
          </pattern>
        </defs>
        {/* the decoy window */}
        <rect
          data-decoy-from={end.decoy.fromQ}
          data-decoy-to={end.decoy.toQ}
          x={x(end.decoy.fromQ) - 30}
          y={AXIS - 58}
          width={x(end.decoy.toQ) - x(end.decoy.fromQ) + 60}
          height={58}
          fill="url(#reveal-hatch)"
        />
        <text
          x={x(end.decoy.fromQ) - 26}
          y={AXIS - 62}
          font-size="11"
          fill="var(--ink-muted)"
        >
          {t('act3.reveal.timeline_decoy', { indicator })}
        </text>
        {/* the axis and its 16 ticks */}
        <line
          x1={x(0)}
          y1={AXIS}
          x2={x(QUARTERS - 1)}
          y2={AXIS}
          stroke="var(--ink)"
          stroke-width="1.5"
        />
        {Array.from({ length: QUARTERS }, (_, q) => (
          <circle
            key={q}
            data-tick={q}
            data-out={!survived && q > endQ ? 'true' : undefined}
            cx={x(q)}
            cy={AXIS}
            r="3"
            fill={!survived && q > endQ ? 'var(--ink-disabled)' : 'var(--ink)'}
            opacity={!survived && q > endQ ? 0.4 : 1}
          />
        ))}
        {[0, 4, 8, 15].map((q) => (
          <text
            key={q}
            x={x(q) - 14}
            y={AXIS + 22}
            font-size="11"
            font-family="var(--font-num, monospace)"
            fill="var(--ink-muted)"
          >
            {shortQ(quarterOf(q))}
          </text>
        ))}
        {/* the trigger */}
        <line
          data-trigger={trigger.q}
          x1={x(trigger.q)}
          y1={10}
          x2={x(trigger.q)}
          y2={AXIS + 8}
          stroke="var(--ink)"
          stroke-width="3"
        />
        <text
          x={x(trigger.q) + 6}
          y={18}
          font-size="12"
          font-weight="700"
          fill="var(--ink)"
        >
          {t('act3.reveal.timeline_trigger', {
            quarter: quarterOf(trigger.q),
            title: triggerTitle,
          })}
          {!survived && trigger.q > endQ
            ? ` ${t('act3.reveal.timeline_after_you_left')}`
            : ''}
        </text>
        {/* a game over: the quarter it happened */}
        {!survived && (
          <text
            data-out-marker={endQ}
            x={x(endQ) - 10}
            y={AXIS + 38}
            font-size="11"
            font-weight="700"
            fill="var(--loss)"
          >
            {t('act3.reveal.timeline_out')}
          </text>
        )}
        {/* the moves */}
        {end.moves.map((m, i) => {
          const k = (stack[m.q] = (stack[m.q] ?? -1) + 1)
          const cy = AXIS - 16 - k * 18
          const colour =
            m.mark === 'match'
              ? 'var(--gain)'
              : m.mark === 'neutral'
                ? 'var(--ink-muted)'
                : 'var(--loss)'
          return (
            <g key={i} data-move-mark={m.mark} data-move-q={m.q}>
              {m.mark === 'decoy' && (
                <rect
                  x={x(m.q) - 8}
                  y={cy - 8}
                  width="16"
                  height="16"
                  fill="url(#reveal-hatch)"
                  stroke="var(--loss)"
                />
              )}
              <text
                x={x(m.q)}
                y={cy + 5}
                text-anchor="middle"
                font-size="15"
                font-weight="700"
                fill={colour}
              >
                {MARK[m.mark]}
              </text>
              {labelled && (
                <text
                  data-move-label
                  x={x(m.q) + 12}
                  // Every other label sits a row higher, so labels of nearby moves don't run into each other.
                  y={cy + 4 - (i % 2) * 22}
                  font-size="11"
                  fill="var(--ink)"
                >
                  {`${moveLabel(m.kind)} · ${timing(m.q - trigger.q).toLowerCase()}`}
                </text>
              )}
            </g>
          )
        })}
        {end.moves.length === 0 && (
          <text
            x={W / 2}
            y={AXIS - 30}
            text-anchor="middle"
            font-size="13"
            fill="var(--ink-muted)"
          >
            {t('act3.reveal.no_moves')}
          </text>
        )}
      </svg>
    </figure>
  )
}

/** The moves list under the timeline (the text alternative, M14's table). */
function MovesList({ end }: { end: Act3End }) {
  if (end.moves.length === 0)
    return (
      <p class="num-s" style={{ margin: 0 }}>
        {t('act3.reveal.no_moves')}
      </p>
    )
  return (
    <table class="num-s reveal-moves">
      <tbody>
        {end.moves.map((m, i) => (
          <tr key={i} data-move-row={m.mark}>
            <td class="num">{fmt.quarter(quarterOf(m.q))}</td>
            <td>{moveLabel(m.kind)}</td>
            <td class="muted">{timing(m.q - end.trigger.q)}</td>
            <td>
              {MARK[m.mark]}
              {m.mark === 'decoy' && ` ${t('act3.reveal.decoy_reacted')}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------- the reading score (M15.4 §5) ----------

/** The five reading title bands with their ranges, from the top band down (BALANCE.act3.readingTitles). */
function bands() {
  const sorted = [...BALANCE.act3.readingTitles].sort((a, b) => a.min - b.min)
  return sorted.map((b, i) => ({
    id: b.id,
    min: b.min,
    max: i + 1 < sorted.length ? sorted[i + 1].min - 1 : 100,
  }))
}

const ARROW = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '·')

/** "How this was scored": one cell per quarter, your stance over the ideal, shaded by the points it earned. */
function HowScored({ end, endQ }: { end: Act3End; endQ: number }) {
  const [open, setOpen] = useState(false)
  const byQ = new Map(end.reading.perQuarter.map((p) => [p.q, p]))
  return (
    <div class="reveal-how">
      <button
        type="button"
        class="btn btn-ghost"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t('act3.reveal.how_title')} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div data-how-scored>
          <div class="reveal-strip">
            {Array.from({ length: QUARTERS }, (_, q) => {
              const p = byQ.get(q)
              const why = q > endQ
                ? t('act3.reveal.not_played')
                : t('act3.reveal.not_scored')
              return (
                <div
                  key={q}
                  class={`reveal-cell${p ? ` pts-${String(p.value).replace('.', '')}` : ' empty'}`}
                  title={p ? quarterOf(q) : `${quarterOf(q)}: ${why}`}
                  data-not-scored={p ? undefined : why}
                >
                  <span class="num-s muted">{shortQ(quarterOf(q))}</span>
                  {p ? (
                    <>
                      <span>{ARROW(p.stance)}</span>
                      <span class="muted">{ARROW(p.ideal)}</span>
                    </>
                  ) : (
                    <span class="muted" aria-label={why}>
                      –
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('act3.reveal.how_legend')}
          </p>
          {/* M16.0 (DT answers 2 and 6): the description and the signal reads live in the disclosure. */}
          <p class="num-s muted" style={{ margin: 0 }} data-description>
            {t('act3.reveal.description')}
          </p>
          <div data-reads>
            <span class="label">{t('act3.reveal.reads_title')}</span>
            {end.signalReads.length === 0 ? (
              <p class="num-s muted" style={{ margin: 0 }}>
                {t('act3.reveal.reads_none')}
              </p>
            ) : (
              <ul class="reveal-reads">
                {end.signalReads.map((r, i) => (
                  <li key={i} class="num-s" data-read-row>
                    {t('act3.reveal.read_row', {
                      quarter: fmt.quarter(r.quarter),
                      indicator:
                        CONTENT.signals[end.scenarioId].find(
                          (x) => x.id === r.indicator,
                        )?.label ?? r.indicator,
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReadingScore({
  end,
  endQ,
  known,
}: {
  end: Act3End
  endQ: number
  /** M18.4: a Scenario Mode run: the score is labelled "scenario known". */
  known?: boolean
}) {
  const r = end.reading
  const wording =
    r.score === null
      ? null
      : r.score >= BALANCE.act3.readingWording.high
        ? 'high'
        : r.score >= BALANCE.act3.readingWording.mid
          ? 'mid'
          : 'low'
  return (
    <section class="panel p reveal-score">
      <span class="label">
        <Term id="reading">{t('act3.reveal.reading')}</Term>
        {known &&<span data-scenario-known> · {t('ui.scenario_mode.known')}</span>}
      </span>
      <div>
        <span class="num-xl" data-score>
          {r.score === null ? t('act3.reveal.reading_none') : r.score}
        </span>{' '}
        <span class="num muted">{t('act3.reveal.out_of')}</span>
      </div>
      {r.score === null && (
        <span class="num-s muted">{t('act3.reveal.not_enough')}</span>
      )}
      {r.penalty > 0 && (
        <span class="num-s" data-penalty>
          {t('act3.reveal.base_penalty', { base: r.base, penalty: r.penalty })}
        </span>
      )}
      <div class="reveal-bands">
        {bands().map((b) => (
          <span
            key={b.id}
            class={`reveal-band${end.readingTitleId === b.id ? ' on' : ''}`}
            data-band={b.id}
            data-on={end.readingTitleId === b.id ? 'true' : undefined}
          >
            {tDynamic(`act3.reveal.title.${b.id}`, b.id)}
            <br />
            <span class="num-s">{`${b.min}–${b.max}`}</span>
          </span>
        ))}
      </div>
      {wording && (
        <p style={{ margin: 0 }}>
          “{tDynamic(`act3.reveal.wording.${wording}`, '')}”
        </p>
      )}
      <HowScored end={end} endQ={endQ} />
    </section>
  )
}

// ---------- the screen ----------

export function Act3Reveal(props: {
  state: GameState
  onNew: () => void
  /** M27.6: "Continue to Act IV" (the app passes it; absent, the footer is as before). */
  onContinueAct4?: () => void
}) {
  const o = act3Outcome(props.state)
  const e = o.end
  const id = e.scenarioId
  const indicator =
    CONTENT.signals[id].find((i) => i.id === e.decoy.indicator)?.label ??
    e.decoy.indicator
  const triggerTitle = tDynamic(`event.${e.trigger.cardId}.title`, '')
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card reveal">
          {/* 1. header and 2. the reading title */}
          <div class="row-between reveal-head">
            <div>
              <div class="label">
                {o.survived
                  ? t('ui.act3.chapter.label')
                  : t('act3.reveal.out', { quarter: fmt.quarter(o.endQuarter) })}
              </div>
              <span class="num-s muted">{t('act3.reveal.played_was')}</span>
              <h1 class="screen-title" data-scenario-name>
                {e.scenarioName}
              </h1>
            </div>
            <div class="reveal-title">
              <span class="label">{t('act3.reveal.your_title')}</span>
              <span class="screen-title" data-reading-title>
                {e.readingTitleId
                  ? tDynamic(`act3.reveal.title.${e.readingTitleId}`, '')
                  : t('act3.reveal.title_none')}
              </span>
            </div>
          </div>

          {/* 3. what happened, the false alarm and the tell */}
          <div class="reveal-two">
            <section class="panel p">
              <span class="label">{t('ui.act3.reveal.happened')}</span>
              <p style={{ margin: 0 }} data-trigger-text>
                {t('act3.reveal.trigger_line', {
                  quarter: fmt.quarter(e.triggerQuarter),
                  card: triggerTitle,
                })}{' '}
                {tDynamic(`act3.reveal.${id}.trigger`, '')}
              </p>
            </section>
            <section class="panel p">
              <span class="label">{t('ui.act3.reveal.decoy')}</span>
              <strong data-decoy-text>
                {`${indicator}, ${fmt.quarter(quarterOf(e.decoy.fromQ))}–${fmt.quarter(quarterOf(e.decoy.toQ))}`}
              </strong>
              <p class="num-s" style={{ margin: 0 }}>
                {tDynamic(`act3.reveal.${id}.decoy_reason`, '')}
              </p>
              <p class="num-s muted" style={{ margin: 0 }}>
                {t('ui.act3.reveal.tell', {
                  tell: tDynamic(`act3.reveal.${id}.decoy_tell`, ''),
                })}
              </p>
            </section>
          </div>

          {/* 4. your reading: the timeline, then the list */}
          <section class="panel p">
            <span class="label">{t('act3.reveal.your_reading')}</span>
            <RevealTimeline end={e} endQ={o.endQ} survived={o.survived} />
            <MovesList end={e} />
          </section>

          {/* 5. the reading score, and 6. the stats */}
          <div class="reveal-two">
            <ReadingScore end={e} endQ={o.endQ} known={!!props.state.scenarioMode} />
            <section class="panel p reveal-stats">
              <span class="label">{t('ui.act3.reveal.net_worth')}</span>
              <span class="num-xl">{fmt.money(o.netWorthUsd)}</span>
              {/* M36.8 (answer 11a): the company's ventures, marked to milestones (part of the valuation) */}
              {props.state.reports.at(-1)?.venturesUsd !== undefined && (
                <div class="row-between" data-reveal-ventures>
                  <span>{t('ui.cap2.val.ventures')}</span>
                  <span class="num">{fmt.money(props.state.reports.at(-1)!.venturesUsd!)}</span>
                </div>
              )}
              <div class="row-between">
                <span>{t('act3.reveal.at_entry')}</span>
                <span class="num">{fmt.money(o.entryNetWorthUsd)}</span>
              </div>
              <div class="row-between">
                <span>{t('act3.reveal.growth')}</span>
                <span
                  class={`num ${o.growth !== null && o.growth >= 1 ? 'gain' : 'loss'}`}
                >
                  {o.growth === null
                    ? '—'
                    : `${t('act3.reveal.growth_value', { x: o.growth.toFixed(1) })} ${o.growth >= 1 ? '▲' : '▼'}`}
                </span>
              </div>
              <div class="row-between">
                <span>{t('ui.act3.reveal.survival')}</span>
                <span>
                  {o.survived
                    ? t('act3.reveal.survived_short')
                    : t('act3.reveal.out', {
                        quarter: fmt.quarter(o.endQuarter),
                      })}
                </span>
              </div>
              <div class="row-between">
                <span>{t('act3.reveal.career')}</span>
                <span>{tDynamic(`ui.chapter2.title.${o.title}`, o.title)}</span>
              </div>
            </section>
          </div>

          {/* 7. the rivals */}
          <section class="panel p">
            <span class="label">{t('ui.act3.reveal.rivals')}</span>
            {/* M20.1: under the heading, in every build */}
            <p class="num-s muted" style={{ margin: 0 }} data-rivals-note>
              {t('ui.act3.reveal.rivals_note')}
            </p>
            <table class="num-s">
              <tbody>
                {e.rivalFates.map((r) => (
                  <tr key={r.rival} data-rival={r.rival}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>
                      {r.withheld ? t('ui.act3.reveal.withheld') : r.fate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* M37.5 (doc 39): the act's P&L in figures, its best and worst site */}
          <ActFinances state={props.state} act={3} />

          {/* 8. the end (M27.6: a company that survived Act III can continue into Act IV) */}
          {props.onContinueAct4 && props.state.phase === 'chapter' ? (
            <div class="row-between">
              <button type="button" class="btn" onClick={props.onNew}>
                {t('ui.act4.back_to_title')}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                data-continue-act4
                onClick={props.onContinueAct4}
              >
                {t('ui.act4.continue')}
              </button>
            </div>
          ) : (
            <div class="row-between">
              <span class="num-s muted">{t('ui.act3.reveal.continues')}</span>
              <button
                type="button"
                class="btn btn-primary"
                onClick={props.onNew}
              >
                {t('act3.reveal.continue')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
