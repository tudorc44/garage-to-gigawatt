// Act III step 6's screens (M17.6; layout from docs/wireframes/act3/A3-09-Government.dc.html, look from the grid
// theme): the Government section (the political-capital meter, the Director, lobbying, the spend cards, this
// quarter's log), the top bar's "PC n", the wildcard card on the Plan screen, and the nuclear PPAs on the contract
// calendar. Everything comes from the selectors; no rules here.
import { t, tDynamic } from '../../i18n/t.ts'
import { governmentView, ppaRows, wildcardView } from '../../sim/selectors.ts'
import type { GameState } from '../../sim/state.ts'
import { Icon } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say, siteName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'
import { BwButton } from './Projects.tsx'

const lobbyName = (id: string) => tDynamic(`pc.lobby.${id}`, id)
const spendName = (id: string) => tDynamic(`pc.spend.${id}`, id)

// ---------- the top bar ----------

/** "PC {n}" next to Bandwidth (Act III, from 2027Q1). */
export function PcStat({ state }: { state: GameState }) {
  const v = governmentView(state)
  if (!v) return null
  return (
    <div class="stat" title={t('ui.gov.meter_title')} data-pc-stat>
      <span class="label">{t('ui.top.pc')}</span>
      <span class={`num${v.low ? ' loss' : ''}`}>
        <Icon name="political-capital" size={16} />
        {v.pc}
      </span>
    </div>
  )
}

// ---------- the meter ----------

function Meter({ v }: { v: NonNullable<ReturnType<typeof governmentView>> }) {
  const delta = v.pc - v.lastPc
  return (
    <div class={`panel p pc-meter${v.low ? ' low' : ''}`} data-meter>
      <div class="row-between">
        <h2 class="panel-title">{t('ui.gov.meter_title')}</h2>
        <span class="num-s muted">0 – 100</span>
      </div>
      <div>
        <span class="num-xl" data-pc>
          {v.pc}
        </span>{' '}
        <span class="num-s" data-pc-delta>
          {delta === 0
            ? t('ui.gov.flat', { was: v.lastPc })
            : t('ui.gov.change', {
                arrow: delta > 0 ? '▲' : '▼',
                n: Math.abs(delta),
                was: v.lastPc,
              })}
        </span>
      </div>
      <div class="pc-bar" aria-hidden="true">
        <div class="pc-fill" style={{ width: `${v.pc}%` }} />
        <div class="pc-tick" style={{ left: `${v.threshold}%` }} />
      </div>
      <div class="pc-scale num-s muted" aria-hidden="true">
        <span>0</span>
        <span style={{ left: `${v.threshold}%` }}>{v.threshold}</span>
        <span>50</span>
        <span>100</span>
      </div>
      <p class="num-s muted" style={{ margin: 0 }}>
        {t('ui.gov.decay_note', { decay: v.decay, start: v.start })}
      </p>
      {v.low && (
        <div class="pc-warning" data-warning>
          <strong>{t('ui.gov.warning', { threshold: v.threshold })}</strong>
          <span class="num-s">
            {t('ui.gov.penalty_moratorium', { at: v.lowPenalty.moratoriumAngerAt })}
          </span>
          <span class="num-s">
            {t('ui.gov.penalty_queue', { n: v.lowPenalty.gridQueueExtraQuarters })}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------- the section ----------

/** The Government section (A3-09). */
export function GovernmentSection({ state, act }: ScreenProps) {
  const v = governmentView(state)
  if (!v) return null
  return (
    <div class="section" data-government>
      <div class="col">
        <Meter v={v} />
        <div class="panel p" data-hire>
          <div class="row-between">
            <h2 class="panel-title">{t('ui.gov.hire_title')}</h2>
            <span class="tag">
              {v.hire.hired ? t('ui.gov.hired') : t('ui.gov.not_hired')}
            </span>
          </div>
          <div class="row-between">
            <strong>{tDynamic(`hire.${v.hire.id}`, v.hire.id)}</strong>
            <span class="num">
              {t('ui.gov.per_quarter', { usd: fmt.money(v.hire.salaryUsdQ) })}
            </span>
          </div>
          <span class="num-s muted">
            {t('ui.gov.hire_net', {
              gain: v.hire.pcPerQuarter,
              decay: v.decay,
              net: v.hire.netPerQuarter,
            })}
          </span>
          {!v.hire.hired && (
            <span>
              <BwButton
                label={t('ui.gov.hire')}
                bw={v.hire.bandwidth}
                action={{ type: 'HIRE', hire: v.hire.id }}
                state={state}
                act={act}
              />{' '}
              {v.hire.blocker && (
                <span class="num-s muted">{say(v.hire.blocker)}</span>
              )}
            </span>
          )}
        </div>
        <div class="panel p" data-pc-log>
          <h2 class="panel-title">{t('ui.gov.log_title')}</h2>
          {v.log.length === 0 ? (
            <p class="num-s muted" style={{ margin: 0 }}>
              {t('ui.gov.log_none')}
            </p>
          ) : (
            v.log.map((e, i) => (
              <div key={i} class="num-s">
                {say(e)}
              </div>
            ))
          )}
        </div>
      </div>
      <div class="col">
        <div class="panel p" data-lobbying>
          <h2 class="panel-title">{t('ui.gov.lobby_title')}</h2>
          <table class="num-s">
            <thead>
              <tr>
                <th>{t('ui.gov.col.action')}</th>
                <th class="r">{t('ui.gov.col.cost')}</th>
                <th class="r">{t('ui.gov.col.takes')}</th>
                <th class="r">{t('ui.gov.col.gain')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {v.lobbying.map((a) => (
                <tr key={a.id} data-lobby={a.id}>
                  <td>
                    {lobbyName(a.id)}
                    {a.backfire && (
                      <span class="muted">
                        {' '}
                        · {t('ui.gov.backfire', { pct: fmt.pct(a.backfire.chance), pc: Math.abs(a.backfire.pc) })}
                      </span>
                    )}
                    {a.angerDelta !== null && (
                      <span class="muted"> · {t('ui.gov.anger', { n: a.angerDelta })}</span>
                    )}
                  </td>
                  <td class="r num">{fmt.money(a.costUsd)}</td>
                  <td class="r num">{t('ui.gov.weeks', { n: a.weeks })}</td>
                  <td class="r num">+{a.pcGain}</td>
                  <td class="r">
                    {a.blocker ? (
                      <span class="num-s muted" data-block>
                        {say(a.blocker)}
                      </span>
                    ) : (
                      <BwButton
                        label={t('ui.gov.start')}
                        bw={v.lobbyBandwidth}
                        action={{ type: 'LOBBY', id: a.id }}
                        state={state}
                        act={act}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="num-s muted" style={{ margin: 0 }}>
            {t('ui.gov.lobby_note')}
          </p>
        </div>
        <div class="panel p" data-spend>
          <div class="row-between">
            <h2 class="panel-title">{t('ui.gov.spend_title')}</h2>
            <span class="num-s muted">{t('ui.gov.you_have', { pc: v.pc })}</span>
          </div>
          <div class="spend-cards">
            {v.spend.map((c) => (
              <div key={c.id} class="spend-card" data-spend-card={c.id}>
                <strong>{spendName(c.id)}</strong>
                <span class="num-s muted">{tDynamic(`pc.spend_body.${c.id}`, '')}</span>
                <span class="row-between">
                  <span class="num-s">{t('ui.gov.costs', { pc: c.pcCost })}</span>
                  {c.blocker ? (
                    <span class="num-s muted" data-block>
                      {say(c.blocker)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      class="btn"
                      onClick={() => act({ type: 'PC_SPEND', id: c.id })}
                    >
                      {t('ui.gov.spend')}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- the wildcard on the Plan screen ----------

/** The wildcard due now (it came in this Plan phase): its card and choices; undecided, the first applies. */
export function WildcardPanel({ state, act }: ScreenProps) {
  const v = wildcardView(state)
  if (!v) return null
  return (
    <div class="panel p wildcard-card" data-wildcard={v.id}>
      <div class="row-between">
        <span class="label">
          <Icon name="wildcard" size={16} /> {t('ui.wildcard.label')}
        </span>
      </div>
      <h2 class="panel-title">{tDynamic(`wildcard.${v.id}.title`, v.id)}</h2>
      <p class="num-s" style={{ margin: 0 }}>
        {tDynamic(`wildcard.${v.id}.body`, '', { n: v.projectN ?? '' })}
      </p>
      {v.choices.map((c) => (
        <div key={c.id} class="row-between">
          <span class="num-s">{tDynamic(`wildcard.${v.id}.${c.id}`, c.id)}</span>
          <span>
            {c.isDefault && <span class="tag default">{t('ui.wildcard.default')}</span>}{' '}
            <button
              type="button"
              class="btn"
              disabled={!!c.blocker}
              title={c.blocker ? say(c.blocker) : undefined}
              onClick={() => act({ type: 'WILDCARD_CHOOSE', choice: c.id })}
              data-wildcard-choice={c.id}
            >
              {t('ui.wildcard.choose')}
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------- nuclear PPAs on the contract calendar ----------

/** Every PPA as a row: site, MW, $/MWh, end quarter, take-or-pay 90% (Contracts, M17.2). */
export function PpaRowsPanel({ state }: { state: GameState }) {
  const rows = ppaRows(state)
  if (rows.length === 0) return null
  return (
    <div class="panel p" data-ppa-rows>
      <h2 class="panel-title">
        <Icon name="nuclear-ppa" size={16} /> {t('ui.ppa.title')}
      </h2>
      <table class="num-s">
        <thead>
          <tr>
            <th>{t('ui.ppa.col.site')}</th>
            <th class="r">{t('ui.ppa.col.mw')}</th>
            <th class="r">{t('ui.ppa.col.price')}</th>
            <th>{t('ui.ppa.col.ends')}</th>
            <th>{t('ui.ppa.col.terms')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-ppa={r.id}>
              <td>
                {siteName(r.site)}
                {r.projectN === null && (
                  <span class="muted"> · {t('ui.ppa.idle')}</span>
                )}
              </td>
              <td class="r num">{fmt.power(r.mw * 1000)}</td>
              <td class="r num">{t('ui.ppa.usd_mwh', { usd: r.priceUsdMwh.toFixed(0) })}</td>
              <td class="num">{fmt.quarter(r.endQuarterLabel)}</td>
              <td>{t('ui.ppa.take_or_pay', { pct: fmt.pct(r.takeOrPayPct) })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
