// M36 (doc 38 §5): the Ventures page, Acts III-IV. Your ventures (stage, stake, value, cash calls waiting for an
// answer) and the offers: one developer per type, its pitch, diligence's reference-class estimate, and a join form
// (a stake, an offtake for one of your sites, a prepayment). Numbers come from the sim's venture views.
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { offtakePrepayUsd, tailShare, venturesView, type VentureOfferView } from '../../sim/ventureViews.ts'
import type { GameState } from '../../sim/state.ts'
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
        {v.offers.map((o) => (
          <Offer key={o.type} state={state} o={o} run={run} />
        ))}
      </div>
    </div>
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
