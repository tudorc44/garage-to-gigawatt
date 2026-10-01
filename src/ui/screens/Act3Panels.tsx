// Act III's bare-bones panels (M13.2; wireframes A3-02 … A3-05, the M13 spec's answer 5). What each
// panel contains and its order follow the wireframes; the layout reuses the existing panels. Everything
// comes from the selectors; no game rules here. Nothing here shows the scenario, a phase, a card's role
// or a future value: Signals show this quarter's value and the ranges you paid to read, contracts show
// today's market only, and a renewal offer shows only once its renewal is open.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { SignalId } from '../../content/index.ts'
import {
  act3ReportLines,
  blendOffers,
  contractCalendar,
  contractsDueSoon,
  idleRigsView,
  renewalsDue,
  signalsPanel,
} from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { Dialog, Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'
import { BwButton, NegotiationPanel } from './Projects.tsx'

// A3-07 (M16.5) lives in its own file; exported here so it loads with the other Act III panels.
export { RacksPanel } from './Act3Racks.tsx'
// A3-09 and the step-6 pieces (M17.6), the same way.
export {
  GovernmentSection,
  PcStat,
  PpaRowsPanel,
  WildcardPanel,
} from './Act3Government.tsx'
import { PpaRowsPanel as PpaRows } from './Act3Government.tsx'

const tenantName = (id: string) => tDynamic(`tenant.${id}`, id)
const tenantType = (type: string) => tDynamic(`ui.tenant_type.${type}`, type)
const short = (id: string) => tDynamic(`ui.act3.sig_short.${id}`, id)

/** Neutral arrows in ink, never gain/loss colours (A3-02). */
const ARROW: Record<string, string> = { up: '▲', flat: '▶', down: '▼' }

/** A small reason line under a blocked button. */
function Why(props: { why: Parameters<typeof say>[0] | null }) {
  return props.why ? (
    <span class="num-s muted">{say(props.why)}</span>
  ) : null
}

// ---------- the top bar strip (A3-02) ----------

/** Six short Signals labels with this quarter's value and arrow, and "Contracts due: N in next 4 Q". */
export function Act3TopStrip({ state }: { state: GameState }) {
  const v = signalsPanel(state)
  const due = contractsDueSoon(state)
  if (!v) return null
  return (
    <>
      <div class="stat" title={t('ui.act3.signals.title')}>
        <span class="label">{t('ui.act3.signals.title')}</span>
        <span class="num-s">
          {v.indicators
            .map(
              (i) =>
                `${short(i.id)} ${i.current?.displayed ?? '—'}${ARROW[i.current?.arrow ?? ''] ?? ''}`,
            )
            .join(' · ')}
        </span>
      </div>
      {due !== null && (
        <div class="stat">
          <span class="label">{t('ui.act3.top.due')}</span>
          <span class="num">{t('ui.act3.top.due_value', { n: due })}</span>
        </div>
      )}
    </>
  )
}

// ---------- Signals on the Plan screen (A3-02, A3-03) ----------

/** A plain 0–100 bar with this quarter's value, and a band for a range you read this quarter. */
function SignalBar(props: {
  value: number | null
  range?: { low: number; high: number } | null
}) {
  return (
    <div class="sig-bar" aria-hidden="true">
      {props.range && (
        <div
          class="sig-band"
          style={{
            left: `${props.range.low}%`,
            width: `${Math.max(1, props.range.high - props.range.low)}%`,
          }}
        />
      )}
      {props.value !== null && (
        <div class="sig-mark" style={{ left: `${props.value}%` }} />
      )}
    </div>
  )
}

/** The Signals panel: six rows, Read the market (1 BW, a chooser), and your reads (newest first). */
export function Act3SignalsPanel({ state, act }: ScreenProps) {
  const v = signalsPanel(state)
  const [choosing, setChoosing] = useState(false)
  if (!v) return null
  const reads = v.indicators
    .flatMap((i) => i.reads.map((r) => ({ ...r, label: i.label })))
    .sort((a, b) => (a.quarter < b.quarter ? 1 : -1))
  return (
    <div class="panel p signals">
      <h2 class="panel-title">{t('ui.act3.signals.title')}</h2>
      {v.indicators.map((i) => {
        const now = i.reads.find((r) => r.quarter === v.quarter)
        return (
          <div key={i.id} class="sig-row" title={i.higherMeans}>
            <div class="row-between">
              <span class="num-s">{i.label}</span>
              <span class="num">
                {i.current?.displayed ?? '—'}{' '}
                {ARROW[i.current?.arrow ?? ''] ?? ''}
              </span>
            </div>
            <SignalBar value={i.current?.displayed ?? null} range={now} />
            {now && <span class="num-s muted">{now.note}</span>}
          </div>
        )
      })}
      <div class="row-between">
        <button
          type="button"
          class="btn"
          disabled={!!v.blocked || v.readThisQuarter !== null}
          onClick={() => setChoosing(true)}
        >
          {t('ui.act3.signals.read', { n: v.cost })}{' '}
          <Pips total={v.cost} filled={v.cost} label={t('ui.plan.costs_bandwidth', { n: v.cost })} />
        </button>
        {v.readThisQuarter !== null ? (
          <span class="num-s muted">{t('ui.act3.signals.read_done')}</span>
        ) : (
          <Why why={v.blocked} />
        )}
      </div>
      {reads.length > 0 && (
        <div>
          <span class="label">{t('ui.act3.signals.your_reads')}</span>
          {reads.map((r, i) => (
            <div key={i} class="num-s">
              {t('ui.act3.signals.read_line', {
                quarter: fmt.quarter(r.quarter),
                indicator: r.label,
                low: r.low,
                high: r.high,
              })}
            </div>
          ))}
        </div>
      )}
      {choosing && (
        <ReadDialog
          state={state}
          act={act}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  )
}

/** Read the market (A3-03): pick one indicator; its true range for this quarter shows on its bar. */
function ReadDialog(props: ScreenProps & { onClose: () => void }) {
  const v = signalsPanel(props.state)!
  const [pick, setPick] = useState<string>(v.indicators[0].id)
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog title={t('ui.act3.signals.read_title')} onClose={props.onClose}>
      <p class="num-s">{t('ui.act3.signals.read_body', { n: v.cost })}</p>
      <div role="radiogroup">
        {v.indicators.map((i) => (
          <label key={i.id} class="row-between">
            <span>
              <input
                type="radio"
                name="signal"
                checked={pick === i.id}
                onChange={() => setPick(i.id)}
              />{' '}
              {i.label}
            </span>
            <span class="num-s muted">
              {i.current?.displayed ?? '—'} {ARROW[i.current?.arrow ?? ''] ?? ''}
            </span>
          </label>
        ))}
      </div>
      {error && <p class="num-s loss">{error}</p>}
      <button
        type="button"
        class="btn btn-primary"
        onClick={() => {
          const e = props.act({
            type: 'READ_SIGNAL',
            indicator: pick as SignalId,
          })
          if (e) setError(say(e))
          else props.onClose()
        }}
      >
        {t('ui.act3.signals.read', { n: v.cost })}
      </button>
    </Dialog>
  )
}

// ---------- Renewals due (A3-05, A3-06's tenant-triggered case) ----------

/** One card per open renewal: the offer with Accept (default) / Counter / Re-let, or the walked state. */
export function RenewalsDuePanel({ state, act }: ScreenProps) {
  const due = renewalsDue(state)
  if (due.length === 0) return null
  return (
    <div class="panel p">
      <h2 class="panel-title">
        {t('ui.act3.renewal.title', { n: due.length })}
      </h2>
      <div class="renewal-cards">
        {due.map((r) => {
          const money = (x: number) =>
            r.kind === 'gpu'
              ? t('ui.act3.per_gpu_hr', { value: fmt.money(x, { exact: true, dp: 2 }) })
              : t('ui.act3.per_year', { value: fmt.money(x) })
          const negotiating =
            state.dealNegotiation?.side === 'renewal' &&
            state.dealNegotiation.projectId === r.projectId
          return (
            <div key={r.projectId} class="panel p renewal-card">
              <span class="label">
                {t(`ui.act3.renewal.cause.${r.cause}${r.by ? `_${r.by}` : ''}` as 'ui.act3.renewal.cause.term')}
              </span>
              <strong>
                {t(r.walked ? 'ui.act3.renewal.walked_title' : 'ui.act3.renewal.offer_title', {
                  tenant: tenantName(r.card),
                })}
              </strong>
              <span class="num-s">
                {t('ui.act3.renewal.contract', {
                  kind: t(`ui.act3.kind.${r.kind}`),
                  size:
                    r.mw !== null
                      ? fmt.power(r.mw * 1000)
                      : t('ui.act3.gpus', {
                          n: (r.gpus ?? 0).toLocaleString('en-US'),
                        }),
                  type: tenantType(r.tenantType),
                })}
              </span>
              <span class="num-s">
                {t('ui.act3.renewal.current', { rent: money(r.currentRate) })}
              </span>
              {!r.walked && r.offer && (
                <>
                  <span class="num">
                    {t('ui.act3.renewal.offer', {
                      rent: money(r.offer.rate),
                      years: r.offer.termYears,
                      change: fmt.delta(r.offer.mult - 1, 'pct'),
                    })}
                  </span>
                  {r.counterMult !== null && (
                    <span class="num-s">
                      {t('ui.act3.renewal.countered', {
                        rent: money(r.currentRate * r.counterMult),
                      })}
                    </span>
                  )}
                  {r.walkChance !== null && (
                    <span class="num-s muted">
                      {t('ui.act3.renewal.survived', {
                        pct: fmt.pct(r.walkChance),
                      })}
                    </span>
                  )}
                  <div class="renewal-actions">
                    <div>
                      <button
                        type="button"
                        class={`btn${r.choice === 'accept' ? ' btn-primary' : ''}`}
                        disabled={!!r.blocked.accept}
                        onClick={() =>
                          act({ type: 'RENEWAL_ACCEPT', projectId: r.projectId })
                        }
                      >
                        {t('ui.act3.renewal.accept')}
                      </button>
                      <span class="num-s muted">
                        {t('ui.act3.renewal.accept_note', {
                          quarter: r.startsQuarter ? fmt.quarter(r.startsQuarter) : '',
                        })}
                      </span>
                    </div>
                    <div>
                      <BwButton
                        label={t('ui.act3.renewal.counter')}
                        bw={r.cost.counter}
                        action={{
                          type: 'DEAL_NEGOTIATE_START',
                          projectId: r.projectId,
                          renewal: true,
                        }}
                        state={state}
                        act={act}
                      />
                      {negotiating ? null : <Why why={r.blocked.counter} />}
                    </div>
                    {r.kind === 'shell' ? (
                      <div>
                        <BwButton
                          label={t('ui.act3.renewal.relet')}
                          bw={r.cost.relet}
                          action={{ type: 'RENEWAL_RELET', projectId: r.projectId }}
                          state={state}
                          act={act}
                          primary={r.choice === 'relet'}
                        />
                        <span class="num-s muted">
                          {t('ui.act3.renewal.relet_note', {
                            quarters: r.reletEmptyQuarters,
                            rent: fmt.money(r.reletEstimateUsd ?? 0),
                          })}
                        </span>
                        <Why why={r.blocked.relet} />
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          class={`btn${r.choice === 'relet' ? ' btn-primary' : ''}`}
                          disabled={!!r.blocked.relet}
                          onClick={() =>
                            act({ type: 'RENEWAL_RELET', projectId: r.projectId })
                          }
                        >
                          {t('ui.act3.renewal.spot')}
                        </button>
                        <Why why={r.blocked.relet} />
                      </div>
                    )}
                  </div>
                  <span class="num-s">
                    {t('ui.act3.renewal.will', {
                      what: t(`ui.act3.renewal.will.${r.choice}` as 'ui.act3.renewal.will.accept'),
                    })}
                  </span>
                  {negotiating && (
                    <NegotiationPanel
                      state={state}
                      act={act}
                      projectId={r.projectId}
                    />
                  )}
                </>
              )}
              {r.walked && (
                <>
                  <span class="num-s">
                    {r.kind === 'shell'
                      ? t('ui.act3.renewal.walked_shell', {
                          size: fmt.power((r.mw ?? 0) * 1000),
                          quarter: r.startsQuarter ? fmt.quarter(r.startsQuarter) : '',
                          rent: money(r.currentRate),
                        })
                      : t('ui.act3.renewal.walked_gpu')}
                  </span>
                  {r.kind === 'shell' && (
                    <div class="renewal-actions">
                      <div>
                        <span class={`tag${r.choice === 'walk' ? ' default' : ''}`}>
                          {t('ui.act3.renewal.auto_relet')}
                        </span>
                        <span class="num-s muted">
                          {t('ui.act3.renewal.relet_note', {
                            quarters: r.reletEmptyQuarters,
                            rent: fmt.money(r.reletEstimateUsd ?? 0),
                          })}
                        </span>
                      </div>
                      <div>
                        <button
                          type="button"
                          class={`btn${r.choice === 'keep_empty' ? ' btn-primary' : ''}`}
                          disabled={!!r.blocked.keepEmpty}
                          onClick={() =>
                            act({
                              type: 'RENEWAL_KEEP_EMPTY',
                              projectId: r.projectId,
                            })
                          }
                        >
                          {t('ui.act3.renewal.keep_empty')}
                        </button>
                        <span class="num-s muted">
                          {t('ui.act3.renewal.keep_empty_note')}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Contracts (A3-04) ----------

/** Every tenant contract by end quarter, with the reopener in its row, and the blend-and-extend offers. */
export function ContractsSection({ state, act }: ScreenProps) {
  const rows = contractCalendar(state)
  const blends = blendOffers(state)
  return (
    <div class="section single">
      <div class="panel p">
        <h2 class="panel-title">
          {t('ui.act3.contracts.title', { n: rows.length })}
        </h2>
        {rows.length === 0 ? (
          <p class="num-s muted">{t('ui.act3.contracts.none')}</p>
        ) : (
          <table class="num-s">
            <thead>
              <tr>
                <th>{t('ui.act3.contracts.col.tenant')}</th>
                <th>{t('ui.act3.contracts.col.kind')}</th>
                <th class="r">{t('ui.act3.contracts.col.size')}</th>
                <th class="r">{t('ui.act3.contracts.col.rent')}</th>
                <th class="r">{t('ui.act3.contracts.col.today')}</th>
                <th class="r">{t('ui.act3.contracts.col.left')}</th>
                <th>{t('ui.act3.contracts.col.ends')}</th>
                <th>{t('ui.act3.contracts.col.flags')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{tenantName(e.card)}</strong>
                    <br />
                    <span class="muted">{tenantType(e.tenantType)}</span>
                  </td>
                  <td>{t(`ui.act3.kind.${e.kind}`)}</td>
                  <td class="r num">
                    {e.mw !== null
                      ? fmt.power(e.mw * 1000)
                      : t('ui.act3.gpus', { n: (e.gpus ?? 0).toLocaleString('en-US') })}
                  </td>
                  <td class="r num">
                    {e.annualRentUsd !== null
                      ? t('ui.act3.per_year', { value: fmt.money(e.annualRentUsd) })
                      : t('ui.act3.per_gpu_hr', {
                          value: fmt.money(e.usdPerGpuHr ?? 0, { exact: true, dp: 2 }),
                        })}
                  </td>
                  <td class="r num">
                    {e.newLeaseRefUsd !== null
                      ? t('ui.act3.per_year', { value: fmt.money(e.newLeaseRefUsd) })
                      : e.marketUsdPerGpuHr !== null
                        ? t('ui.act3.per_gpu_hr', {
                            value: fmt.money(e.marketUsdPerGpuHr, { exact: true, dp: 2 }),
                          })
                        : '—'}
                  </td>
                  <td class="r num">{e.quartersLeft ?? '—'}</td>
                  <td class="num">
                    {e.endQuarterLabel
                      ? fmt.quarter(e.endQuarterLabel)
                      : t('ui.act3.contracts.after_2030')}
                  </td>
                  <td>
                    {e.distressed && (
                      <span class="tag">{t('ui.act3.contracts.flag.distress')}</span>
                    )}{' '}
                    {e.holdover && (
                      <span class="tag">{t('ui.act3.contracts.flag.holdover')}</span>
                    )}{' '}
                    {e.reopenerEligible && (
                      <span>
                        <BwButton
                          label={t('ui.act3.contracts.reopen', {
                            fee: fmt.money(e.reopenFeeUsd ?? 0),
                          })}
                          bw={1}
                          action={{ type: 'REOPEN_LEASE', projectId: e.id }}
                          state={state}
                          act={act}
                        />
                        <Why why={e.reopenBlocked} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p class="num-s muted">{t('ui.act3.contracts.reopen_rule')}</p>
      </div>
      <PpaRows state={state} />
      {blends.length > 0 && (
        <div class="panel p">
          <h2 class="panel-title">{t('ui.act3.blend.title')}</h2>
          <p class="num-s muted">{t('ui.act3.blend.body')}</p>
          <table class="num-s">
            <tbody>
              {blends.map((b) => (
                <tr key={b.projectId}>
                  <td>
                    <strong>{tenantName(b.card)}</strong>
                  </td>
                  <td>
                    {t('ui.act3.blend.line', {
                      years: b.extendYears,
                      now: fmt.money(b.currentRentUsd),
                      blended: fmt.money(b.blendedRentUsd),
                      change: fmt.delta(b.mult - 1, 'pct', { dp: 1 }),
                    })}
                  </td>
                  <td class="r">
                    <button
                      type="button"
                      class="btn"
                      disabled={!!b.blocked}
                      onClick={() =>
                        act({ type: 'BLEND_ACCEPT', projectId: b.projectId })
                      }
                    >
                      {t('ui.act3.blend.accept')}
                    </button>{' '}
                    <span class="tag default">{t('ui.act3.blend.ignore')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- idled rigs (Sites & Fleet) ----------

/** "N MW idle (card)" with "Turn back on" (RESUME_IDLE_MACHINES); nothing when no machine is idle. */
export function IdleRigsPanel({ state, act }: ScreenProps) {
  const v = idleRigsView(state)
  if (!v) return null
  return (
    <div class="panel p">
      <div class="row-between">
        <span>
          {t('ui.act3.idle.line', {
            mw: fmt.power(v.mw * 1000),
            units: v.units,
          })}
        </span>
        <button
          type="button"
          class="btn"
          disabled={!!v.blocked}
          onClick={() => act({ type: 'RESUME_IDLE_MACHINES' })}
        >
          {t('ui.act3.idle.resume')}
        </button>
      </div>
      <Why why={v.blocked} />
    </div>
  )
}

// ---------- the quarter report's Act III block ----------

/** This quarter's renewals, reopeners, blend acceptances and card effects, as plain lines. */
export function Act3ReportBlock({ state }: { state: GameState }) {
  const lines = act3ReportLines(state)
  if (!lines) return null
  return (
    <div class="panel p">
      <h2 class="panel-title">{t('ui.act3.report.title')}</h2>
      {lines.length === 0 ? (
        <p class="num-s muted">{t('ui.act3.report.none')}</p>
      ) : (
        lines.map((e, i) => (
          <div key={i} class="num-s">
            {say(e)}
          </div>
        ))
      )}
    </div>
  )
}
