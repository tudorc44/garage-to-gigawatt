// Act V's screens (M62.3, doc 43 §17 with §0.18): A5-02's dashboard (the MW strip in four columns: firm, flexible,
// orbital, leased, per M57's megawatt split; plants and the queue at a glance), the lunar holding panel (Capital), and
// A5-07's quarter report panels (plants, queue). Everything from the sim's views; no rules here. Nothing reads the
// future: the megawatt split, the plants and the queue are the player's own.
import { useContext } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { megawattMix } from '../../sim/systems/megawattMix.ts'
import { lunarHoldingView } from '../../sim/systems/lunarHolding.ts'
import { plantsView } from '../../sim/systems/plants.ts'
import { queueView } from '../../sim/systems/queue.ts'
import { NavContext } from '../components/frame.tsx'
import { Runway } from '../components/runway.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const KINDS = ['firm', 'flexible', 'orbital', 'landlord'] as const
const kindName = (k: (typeof KINDS)[number]) => tDynamic(`ui.act5.mw_title.${k}`, k)
const typeName = (type: string) => tDynamic(`venture_type.${type}`, type)

/** A5-02: the Plan dashboard's Act V strip, in place of Act IV's. */
export function Act5Dashboard({ state }: { state: GameState }) {
  const nav = useContext(NavContext)
  const mix = megawattMix(state)
  const total = KINDS.reduce((a, k) => a + mix[k], 0)
  const plants = plantsView(state)
  const building = (state.ventures ?? []).filter(
    (v) => v.stake > 0 && v.stage !== 'operating' && v.stage !== 'cancelled' && v.stage !== 'folded',
  )
  const q = queueView(state)
  const positions = q?.positions ?? []
  const next = [...positions].map((p) => p.expectedQuarter).filter((x): x is string => !!x).sort()[0]
  return (
    <div class="panel p mw-panel" data-act5-dashboard>
      <div class="row-between">
        <h2 class="panel-title">{t('ui.act5.dash.title', { total: fmt.power(total * 1000) })}</h2>
        <div class="mw-legend">
          {KINDS.map((k) => (
            <span key={k} class="mw-key">
              <i class={`mw-${k}`} aria-hidden="true" />
              {kindName(k)} <span class="num">{fmt.power(mix[k] * 1000)}</span>
            </span>
          ))}
        </div>
      </div>
      <div class="mwbar" role="img" aria-label={KINDS.map((k) => `${kindName(k)} ${fmt.power(mix[k] * 1000)}`).join(', ')}>
        {total > 0 &&
          KINDS.filter((k) => mix[k] > 0).map((k) => (
            <div key={k} class={`mw-${k}`} style={{ width: `${(mix[k] / total) * 100}%` }}>
              {mix[k] / total >= 0.06 && <span>{kindName(k)}</span>}
            </div>
          ))}
      </div>
      <Runway state={state} />
      <div class="act5-glance">
        <section data-plants-glance>
          <div class="label">{t('ui.act5.dash.plants')}</div>
          {plants.length === 0 && building.length === 0 && <p class="num-s muted">{t('ui.act5.dash.no_plants')}</p>}
          {plants.map((p) => (
            <p key={p.id} class="num-s" style={{ margin: 0 }}>
              {t('ui.act5.dash.plant', {
                type: typeName(p.type),
                stake: `${Math.round(p.stake * 100)}%`,
                mw: fmt.power(p.mw * 1000),
                cf: `${Math.round(p.cf * 100)}%`,
                value: fmt.money(p.stakeValueUsd),
              })}
            </p>
          ))}
          {building.map((v) => (
            <p key={v.id} class="num-s muted" style={{ margin: 0 }}>
              {t('ui.act5.dash.building', { type: typeName(v.type), stage: tDynamic(`ui.ventures.stage.${v.stage}`, v.stage) })}
            </p>
          ))}
          <button type="button" class="btn btn-ghost" onClick={() => nav?.setSection('ventures')}>
            {t('ui.act5.dash.to_plants')}
          </button>
        </section>
        <section data-queue-glance>
          <div class="label">{t('ui.act5.dash.queue')}</div>
          <p class="num-s" style={{ margin: 0 }}>
            {positions.length === 0
              ? t('ui.queue.none')
              : t('ui.act5.dash.positions', {
                  n: positions.length,
                  mw: fmt.power(positions.reduce((a, p) => a + p.kw, 0)),
                  next: next ? fmt.quarter(next) : '—',
                })}
          </p>
          {q?.fastLaneQuarters != null && <p class="num-s muted">{t('ui.queue.fast_open', { n: q.fastLaneQuarters })}</p>}
          <button type="button" class="btn btn-ghost" onClick={() => nav?.setSection('projects')}>
            {t('ui.act5.dash.to_queue')}
          </button>
        </section>
      </div>
    </div>
  )
}

/** Doc 43 §9.2, §0.18: the lunar holding (Capital): its 2035 value, today's index and value, the first-tonnes range, Sell. */
export function LunarHoldingPanel({ state, act }: ScreenProps) {
  const v = lunarHoldingView(state)
  if (!v) return null
  return (
    <section class="panel p" data-lunar-holding>
      <h3 class="panel-title">{t('ui.lunar.title')}</h3>
      <p class="num-s muted" style={{ margin: 0 }}>{t('ui.lunar.body')}</p>
      <p class="num-s" style={{ margin: 0 }}>
        {t('ui.lunar.value', { then: fmt.money(v.value2035Usd), index: v.index.toFixed(2), now: fmt.money(v.valueUsd) })}
      </p>
      <p class="num-s" style={{ margin: 0 }}>
        {v.tonnesRange ? t('ui.lunar.tonnes', { lo: v.tonnesRange.lo, hi: v.tonnesRange.hi }) : t('ui.lunar.no_plant')}
      </p>
      {v.sold ? (
        <p class="num-s muted">{t('ui.lunar.sold')}</p>
      ) : (
        state.phase === 'plan' && (
          <button
            type="button"
            class="btn"
            data-sell-lunar
            disabled={!!v.blocked}
            title={v.blocked ? say(v.blocked) : undefined}
            onClick={() => act({ type: 'SELL_LUNAR_HOLDING' })}
          >
            {t('ui.lunar.sell', { usd: fmt.money(v.saleUsd) })}
          </button>
        )
      )}
    </section>
  )
}

/** A5-07: the quarter report's plants and queue panels. */
export function Act5ReportPanel({ state }: { state: GameState }) {
  const plants = plantsView(state)
  const q = queueView(state)
  const positions = q?.positions ?? []
  if (plants.length === 0 && positions.length === 0) return null
  return (
    <div class="panel p" data-act5-report>
      <h2 class="panel-title">{t('ui.act5.report.title')}</h2>
      {plants.map((p) => (
        <p key={p.id} class="num-s" style={{ margin: 0 }}>
          {t('ui.act5.report.plant', {
            type: typeName(p.type),
            mwh: Math.round(p.mwh).toLocaleString('en-US'),
            cf: `${Math.round(p.cf * 100)}%`,
            ebitda: fmt.money(p.stakeEbitdaUsd),
            contracted: `${Math.round(p.contractedShare * 100)}%`,
            value: fmt.money(p.stakeValueUsd),
          })}
        </p>
      ))}
      {positions.length > 0 && (
        <p class="num-s" style={{ margin: 0 }}>
          {t('ui.act5.report.queue', {
            n: positions.length,
            mw: fmt.power(positions.reduce((a, p) => a + p.kw, 0)),
            billsDue: positions.filter((p) => p.billUsd !== null && !p.billPaid).length,
          })}
        </p>
      )}
    </div>
  )
}
