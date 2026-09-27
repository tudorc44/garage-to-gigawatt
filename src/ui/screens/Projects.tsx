// Act II projects (scope 0.2 §2.5): the Projects page (wireframe A2-04, a kanban from Proposed to
// Sold), the Open-a-project dialog, and the Deal builder (A2-05) with its three slots and the
// projected return. Everything comes from the project views; no game rules here.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { Action } from '../../sim/actions.ts'
import {
  PROJECT_COLUMNS,
  dealView,
  openProjectView,
  projectsView,
  whyNot,
  type ProjectCardView,
} from '../../sim/selectors.ts'
import type { ProjectKind } from '../../sim/state.ts'
import { Dialog, Icon, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say, tierIcon, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const kindName = (kind: string) => tDynamic(`project_kind.${kind}`, kind)
const gpuName = (gpu: string) => tDynamic(`gpu.${gpu}`, gpu)
const tenantName = (id: string) => tDynamic(`tenant.${id}`, id)
const tenantType = (type: string) => tDynamic(`ui.tenant_type.${type}`, type)
const regionName = (r: string | null) =>
  r ? tDynamic(`ui.region.${r}`, r.toUpperCase()) : ''

/** A button that shows its Bandwidth cost as pips and, when not allowed, why (as its title). */
function BwButton(props: {
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
  const size =
    kind === 'pilot' ? (v.pilotSizes.includes(kw) ? kw : v.pilotSizes[0]) : kw
  const action: Action = {
    type: 'PROJECT_OPEN',
    siteId,
    kw: size,
    kind,
    ...(kind === 'cloud' ? { gpu } : {}),
  }
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
            {tierName(x.site.tier)}
            {x.region && <span class="tag">{regionName(x.region)}</span>}
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

      <div class="deal-panel">
        <div class="label">{t('ui.deal.power')} ✓</div>
        <div class="num-s">
          {t('ui.deal.power_line', {
            tier: tierName(card.tier),
            total: fmt.power(v.power.totalKw),
            mining: fmt.power(v.power.miningKw),
            free: fmt.power(v.power.freeKw),
          })}
        </div>
        <div class="num-s muted">{t('ui.deal.power_later')}</div>
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

      <div class="deal-panel">
        <div class="label">
          {t('ui.deal.capital')} {card.slots.capital ? '✓' : '○'}
        </div>
        <div class="row-between">
          <span class="num-s">
            {t('ui.deal.own_cash', { cash: fmt.money(v.capital.cashUsd) })}
          </span>
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
        </div>
        <div class="num-s muted">{t('ui.deal.capital_later')}</div>
      </div>

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
            label={t('ui.deal.start', { cost: fmt.money(ret.capexUsd) })}
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
