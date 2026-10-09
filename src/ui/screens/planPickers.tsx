// M33.2 (design thread, doc 35): the Plan to-do's grouped site actions. With two or more sites, one row per action
// kind ("Leave a site · 10 sites eligible ›") opens a SitePicker; picking a site does the action or opens its confirm.
import { t } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import {
  communityView,
  hostingView,
  quarterName,
  renewalViews,
  siteViews,
  transformerViews,
  whyNot,
  type SiteFeeAction,
} from '../../sim/selectors.ts'
import type { GameState, Site } from '../../sim/state.ts'
import { SitePicker, type PickRow } from '../components/sitePicker.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'

export type PickKind =
  | 'leave'
  | 'renewal'
  | 'transformer'
  | 'talk'
  | 'mitigate'
  | 'hosting'

/** Heat from which a site counts for "Talk to the neighbours · N sites at Heat ≥ 30" (doc 35). */
export const TALK_FROM_HEAT = 30

const why = (state: GameState, a: Action) => {
  const w = whyNot(state, a)
  return w ? say(w) : undefined
}

/** The rows a kind's picker lists (also counted by the grouped to-do row). */
export function pickRows(state: GameState, kind: PickKind): PickRow[] {
  switch (kind) {
    case 'leave':
      return siteViews(state).flatMap((sv) =>
        sv.leaving
          ? [
              {
                site: sv.site,
                fact: fmt.money(sv.leaving.penaltyUsd),
                factSort: sv.leaving.penaltyUsd,
                why: why(state, { type: 'LEAVE_SITE', siteId: sv.site.id }),
              },
            ]
          : [],
      )
    case 'renewal':
      return renewalViews(state).map((r) => {
        const price = r.options.find((o) => o.type === r.current.type)!.openingUsdKwh
        return {
          site: r.site,
          fact: fmt.cents(price),
          factSort: price,
          label:
            state.negotiation?.siteId === r.site.id
              ? t('site.pick.renewal_open')
              : undefined,
        }
      })
    case 'transformer':
      return transformerViews(state).map((u) => ({
        site: u.site,
        fact: fmt.money(u.costUsd),
        factSort: u.costUsd,
        why:
          u.readyQuarter !== undefined
            ? t('ui.locked.transformer_underway', {
                quarter: fmt.quarter(quarterName(u.readyQuarter)),
              })
            : why(state, { type: 'UPGRADE_TRANSFORMER', siteId: u.site.id }),
      }))
    case 'talk': {
      const v = communityView(state)
      return v.sites.map((x) => ({
        site: x.site,
        fact: fmt.money(x.outreachUsd),
        factSort: x.outreachUsd,
        why: x.outreachDone
          ? t('ui.community.done')
          : why(state, { type: 'OUTREACH', siteId: x.site.id }),
      }))
    }
    case 'mitigate': {
      const v = communityView(state)
      return v.sites.map((x) => ({
        site: x.site,
        fact: fmt.money(x.mitigationUsd),
        factSort: x.mitigationUsd,
        why: x.mitigated
          ? t('ui.community.done')
          : why(state, { type: 'MITIGATE_NOISE', siteId: x.site.id }),
      }))
    }
    case 'hosting': {
      const v = hostingView(state)
      return v.sites.map((x) => {
        // A site with a hosting contract stays open: its contract can be ended there.
        const hosts = v.contracts.some((c) => c.contract.siteId === x.site.id)
        return {
          site: x.site,
          fact: fmt.power(x.freeKw),
          factSort: x.freeKw,
          why: hosts
            ? undefined
            : x.freeKw <= 0
              ? t('site.pick.no_free')
              : x.blocker
                ? say(x.blocker)
                : undefined,
        }
      })
    }
  }
}

/** The picker for one kind; `open` takes the Plan to a confirm dialog (leave, renewal, hosting). */
export function PlanPicker(props: {
  state: GameState
  act: (a: Action) => unknown
  kind: PickKind
  openDialog: (
    o:
      | `leave:${string}`
      | `renew:${string}`
      | `hosting:${string}`
      | `confirm:${SiteFeeAction}:${string}`,
  ) => void
  onClose: () => void
}) {
  const { state, kind } = props
  const v = communityView(state)
  const spec: Record<
    PickKind,
    { fact: string; action: string; bw?: number; sort?: 'heat'; desc?: boolean; pick: (s: Site) => void }
  > = {
    leave: {
      fact: t('site.pick.fact.penalty'),
      action: t('site.pick.leave'),
      pick: (s) => props.openDialog(`leave:${s.id}`),
    },
    renewal: {
      fact: t('site.pick.fact.renewal'),
      action: t('site.pick.renewal'),
      pick: (s) => props.openDialog(`renew:${s.id}`),
    },
    transformer: {
      fact: t('site.pick.fact.cost'),
      action: t('site.pick.transformer'),
      // (M34.2, 3f: a fee-charging action opens its confirm)
      pick: (s) => props.openDialog(`confirm:transformer:${s.id}`),
    },
    talk: {
      fact: t('site.pick.fact.cost'),
      action: t('site.pick.talk'),
      bw: v.outreachBandwidth,
      sort: 'heat',
      desc: true,
      pick: (s) => props.openDialog(`confirm:talk:${s.id}`),
    },
    mitigate: {
      fact: t('site.pick.fact.cost'),
      action: t('site.pick.mitigate'),
      bw: v.mitigationBandwidth,
      pick: (s) => props.openDialog(`confirm:mitigate:${s.id}`),
    },
    hosting: {
      fact: t('site.pick.fact.free'),
      action: t('site.pick.hosting'),
      sort: undefined,
      desc: true,
      pick: (s) => props.openDialog(`hosting:${s.id}`),
    },
  }
  const s = spec[kind]
  return (
    <SitePicker
      state={state}
      title={t(`site.pick.title.${kind}`)}
      intro={
        kind === 'talk' || kind === 'mitigate'
          ? t('ui.community.note', {
              bw: v.outreachBandwidth,
              grievance: fmt.signedInt(v.outreachGrievance),
              mbw: v.mitigationBandwidth,
              base: -v.mitigationBase,
            })
          : undefined
      }
      factLabel={s.fact}
      actionLabel={s.action}
      bw={s.bw}
      rows={pickRows(state, kind)}
      defaultSort={s.sort}
      defaultDesc={s.desc ?? (kind === 'hosting' ? true : undefined)}
      onPick={s.pick}
      onClose={props.onClose}
    />
  )
}
