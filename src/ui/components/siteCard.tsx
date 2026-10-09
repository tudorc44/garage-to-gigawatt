// M33.3 (design thread, doc 35): a site's card, in every act. A side drawer from 1280 px, a dialog below (CSS). Header:
// the long name, the type, when it was powered; then power, uses, money, Heat (with the M21.2 breakdown) and the site
// actions open here, each going to its own confirm (or done at once, as the Plan's site pickers do).
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { t, tDynamic, type Message } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import { siteCardView, type SiteCardView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'
import { flawName, machineName, say, siteLong, tierName } from '../names.ts'
import {
  BuyDialog,
  HostingDialog,
  LeaveDialog,
  RenewalDialog,
} from '../screens/dialogs.tsx'
import { Dialog } from './basics.tsx'
import { HeatBreakdown } from './heatBreakdown.tsx'
import { SiteCardContext } from './siteCardContext.ts'
import { HEAT_CHIP_FROM, HeatChip } from './siteName.tsx'

type Act = (a: Action) => Message | null | unknown

/** Provides "open this site's card" to every site name below, and shows the card. */
export function SiteCardHost(props: {
  state: GameState
  act: Act
  children: ComponentChildren
}) {
  const [siteId, setSiteId] = useState<string | null>(null)
  return (
    <SiteCardContext.Provider value={{ open: setSiteId }}>
      {props.children}
      {siteId && (
        <SiteCard
          state={props.state}
          act={props.act}
          siteId={siteId}
          onClose={() => setSiteId(null)}
        />
      )}
    </SiteCardContext.Provider>
  )
}

type Sub = 'buy' | 'leave' | 'renew' | 'hosting' | null

function SiteCard(props: { state: GameState; act: Act; siteId: string; onClose: () => void }) {
  const { state, siteId } = props
  const act = props.act as (a: Action) => Message | null
  const [sub, setSub] = useState<Sub>(null)
  const v = siteCardView(state, siteId)
  if (!v) return null
  const plan = state.phase === 'plan'
  const close = () => setSub(null)
  return (
    <>
      <Dialog title={siteLong(state, v.site)} onClose={props.onClose} variant="site-card">
        <div class="site-card-body" data-site-card={siteId}>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('site.card.sub', {
              type: v.site.category
                ? tDynamic(`site.name.cat.${v.site.category}`, v.site.category)
                : tierName(v.site.tier),
              ready: v.readyQuarter
                ? t(v.ready ? 'site.card.powered_since' : 'site.card.powered_from', {
                    quarter: fmt.quarter(v.readyQuarter),
                  })
                : '',
            })}
          </p>
          <Power v={v} />
          <Uses v={v} />
          <section class="site-card-sec">
            <h3 class="label">{t('site.card.money')}</h3>
            <p class="num-s">
              {t('site.card.rent', { rent: fmt.money(v.rentUsdQ) })}
              {v.leavePenaltyUsd !== null &&
                ` · ${t('site.card.leave_penalty', { penalty: fmt.money(v.leavePenaltyUsd) })}`}
            </p>
          </section>
          <section class="site-card-sec">
            <h3 class="label">
              {v.heat >= HEAT_CHIP_FROM ? (
                <>
                  {t('site.card.heat_label')} <HeatChip heat={v.heat} />
                </>
              ) : (
                t('site.card.heat', { heat: Math.round(v.heat) })
              )}
            </h3>
            <HeatBreakdown state={state} siteId={siteId} />
            {v.flaw && (
              <p class="num-s warn">{t('site.flag.flaw', { flaw: flawName(v.flaw) })}</p>
            )}
          </section>
          {plan && (
            <Actions
              v={v}
              act={act}
              open={setSub}
            />
          )}
        </div>
      </Dialog>
      {sub === 'buy' && <BuyDialog state={state} act={act} siteId={siteId} onClose={close} />}
      {sub === 'leave' && (
        <LeaveDialog
          state={state}
          act={act}
          siteId={siteId}
          onClose={() => {
            close()
            if (!state.sites.some((s) => s.id === siteId)) props.onClose()
          }}
        />
      )}
      {sub === 'renew' && <RenewalDialog state={state} act={act} siteId={siteId} onClose={close} />}
      {sub === 'hosting' && <HostingDialog state={state} act={act} siteId={siteId} onClose={close} />}
    </>
  )
}

function Power({ v }: { v: SiteCardView }) {
  return (
    <section class="site-card-sec">
      <h3 class="label">{t('site.card.power')}</h3>
      <p class="num-s">
        {t('site.card.power_line', {
          capacity: fmt.power(v.capacityKw),
          energized: fmt.power(v.facts.energizedKw),
          free: fmt.power(v.facts.freeKw),
        })}
      </p>
      <p class="num-s">
        {t('site.card.price', {
          price: fmt.cents(v.powerUsdKwh),
          region: v.facts.region ? tDynamic(`ui.region.${v.facts.region}`, v.facts.region) : '—',
        })}
        {v.contract &&
          ` · ${t(v.facts.renewalDue ? 'site.card.contract_due' : 'site.card.contract', {
            type: tDynamic(`contract.${v.contract.type}`, v.contract.type),
            quarter: fmt.quarter(v.contract.endQuarter),
          })}`}
      </p>
    </section>
  )
}

function Uses({ v }: { v: SiteCardView }) {
  const none =
    v.machines.units === 0 && v.hosting.length === 0 && v.projects.length === 0 && v.stations.length === 0
  return (
    <section class="site-card-sec">
      <h3 class="label">{t('site.card.uses')}</h3>
      {none && <p class="num-s muted">{t('site.card.idle')}</p>}
      {v.machines.units > 0 && (
        <p class="num-s">
          {t('site.card.machines', {
            n: v.machines.units.toLocaleString('en-US'),
            mix: v.machines.models
              .map((m) => `${m.count.toLocaleString('en-US')} × ${machineName(m.model)}`)
              .join(', '),
          })}
        </p>
      )}
      {v.hosting.map((h, i) => (
        <p key={`h${i}`} class="num-s">
          {t('site.card.hosting', {
            kw: fmt.power(h.kw),
            rate: fmt.cents(h.rateUsdKwh),
            quarter: fmt.quarter(h.termEnd),
          })}
        </p>
      ))}
      {v.projects.map((p) => (
        <p key={`p${p.n}`} class="num-s">
          {t('site.card.project', {
            // (as the Projects board names it)
            name: t('ui.projects.name', { tier: v.site.tier, n: p.n }),
            kind: tDynamic(`project_kind.${p.kind}`, p.kind),
            stage: tDynamic(`site.card.stage.${p.stage}`, p.stage),
            kw: fmt.power(p.kw),
          })}
          {p.tenant && ` · ${tDynamic(`tenant.${p.tenant}`, p.tenant)}`}
        </p>
      ))}
      {v.stations.map((st, i) => (
        <p key={`s${i}`} class="num-s">
          {t('site.card.station', { units: st.units, quarter: fmt.quarter(st.readyQuarter) })}
        </p>
      ))}
    </section>
  )
}

/** The site actions open here (as the Plan's pickers): each opens its confirm, or is done at once. */
function Actions(props: {
  v: SiteCardView
  act: (a: Action) => Message | null
  open: (s: Sub) => void
}) {
  const { v, act, open } = props
  const id = v.site.id
  const a = v.actions
  const button = (key: string, label: string, why: Message | null | undefined, onClick: () => void) =>
    why === undefined ? null : (
      <span key={key} class="site-card-action">
        <button type="button" class="btn" disabled={!!why} onClick={onClick}>
          {label}
        </button>
        {why && <span class="num-s muted">{say(why)}</span>}
      </span>
    )
  return (
    <section class="site-card-sec">
      <h3 class="label">{t('site.card.actions')}</h3>
      <div class="site-card-actions">
        {button('buy', t('site.card.buy'), null, () => open('buy'))}
        {button('hosting', t('site.pick.hosting'), a.hosting, () => open('hosting'))}
        {button('renew', t('site.pick.renewal'), a.renewal, () => open('renew'))}
        {button('transformer', t('site.pick.transformer'), a.transformer, () =>
          act({ type: 'UPGRADE_TRANSFORMER', siteId: id }),
        )}
        {button('talk', t('site.pick.talk'), a.talk, () => act({ type: 'OUTREACH', siteId: id }))}
        {button('mitigate', t('site.pick.mitigate'), a.mitigate, () =>
          act({ type: 'MITIGATE_NOISE', siteId: id }),
        )}
        {button('station', t('site.pick.title.station'), a.station, () =>
          act({ type: 'BUILD_GROUND_STATION', siteId: id }),
        )}
        {button('leave', t('site.pick.leave'), a.leave, () => open('leave'))}
      </div>
    </section>
  )
}
