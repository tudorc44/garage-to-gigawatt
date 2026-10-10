// M35 (doc 38 §4): a site's Power options, opened from its card. What's built (and how it's doing), what can be built
// with its honest numbers (capex, build time, payback: E-D1's "badge, not a cost cutter"), Texas's demand response and
// 4CP (E-D6), and a flare pad's well. All numbers come from the sim's energy views.
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { energyCardView, type EnergyChoiceView, type EnergyQuote } from '../../sim/energyViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { say, siteLong } from '../names.ts'
import { Dialog } from './basics.tsx'

type Act = (a: Action) => Message | null

const kindName = (kind: string) => tDynamic(`ui.energy.kind.${kind}`, kind)

/** M39.6 (doc 41): the reality line under a kind (doc 40 §Q5): the home kinds' 2015 cost, the utility kinds' 1 MW cost. */
const REALITY: Partial<Record<string, 'ui.energy.reality.home' | 'ui.energy.reality.utility'>> = {
  rooftop_solar: 'ui.energy.reality.home',
  home_battery: 'ui.energy.reality.home',
  btm_solar: 'ui.energy.reality.utility',
  bess: 'ui.energy.reality.utility',
}

/** "7 kW", "4 blocks", "20 MW · 4 h". */
function sizeLabel(unit: EnergyChoiceView['unit'], size: number, hours?: number): string {
  const base =
    unit === 'blocks'
      ? t('ui.energy.blocks', { n: size })
      : fmt.power(unit === 'mw' ? size * 1000 : size)
  return hours ? t('ui.energy.with_hours', { size: base, hours }) : base
}

/** "Pays back in about 19 years", "Never pays back here", or the $/MWh line for an asset that earns otherwise. */
function paybackLine(q: Pick<EnergyQuote, 'paybackYears' | 'effectiveUsdMwh'>, kind: string): string {
  if (q.paybackYears !== null) return t('ui.energy.payback', { years: Math.max(1, Math.round(q.paybackYears)) })
  if (kind === 'home_battery') return t('ui.energy.no_arbitrage')
  if (kind === 'bess' || kind === 'iron_air') return t(`ui.energy.earns.${kind}`)
  return t('ui.energy.never_pays')
}

export function EnergyDialog(props: { state: GameState; act: Act; siteId: string; onClose: () => void }) {
  const { state, act, siteId } = props
  const v = energyCardView(state, siteId)
  const site = state.sites.find((s) => s.id === siteId)
  const [error, setError] = useState<Message | null>(null)
  if (!v || !site) return null
  const run = (a: Action) => setError(act(a))
  return (
    <Dialog title={t('ui.energy.title', { site: siteLong(state, site) })} onClose={props.onClose}>
      <div class="energy-dialog" data-energy={siteId}>
        <p class="num-s muted" style={{ margin: 0 }}>
          {t('ui.energy.intro')}
        </p>
        {error && <p class="num-s warn">{say(error)}</p>}

        {v.assets.length > 0 && (
          <section class="site-card-sec">
            <h3 class="label">{t('ui.energy.built')}</h3>
            {v.assets.map((a) => (
              <p key={a.id} class="num-s" data-energy-asset={a.kind}>
                {kindName(a.kind)}
                {' · '}
                {a.blocks !== undefined ? t('ui.energy.blocks', { n: a.blocks }) : fmt.power(a.kw)}
                {a.hours ? ` · ${t('ui.energy.hours', { hours: a.hours })}` : ''}
                {' · '}
                {a.status === 'building'
                  ? t('ui.energy.building_until', { quarter: fmt.quarter(a.readyQuarter) })
                  : t(`ui.energy.status.${a.status}`)}
                {a.cf !== null &&
                  ` · ${t(a.cfPitched ? 'ui.energy.cf_pitched' : 'ui.energy.cf', { pct: Math.round(a.cf * 100) })}`}
                {a.status !== 'building' && ` · ${paybackLine({ paybackYears: a.paybackYears, effectiveUsdMwh: null }, a.kind)}`}
                {a.repairUsd !== null && (
                  <>
                    {' '}
                    <button
                      type="button"
                      class="btn"
                      onClick={() => run({ type: 'ENERGY_REPAIR', siteId, assetId: a.id })}
                    >
                      {t('ui.energy.repair', { cost: fmt.money(a.repairUsd) })}
                    </button>
                  </>
                )}
              </p>
            ))}
            {v.firmKw > 0 && <p class="num-s">{t('ui.energy.firm', { kw: fmt.power(v.firmKw) })}</p>}
          </section>
        )}

        {v.choices.length > 0 && (
          <section class="site-card-sec">
            <h3 class="label">{t('ui.energy.build')}</h3>
            {v.choices.map((c) => (
              <Choice key={c.kind} c={c} onBuild={(q) => run({ type: 'ENERGY_BUILD', siteId, kind: c.kind, size: q.size, hours: q.hours })} />
            ))}
          </section>
        )}
        {v.choices.length === 0 && v.assets.length === 0 && !v.texas && !v.flare && (
          <p class="num-s muted">{t('ui.energy.none')}</p>
        )}

        {v.texas && (
          <section class="site-card-sec" data-texas>
            <h3 class="label">{t('ui.energy.texas')}</h3>
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.energy.texas_note')}
            </p>
            {v.texas.blocked && <p class="num-s warn">{say(v.texas.blocked)}</p>}
            <label class="num-s energy-toggle">
              <input
                type="checkbox"
                checked={v.texas.enrolled}
                disabled={!!v.texas.blocked && !v.texas.enrolled}
                onChange={() => run({ type: 'TEXAS_SET', siteId, enrolled: !v.texas!.enrolled })}
              />
              {t('ui.energy.dr', {
                mw: fmt.power(v.texas.curtailableMw * 1000),
                credit: fmt.money(v.texas.creditUsd),
                summer: tDynamic(`texas_summer.${v.texas.summer}`, v.texas.summer),
              })}
            </label>
            {/* M39.1 (doc 41): the resale of that power, paid with the credit, on a fixed-price contract only */}
            <p class="num-s">
              {v.texas.fixedPrice
                ? t('ui.energy.resale', { usd: fmt.money(v.texas.resaleUsd) })
                : t('ui.energy.resale_none')}
            </p>
            {v.texas.aiMw > 0 && (
              <p class="num-s">
                {t('ui.energy.ai_excluded', {
                  ai: fmt.power(v.texas.aiMw * 1000),
                  battery: fmt.power(v.texas.bessMw * 1000),
                })}
              </p>
            )}
            {v.texas.forfeited && <p class="num-s warn">{t('ui.energy.forfeited')}</p>}
            <label class="num-s energy-toggle">
              <input
                type="checkbox"
                checked={v.texas.fourCp}
                disabled={(!!v.texas.blocked || !!v.texas.fourCpBlocked) && !v.texas.fourCp}
                onChange={() => run({ type: 'TEXAS_SET', siteId, fourCp: !v.texas!.fourCp })}
              />
              {t('ui.energy.four_cp', { usd: fmt.money(v.texas.fourCpUsdMw) })}
            </label>
            {v.texas.fourCpBlocked && <p class="num-s muted">{say(v.texas.fourCpBlocked)}</p>}
            {v.texas.discountYear && (
              <p class="num-s">
                {t('ui.energy.discount', { year: v.texas.discountYear, usd: fmt.money(v.texas.fourCpSavingUsd) })}
              </p>
            )}
          </section>
        )}

        {v.flare && (
          <section class="site-card-sec" data-flare>
            <h3 class="label">{t('ui.energy.flare')}</h3>
            <p class="num-s">
              {v.flare.movingUntil !== null
                ? t('ui.energy.flare_moving', { quarter: fmt.quarter(v.flare.movingUntil) })
                : t('ui.energy.flare_output', { pct: Math.round(v.flare.outputShare * 100) })}
            </p>
            <button
              type="button"
              class="btn"
              disabled={!!v.flare.relocateBlocked}
              onClick={() => run({ type: 'FLARE_RELOCATE', siteId })}
            >
              {t('ui.energy.relocate', { cost: fmt.money(v.flare.relocateUsd) })}
            </button>
            {v.flare.relocateBlocked && <span class="num-s muted"> {say(v.flare.relocateBlocked)}</span>}
          </section>
        )}
      </div>
    </Dialog>
  )
}

/** One kind on offer: pick a size (and a battery's hours), see the numbers, build. */
function Choice(props: { c: EnergyChoiceView; onBuild: (q: EnergyQuote) => void }) {
  const { c } = props
  const [pick, setPick] = useState(0)
  const q = c.quotes[Math.min(pick, c.quotes.length - 1)]
  return (
    <div class="energy-choice" data-energy-choice={c.kind}>
      <div class="row-between">
        <strong class="num-s">{kindName(c.kind)}</strong>
        {q && (
          <span class="num-s">
            {fmt.money(q.capexUsd)} · {t('ui.energy.build_quarters', { n: q.buildQuarters })}
          </span>
        )}
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t(`ui.energy.what.${c.kind}`)}
      </p>
      {/* M39.6 (doc 41, doc 40 §Q5): what running a rig on sun and batteries alone really costs */}
      {REALITY[c.kind] && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {t(REALITY[c.kind]!)}
        </p>
      )}
      {c.blocked && <p class="num-s muted">{say(c.blocked)}</p>}
      {q && (
        <div class="energy-choice-row">
          {c.quotes.length > 1 && (
            <select
              aria-label={t('ui.energy.size')}
              value={String(pick)}
              onChange={(e) => setPick(Number((e.target as HTMLSelectElement).value))}
            >
              {c.quotes.map((x, i) => (
                <option key={i} value={String(i)}>
                  {sizeLabel(c.unit, x.size, x.hours)}
                </option>
              ))}
            </select>
          )}
          {c.quotes.length === 1 && <span class="num-s">{sizeLabel(c.unit, q.size, q.hours)}</span>}
          <span class="num-s">{paybackLine(q, c.kind)}</span>
          <button type="button" class="btn" disabled={!!q.blocked} onClick={() => props.onBuild(q)}>
            {t('ui.energy.build_button')}
          </button>
          {q.blocked && <span class="num-s muted">{say(q.blocked)}</span>}
        </div>
      )}
    </div>
  )
}
