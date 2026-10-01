// A3-07 Racks and retrofit (Act III, M16.5; layout from docs/wireframes/act3/A3-07-Racks.dc.html, look from the
// design system's grid theme). In Sites & Fleet: the "Halls and rack density" table, the "What fits where"
// matrix, and the panel for the selected hall: a retrofit (both options, the income lost while it runs, what
// fits afterwards) or a GPU change. Everything comes from racksView (sim/projectViews.ts); no rules here. The
// mid→top price is this quarter's only (a live market price, like rents); nothing shows a future value.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { DensityTier } from '../../content/index.ts'
import { racksView } from '../../sim/projectViews.ts'
import { fmt } from '../format.ts'
import { say, siteName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'
import { BwButton } from './Projects.tsx'

type View = NonNullable<ReturnType<typeof racksView>>
type Row = View['rows'][number]

const gpuName = (id: string) => tDynamic(`gpu.${id}`, id)
const FILL: Record<DensityTier, number> = { low: 1, mid: 2, top: 3 }

/** The tier's label: "Low · 40–60 kW/rack", "Mid · ~125 kW/rack", "Top · ~600 kW/rack". */
function tierLabel(v: View, tier: DensityTier, unit: 'rack' | 'kw' = 'rack') {
  const r = v.tierRack[tier]
  return tDynamic(`ui.act3.density.${tier}${unit === 'kw' ? '_kw' : ''}`, tier, {
    lo: r.range[0],
    hi: r.range[1],
    kw: r.rackKw,
  })
}

/** The density badge: the tier's label and a 1-2-3 fill, so tiers read without colour (Components). */
export function DensityBadge(props: { v: View; tier: DensityTier }) {
  return (
    <span class="den" data-density={props.tier}>
      <i aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <b key={n} class={n <= FILL[props.tier] ? '' : 'o'} />
        ))}
      </i>
      {tierLabel(props.v, props.tier)}
    </span>
  )
}

const hallName = (r: Row) =>
  `${siteName(r.site)} · ${t('ui.projects.name', { tier: r.site.tier, n: r.project.n })}`

// ---------- the table ----------

function HallsTable(props: {
  v: View
  selected: string | null
  onPick: (id: string, mode: 'retrofit' | 'refit') => void
}) {
  const { v } = props
  return (
    <div class="panel p" data-halls>
      <div class="row-between">
        <h2 class="panel-title">{t('ui.act3.racks.title')}</h2>
        <span class="num-s muted">
          {t('ui.act3.racks.energized', { mw: fmt.power(v.energizedMw * 1000) })}
        </span>
      </div>
      {v.rows.length === 0 ? (
        <p class="num-s muted">{t('ui.act3.racks.none')}</p>
      ) : (
        <table class="num-s">
          <thead>
            <tr>
              <th>{t('ui.act3.racks.col.hall')}</th>
              <th class="r">{t('ui.act3.racks.col.mw')}</th>
              <th>{t('ui.act3.racks.col.density')}</th>
              <th>{t('ui.act3.racks.col.fits')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r) => (
              <tr
                key={r.project.id}
                data-hall={r.project.id}
                class={props.selected === r.project.id ? 'on' : undefined}
              >
                <td>
                  {hallName(r)}
                  {r.project.stage !== 'live' && (
                    <span class="muted">
                      {' '}
                      · {tDynamic(`ui.act3.racks.stage.${r.project.stage}`, r.project.stage)}
                    </span>
                  )}
                </td>
                <td class="r num">{fmt.power(r.mw * 1000)}</td>
                <td>
                  <DensityBadge v={v} tier={r.tier} />
                </td>
                <td>{r.fits.map(gpuName).join(', ')}</td>
                <td class="r">
                  {r.downtime ? (
                    <span class="tag" data-downtime>
                      {t(`ui.act3.racks.downtime.${r.downtime.kind}`, {
                        quarter: fmt.quarter(r.downtime.until),
                      })}
                    </span>
                  ) : (
                    <span class="racks-acts">
                      {r.retrofit.blocker ? (
                        <span class="num-s muted" data-block>
                          {say(r.retrofit.blocker)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          class="btn"
                          data-retrofit={r.project.id}
                          onClick={() => props.onPick(r.project.id, 'retrofit')}
                        >
                          {t('ui.act3.racks.retrofit')}
                        </button>
                      )}
                      {r.refit && (
                        <button
                          type="button"
                          class="btn"
                          data-refit={r.project.id}
                          disabled={!!r.refit.blocker}
                          title={r.refit.blocker ? say(r.refit.blocker) : undefined}
                          onClick={() => props.onPick(r.project.id, 'refit')}
                        >
                          {t('ui.act3.racks.refit')}
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------- the fit matrix ----------

function FitMatrix({ v }: { v: View }) {
  const tiers: DensityTier[] = ['low', 'mid', 'top']
  return (
    <div class="panel p" data-fit-matrix>
      <div class="row-between">
        <h2 class="panel-title">{t('ui.act3.racks.matrix_title')}</h2>
        <span class="num-s muted">{t('ui.act3.racks.matrix_sub')}</span>
      </div>
      <table class="num-s fit-matrix">
        <thead>
          <tr>
            <th>{t('ui.act3.racks.matrix_gen')}</th>
            {tiers.map((tier) => (
              <th key={tier} class="c">
                {tierLabel(v, tier, 'kw')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {v.matrix.map((m) => (
            <tr key={m.id} data-gen={m.id}>
              <td>
                {t(`ui.act3.racks.gen.${m.id}`)}
                {m.from && (
                  <span class="muted"> {t('ui.act3.racks.from', { quarter: fmt.quarter(m.from) })}</span>
                )}
              </td>
              {tiers.map((tier) => (
                <td
                  key={tier}
                  class={`c${m.needs === tier ? ' needs' : ''}`}
                  data-fit={m.fits[tier] ? 'yes' : 'no'}
                >
                  {m.fits[tier]
                    ? t('ui.act3.racks.fits')
                    : t('ui.act3.racks.too_dense')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.act3.racks.matrix_note')}
      </p>
    </div>
  )
}

// ---------- the retrofit panel ----------

function RetrofitPanel(props: ScreenProps & { v: View; r: Row; onClose: () => void }) {
  const { v, r } = props
  const o = r.retrofit
  const option = (
    which: 'low_to_mid' | 'mid_to_top',
    x: typeof o.lowToMid | typeof o.midToTop,
  ) => {
    const on = o.to === (which === 'low_to_mid' ? 'mid' : 'top')
    return (
      <div class={`opt${on ? ' on' : ''}`} data-option={which} data-on={on ? 'true' : undefined}>
        <strong>{t(`ui.act3.racks.option.${which}`)}</strong>
        <span class="num">
          {t('ui.act3.racks.per_mw', { usd: fmt.money(x.usdMw) })}
        </span>
        <span class="num-s">
          {t('ui.act3.racks.times_mw', {
            mw: fmt.power(r.mw * 1000),
            total: fmt.money(x.totalUsd),
          })}
        </span>
        {which === 'mid_to_top' && (
          <span class="num-s muted">{t('ui.act3.racks.market_price')}</span>
        )}
        <span class="num-s">{t('ui.act3.racks.weeks', { n: x.weeks })}</span>
        <span class="num-s muted">
          {on
            ? t('ui.act3.racks.selected')
            : which === 'mid_to_top' && r.tier === 'low'
              ? t('ui.act3.racks.needs_mid')
              : t('ui.act3.racks.done_already')}
        </span>
      </div>
    )
  }
  return (
    <div class="panel p racks-panel" data-retrofit-panel>
      <span class="label">{t('ui.act3.racks.project_retrofit')}</span>
      <h2 class="panel-title">{t('ui.act3.racks.retrofit_title', { hall: hallName(r) })}</h2>
      <div class="opts">
        {option('low_to_mid', o.lowToMid)}
        {option('mid_to_top', o.midToTop)}
      </div>
      <div class="kv">
        <span>{t('ui.act3.racks.income')}</span>
        <span class="num" data-income>
          {o.income
            .map((x) =>
              t('ui.act3.racks.income_q', {
                quarter: fmt.quarter(x.quarter),
                share: fmt.pct(x.share),
                usd: fmt.money(x.usd),
              }),
            )
            .join(' · ')}
        </span>
      </div>
      <div class="kv">
        <span>{t('ui.act3.racks.after')}</span>
        <span data-after>{o.afterFits.map(gpuName).join(', ')}</span>
      </div>
      <div class="kv">
        <span>{t('ui.act3.racks.cash_now')}</span>
        <span class="num">{fmt.money(v.cashUsd)}</span>
      </div>
      <p class="num-s" style={{ margin: 0 }}>
        {o.leased ? t('ui.act3.racks.tenant_note') : t('ui.act3.racks.earns_note')}
      </p>
      <div class="row-between">
        <button type="button" class="btn" onClick={props.onClose}>
          {t('ui.act3.racks.cancel')}
        </button>
        <BwButton
          label={t('ui.act3.racks.start')}
          bw={v.bandwidth.retrofit}
          primary
          action={{ type: 'RETROFIT', projectId: r.project.id }}
          state={props.state}
          act={props.act}
          onDone={props.onClose}
        />
      </div>
    </div>
  )
}

// ---------- the GPU change panel ----------

function RefitPanel(props: ScreenProps & { v: View; r: Row; onClose: () => void }) {
  const { v, r } = props
  const choices = r.refit!.choices
  const [gpu, setGpu] = useState(
    choices.find((c) => !c.blocker)?.gpu ?? choices[0]?.gpu ?? '',
  )
  const pick = choices.find((c) => c.gpu === gpu)
  return (
    <div class="panel p racks-panel" data-refit-panel>
      <span class="label">{t('ui.act3.racks.project_refit')}</span>
      <h2 class="panel-title">
        {t('ui.act3.racks.refit_title', {
          hall: hallName(r),
          gpu: gpuName(r.project.gpu ?? ''),
        })}
      </h2>
      <table class="num-s">
        <thead>
          <tr>
            <th />
            <th>{t('ui.act3.racks.col.gen')}</th>
            <th class="r">{t('ui.act3.racks.col.unit')}</th>
            <th class="r">{t('ui.act3.racks.col.count')}</th>
            <th class="r">{t('ui.act3.racks.col.cost')}</th>
            <th class="r">{t('ui.act3.racks.col.net')}</th>
            <th class="r">{t('ui.act3.racks.col.weeks')}</th>
          </tr>
        </thead>
        <tbody>
          {choices.map((c) => (
            <tr key={c.gpu} data-choice={c.gpu}>
              <td>
                <input
                  type="radio"
                  name="refit-gpu"
                  checked={c.gpu === gpu}
                  onChange={() => setGpu(c.gpu)}
                  aria-label={gpuName(c.gpu)}
                />
              </td>
              <td>{gpuName(c.gpu)}</td>
              <td class="r num">{fmt.money(c.plan.unitUsd)}</td>
              <td class="r num">{c.plan.count.toLocaleString('en-US')}</td>
              <td class="r num">{fmt.money(c.plan.newUsd)}</td>
              <td class="r num">{fmt.money(c.plan.netUsd)}</td>
              <td class="r num">{c.plan.weeks}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="kv">
        <span>{t('ui.act3.racks.sale_value')}</span>
        <span class="num" data-sale>{fmt.money(r.refit!.saleUsd)}</span>
      </div>
      {pick && (
        <div class="kv">
          <span>{t('ui.act3.racks.income')}</span>
          <span class="num">
            {t('ui.act3.racks.refit_downtime', { n: pick.plan.weeks })}
          </span>
        </div>
      )}
      <div class="kv">
        <span>{t('ui.act3.racks.cash_now')}</span>
        <span class="num">{fmt.money(v.cashUsd)}</span>
      </div>
      {pick?.blocker && <p class="num-s loss">{say(pick.blocker)}</p>}
      <div class="row-between">
        <button type="button" class="btn" onClick={props.onClose}>
          {t('ui.act3.racks.cancel')}
        </button>
        <BwButton
          label={t('ui.act3.racks.refit_start')}
          bw={v.bandwidth.refit}
          primary
          action={{ type: 'REFIT_GPUS', projectId: r.project.id, gpu }}
          state={props.state}
          act={props.act}
          onDone={props.onClose}
        />
      </div>
    </div>
  )
}

// ---------- the section block ----------

/** A3-07 in Sites & Fleet (Act III only): the halls table and the fit matrix, with the selected hall's panel. */
export function RacksPanel({ state, act }: ScreenProps) {
  const v = racksView(state)
  const [pick, setPick] = useState<{ id: string; mode: 'retrofit' | 'refit' } | null>(null)
  if (!v) return null
  const row = pick ? v.rows.find((r) => r.project.id === pick.id) : undefined
  const close = () => setPick(null)
  return (
    <div class="racks" data-racks>
      <div class="col">
        <HallsTable
          v={v}
          selected={pick?.id ?? null}
          onPick={(id, mode) => setPick({ id, mode })}
        />
        <FitMatrix v={v} />
      </div>
      <div class="col">
        {row && pick?.mode === 'retrofit' && (
          <RetrofitPanel state={state} act={act} v={v} r={row} onClose={close} />
        )}
        {row && pick?.mode === 'refit' && row.refit && (
          <RefitPanel state={state} act={act} v={v} r={row} onClose={close} />
        )}
        {!row && (
          <div class="panel p">
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.act3.racks.pick')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
