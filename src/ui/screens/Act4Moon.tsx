// Act IV's Moon screen (M30.5; doc 33 §17 A4-06, A4-07; layout in docs/wireframes/act4/README.md). Re-exported by
// Act4Panels.tsx so it loads in the Act IV lazy chunk. The polar sites (yours, the rivals' and the blocs' claims), your
// programme per site (claim → prospect → power → pilot → production), disputes, offtake, the megawatt contract and the
// "after 2035" panel; the prospect report modal. Every number comes from src/sim/moonViews.ts: your estimates, never
// the hidden geology.
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import { moonView, prospectReportView, type MoonView, type SiteView } from '../../sim/moonViews.ts'
import type { LunarSiteId } from '../../content/moonContent.ts'
import { Dialog, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const siteName = (id: string) => tDynamic(`moon.site.${id}`, id)
const claimant = (id: string) => tDynamic(`moon.claimant.${id}`, id)
const tonnes = (t0: number) => Math.round(t0).toLocaleString('en-US')

function Btn(props: { label: string; why: Message | null; bw?: number; primary?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`btn${props.primary ? ' btn-primary' : ''}`}
      disabled={!!props.why}
      title={props.why ? say(props.why) : undefined}
      onClick={props.onClick}
    >
      {props.label}
      {(props.bw ?? 0) > 0 && (
        <Pips total={props.bw!} filled={props.bw!} label={t('ui.plan.costs_bandwidth', { n: props.bw! })} />
      )}
    </button>
  )
}

/** A4-06: the Moon (a nav section in Act IV). */
export function MoonSection({ state, act }: ScreenProps) {
  const v = moonView(state)
  const [report, setReport] = useState<LunarSiteId | null>(null)
  if (!v) return null
  const yours = v.sites.filter((s) => s.yours)
  return (
    <div class="section single" data-moon>
      <div class="panel p">
        <h2 class="panel-title">{t('ui.moon.title')}</h2>
        <p class="num-s muted">
          {t('ui.moon.lead', {
            value: fmt.money(v.lunarUnitUsd),
            landing: fmt.pct(v.costs.landingChance),
            mission: fmt.money(v.costs.missionUsd),
            perT: fmt.money(v.costs.valueUsdT),
          })}
        </p>
        {v.frozenUntil && <p class="num-s warn">{t('ui.moon.frozen', { quarter: fmt.quarter(v.frozenUntil) })}</p>}
        {v.alignedBloc && <p class="num-s">{t(`ui.moon.aligned.${v.alignedBloc}`)}</p>}
      </div>
      {v.disputes.length > 0 && <MoonDisputes v={v} act={act} />}
      <Sites v={v} act={act} />
      {yours.map((s) => (
        <Programme key={s.site} s={s} v={v} act={act} onReports={() => setReport(s.site)} />
      ))}
      <Offtake v={v} act={act} />
      <After2035 />
      {report && <ProspectReport state={state} site={report} onClose={() => setReport(null)} />}
    </div>
  )
}

/** The disputes (also on the Plan screen): hold, align, share, withdraw. */
function MoonDisputes({ v, act }: { v: MoonView; act: ScreenProps['act'] }) {
  return (
    <div class="panel p" data-moon-disputes>
      <h2 class="panel-title">{t('ui.moon.disputes.title')}</h2>
      {v.disputes.map((d) => (
        <div key={d.site}>
          <p class="num-s">{t('ui.moon.disputes.line', { site: siteName(d.site), who: claimant(d.claimant) })}</p>
          <div class="orbit-row">
            {d.choices.map((c) => (
              <Btn
                key={c.choice}
                label={t(`ui.moon.disputes.${c.choice}`)}
                why={c.why}
                onClick={() => act({ type: 'RESOLVE_LUNAR_DISPUTE', site: d.site, choice: c.choice })}
              />
            ))}
          </div>
        </div>
      ))}
      <p class="num-s muted">{t('ui.moon.disputes.hint')}</p>
    </div>
  )
}

/** A4-02's lunar line: the disputes waiting, on the Plan screen. */
export function MoonDisputesPanel({ state, act }: ScreenProps) {
  const v = moonView(state)
  if (!v || v.disputes.length === 0) return null
  return <MoonDisputes v={v} act={act} />
}

/** The polar sites (the map, as a table): light, ice, room, who wants it, who holds it. */
function Sites({ v, act }: { v: MoonView; act: ScreenProps['act'] }) {
  return (
    <div class="panel p" data-moon-sites>
      <h2 class="panel-title">{t('ui.moon.sites.title')}</h2>
      <p class="num-s muted">
        {t('ui.moon.sites.lead', {
          fee: fmt.money(v.costs.claimFeeUsd),
          pc: v.costs.claimPc,
          within: v.costs.landWithin,
        })}
      </p>
      <table class="num-s">
        <thead>
          <tr>
            <th>{t('ui.moon.sites.col.site')}</th>
            <th class="r">{t('ui.moon.sites.col.light')}</th>
            <th class="r">{t('ui.moon.sites.col.ice')}</th>
            <th class="r">{t('ui.moon.sites.col.room')}</th>
            <th>{t('ui.moon.sites.col.status')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {v.sites.map((s) => (
            <tr key={s.site}>
              <td>
                <strong>{siteName(s.site)}</strong>
                <br />
                <span class="muted">{t(`ui.moon.interest.${s.blocInterest}`)}</span>
              </td>
              <td class="r num">{fmt.pct(s.illumination)}</td>
              <td class="r num">{`${s.iceAccess.toFixed(1)}×`}</td>
              <td class="r num">{t('ui.moon.kwe', { kwe: s.maxKwe })}</td>
              <td>{statusText(s)}</td>
              <td>
                {!s.yours && !s.lost && !(s.rival?.landed) && (
                  <Btn
                    label={t('ui.moon.claim')}
                    why={s.claimWhy}
                    bw={1}
                    onClick={() => act({ type: 'CLAIM_LUNAR_SITE', site: s.site })}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function statusText(s: SiteView): string {
  if (s.yours) {
    const base =
      s.yours.status === 'held'
        ? t('ui.moon.status.held', { quarter: fmt.quarter(s.yours.landedLabel ?? '') })
        : t('ui.moon.status.claimed', { quarter: fmt.quarter(s.yours.landByLabel ?? '') })
    if (s.yours.sharedWith) return `${base} ${t('ui.moon.status.shared', { who: claimant(s.yours.sharedWith) })}`
    return s.rival ? `${base} ${t('ui.moon.status.also', { who: claimant(s.rival.claimant) })}` : base
  }
  if (s.lost) return t(`ui.moon.status.${s.lost}`)
  if (s.rival)
    return s.rival.landed
      ? t('ui.moon.status.rival_landed', { who: claimant(s.rival.claimant) })
      : t('ui.moon.status.rival_claimed', { who: claimant(s.rival.claimant) })
  return t('ui.moon.status.free')
}

/** Your programme on one site: the pipeline and its next steps. */
function Programme({ s, v, act, onReports }: { s: SiteView; v: MoonView; act: ScreenProps['act']; onReports: () => void }) {
  const y = s.yours!
  const [kwe, setKwe] = useState(s.solarOptions.find((o) => o.kwe >= v.costs.pilotMinKwe)?.kwe ?? s.solarOptions[0]?.kwe ?? 0)
  const solar = s.solarOptions.find((o) => o.kwe === kwe)
  const steps = [
    { key: 'claim' as const, done: true },
    { key: 'prospect' as const, done: y.category !== 'inferred' },
    { key: 'power' as const, done: y.arrangedKwe >= v.costs.pilotMinKwe },
    { key: 'pilot' as const, done: !!y.pilot?.running },
    { key: 'production' as const, done: !!y.production },
  ]
  return (
    <div class="panel p" data-moon-site={s.site}>
      <div class="row-between">
        <h2 class="panel-title">{siteName(s.site)}</h2>
        <span class="tag">{t(`ui.moon.category.${y.category}`)}</span>
      </div>
      <p class="num-s moon-pipeline">
        {steps.map((x) => `${x.done ? '●' : '○'} ${t(`ui.moon.step.${x.key}`)}`).join('  →  ')}
      </p>
      <p class="num-s">
        {t('ui.moon.estimate', { t: tonnes(y.estimateT), value: fmt.money(y.valueUsd) })}{' '}
        <button type="button" class="btn" onClick={onReports}>
          {t('ui.moon.reports', { n: y.reports.length })}
        </button>
      </p>
      {s.mission ? (
        <p class="num-s">{t('ui.moon.mission_en_route', { quarter: fmt.quarter(s.mission.arrivalLabel) })}</p>
      ) : (
        <div class="orbit-row">
          <Btn
            label={t('ui.moon.send_mission', { cost: fmt.money(v.costs.missionUsd) })}
            why={s.missionWhy}
            bw={1}
            onClick={() => act({ type: 'SEND_LUNAR_MISSION', site: s.site })}
          />
          <span class="num-s muted">
            {t('ui.moon.mission_hint', { lo: v.costs.missionLead[0], hi: v.costs.missionLead[1], pct: fmt.pct(v.costs.landingChance) })}
          </span>
        </div>
      )}
      <p class="num-s">
        {t('ui.moon.power', {
          arranged: y.arrangedKwe,
          delivered: Math.round(y.deliveredKwe),
        })}
        {y.solar && ` · ${t('ui.moon.solar_line', { kwe: y.solar.kwe, quarter: fmt.quarter(y.solar.readyLabel ?? '') })}`}
        {y.reactor && ` · ${t('ui.moon.reactor_line', { quarter: fmt.quarter(y.reactor.readyLabel ?? '') })}`}
      </p>
      {y.status === 'held' && (
        <div class="orbit-row">
          {!y.solar && s.solarOptions.length > 0 && (
            <>
              <select value={kwe} onChange={(e) => setKwe(Number((e.target as HTMLSelectElement).value))}>
                {s.solarOptions.map((o) => (
                  <option key={o.kwe} value={o.kwe}>
                    {t('ui.moon.solar_option', { kwe: o.kwe, cost: fmt.money(o.costUsd) })}
                  </option>
                ))}
              </select>
              <Btn
                label={t('ui.moon.build_solar')}
                why={solar?.why ?? null}
                bw={1}
                onClick={() => act({ type: 'BUILD_LUNAR_SOLAR', site: s.site, kwe })}
              />
            </>
          )}
          {!y.reactor && (
            <Btn
              label={t('ui.moon.lease_reactor')}
              why={s.reactorWhy}
              bw={1}
              onClick={() => act({ type: 'LEASE_LUNAR_REACTOR', site: s.site })}
            />
          )}
        </div>
      )}
      {y.pilot ? (
        <p class="num-s">
          {y.pilot.running
            ? t('ui.moon.pilot_running', {
                t: y.pilot.processedT.toFixed(1),
                availability: fmt.pct(y.pilot.availability),
              })
            : t('ui.moon.pilot_building', { quarter: fmt.quarter(y.pilot.readyLabel ?? '') })}
          {y.pilot.frozen && ` ${t('ui.moon.pilot_frozen')}`}{' '}
          <Btn
            label={t(y.pilot.maintained ? 'ui.moon.crew_off' : 'ui.moon.crew_on')}
            why={s.maintainWhy}
            onClick={() => act({ type: 'SET_LUNAR_MAINTENANCE', site: s.site, on: !y.pilot!.maintained })}
          />
        </p>
      ) : (
        y.status === 'held' && (
          <div class="orbit-row">
            <Btn
              label={t('ui.moon.decide_pilot', { cost: fmt.money(v.costs.pilotUsd) })}
              why={s.pilotWhy}
              bw={2}
              onClick={() => act({ type: 'DECIDE_LUNAR_PILOT', site: s.site })}
            />
          </div>
        )
      )}
      {y.production ? (
        <p class="num-s">
          {t('ui.moon.production_line', { drawn: fmt.money(y.production.drawnUsd), capex: fmt.money(y.production.capexUsd) })}
        </p>
      ) : (
        y.pilot && (
          <div class="orbit-row">
            <Btn
              label={t('ui.moon.decide_production', { cost: fmt.money(v.costs.productionUsd) })}
              why={s.productionWhy}
              bw={3}
              onClick={() => act({ type: 'DECIDE_LUNAR_PRODUCTION', site: s.site })}
            />
          </div>
        )
      )}
    </div>
  )
}

/** Offtake offers and contracts, and the megawatt contract. */
function Offtake({ v, act }: { v: MoonView; act: ScreenProps['act'] }) {
  return (
    <div class="panel p" data-moon-offtake>
      <h2 class="panel-title">{t('ui.moon.offtake.title')}</h2>
      {v.offers.length === 0 && v.offtakes.length === 0 && <p class="num-s muted">{t('ui.moon.offtake.none')}</p>}
      {v.offers.map((o) => (
        <div key={o.index} class="orbit-row num-s">
          <span>
            {t('ui.moon.offtake.offer', {
              buyer: tDynamic(`moon.buyer.${o.buyer}`, o.buyer),
              t: o.volumeTYr,
              price: fmt.money(o.priceUsdKg, { exact: true }),
              quarters: o.termQuarters,
            })}
          </span>
          <Btn
            label={t('ui.moon.offtake.sign')}
            why={o.why}
            bw={2}
            onClick={() => act({ type: 'SIGN_LUNAR_OFFTAKE', offer: o.index })}
          />
        </div>
      ))}
      {v.offtakes.map((o) => (
        <p key={o.id} class={`num-s${o.live ? '' : ' muted'}`}>
          {t('ui.moon.offtake.contract', {
            buyer: tDynamic(`moon.buyer.${o.buyer}`, o.buyer),
            t: o.volumeTYr,
            delivered: o.deliveredT.toFixed(1),
            quarter: fmt.quarter(o.endLabel),
            left: fmt.money(o.leftUsd),
          })}
        </p>
      ))}
      <div class="orbit-row num-s">
        {v.megawatt.signedLabel ? (
          <span>{t('ui.moon.megawatt.signed', { quarter: fmt.quarter(v.megawatt.signedLabel) })}</span>
        ) : (
          <>
            <span>{t('ui.moon.megawatt.lead')}</span>
            <Btn
              label={t('ui.moon.megawatt.sign', { cost: fmt.money(v.megawatt.feeUsd) })}
              why={v.megawatt.why}
              bw={1}
              onClick={() => act({ type: 'SIGN_LUNAR_MEGAWATT' })}
            />
          </>
        )}
      </div>
    </div>
  )
}

/** "After 2035" (doc 33 §9.6): what lunar supply is for beyond the act, and the model's ceiling. No in-act cash. */
function After2035() {
  return (
    <div class="panel p" data-moon-after>
      <h2 class="panel-title">{t('ui.moon.after.title')}</h2>
      <p class="num-s">{t('ui.moon.after.tugs')}</p>
      <p class="num-s">{t('ui.moon.after.mass')}</p>
      <p class="num-s muted">{t('ui.moon.after.ceiling')}</p>
    </div>
  )
}

/** A4-07: the prospect report modal (the lunar "Read the market"). */
function ProspectReport({ state, site, onClose }: { state: ScreenProps['state']; site: LunarSiteId; onClose: () => void }) {
  const r = prospectReportView(state, site)
  if (!r) return null
  return (
    <Dialog title={t('ui.moon.report.title', { site: siteName(site) })} onClose={onClose}>
      <p class="num-s">
        {t('ui.moon.report.category', { category: t(`ui.moon.category.${r.category}`) })}{' '}
        {t(`ui.moon.report.category_${r.category}`)}
      </p>
      {r.reports.length === 0 ? (
        <p class="num-s muted">{t('ui.moon.report.none', { t: tonnes(r.inferredT) })}</p>
      ) : (
        <table class="num-s" data-moon-report>
          <thead>
            <tr>
              <th>{t('ui.moon.report.col.quarter')}</th>
              <th>{t('ui.moon.report.col.source')}</th>
              <th class="r">{t('ui.moon.report.col.estimate')}</th>
              <th class="r">{t('ui.moon.report.col.band')}</th>
            </tr>
          </thead>
          <tbody>
            {r.reports.map((x, i) => (
              <tr key={i}>
                <td class="num">{fmt.quarter(x.label)}</td>
                <td>{t(`ui.moon.report.step.${x.step}`)}</td>
                <td class="r num">{t('ui.moon.tonnes', { t: tonnes(x.estimateT) })}</td>
                <td class="r num">{t('ui.moon.report.band', { low: tonnes(x.lowT), high: tonnes(x.highT) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.share < 1 && <p class="num-s muted">{t('ui.moon.report.shared', { sharePct: r.share })}</p>}
      <p class="num-s muted">{t('ui.moon.report.hint')}</p>
    </Dialog>
  )
}
