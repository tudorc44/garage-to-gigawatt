// The Act II Capital screen (wireframe A2-07; scope 0.2 §2.2, §2.7): the credit rating with its
// inputs and the next notch either way, the debt stack, the backlog by tenant, the valuation line by
// line, and equity (the cap table and a raise / ATM offering). Everything comes from the capital
// views; no game rules here.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import {
  backlogView,
  debtStackView,
  equityView,
  ratingView,
  valuationBreakdown,
} from '../../sim/selectors.ts'
import { Tip } from '../components/basics.tsx'
import { BridgePayment } from '../components/bridge.tsx'
import { fmt } from '../format.ts'
import { say } from '../names.ts'
import { LoanDialog } from './dialogs.tsx'
import type { ScreenProps } from './Plan.tsx'
import { BwButton } from './Projects.tsx'

const tenantName = (id: string) => tDynamic(`tenant.${id}`, id)
const x = (n: number) => `${n.toFixed(1)}×`

export function CapitalAct2({ state, act }: ScreenProps) {
  return (
    <div class="capital2">
      <RatingCard state={state} />
      <DebtStack state={state} act={act} />
      <Backlog state={state} />
      <Valuation state={state} />
      <Equity state={state} act={act} />
    </div>
  )
}

function RatingCard({ state }: { state: ScreenProps['state'] }) {
  const v = ratingView(state)
  return (
    <section class="panel p cap-rating">
      <div class="label">{t('ui.cap2.rating')}</div>
      <Tip id="credit_rating" />
      {!v ? (
        <p class="num-s muted">{t('ui.cap2.not_rated')}</p>
      ) : (
        <>
          <div>
            <span class="rating-badge big">{v.rating}</span>
          </div>
          <p class="num-s muted" style={{ margin: 0 }}>
            {v.scaleList.map((r, i) => (
              <span key={r}>
                {i > 0 && ' · '}
                {r === v.rating ? <strong>[{r}]</strong> : r}
              </span>
            ))}
          </p>
          <div class="label">{t('ui.cap2.inputs')}</div>
          <div class="cap-input">
            <span>{t('ui.cap2.leverage')}</span>
            <span class="r">
              <strong>
                {v.inputs.debtToEbitda === null
                  ? v.inputs.debtUsd > 0
                    ? t('ui.cap2.no_ebitda')
                    : t('ui.cap2.no_debt')
                  : x(v.inputs.debtToEbitda)}
              </strong>{' '}
              <span class="muted">
                {tDynamic(`ui.cap2.band.${v.inputs.band}`, v.inputs.band)}
              </span>
            </span>
          </div>
          <div class="cap-input">
            <span>{t('ui.cap2.backlog_quality')}</span>
            <span class="r">
              <strong>
                {tDynamic(
                  `ui.cap2.quality.${v.inputs.quality}`,
                  v.inputs.quality,
                )}
              </strong>{' '}
              <span class="muted">
                {t('ui.cap2.ig_share', {
                  share: fmt.pct(v.inputs.strongShare),
                })}
              </span>
            </span>
          </div>
          <div class="cap-input">
            <span>{t('ui.cap2.runway')}</span>
            <span class="r">
              <strong>
                {v.inputs.runwayQuarters === null
                  ? t('ui.cap2.not_burning')
                  : v.inputs.runwayQuarters >= 20
                    ? t('ui.cap2.quarters_plus', { n: 20 })
                    : t('ui.cap2.quarters', {
                        n: v.inputs.runwayQuarters.toFixed(1),
                      })}
              </strong>{' '}
              <span class={v.inputs.shortRunway ? 'loss' : 'muted'}>
                {v.inputs.shortRunway ? t('ui.cap2.short') : t('ui.cap2.ok')}
              </span>
            </span>
          </div>
          <div class="label">{t('ui.cap2.next_notch')}</div>
          {v.up && (
            <div class="notch-box num-s">
              {t('ui.cap2.up', { rating: v.up.rating, x: v.up.belowX })}
            </div>
          )}
          {v.down && (
            <div class="notch-box num-s">
              {t('ui.cap2.down', { rating: v.down.rating, x: v.down.aboveX })}
            </div>
          )}
          <div class="label">{t('ui.cap2.loan_terms')}</div>
          <p class="num-s muted" style={{ margin: 0 }}>
            {v.loanBands.map((b, i) => {
              const text = t('ui.cap2.loan_band', {
                band: tDynamic(`ui.cap2.loan_band.${b.from}`, b.from),
                spread: fmt.pct(b.spread, 1),
                ltv: fmt.pct(b.ltv),
              })
              return (
                <span key={b.from}>
                  {i > 0 && ' · '}
                  {b.current ? <strong>{text}</strong> : text}
                </span>
              )
            })}
          </p>
        </>
      )}
      <p class="num-s muted" style={{ marginTop: 'auto' }}>
        {t('ui.cap2.rating_note')}
      </p>
    </section>
  )
}

function DebtStack({ state, act }: ScreenProps) {
  const v = debtStackView(state)
  const [loan, setLoan] = useState(false)
  return (
    <section class="panel p">
      <div class="row-between">
        <div class="label">
          {t('ui.cap2.debt_stack', { total: fmt.money(v.totalUsd) })}
        </div>
        {v.equipmentOffered && (
          <button type="button" class="btn" onClick={() => setLoan(true)}>
            {t('ui.cap2.equipment_loan')}
          </button>
        )}
      </div>
      {v.rows.length === 0 ? (
        <p class="num-s muted">{t('ui.cap2.no_debt_rows')}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('ui.cap2.col.instrument')}</th>
              <th class="r">{t('ui.cap2.col.balance')}</th>
              <th class="r">{t('ui.cap2.col.rate')}</th>
              <th>{t('ui.cap2.col.maturity')}</th>
              <th>{t('ui.cap2.col.covenant')}</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r, i) => (
              <tr key={i}>
                <td>
                  {tDynamic(`ui.cap2.kind.${r.kind}`, r.kind)}
                  {r.projectN !== null &&
                    ` · ${t('ui.cap2.project_n', { n: r.projectN })}`}
                  {r.rating && <span class="tag">{r.rating}</span>}
                </td>
                <td class="num r">
                  {fmt.money(r.balanceUsd)}
                  {r.balanceUsd < r.amountUsd - 1 && (
                    <div class="num-s muted">
                      {t('ui.cap2.of', { amount: fmt.money(r.amountUsd) })}
                    </div>
                  )}
                </td>
                <td class="num r">{fmt.pct(r.apr, 1)}</td>
                <td class="num">
                  {r.maturity ? fmt.quarter(r.maturity) : '—'}
                </td>
                <td
                  class={`num-s ${r.status === 'breach' || r.missed > 0 ? 'loss' : ''}`}
                >
                  {r.missed > 0
                    ? t('ui.cap2.missed', { n: r.missed })
                    : r.status === null
                      ? '—'
                      : r.status === 'building'
                        ? t('ui.cap2.building')
                        : t(`ui.cap2.dscr.${r.status}`, {
                            x: x(r.dscr!),
                            min: x(v.dscrMin),
                          })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {v.rows.some((r) => r.kind === 'bridge') && (
        <BridgePayment state={state} />
      )}
      {v.rows.some((r) => r.kind === 'bridge') && (
        <div class="row-between">
          <span class="num-s muted">{t('ui.cap2.bridge_note')}</span>
          <button
            type="button"
            class="btn"
            disabled={v.bridgeRepay !== null}
            title={v.bridgeRepay ? say(v.bridgeRepay) : undefined}
            onClick={() => act({ type: 'REPAY_BRIDGE_LOAN' })}
          >
            {t('ui.cap2.bridge_repay')}
          </button>
        </div>
      )}
      {loan && (
        <LoanDialog state={state} act={act} onClose={() => setLoan(false)} />
      )}
    </section>
  )
}

function Backlog({ state }: { state: ScreenProps['state'] }) {
  const v = backlogView(state)
  return (
    <section class="panel p">
      <div class="label">
        {t('ui.cap2.backlog', { total: fmt.money(v.totalUsd) })}
      </div>
      <Tip id="backlog" />
      {v.rows.length === 0 ? (
        <p class="num-s muted">{t('ui.cap2.no_backlog')}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('ui.cap2.col.tenant')}</th>
              <th>{t('ui.cap2.col.rating')}</th>
              <th class="r">{t('ui.cap2.col.remaining')}</th>
              <th class="r">{t('ui.cap2.col.weight')}</th>
              <th class="r">{t('ui.cap2.col.counted')}</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r) => (
              <tr key={r.projectN}>
                <td>
                  {tenantName(r.tenant)} ·{' '}
                  {t('ui.cap2.project_n', { n: r.projectN })}
                </td>
                <td class="num">
                  {r.rating}
                  {r.backstopped && ` · ${t('ui.cap2.backstopped')}`}
                </td>
                <td class="num r">{fmt.money(r.remainingUsd)}</td>
                <td class="num r">{fmt.pct(r.weight)}</td>
                <td class="num r">{fmt.money(r.countedUsd)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>{t('ui.cap2.total')}</strong>
              </td>
              <td />
              <td class="num r">
                <strong>{fmt.money(v.totalUsd)}</strong>
              </td>
              <td />
              <td class="num r">
                <strong>{fmt.money(v.countedUsd)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.cap2.weights_note', {
          aPct: v.weights.a,
          bbbPct: v.weights.bbb,
          backstopPct: v.weights.backstop,
          belowPct: v.weights.below,
          floor: v.floorMultiple,
        })}
      </p>
    </section>
  )
}

function Valuation({ state }: { state: ScreenProps['state'] }) {
  const v = valuationBreakdown(state)
  if (!v)
    return (
      <section class="panel p">
        <div class="label">{t('ui.section.valuation')}</div>
        <p class="num-s muted">{t('ui.section.val.none')}</p>
      </section>
    )
  const line = (text: string, usd: number, cls = '') => (
    <tr>
      <td>{text}</td>
      <td class={`num r ${cls}`}>{fmt.money(usd)}</td>
    </tr>
  )
  return (
    <section class="panel p">
      <div class="label">
        {t('ui.cap2.valuation', { total: fmt.money(v.valuationUsd) })}
      </div>
      <table>
        <tbody>
          {line(
            t('ui.cap2.val.mining', {
              ebitda: fmt.money(v.ebitdaUsd * 4),
              multiple: v.multiple,
            }),
            v.enterpriseUsd,
          )}
          {line(
            t('ui.cap2.val.ai', {
              ebitda: fmt.money(v.aiEbitdaUsd * 4),
              multiple: v.aiMultiple,
            }),
            v.aiEnterpriseUsd,
          )}
          {line(t('ui.section.val.cash'), v.cashUsd)}
          {line(t('ui.section.val.treasury'), v.treasuryUsd)}
          {line(t('ui.section.val.debt'), -v.debtUsd, 'loss')}
          {line(t('ui.cap2.val.construction'), v.constructionUsd)}
          {line(t('ui.cap2.val.backlog'), v.weightedBacklogUsd)}
          <tr>
            <td>
              <strong>
                {t('ui.section.val.total', { quarter: fmt.quarter(v.quarter) })}
              </strong>
            </td>
            <td class="num r">
              <strong>{fmt.money(v.valuationUsd)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function Equity({ state, act }: ScreenProps) {
  const v = equityView(state)
  return (
    <section class="panel p">
      <div class="label">{t('ui.cap2.equity')}</div>
      <div class="stake-bar" role="img" aria-label={fmt.pct(v.founderStake, 1)}>
        <div class="stake-you" style={{ width: `${v.founderStake * 100}%` }}>
          {t('ui.section.you_pct', { pct: fmt.pct(v.founderStake, 1) })}
        </div>
        <div class="stake-investors">
          {t('ui.section.investors_pct', {
            pct: fmt.pct(1 - v.founderStake, 1),
          })}
        </div>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.cap2.stake_value', { value: fmt.money(v.founderValueUsd) })}
      </p>
      <div class="label">
        {v.public ? t('ui.cap2.atm') : t('ui.cap2.raise')}
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.cap2.raise_note', {
          pre: fmt.money(v.preMoneyUsd),
          left: v.raisesLeft,
        })}
      </p>
      {v.signedUsd > 0 && (
        <p class="num-s gain" style={{ margin: 0 }}>
          {t('ui.cap2.raise_signed', { usd: fmt.money(v.signedUsd) })}
        </p>
      )}
      <div class="raise-options">
        {v.options.map((o) => (
          <BwButton
            key={o.dilution}
            label={t('ui.cap2.raise_option', {
              amount: fmt.money(o.amountUsd),
              dilution: fmt.pct(o.dilution),
              stake: fmt.pct(o.stakeAfter, 1),
            })}
            bw={v.bandwidth}
            action={{ type: 'RAISE_EQUITY', dilution: o.dilution }}
            state={state}
            act={act}
          />
        ))}
      </div>
    </section>
  )
}
