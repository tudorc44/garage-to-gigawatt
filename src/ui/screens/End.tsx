// The end of Act I: the Merge decision screen (after the 2022Q3 report), then the chapter
// report. A bust skips the Merge and goes straight to the chapter report ("Chapter ends early").
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import { chapterReport, mergeView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { momentLines, runSummaryText } from '../chapter.ts'
import { fmt } from '../format.ts'
import type { ScreenProps } from './Plan.tsx'
import { League } from './Report.tsx'

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
}) {
  const s = props.state
  const c = chapterReport(s)
  const [exported, setExported] = useState<string | null>(null)
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
                {t('ui.chapter.quarters', { n: c.quartersPlayed, of: 23 })}
              </span>
            </div>
          </div>
          <div>
            <span class="label">{t('ui.chapter.curve')}</span>
            <CareerChart curve={c.curve} />
          </div>
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
            <button type="button" class="btn btn-primary" onClick={props.onNew}>
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
