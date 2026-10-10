// The end of Act I: the Merge decision screen (after the 2022Q3 report), then the chapter
// report, from where the game carries on into Act II. A bust skips the Merge and goes straight
// to the chapter report ("Chapter ends early"), with no way on.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import {
  act2ChapterView,
  actTurn,
  chapterReport,
  gameOverView,
  mergeView,
} from '../../sim/selectors.ts'
import { inActII, type GameState } from '../../sim/state.ts'
import { gameOverText, momentLines, runSummaryText } from '../chapter.ts'
import { fmt } from '../format.ts'
import type { ScreenProps } from './Plan.tsx'
import { League } from './Report.tsx'
import { ActFinances } from '../components/financeSummary.tsx'

export function MergeScreen({ state, act }: ScreenProps) {
  const v = mergeView(state)
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">{t('ui.merge.label')}</div>
          <h1 class="screen-title">{t('ui.merge.title')}</h1>
          <p class="pitch">{t('ui.merge.body')}</p>
          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.merge.gpus')}</span>
              <span class="num-xl">{v.gpus}</span>
              <span class="num-s muted">
                {t('ui.merge.resale', { value: fmt.money(v.gpuResaleUsd) })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.merge.btc')}</span>
              <span class="num-xl">{fmt.hash(v.btcThs, 'TH')}</span>
              <span class="num-s muted">{t('ui.merge.btc_sub')}</span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.merge.mw')}</span>
              <span class="num-xl">{fmt.power(v.energizedKw)}</span>
              <span class="num-s muted">
                {t('ui.merge.mw_sub', {
                  used: fmt.power(v.usedKw),
                  idle: fmt.power(v.idleKw),
                })}
              </span>
            </div>
          </div>
          <div class="merge-choices" role="radiogroup">
            {v.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={picked === c.id}
                class={`choice${picked === c.id ? ' default' : ''}`}
                onClick={() => setPicked(c.id)}
              >
                <span class="choice-label">
                  {tDynamic(`merge_choice.${c.id}`, c.id)}
                </span>
                <span class="num-s">{c.text}</span>
                {c.insight && (
                  <span class="num-s gain">{t('ui.merge.cloud_insight')}</span>
                )}
                {c.note && <span class="num-s warn">{t(c.note)}</span>}
                {picked === c.id && (
                  <span class="num-s muted" style={{ fontStyle: 'italic' }}>
                    {t('ui.merge.act2', { preview: c.act2Preview })}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div>
            <button
              type="button"
              class="btn btn-primary"
              disabled={!picked}
              onClick={() =>
                picked && act({ type: 'MERGE_CHOOSE', choice: picked })
              }
            >
              {t('ui.merge.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The Act II chapter report (wireframe A2-09; scope 0.2 §2.13): the end of the game at 2026Q4, or a
 * bust in Act II (with its cause, M6.4). Title by end valuation; score tiles; the career curve
 * 2017–2026; the valuation's parts; the act's key moments; the league; the Act III teaser.
 */
function Act2Chapter(props: {
  state: GameState
  onReplay: () => void
  onNew: () => void
  /** Test builds only (M13): "Continue to Act III (test build)". */
  extra?: ComponentChildren
}) {
  const s = props.state
  const c = act2ChapterView(s)
  const m = c.moments
  const cause = c.bust ? gameOverView(s) : null
  const b = c.breakdown
  const moments = [
    m.headStart &&
      t('ui.chapter2.m.head_start', {
        choice: tDynamic(`merge_choice.${m.headStart}`, m.headStart),
      }),
    m.lifeline && t('ui.chapter2.m.lifeline'),
    m.projectsLive > 0 &&
      t('ui.chapter2.m.projects', {
        n: m.projectsLive,
        quarter: fmt.quarter(m.firstLive ?? ''),
      }),
    m.biggestTenant &&
      t('ui.chapter2.m.tenants', {
        n: m.tenantsSigned,
        tenant: tDynamic(
          `tenant.${m.biggestTenant.tenant}`,
          m.biggestTenant.tenant,
        ),
        rent: fmt.money(m.biggestTenant.rentUsd),
      }),
    m.delays > 0 && t('ui.chapter2.m.delays', { n: m.delays }),
    m.foreclosures > 0 &&
      t('ui.chapter2.m.foreclosures', { n: m.foreclosures }),
    m.sold > 0 && t('ui.chapter2.m.sold', { n: m.sold }),
    m.halving &&
      t('ui.chapter2.m.halving', { pct: fmt.pct(m.halving.miningChangePct) }),
    t('ui.chapter2.m.price_reset', { quarter: fmt.quarter(m.priceReset) }),
    c.peak &&
      t('ui.chapter2.m.peak', {
        value: fmt.money(c.peak.valuationUsd),
        quarter: fmt.quarter(c.peak.quarter),
      }),
  ].filter((x): x is string => typeof x === 'string')
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">
            {t(c.bust ? 'ui.chapter2.ends_early' : 'ui.chapter2.done')}
          </div>
          <h1 class="screen-title">
            {tDynamic(`ui.chapter2.title.${c.title}`, c.title)}
          </h1>
          <p class="pitch">
            {c.bust
              ? t('ui.chapter2.bust_body', {
                  quarter: fmt.quarter(c.curve.at(-1)?.quarter ?? ''),
                })
              : t('ui.chapter2.body', {
                  value: fmt.money(c.finalValuationUsd),
                })}
          </p>
          {cause && <GameOverCause cause={cause} />}
          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.chapter.net_worth')}</span>
              <span class="num-xl">{fmt.money(c.netWorthUsd)}</span>
              <span class="num-s muted">
                {t('ui.chapter.net_worth_sub', {
                  stake: fmt.pct(c.founderStake),
                  valuation: fmt.money(c.finalValuationUsd),
                })}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.end.peak')}</span>
              <span class="num-xl">{fmt.money(c.peak?.valuationUsd ?? 0)}</span>
              <span class="num-s muted">
                {c.peak ? fmt.quarter(c.peak.quarter) : ''}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.chapter.rank')}</span>
              <span class="num-xl">
                {c.rank ? t('ui.chapter.rank_value', c.rank) : '—'}
              </span>
              <span class="num-s muted">{t('ui.chapter2.rank_sub')}</span>
            </div>
          </div>
          <div>
            <span class="label">{t('ui.chapter2.curve')}</span>
            <CareerChart curve={c.curve} />
          </div>
          {/* M37.5 (doc 39): the act's P&L in figures, its best and worst site */}
          <ActFinances state={s} act={2} />
          {b && (
            <div class="panel p">
              <span class="label">
                {t('ui.chapter2.breakdown', {
                  quarter: fmt.quarter(b.quarter),
                })}
              </span>
              <table>
                <tbody>
                  {(
                    [
                      ['mining', b.miningEvUsd],
                      ['ai', b.aiEvUsd],
                      ['backlog', b.backlogUsd],
                      ['construction', b.constructionUsd],
                      ['cash', b.cashUsd],
                      ['treasury', b.treasuryUsd],
                      ['debt', -b.debtUsd],
                    ] as const
                  ).map(([k, v]) => (
                    <tr key={k}>
                      <td>{t(`ui.chapter2.part.${k}`)}</td>
                      <td class={`num r${v < 0 ? ' loss' : ''}`}>
                        {fmt.money(v)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>{t('ui.chapter2.part.total')}</strong>
                    </td>
                    <td class="num r">
                      <strong>{fmt.money(c.finalValuationUsd)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div class="log">
            <span class="label">{t('ui.chapter.moments')}</span>
            {moments.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          {s.reports.length > 0 && <League state={s} r={s.reports.at(-1)!} />}
          <div class="panel p">
            <span class="label">{t('ui.chapter2.teaser_label')}</span>
            <p class="num-s" style={{ margin: 0 }}>
              {t('ui.chapter2.teaser')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {props.extra}
            <button
              type="button"
              class={props.extra ? 'btn' : 'btn btn-primary'}
              onClick={props.onNew}
            >
              {t('ui.end.new')}
            </button>
            <button type="button" class="btn" onClick={props.onReplay}>
              {t('ui.end.replay', { seed: String(s.seed) })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Why the company went under in Act II (M6.4, wireframe A2-10): the lenders' foreclosures, or cash. */
function GameOverCause({
  cause,
}: {
  cause: NonNullable<ReturnType<typeof gameOverView>>
}) {
  const text = gameOverText(cause)
  return (
    <div class="panel p">
      <span class="label loss">{text.title}</span>
      <p class="num-s" style={{ margin: 0 }}>
        {text.body}
      </p>
      {cause.foreclosed.map((f) => (
        <div class="num-s" key={f.n}>
          {t('ui.gameover.foreclosed_line', {
            n: f.n,
            quarter: fmt.quarter(f.quarter),
            debt: fmt.money(f.debtUsd),
          })}
        </div>
      ))}
      {cause.cause === 'foreclosure' && cause.missed.length > 0 && (
        <div class="num-s muted">
          {t('ui.gameover.missed', { n: cause.missed.length })}
        </div>
      )}
    </div>
  )
}

/** The career curve: company valuation at each quarter end, with the peak marked. */
function CareerChart({
  curve,
}: {
  curve: { quarter: string; valuationUsd: number }[]
}) {
  const w = 600
  const h = 140
  const pad = 8
  if (curve.length === 0) return null
  const values = curve.map((p) => p.valuationUsd)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const xy = values.map((v, i) => [
    pad + ((w - 2 * pad) * i) / Math.max(1, values.length - 1),
    pad + (h - 2 * pad) * (1 - (v - min) / range),
  ])
  const peak = values.indexOf(max)
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg
      class="career-chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t('ui.chapter.curve')}
    >
      <polygon
        class="c-btc-area"
        points={`${pad},${h - pad} ${line} ${xy.at(-1)![0]},${h - pad}`}
      />
      <polyline
        class="c-btc-line"
        points={line}
        vector-effect="non-scaling-stroke"
      />
      {peak >= 0 && (
        <circle class="c-btc" cx={xy[peak][0]} cy={xy[peak][1]} r={4} />
      )}
    </svg>
  )
}

export function ChapterScreen(props: {
  state: GameState
  onReplay: () => void
  onNew: () => void
  /** The Act I chapter report after the Merge: carry on into Act II. */
  onContinue?: () => void
  /** Test builds only (M13): extra buttons on the Act II chapter report. */
  extra?: ComponentChildren
}) {
  const s = props.state
  const [exported, setExported] = useState<string | null>(null)
  if (inActII(s)) return <Act2Chapter {...props} />
  const c = chapterReport(s)
  const exportRun = () => {
    const text = runSummaryText(s)
    setExported(text)
    try {
      void navigator.clipboard?.writeText(text).catch(() => undefined)
    } catch {
      // The text box below still shows it for copying by hand.
    }
  }
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card">
          <div class="label">
            {t(c.bust ? 'ui.chapter.ends_early' : 'ui.chapter.act_done')}
          </div>
          <h1 class="screen-title">{c.title}</h1>
          <p class="pitch">
            {c.bust
              ? t('ui.chapter.bust_body', {
                  quarter: fmt.quarter(c.curve.at(-1)?.quarter ?? ''),
                })
              : t('ui.chapter.body')}
          </p>
          <div class="end-tiles">
            <div class="panel tile">
              <span class="label">{t('ui.chapter.net_worth')}</span>
              <span class="num-xl">{fmt.money(c.netWorthUsd)}</span>
              <span class="num-s muted">
                {t('ui.chapter.net_worth_sub', {
                  stake: fmt.pct(c.founderStake),
                  valuation: fmt.money(c.finalValuationUsd),
                })}
              </span>
            </div>
            {c.growth && (
              <div class="panel tile">
                <span class="label">{t('ui.chapter.growth')}</span>
                <span class="num-xl">
                  {t('ui.chapter.growth_value', {
                    multiple: c.growth.multiple.toLocaleString('en-US', {
                      maximumFractionDigits: 1,
                    }),
                  })}
                </span>
                <span class="num-s muted">
                  {t('ui.chapter.growth_sub', {
                    start: fmt.money(c.growth.startUsd),
                  })}
                </span>
              </div>
            )}
            <div class="panel tile">
              <span class="label">{t('ui.end.peak')}</span>
              <span class="num-xl">{fmt.money(c.peak?.valuationUsd ?? 0)}</span>
              <span class="num-s muted">
                {c.peak ? fmt.quarter(c.peak.quarter) : ''}
              </span>
            </div>
            <div class="panel tile">
              <span class="label">{t('ui.chapter.rank')}</span>
              <span class="num-xl">
                {c.rank ? t('ui.chapter.rank_value', c.rank) : '—'}
              </span>
              <span class="num-s muted">
                {t('ui.chapter.quarters', {
                  n: c.quartersPlayed,
                  of: actTurn(s).turns,
                })}
              </span>
            </div>
          </div>
          <div>
            <span class="label">{t('ui.chapter.curve')}</span>
            <CareerChart curve={c.curve} />
          </div>
          {/* M37.5 (doc 39): the act's P&L in figures, its best and worst site */}
          <ActFinances state={s} act={1} />
          {c.mergeChoice && (
            <div class="panel p">
              <span class="label">{t('ui.chapter.your_merge')}</span>
              <strong>
                {tDynamic(`merge_choice.${c.mergeChoice.id}`, c.mergeChoice.id)}
              </strong>
              <p class="num-s muted" style={{ margin: 0 }}>
                {c.mergeChoice.act2Preview}
              </p>
            </div>
          )}
          <div class="log">
            <span class="label">{t('ui.chapter.moments')}</span>
            {momentLines(c).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          {s.reports.length > 0 && <League state={s} r={s.reports.at(-1)!} />}
          {exported !== null && (
            <label class="field">
              <span class="label">{t('ui.chapter.export_help')}</span>
              <textarea
                class="export-box"
                readOnly
                rows={8}
                value={exported}
                onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {props.onContinue && (
              <button
                type="button"
                class="btn btn-primary"
                onClick={props.onContinue}
              >
                {t('ui.chapter.continue_act2')}
              </button>
            )}
            <button
              type="button"
              class={props.onContinue ? 'btn' : 'btn btn-primary'}
              onClick={props.onNew}
            >
              {t('ui.end.new')}
            </button>
            <button type="button" class="btn" onClick={props.onReplay}>
              {t('ui.end.replay', { seed: String(s.seed) })}
            </button>
            <button type="button" class="btn" onClick={exportRun}>
              {t('ui.chapter.export')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
