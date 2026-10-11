// M36 (doc 38 §5): the Ventures page, Acts III-IV. Your ventures (stage, stake, value, cash calls waiting for an
// answer) and the offers: one developer per type, its pitch, diligence's reference-class estimate, and a join form
// (a stake, an offtake for one of your sites, a prepayment). Numbers come from the sim's venture views.
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { offtakePrepayUsd, tailShare, venturesView, type VentureOfferView } from '../../sim/ventureViews.ts'
import type { GameState } from '../../sim/state.ts'
import { plantsView } from '../../sim/systems/plants.ts'
import { followOnOffers } from '../../sim/systems/ventures.ts'
import { SiteName } from '../components/siteName.tsx'
import { fmt } from '../format.ts'
import { say, siteName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const typeName = (type: string) => tDynamic(`ui.ventures.type.${type}`, type)
const pct = (x: number) => `${Math.round(x * 100)}%`

export function VenturesSection({ state, act }: ScreenProps) {
  const v = venturesView(state)
  const [error, setError] = useState<Message | null>(null)
  const run = (a: Action) => setError((act as (a: Action) => Message | null)(a))
  return (
    <div class="section ventures" data-ventures>
      <div class="col">
        <section class="panel p">
          <h2 class="panel-title">{t('ui.ventures.title')}</h2>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.ventures.intro')}
          </p>
          {error && <p class="num-s warn">{say(error)}</p>}
          {!v.open && <p class="num-s muted">{t('ui.ventures.closed')}</p>}
        </section>
        {v.mine.length > 0 && (
          <section class="panel p" data-my-ventures>
            <div class="row-between">
              <h3 class="panel-title">{t('ui.ventures.mine')}</h3>
              <span class="num-s">{t('ui.ventures.total', { value: fmt.money(v.totalValueUsd) })}</span>
            </div>
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.ventures.marks_note', { hit: String(v.marks.hit), slip: String(v.marks.slip) })}
            </p>
            {v.mine.map((m) => (
              <div key={m.id} class="venture-row" data-venture={m.type}>
                <div class="row-between">
                  <strong class="num-s">{typeName(m.type)}</strong>
                  <span class="num-s">
                    {tDynamic(`ui.ventures.stage.${m.stage}`, m.stage)}
                    {m.sinceQuarter && ` · ${fmt.quarter(m.sinceQuarter)}`}
                  </span>
                </div>
                <p class="num-s" style={{ margin: 0 }}>
                  {[
                    m.stake > 0
                      ? t('ui.ventures.stake_line', { stake: pct(m.stake), paid: fmt.money(m.paidUsd), value: fmt.money(m.valueUsd) })
                      : m.walked
                        ? t('ui.ventures.walked')
                        : null,
                    m.offtakeMw > 0
                      ? t('ui.ventures.offtake_line', {
                          mw: fmt.power(m.offtakeMw * 1000),
                          price: `$${Math.round(m.ppaUsdMwh)}`,
                        })
                      : null,
                    m.gatesPassed !== null
                      ? t('ui.ventures.gates', { n: m.gatesPassed })
                      : t('ui.ventures.calls', { n: m.callsDone }),
                    m.reopened ? t('ui.ventures.reopened') : null,
                    t('ui.ventures.marked', { hit: m.milestones, slips: m.slips }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {m.siteId && (
                    <>
                      {' · '}
                      <SiteName state={state} site={state.sites.find((s) => s.id === m.siteId)!} />
                    </>
                  )}
                </p>
                {m.call && state.phase === 'plan' && (
                  <div class="venture-call" data-venture-call={m.id}>
                    <p class="num-s warn" style={{ margin: 0 }}>
                      {t(m.call.n === 4 ? 'ui.ventures.call_field' : m.call.n === 5 ? 'ui.ventures.call_pivot' : 'ui.ventures.call', {
                        n: m.call.n,
                        due: fmt.money(m.call.dueUsd),
                      })}
                    </p>
                    <div class="energy-choice-row">
                      {m.call.choices.map((c) => (
                        <button
                          key={c.choice}
                          type="button"
                          class="btn"
                          disabled={!!c.blocked}
                          title={c.blocked ? say(c.blocked) : undefined}
                          onClick={() => run({ type: 'VENTURE_CALL', ventureId: m.id, choice: c.choice })}
                        >
                          {t(`ui.ventures.choice.${c.choice}`, {
                            pay: fmt.money(c.payUsd),
                            share: pct(c.choice === 'partner' ? (m.call!.partnerShare ?? 0) : (m.call!.costShare ?? 0)),
                          })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
      <div class="col">
        {/* (M52: in Act V, your running plants and the developers' next units) */}
        {state.act === 5 && <PlantsPanel state={state} run={run} />}
        {v.offers.map((o) => (
          <Offer key={o.type} state={state} o={o} run={run} />
        ))}
      </div>
    </div>
  )
}

/**
 * Act V's plants (M52, doc 43 §7, §11, §14.1): each running plant you hold a stake in, what it earns and what your
 * stake is worth, with its three actions (plant debt, a fund sale, an output contract); then the developers' next units.
 */
function PlantsPanel(props: { state: GameState; run: (a: Action) => void }) {
  const plants = plantsView(props.state)
  const followOns = followOnOffers(props.state)
  const plan = props.state.phase === 'plan'
  if (plants.length === 0 && followOns.length === 0) return null
  return (
    <section class="panel p" data-plants>
      <h3 class="panel-title">{t('ui.plants.title')}</h3>
      {plants.map((p) => (
        <div key={p.id} class="venture-row" data-plant={p.type}>
          <div class="row-between">
            <strong class="num-s">{typeName(p.type)}</strong>
            <span class="num-s">{t('ui.plants.value', { value: fmt.money(p.stakeValueUsd), stake: pct(p.stake) })}</span>
          </div>
          <p class="num-s" style={{ margin: 0 }}>
            {t('ui.plants.line', {
              ebitda: fmt.money(p.stakeEbitdaUsd),
              contracted: pct(p.contractedShare),
              multiple: `${p.multiple.toFixed(1)}×`,
            })}
            {p.debtUsd > 0 && ` · ${t('ui.plants.debt', { debt: fmt.money(p.debtUsd) })}`}
            {p.lockedUp && ` · ${t('ui.plants.locked')}`}
          </p>
          {plan && (
            <div class="energy-choice-row">
              <button
                type="button"
                class="btn"
                disabled={!!p.debtBlocked}
                title={p.debtBlocked ? say(p.debtBlocked) : undefined}
                onClick={() => props.run({ type: 'ARRANGE_PLANT_DEBT', ventureId: p.id })}
              >
                {t(`ui.plants.debt_btn.${p.debtKind}`, { usd: fmt.money(p.debtOfferUsd) })}
              </button>
              <button
                type="button"
                class="btn"
                disabled={!!p.saleBlocked}
                title={p.saleBlocked ? say(p.saleBlocked) : undefined}
                onClick={() => props.run({ type: 'SELL_PLANT_STAKE', ventureId: p.id, share: 0.5 })}
              >
                {t('ui.plants.sell_half', { usd: fmt.money(p.bidHalfUsd) })}
              </button>
              <button
                type="button"
                class="btn"
                disabled={!!p.saleBlocked}
                title={p.saleBlocked ? say(p.saleBlocked) : undefined}
                onClick={() => props.run({ type: 'SELL_PLANT_STAKE', ventureId: p.id, share: 1 })}
              >
                {t('ui.plants.sell_all', { usd: fmt.money(p.bidAllUsd) })}
              </button>
              <button
                type="button"
                class="btn"
                disabled={!!p.contractBlocked}
                title={p.contractBlocked ? say(p.contractBlocked) : undefined}
                onClick={() => props.run({ type: 'CONTRACT_PLANT_OUTPUT', ventureId: p.id, share: p.contractShare })}
              >
                {t('ui.plants.contract_btn', { share: pct(p.contractShare) })}
              </button>
            </div>
          )}
        </div>
      ))}
      {followOns.map((f) => (
        <div key={f.cls} class="venture-row" data-follow-on={f.cls}>
          <p class="num-s" style={{ margin: 0 }}>
            {t('ui.plants.follow_line', {
              type: typeName(f.type),
              mw: fmt.power(f.mw * 1000),
              pitch: `$${Math.round(f.pitchUsdKw).toLocaleString('en-US')}`,
            })}
          </p>
          {plan && (
            <button
              type="button"
              class="btn"
              disabled={!!f.blocked}
              title={f.blocked ? say(f.blocked) : undefined}
              onClick={() => props.run({ type: 'COMMIT_FOLLOW_ON', venture: f.type, stake: f.stake, offtake: 0, prepay: 0 })}
            >
              {t('ui.plants.follow_btn', { stake: pct(f.stake), usd: fmt.money(f.buyInUsd) })}
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

function Offer(props: { state: GameState; o: VentureOfferView; run: (a: Action) => void }) {
  const { o, run, state } = props
  const [stake, setStake] = useState(0)
  const [offtake, setOfftake] = useState(0)
  const [prepay, setPrepay] = useState(0)
  const [siteId, setSiteId] = useState(o.sites[0]?.id ?? '')
  const stakeCost = o.stakes.find((s) => s.share === stake)?.costUsd ?? 0
  const prepayCost = offtake > 0 ? offtakePrepayUsd(o.type, offtake, prepay) : 0
  const plan = state.phase === 'plan'
  const tail = tailShare(o.overrunClass)
  return (
    <section class="panel p venture-offer" data-venture-offer={o.type}>
      <div class="row-between">
        <h3 class="panel-title">{typeName(o.type)}</h3>
        <span class="num-s">{fmt.power(o.mw * 1000)}</span>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t(`ui.ventures.what.${o.type}`)}
      </p>
      <p class="num-s" style={{ margin: 0 }} data-venture-developer>
        {t('ui.ventures.developer', {
          stage: tDynamic(`ui.ventures.stage.${o.developerStage}`, o.developerStage),
          start: fmt.quarter(o.developerStart),
        })}
      </p>
      <p class="num-s" style={{ margin: 0 }}>
        {t(o.type === 'fusion' ? 'ui.ventures.pitch_fusion' : o.pitchPpaUsdMwh === null ? 'ui.ventures.pitch_storage' : 'ui.ventures.pitch', {
          capex: fmt.money(o.pitchUsdKw),
          year: o.pitchYear ?? '—',
          price: o.pitchPpaUsdMwh !== null ? `$${o.pitchPpaUsdMwh}` : '—',
        })}
      </p>
      {o.referenceUsdKw !== null ? (
        <p class="num-s" style={{ margin: 0 }} data-venture-reference>
          {o.type === 'fusion'
            ? t('ui.ventures.reference_fusion', { capex: fmt.money(o.referenceUsdKw), p: pct(o.p2035) })
            : t('ui.ventures.reference', {
                capex: fmt.money(o.referenceUsdKw),
                tail: tail !== null ? pct(tail) : '—',
                p: pct(o.p2035),
              })}
        </p>
      ) : (
        <div class="energy-choice-row">
          <button
            type="button"
            class="btn"
            disabled={!plan || !!o.diligenceBlocked}
            title={o.diligenceBlocked ? say(o.diligenceBlocked) : undefined}
            onClick={() => run({ type: 'VENTURE_DILIGENCE', venture: o.type })}
          >
            {t('ui.ventures.diligence', { bw: o.diligenceBandwidth, fee: fmt.money(o.diligenceUsd) })}
          </button>
          {o.diligenceBlocked && <span class="num-s muted">{say(o.diligenceBlocked)}</span>}
        </div>
      )}
      {o.blocked ? (
        <p class="num-s muted">{say(o.blocked)}</p>
      ) : (
        plan && (
          <div class="venture-join">
            <label class="num-s">
              {t('ui.ventures.stake')}{' '}
              <select value={String(stake)} onChange={(e) => setStake(Number((e.target as HTMLSelectElement).value))}>
                <option value="0">{t('ui.ventures.none')}</option>
                {o.stakes.map((s) => (
                  <option key={s.share} value={String(s.share)}>
                    {pct(s.share)} · {fmt.money(s.costUsd)}
                  </option>
                ))}
              </select>
            </label>
            {o.offtakes.length > 0 && (
              <label class="num-s">
                {t(o.type === 'fusion' ? 'ui.ventures.reservation' : 'ui.ventures.offtake')}{' '}
                <select value={String(offtake)} onChange={(e) => setOfftake(Number((e.target as HTMLSelectElement).value))}>
                  <option value="0">{t('ui.ventures.none')}</option>
                  {o.offtakes.map((x) => (
                    <option key={x} value={String(x)}>
                      {pct(x)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {offtake > 0 && o.type !== 'fusion' && (
              <label class="num-s">
                {t('ui.ventures.campus')}{' '}
                <select value={siteId} onChange={(e) => setSiteId((e.target as HTMLSelectElement).value)}>
                  {o.sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {siteName(state.sites.find((x) => x.id === s.id)!)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {offtake > 0 && o.prepays.length > 0 && (
              <label class="num-s">
                {t('ui.ventures.prepay')}{' '}
                <select value={String(prepay)} onChange={(e) => setPrepay(Number((e.target as HTMLSelectElement).value))}>
                  {o.prepays.map((p) => (
                    <option key={p.index} value={String(p.index)}>
                      {p.share === 0 ? t('ui.ventures.none') : t('ui.ventures.prepay_opt', { share: pct(p.share), cut: pct(p.priceCut) })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div class="energy-choice-row">
              <span class="num-s">{t('ui.ventures.cost_now', { cost: fmt.money(stakeCost + prepayCost) })}</span>
              <button
                type="button"
                class="btn"
                disabled={stake === 0 && offtake === 0}
                onClick={() =>
                  run({
                    type: 'VENTURE_JOIN',
                    venture: o.type,
                    stake,
                    offtake,
                    prepay,
                    ...(offtake > 0 && o.type !== 'fusion' ? { siteId } : {}),
                  })
                }
              >
                {t('ui.ventures.join')}
              </button>
            </div>
            {offtake > 0 && o.sites.length === 0 && o.type !== 'fusion' && (
              <p class="num-s muted">{t('error.venture_region')}</p>
            )}
          </div>
        )
      )}
    </section>
  )
}
