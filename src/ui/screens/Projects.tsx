// Act II projects (scope 0.2 §2.5): the Projects page (wireframe A2-04, a kanban from Proposed to
// Sold), the Open-a-project dialog, and the Deal builder (A2-05) with its three slots and the
// projected return. Everything comes from the project views; no game rules here.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import {
  PROJECT_COLUMNS,
  dealCapitalView,
  dealNegotiationView,
  dealView,
  openProjectView,
  projectsView,
  whyNot,
  type ProjectCardView,
} from '../../sim/selectors.ts'
import type { PowerSource, ProjectKind } from '../../sim/state.ts'
import { Dialog, Icon, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say, siteName, tierIcon, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const kindName = (kind: string) => tDynamic(`project_kind.${kind}`, kind)
const gpuName = (gpu: string) => tDynamic(`gpu.${gpu}`, gpu)
const tenantName = (id: string) => tDynamic(`tenant.${id}`, id)
const tenantType = (type: string) => tDynamic(`ui.tenant_type.${type}`, type)
const regionName = (r: string | null) =>
  r ? tDynamic(`ui.region.${r}`, r.toUpperCase()) : ''

/** A button that shows its Bandwidth cost as pips and, when not allowed, why (as its title). */
export function BwButton(props: {
  label: string
  bw: number
  action: Action
  state: ScreenProps['state']
  act: ScreenProps['act']
  primary?: boolean
  onDone?: () => void
}) {
  const why = whyNot(props.state, props.action)
  return (
    <button
      type="button"
      class={`btn${props.primary ? ' btn-primary' : ''}`}
      disabled={!!why}
      title={why ? say(why) : undefined}
      onClick={() => {
        props.act(props.action)
        props.onDone?.()
      }}
    >
      {props.label}
      {props.bw > 0 && (
        <Pips
          total={props.bw}
          filled={props.bw}
          label={t('ui.plan.costs_bandwidth', { n: props.bw })}
        />
      )}
    </button>
  )
}

/** The three slot chips: done ✓, part-filled ◐, open ○; a pilot has no Tenant chip. */
function SlotChips({ card }: { card: ProjectCardView }) {
  const chip = (name: string, done: boolean | null) =>
    done === null ? null : (
      <span class={`slot${done ? ' done' : ''}`}>
        {t(`ui.deal.slot.${name}` as 'ui.deal.slot.power')} {done ? '✓' : '○'}
      </span>
    )
  return (
    <span class="slots">
      {chip('power', card.slots.power)}
      {chip('tenant', card.slots.tenant)}
      {chip('capital', card.slots.capital)}
    </span>
  )
}

/** A signed tenant: a shell's lease, or a cloud's GPU contract with its locked $/GPU-hr. */
function TenantLine({ card }: { card: ProjectCardView }) {
  const tn = card.tenant!
  const params = {
    name: tenantName(tn.id),
    rating: tn.rating,
    annual: fmt.money(tn.annualUsd),
    years: tn.termYears,
  }
  return (
    <>
      {tn.gpuUsdHr === null
        ? t('ui.projects.tenant', params)
        : t('ui.projects.gpu_tenant', {
            ...params,
            price: fmt.money(tn.gpuUsdHr),
          })}
    </>
  )
}

function projectName(card: ProjectCardView) {
  return t('ui.projects.name', { tier: card.tier, n: card.project.n })
}

// ---------- the Projects page (A2-04) ----------

export function ProjectsSection({ state, act }: ScreenProps) {
  const v = projectsView(state)
  const [opening, setOpening] = useState(false)
  const [deal, setDeal] = useState<string | null>(null)
  return (
    <div class="projects">
      <div class="row-between">
        <div>
          <h2 class="panel-title">{t('ui.projects.title')}</h2>
          <span class="num-s muted">
            {t('ui.projects.summary', {
              count: v.count,
              power: fmt.power(v.kw),
              knowHow: v.knowHow,
            })}
          </span>
        </div>
        <button
          type="button"
          class="btn"
          disabled={state.bandwidth < v.openBandwidth}
          title={
            state.bandwidth < v.openBandwidth
              ? t('error.no_bandwidth', {
                  needed: v.openBandwidth,
                  have: state.bandwidth,
                })
              : undefined
          }
          onClick={() => setOpening(true)}
        >
          {t('ui.projects.open')}
          <Pips
            total={v.openBandwidth}
            filled={v.openBandwidth}
            label={t('ui.plan.costs_bandwidth', { n: v.openBandwidth })}
          />
        </button>
      </div>
      <div class="kanban">
        {PROJECT_COLUMNS.map((col) => (
          <div class="kanban-col" key={col}>
            <div class="label">
              {t(`ui.projects.col.${col}` as 'ui.projects.col.live', {
                n: v.byColumn[col].length,
              })}
            </div>
            {v.byColumn[col].length === 0 ? (
              <div class="kanban-empty num-s muted">
                {t(`ui.projects.empty.${col}` as 'ui.projects.empty.live')}
              </div>
            ) : (
              v.byColumn[col].map((c) => (
                <ProjectCardEl
                  key={c.project.id}
                  card={c}
                  state={state}
                  act={act}
                  onDeal={() => setDeal(c.project.id)}
                />
              ))
            )}
          </div>
        ))}
      </div>
      {opening && (
        <OpenProjectDialog
          state={state}
          act={act}
          onClose={() => setOpening(false)}
          onOpened={(id) => {
            setOpening(false)
            setDeal(id)
          }}
        />
      )}
      {deal && (
        <DealBuilder
          state={state}
          act={act}
          projectId={deal}
          onClose={() => setDeal(null)}
        />
      )}
    </div>
  )
}

function ProjectCardEl(
  props: ScreenProps & { card: ProjectCardView; onDeal: () => void },
) {
  const { card, state, act } = props
  const p = card.project
  const late = card.late && card.late.quarters > 0
  return (
    <article class={`project-card${late ? ' late' : ''}`}>
      <div class="row-between">
        <strong>{projectName(card)}</strong>
        <span class="num-s">
          {late && (
            <span class="tag danger">
              {t('ui.projects.late', { n: card.late!.quarters })}
            </span>
          )}{' '}
          {card.irr !== null &&
            t('ui.projects.irr', { irr: fmt.pct(card.irr) })}
        </span>
      </div>
      <div class="num-s muted">
        {card.region && <span class="tag">{regionName(card.region)}</span>}{' '}
        {t('ui.projects.what', {
          power: fmt.power(p.kw),
          kind: kindName(p.kind),
          gpuPart: p.gpu ? ` · ${gpuName(p.gpu)}` : '',
        })}
      </div>
      {card.column !== 'live' && card.column !== 'sold' && (
        <SlotChips card={card} />
      )}
      {card.tenant ? (
        <div class="num-s">
          <TenantLine card={card} />
        </div>
      ) : (
        p.kind !== 'shell' &&
        card.utilisation !== null && (
          <div class="num-s">
            {t('ui.projects.spot', {
              gpus: card.gpuCount.toLocaleString('en-US'),
              gpu: gpuName(p.gpu ?? ''),
              util: fmt.pct(card.utilisation),
              price: fmt.money(card.gpuUsdHr ?? 0),
            })}
          </div>
        )
      )}
      {p.stage === 'building' && (
        <div class="num-s">
          {t('ui.projects.to_go', {
            n: card.toGo ?? 0,
            quarter: fmt.quarter(card.ready),
          })}
          {card.tenant &&
            ` · ${t('ui.projects.ready_by', { quarter: fmt.quarter(card.tenant.readyBy) })}`}
        </div>
      )}
      {p.stage === 'proposed' && (
        <div class="num-s muted">
          {t('ui.projects.build', { n: card.buildQuarters })}
          {card.tenant &&
            ` · ${t('ui.projects.ready_by', { quarter: fmt.quarter(card.tenant.readyBy) })}`}
        </div>
      )}
      {p.stage === 'live' && card.tenant && (
        <div class="num-s muted">
          {t('ui.projects.years_left', {
            years: card.tenant.yearsLeft.toFixed(2).replace(/\.?0+$/, ''),
          })}
        </div>
      )}
      {late && (
        <div class="num-s loss">
          {t('ui.projects.late_line', {
            damages: fmt.money(card.late!.damagesUsd),
            walk: fmt.pct(card.late!.walkChance),
          })}
        </div>
      )}
      {p.stage === 'proposed' && (
        <button type="button" class="btn" onClick={props.onDeal}>
          {t('ui.projects.deal')}
        </button>
      )}
      {card.saleUsd !== null && (
        <BwButton
          label={t('ui.projects.sell', { value: fmt.money(card.saleUsd) })}
          bw={2}
          action={{ type: 'PROJECT_SELL', projectId: p.id }}
          state={state}
          act={act}
        />
      )}
      {card.gpuSale && (
        <BwButton
          label={t('ui.projects.sell_gpus', {
            value: fmt.money(card.gpuSale.valueUsd),
          })}
          bw={1}
          action={{ type: 'PROJECT_SELL_GPUS', projectId: p.id }}
          state={state}
          act={act}
        />
      )}
    </article>
  )
}

// ---------- opening a project ----------

function OpenProjectDialog(
  props: ScreenProps & {
    onClose: () => void
    onOpened: (projectId: string) => void
  },
) {
  const { state, act } = props
  const v = openProjectView(state)
  const [siteId, setSiteId] = useState(v.sites[0]?.site.id ?? '')
  const [kind, setKind] = useState<ProjectKind>('shell')
  const [gpu, setGpu] = useState<string>(v.gpus[0] ?? 'h100')
  const site = v.sites.find((x) => x.site.id === siteId)
  const [kw, setKw] = useState(Math.floor(site?.freeKw ?? 0))
  const [power, setPower] = useState<'existing' | PowerSource>('existing')
  const size =
    kind === 'pilot' ? (v.pilotSizes.includes(kw) ? kw : v.pilotSizes[0]) : kw
  const action: Action = {
    type: 'PROJECT_OPEN',
    siteId,
    kw: size,
    kind,
    ...(kind === 'cloud' ? { gpu } : {}),
    ...(power !== 'existing' ? { power } : {}),
  }
  const powerNote =
    !site || power === 'existing'
      ? t('ui.projects.power_note.existing', {
          free: fmt.power(site?.freeKw ?? 0),
        })
      : power === 'grid'
        ? t('ui.projects.power_note.grid', {
            usd: fmt.money(site.grid.usdMw),
            from: site.grid.quarters?.[0] ?? 0,
            to: site.grid.quarters?.[1] ?? 0,
          })
        : t('ui.projects.power_note.gas', {
            usd: fmt.money(site.gas.usdMw),
            quarters: site.gas.quarters,
            heat: site.gas.heat,
          })
  const why = whyNot(state, action)
  const kinds: ProjectKind[] = ['shell', 'cloud', 'pilot']
  return (
    <Dialog title={t('ui.projects.open_title')} onClose={props.onClose}>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.projects.open_note')}
      </p>
      <div class="label">{t('ui.projects.open_site')}</div>
      {v.sites.length === 0 ? (
        <p class="num-s muted">{t('ui.projects.no_sites')}</p>
      ) : (
        v.sites.map((x) => (
          <label class="form-row" key={x.site.id}>
            <input
              type="radio"
              name="project-site"
              checked={x.site.id === siteId}
              onChange={() => {
                setSiteId(x.site.id)
                setKw(Math.floor(x.freeKw))
              }}
            />
            <Icon name={tierIcon(x.site.tier)} size={16} />
            {siteName(x.site)}
            {x.region && !x.site.category && (
              <span class="tag">{regionName(x.region)}</span>
            )}
            <span class="num-s muted">
              {t('ui.projects.free', { value: fmt.power(x.freeKw) })}
            </span>
          </label>
        ))
      )}
      <div class="label">{t('ui.projects.open_kind')}</div>
      <div
        class="seg"
        role="group"
        aria-label={t('ui.projects.open_kind')}
        style={{ alignSelf: 'flex-start' }}
      >
        {kinds.map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {kindName(k)}
          </button>
        ))}
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {tDynamic(`ui.projects.kind_note.${kind}`, '')}
      </p>
      <div class="label">{t('ui.projects.open_power')}</div>
      <div
        class="seg"
        role="group"
        aria-label={t('ui.projects.open_power')}
        style={{ alignSelf: 'flex-start' }}
      >
        {(['existing', 'grid', 'gas'] as const).map((k) => (
          <button
            type="button"
            key={k}
            aria-pressed={power === k}
            onClick={() => setPower(k)}
          >
            {t(`ui.projects.power.${k}`)}
          </button>
        ))}
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {powerNote}
      </p>
      {kind === 'cloud' && (
        <label class="form-row">
          {t('ui.projects.gpu')}
          <select
            value={gpu}
            onChange={(e) => setGpu((e.target as HTMLSelectElement).value)}
          >
            {v.gpus.map((g) => (
              <option key={g} value={g}>
                {gpuName(g)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label class="form-row">
        {t('ui.projects.size')}
        {kind === 'pilot' ? (
          <select
            value={size}
            onChange={(e) =>
              setKw(Number((e.target as HTMLSelectElement).value))
            }
          >
            {v.pilotSizes.map((s) => (
              <option key={s} value={s}>
                {fmt.power(s)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min={0}
            step={100}
            value={kw}
            style={{ width: '100px' }}
            onInput={(e) =>
              setKw(
                Math.max(
                  0,
                  Math.floor(Number((e.target as HTMLInputElement).value)),
                ),
              )
            }
          />
        )}
        <span class="num-s muted">kW</span>
      </label>
      {why && <p class="num-s loss">{say(why)}</p>}
      <div class="row-between">
        <span />
        <button
          type="button"
          class="btn btn-primary"
          disabled={!!why}
          onClick={() => {
            act(action)
            props.onOpened(v.nextId)
          }}
        >
          {t('ui.projects.open_go')}
          <Pips
            total={v.bandwidth}
            filled={v.bandwidth}
            label={t('ui.plan.costs_bandwidth', { n: v.bandwidth })}
          />
        </button>
      </div>
    </Dialog>
  )
}

// ---------- the Deal builder's capital stack (A2-05) ----------

function CapitalRows(
  props: ScreenProps & { card: ProjectCardView; cashUsd: number },
) {
  const { state, act, card } = props
  const p = card.project
  const c = dealCapitalView(state, p)
  const debtRow = (row: typeof c.projectDebt) => (
    <tr>
      <td>{t(`ui.deal.cap.${row.kind}`)}</td>
      <td class="num r">
        {row.on ? fmt.money(row.amountUsd) : fmt.money(row.capUsd)}
      </td>
      <td class="num r">{fmt.pct(row.apr, 1)}</td>
      <td class="num-s">
        {row.blocker ? (
          <span class="muted">{say(row.blocker)}</span>
        ) : (
          t('ui.deal.cap.debt_terms', {
            share: fmt.pct(row.share),
            years: (row.tenorQuarters / 4).toFixed(1).replace(/\.0$/, ''),
            rating: row.rating,
          })
        )}
      </td>
      <td class="r">
        {!row.blocker && (
          <span class="raise-options">
            <BwButton
              label={t('ui.deal.negotiate')}
              bw={2}
              action={{
                type: 'DEAL_NEGOTIATE_START',
                projectId: p.id,
                debt: row.kind,
              }}
              state={state}
              act={act}
            />
            <button
              type="button"
              class="btn"
              disabled={!!row.toggle}
              title={row.toggle ? say(row.toggle) : undefined}
              onClick={() =>
                act({
                  type: 'PROJECT_DEBT',
                  projectId: p.id,
                  debt: row.kind,
                  on: !row.on,
                })
              }
            >
              {row.on ? t('ui.deal.cap.remove') : t('ui.deal.cap.use')}
            </button>
          </span>
        )}
      </td>
    </tr>
  )
  const debtShare = c.capexUsd > 0 ? c.debtUsd / c.capexUsd : 0
  return (
    <div class="deal-panel">
      <div class="label">
        {t('ui.deal.capital')} {card.slots.capital ? '✓' : '○'}
      </div>
      <table>
        <tbody>
          <tr>
            <td>{t('ui.deal.cap.own_cash')}</td>
            <td class="num r">{fmt.money(c.ownCashUsd)}</td>
            <td />
            <td class="num-s muted">
              {t('ui.deal.cap.of_cash', { cash: fmt.money(props.cashUsd) })}
            </td>
            <td class="r">
              {card.slots.capital ? (
                <span class="num-s">{t('ui.deal.funded')}</span>
              ) : (
                <BwButton
                  label={t('ui.deal.fund')}
                  bw={0}
                  action={{ type: 'PROJECT_FUND_CASH', projectId: p.id }}
                  state={state}
                  act={act}
                />
              )}
            </td>
          </tr>
          {c.equipment && (
            <tr>
              <td>{t('ui.deal.cap.equipment')}</td>
              <td />
              <td class="num r">{fmt.pct(c.equipment.apr, 1)}</td>
              <td class="num-s muted" colSpan={2}>
                {t('ui.deal.cap.equipment_note', {
                  ltv: fmt.pct(c.equipment.ltv),
                })}
              </td>
            </tr>
          )}
          {debtRow(c.projectDebt)}
          {p.kind === 'cloud' && debtRow(c.ddtl)}
          <tr>
            <td>{t('ui.deal.cap.equity')}</td>
            <td />
            <td />
            <td class="num-s muted" colSpan={2}>
              {t('ui.deal.cap.equity_note')}
            </td>
          </tr>
          <tr>
            <td>{t('ui.deal.cap.jv')}</td>
            <td class="num r">
              {c.jv.share !== null ? fmt.money(c.jv.fundsUsd) : ''}
            </td>
            <td />
            <td class="num-s" colSpan={2}>
              {c.jv.options.every((o) => o.blocker && !c.jv.share) ? (
                <span class="muted">{say(c.jv.options[0].blocker!)}</span>
              ) : (
                <span class="raise-options">
                  {c.jv.options.map((o) => (
                    <button
                      key={o.share}
                      type="button"
                      class={`btn${c.jv.share === o.share ? ' btn-primary' : ''}`}
                      disabled={!!o.blocker}
                      title={o.blocker ? say(o.blocker) : undefined}
                      onClick={() =>
                        act({
                          type: 'PROJECT_JV',
                          projectId: p.id,
                          share: o.share,
                        })
                      }
                    >
                      {t('ui.deal.cap.jv_share', { share: fmt.pct(o.share) })}
                    </button>
                  ))}
                </span>
              )}
            </td>
          </tr>
          {p.kind === 'shell' && (
            <tr>
              <td>{t('ui.deal.cap.backstop')}</td>
              <td />
              <td />
              <td class="num-s" colSpan={2}>
                {c.backstop.taken ? (
                  t('ui.deal.cap.backstop_taken', {
                    warrants: fmt.pct(c.backstop.warrantsShare, 1),
                  })
                ) : c.backstop.blocker ? (
                  <span class="muted">{say(c.backstop.blocker)}</span>
                ) : (
                  <BwButton
                    label={t('ui.deal.cap.backstop_take', {
                      warrants: fmt.pct(c.backstop.warrantsShare, 1),
                    })}
                    bw={2}
                    action={{ type: 'PROJECT_BACKSTOP', projectId: p.id }}
                    state={state}
                    act={act}
                  />
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div class="debt-bar" role="img" aria-label={fmt.pct(debtShare)}>
        <div class="debt-part" style={{ width: `${debtShare * 100}%` }}>
          {debtShare > 0.08 &&
            t('ui.deal.cap.debt_pct', { pct: fmt.pct(debtShare) })}
        </div>
        <div class="equity-part">
          {t('ui.deal.cap.equity_pct', { pct: fmt.pct(1 - debtShare) })}
        </div>
      </div>
      {(c.dscr !== null || c.ratingAfter) && (
        <p class="num-s muted" style={{ margin: 0 }}>
          {c.dscr !== null &&
            t('ui.deal.cap.dscr', {
              x: `${c.dscr.toFixed(2)}×`,
              min: `${c.dscrMin.toFixed(2)}×`,
            })}
          {c.ratingAfter &&
            ` ${t('ui.deal.cap.rating_effect', {
              from: c.ratingBefore ?? '—',
              to: c.ratingAfter,
            })}`}
        </p>
      )}
    </div>
  )
}

/**
 * A tenant or lender negotiation in progress on this project (M6.0i): the card's terms, their
 * current offer, the rounds so far, and your next ask (as % over the card's price, or points off
 * the rate), accept or walk away. Hidden when there's none.
 */
function NegotiationPanel(props: ScreenProps & { projectId: string }) {
  const { state, act } = props
  const v = dealNegotiationView(state)
  const tenant = v?.side === 'tenant'
  // The ask as the player types it: % over the card (tenant) or points off (lender).
  const step = tenant ? 1 : 0.05
  const [ask, setAsk] = useState(tenant ? 6 : 0.5)
  if (!v || v.projectId !== props.projectId) return null
  const shown = (x: number) =>
    tenant
      ? fmt.pct(x - 1, 1)
      : t('ui.deal.neg.points', { n: (x * 100).toFixed(2) })
  const value = tenant ? 1 + ask / 100 : ask / 100
  return (
    <div class="deal-panel">
      <div class="label">
        {t('ui.deal.neg.title', {
          who: v.card ? tenantName(v.card) : t(`ui.deal.cap.${v.debt!}`),
          round: Math.min(v.round + 1, v.rounds),
          rounds: v.rounds,
        })}
      </div>
      <div class="num-s">
        {tenant
          ? t('ui.deal.neg.tenant_offer', {
              base: fmt.money(v.baseAnnualUsd ?? 0),
              offer: shown(v.offer),
              annual: fmt.money((v.baseAnnualUsd ?? 0) * v.offer),
            })
          : t('ui.deal.neg.lender_offer', {
              base: fmt.pct(v.baseApr ?? 0, 2),
              offer: shown(v.offer),
              rate: fmt.pct((v.baseApr ?? 0) - v.offer, 2),
            })}
      </div>
      {v.history.map((h, i) => (
        <div class="num-s muted" key={i}>
          {t('ui.deal.neg.history', {
            n: i + 1,
            ask: shown(h.ask),
            reply: t(`ui.deal.neg.reply.${h.reply}`),
          })}
        </div>
      ))}
      <div class="row-between">
        {!v.final ? (
          <span class="raise-options">
            <label class="num-s">
              {tenant
                ? t('ui.deal.neg.ask_tenant')
                : t('ui.deal.neg.ask_lender')}{' '}
              <input
                type="number"
                min={0}
                step={step}
                value={ask}
                style={{ width: '5em' }}
                onInput={(e) =>
                  setAsk(Number((e.target as HTMLInputElement).value))
                }
              />
            </label>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'DEAL_COUNTER', ask: value })}
            >
              {t('ui.deal.neg.counter')}
            </button>
          </span>
        ) : (
          <span class="num-s muted">{t('ui.deal.neg.final')}</span>
        )}
        <span class="raise-options">
          <button
            type="button"
            class="btn"
            onClick={() => act({ type: 'DEAL_ACCEPT' })}
          >
            {t('ui.deal.neg.accept')}
          </button>
          <button
            type="button"
            class="btn"
            onClick={() => act({ type: 'DEAL_WALK' })}
          >
            {t('ui.deal.neg.walk')}
          </button>
        </span>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.deal.neg.rules')}
      </p>
    </div>
  )
}

// ---------- the Deal builder (A2-05) ----------

function DealBuilder(
  props: ScreenProps & { projectId: string; onClose: () => void },
) {
  const { state, act } = props
  const v = dealView(state, props.projectId)
  if (!v) return null
  const { card } = v
  const p = card.project
  const ret = v.projected
  return (
    <Dialog
      title={t('ui.deal.title', { name: projectName(card) })}
      onClose={props.onClose}
    >
      <div class="row-between">
        <span class="num-s muted">
          {card.region && <span class="tag">{regionName(card.region)}</span>}{' '}
          {t('ui.deal.sub', {
            power: fmt.power(p.kw),
            kind: kindName(p.kind),
            build: card.buildQuarters,
          })}
          {p.gpu &&
            ` · ${t('ui.deal.gpus', { n: card.gpuCount.toLocaleString('en-US'), gpu: gpuName(p.gpu) })}`}
        </span>
        <SlotChips card={card} />
      </div>

      <NegotiationPanel state={state} act={act} projectId={p.id} />

      <div class="deal-panel">
        <div class="label">{t('ui.deal.power')} ✓</div>
        {v.power.added ? (
          <div class="num-s">
            {t(`ui.deal.power_added.${v.power.added.source}`, {
              power: fmt.power(p.kw),
              cost: fmt.money(v.power.added.costUsd),
              when: v.power.added.readyQuarter
                ? fmt.quarter(v.power.added.readyQuarter)
                : t('ui.deal.power_after', {
                    n: v.power.added.expectedQuarters,
                  }),
            })}
          </div>
        ) : (
          <>
            <div class="num-s">
              {t('ui.deal.power_line', {
                tier: tierName(card.tier),
                total: fmt.power(v.power.totalKw),
                mining: fmt.power(v.power.miningKw),
                free: fmt.power(v.power.freeKw),
              })}
            </div>
            <div class="num-s muted">{t('ui.deal.power_later')}</div>
          </>
        )}
      </div>

      {card.slots.tenant !== null && (
        <div class="deal-panel">
          <div class="label">
            {t('ui.deal.tenant')} {card.slots.tenant ? '✓' : '○'}
          </div>
          {card.tenant ? (
            <div class="num-s">
              <TenantLine card={card} />
              {' · '}
              {t('ui.projects.ready_by', {
                quarter: fmt.quarter(card.tenant.readyBy),
              })}
            </div>
          ) : (
            <>
              {p.spot && <div class="num-s">{t('ui.deal.on_spot')}</div>}
              {v.offers.length === 0 && (
                <p class="num-s muted" style={{ margin: 0 }}>
                  {t('ui.deal.no_offers')}
                </p>
              )}
              {v.offers.map((o) => (
                <div class="offer" key={o.offer.id}>
                  <div class="row-between">
                    <strong>
                      {tenantName(o.offer.card)}{' '}
                      <span class="tag">{o.rating}</span>{' '}
                      <span class="num-s muted">{tenantType(o.type)}</span>
                    </strong>
                    <span class="raise-options">
                      <BwButton
                        label={t('ui.deal.negotiate')}
                        bw={2}
                        action={{
                          type: 'DEAL_NEGOTIATE_START',
                          projectId: p.id,
                          offerId: o.offer.id,
                        }}
                        state={state}
                        act={act}
                      />
                      <BwButton
                        label={t('ui.deal.accept')}
                        bw={0}
                        action={{
                          type: 'PROJECT_SIGN_TENANT',
                          projectId: p.id,
                          offerId: o.offer.id,
                        }}
                        state={state}
                        act={act}
                      />
                    </span>
                  </div>
                  <div class="num-s">
                    {o.gpuUsdHr === null
                      ? t('ui.deal.offer_terms', {
                          price: fmt.money(o.priceUsdMwYr),
                          annual: fmt.money(o.annualUsd),
                          years: o.termYears,
                          prepay: fmt.pct(o.prepaymentShare),
                          quarter: fmt.quarter(o.readyBy),
                          walk: fmt.pct(o.walkChance),
                        })
                      : t('ui.deal.gpu_offer_terms', {
                          price: fmt.money(o.gpuUsdHr),
                          annual: fmt.money(o.annualUsd),
                          years: o.termYears,
                          quarter: fmt.quarter(o.readyBy),
                          walk: fmt.pct(o.walkChance),
                        })}
                    {o.capexCreditUsd > 0 &&
                      ` · ${t('ui.deal.credit', { value: fmt.money(o.capexCreditUsd) })}`}
                  </div>
                </div>
              ))}
              {v.spot && !p.spot && (
                <div class="row-between">
                  <span class="num-s">
                    {t('ui.deal.spot', {
                      price: fmt.money(v.spot.usdHr ?? 0),
                      util: fmt.pct(v.spot.utilisation),
                    })}
                  </span>
                  <BwButton
                    label={t('ui.deal.use_spot')}
                    bw={0}
                    action={{ type: 'PROJECT_SPOT', projectId: p.id }}
                    state={state}
                    act={act}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <CapitalRows
        state={state}
        act={act}
        card={card}
        cashUsd={v.capital.cashUsd}
      />

      <div class="deal-panel">
        <div class="label">{t('ui.deal.return')}</div>
        <table>
          <tbody>
            <tr>
              <td>{t('ui.deal.capex')}</td>
              <td class="num r">{fmt.money(ret.capexUsd)}</td>
              <td class="num-s muted">
                {v.cost.gpuUsd > 0 &&
                  t('ui.deal.capex_split', {
                    gpus: fmt.money(v.cost.gpuUsd),
                    retrofit: fmt.money(v.cost.retrofitUsd - v.cost.creditUsd),
                  })}
                {v.cost.creditUsd > 0 &&
                  t('ui.deal.credit', { value: fmt.money(v.cost.creditUsd) })}
              </td>
            </tr>
            <tr>
              <td>{t('ui.deal.revenue')}</td>
              <td class="num r">
                {ret.revenueUsd === null ? '—' : fmt.money(ret.revenueUsd)}
              </td>
              <td />
            </tr>
            <tr>
              <td>{t('ui.deal.ebitda')}</td>
              <td class="num r">
                {ret.ebitdaUsd === null ? '—' : fmt.money(ret.ebitdaUsd)}
              </td>
              <td />
            </tr>
            <tr>
              <td>{t('ui.deal.payback')}</td>
              <td class="num r">
                {ret.paybackYears === null
                  ? '—'
                  : t('ui.deal.years', { n: ret.paybackYears.toFixed(1) })}
              </td>
              <td />
            </tr>
            <tr>
              <td>{t('ui.deal.irr')}</td>
              <td class="num r">
                <strong>{ret.irr === null ? '—' : fmt.pct(ret.irr)}</strong>
              </td>
              <td class="num-s muted">
                {p.kind === 'shell'
                  ? t('ui.deal.irr_note.shell')
                  : t('ui.deal.irr_note.cloud', {
                      years: v.projectionYears,
                      residual: fmt.pct(v.residualShareAtEnd),
                    })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="row-between">
        <span class="num-s loss">
          {v.startBlocker &&
            t('ui.deal.cant_start', { why: say(v.startBlocker) })}
        </span>
        <span style={{ display: 'inline-flex', gap: '8px' }}>
          <BwButton
            label={t('ui.deal.cancel')}
            bw={0}
            action={{ type: 'PROJECT_CANCEL', projectId: p.id }}
            state={state}
            act={act}
            onDone={props.onClose}
          />
          <button type="button" class="btn" onClick={props.onClose}>
            {t('ui.deal.save_close')}
          </button>
          <BwButton
            label={t('ui.deal.start', {
              cost: fmt.money(dealCapitalView(state, p).ownCashUsd),
            })}
            bw={v.startBandwidth}
            action={{ type: 'PROJECT_START', projectId: p.id }}
            state={state}
            act={act}
            primary
            onDone={props.onClose}
          />
        </span>
      </div>
    </Dialog>
  )
}
