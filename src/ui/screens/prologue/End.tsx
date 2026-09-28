// The prologue's end (wireframes P0-07, P0-08): its chapter report with the career graph, then the
// handover screen (what carries into Act I, how Act I scores you), then Act I. The handover is a
// UI step: CONTINUE_TO_ACT_1 runs only on its Start button.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../../i18n/t.ts'
import {
  prologueChapterView,
  prologueHandoverView,
} from '../../../sim/prologue/views.ts'
import { Icon } from '../../components/basics.tsx'
import { fmt } from '../../format.ts'
import { machineName, tierName } from '../../names.ts'
import {
  CenterCard,
  coins,
  price,
  watts,
  type PrologueProps,
} from './common.tsx'

export function Chapter(props: PrologueProps) {
  const [handover, setHandover] = useState(false)
  return handover ? (
    <Handover {...props} back={() => setHandover(false)} />
  ) : (
    <Report {...props} next={() => setHandover(true)} />
  )
}

/** A label and a value on one line, with a dashed rule under it. */
function Kv(props: {
  label: preact.ComponentChildren
  value: string
  strong?: boolean
  tone?: string
}) {
  return (
    <div class="p0-kv">
      <span>{props.label}</span>
      <span class={`num ${props.tone ?? ''}`}>
        {props.strong ? <strong>{props.value}</strong> : props.value}
      </span>
    </div>
  )
}

/** The chapter report (P0-07): net worth, coins over the prologue, the career graph, the 2010 coins. */
function Report({ state, next }: PrologueProps & { next: () => void }) {
  const v = prologueChapterView(state)
  const b = v.breakdown
  const f = v.coinsFlow
  return (
    <CenterCard wide>
      <div class="row-between">
        <div>
          <div class="label">{t('ui.p0.chapter_label')}</div>
          <h1 class="screen-title">{t('ui.p0.chapter_name')}</h1>
        </div>
        <div class="g-right">
          <div class="label">{t('ui.p0.c.your_title')}</div>
          <strong>{tDynamic(`p0.chapter_title.${v.title}`, v.title)}</strong>
        </div>
      </div>
      <div class="p0-two">
        <section class="panel">
          <div class="row-between">
            <span class="panel-title">{t('ui.p0.c.net_worth_end')}</span>
            <span class="num-kpi">{fmt.money(v.netWorthUsd)}</span>
          </div>
          <Kv
            label={t('ui.p0.c.btc_line', {
              btc: coins(state.treasury.BTC, 'BTC'),
              price: price(b.btcPrice),
            })}
            value={fmt.money(b.btcUsd)}
          />
          <Kv label="ETH" value={fmt.money(b.ethUsd)} />
          <Kv label={t('ui.p0.c.cash')} value={fmt.money(b.cash)} />
          <Kv
            label={t('ui.p0.c.machines', { n: b.units })}
            value={fmt.money(b.machinesUsd)}
          />
        </section>
        <section class="panel">
          <span class="panel-title">{t('ui.p0.c.coins_title')}</span>
          <Kv label={t('ui.p0.c.mined_label')} value={coins(f.mined, 'BTC')} />
          <Kv
            label={t('ui.p0.c.sold_label')}
            value={coins(f.soldOrSpent, 'BTC')}
          />
          <Kv
            label={t('ui.p0.c.lost_label')}
            value={f.lost > 0 ? `−${coins(f.lost, 'BTC')}` : coins(0, 'BTC')}
            tone={f.lost > 0 ? 'loss' : ''}
          />
          {f.losses.map((r, i) => (
            <span class="num-s muted" key={i}>
              {t('ui.p0.c.loss_line', {
                btc: coins(r.amount, 'BTC'),
                cause: t(`ui.p0.lost_${r.cause}`),
                quarter: r.quarter,
              })}
            </span>
          ))}
          <Kv
            label={t('ui.p0.c.kept_label')}
            value={coins(f.kept, 'BTC')}
            strong
          />
        </section>
      </div>
      <section class="panel">
        <div class="row-between">
          <span class="panel-title">{t('ui.p0.c.career_title')}</span>
          <span class="num-s muted">{t('ui.p0.c.career_note')}</span>
        </div>
        <Career career={v.career} markers={v.markers} />
      </section>
      <div class="row-between">
        <p class="num-s">
          <Icon name="news" size={16} />{' '}
          {t('ui.p0.c.coins_2010', {
            btc: coins(v.mined2010, 'BTC'),
            peak: fmt.money(v.peak2021Usd),
            worth: fmt.money(v.worth2021Usd),
          })}
        </p>
        <button type="button" class="btn btn-primary" onClick={next}>
          {t('ui.p0.to_act1')}
        </button>
      </div>
    </CenterCard>
  )
}

/** Net worth by quarter on a log scale, with the era's markers (bubbles, halvings, Mt Gox). */
function Career(props: {
  career: { quarter: string; netWorthUsd: number }[]
  markers: { id: string; quarter: string }[]
}) {
  const pts = props.career
  if (pts.length < 2) return null
  const W = 1000
  const H = 220
  const left = 56
  const top = 34
  const bottom = H - 22
  const vals = pts.map((p) => Math.max(100, p.netWorthUsd))
  const lo = Math.floor(Math.log10(Math.min(...vals)))
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...vals))))
  const x = (i: number) => left + (i / (pts.length - 1)) * (W - left - 8)
  const y = (v: number) =>
    bottom - ((Math.log10(Math.max(100, v)) - lo) / (hi - lo)) * (bottom - top)
  const line = pts
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.netWorthUsd).toFixed(1)}`,
    )
    .join(' ')
  const decades: number[] = []
  for (let d = lo; d <= hi; d++) decades.push(d)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      class="p0-chart p0-career"
      role="img"
      aria-label={t('ui.p0.c.career_title')}
    >
      {decades.map((d) => (
        <g key={d}>
          <line
            x1={left}
            x2={W - 8}
            y1={y(10 ** d)}
            y2={y(10 ** d)}
            class="grid"
          />
          <text x={left - 6} y={y(10 ** d) + 3} class="axis" text-anchor="end">
            {fmt.money(10 ** d)}
          </text>
        </g>
      ))}
      {pts.map((p, i) =>
        p.quarter.endsWith('Q1') ? (
          <text
            key={p.quarter}
            x={x(i)}
            y={H - 4}
            class="axis"
            text-anchor="middle"
          >
            {p.quarter.slice(0, 4)}
          </text>
        ) : null,
      )}
      {props.markers.map((m, k) => {
        const i = pts.findIndex((p) => p.quarter === m.quarter)
        return (
          <g key={`${m.id}${m.quarter}`}>
            <line x1={x(i)} x2={x(i)} y1={top - 4} y2={bottom} class="marker" />
            <text
              x={x(i)}
              y={k % 2 ? top - 16 : top - 6}
              class="axis"
              text-anchor="middle"
            >
              {tDynamic(`ui.p0.c.marker.${m.id}`, m.id)}
            </text>
          </g>
        )
      })}
      <path d={line} class="s-wallet" />
    </svg>
  )
}

/** The handover (P0-08): what carries into Act I, how Act I scores you, and a 2017 start beside it. */
function Handover({ state, act, back }: PrologueProps & { back: () => void }) {
  const h = prologueHandoverView(state)
  const wallet = Math.max(0, h.treasury.BTC - h.onExchange.BTC)
  return (
    <CenterCard wide>
      <div>
        <div class="label">{t('ui.p0.h.label')}</div>
        <h1 class="screen-title">{t('ui.p0.h.title')}</h1>
        <p class="num-s muted">{t('ui.p0.h.sub')}</p>
      </div>
      <div class="p0-handover">
        <section class="panel">
          {h.sites.map((s, i) => (
            <div class="p0-item" key={i}>
              <span class="label">
                <Icon name="garage" size={16} /> {t('ui.p0.h.site')}
              </span>
              <span>
                <strong>{tierName(s.tier)}</strong>
                <span class="num-s muted">
                  {' '}
                  · {watts(s.capacityKw)} · {price(s.powerUsdKwh)}/kWh
                </span>
              </span>
              <span class="num-s">
                {t('ui.p0.h.used', {
                  used: watts(s.usedKw),
                  cap: watts(s.capacityKw),
                })}
              </span>
            </div>
          ))}
          <div class="p0-item">
            <span class="label">
              <Icon name="asic" size={16} /> {t('ui.p0.h.machines')}
            </span>
            <span>
              <strong>
                {h.machines.length
                  ? h.machines
                      .map((m) => `${m.count} × ${machineName(m.model)}`)
                      .join(' · ')
                  : t('ui.p0.h.no_machines')}
              </strong>
              <br />
              <span class="num-s muted">{t('ui.p0.h.machines_note')}</span>
            </span>
            <span class="num">{fmt.money(h.machinesUsd)}</span>
          </div>
          <div class="p0-item">
            <span class="label">
              <Icon name="cash" size={16} /> {t('ui.p0.c.cash')}
            </span>
            <strong>{fmt.money(h.cash)}</strong>
            <span class="num">{fmt.money(h.cash)}</span>
          </div>
          <div class="p0-item">
            <span class="label">
              <Icon name="wallet" size={16} /> {t('ui.p0.h.coins')}
            </span>
            <span>
              <strong>
                {t('ui.p0.h.coins_line', {
                  wallet: coins(wallet, 'BTC'),
                  exchange: coins(h.onExchange.BTC, 'BTC'),
                })}
                {h.treasury.ETH > 0 && ` · ${coins(h.treasury.ETH, 'ETH')}`}
              </strong>
              <br />
              <span class="num-s muted">{t('ui.p0.h.custody_note')}</span>
            </span>
            <span class="num">{fmt.money(h.coinsUsd)}</span>
          </div>
        </section>
        <div class="col">
          <section class="panel">
            <div class="label">{t('ui.p0.h.score_label')}</div>
            <div class="panel-title">{t('ui.p0.h.score_title')}</div>
            <p class="num-s">
              {t('ui.p0.h.score_body', {
                start: fmt.money(h.startNetWorthUsd),
              })}
            </p>
          </section>
          <section class="panel">
            <span class="panel-title">{t('ui.p0.h.compare')}</span>
            <table class="p0-table num-s">
              <thead>
                <tr>
                  <th />
                  <th>{t('ui.p0.h.you')}</th>
                  <th>{t('ui.p0.h.fresh')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('ui.p0.c.cash')}</td>
                  <td>{fmt.money(h.cash)}</td>
                  <td>{fmt.money(h.fresh.cash)}</td>
                </tr>
                <tr>
                  <td>{t('ui.p0.h.coins')}</td>
                  <td>{coins(h.treasury.BTC, 'BTC')}</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>{t('ui.p0.h.site')}</td>
                  <td>{h.sites.map((s) => tierName(s.tier)).join(', ')}</td>
                  <td>
                    {t('ui.p0.h.fresh_site', { site: tierName(h.fresh.tier) })}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <div class="row-between">
        <button type="button" class="btn" onClick={back}>
          {t('ui.p0.h.back')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'CONTINUE_TO_ACT_1' })}
        >
          {t('ui.p0.h.start')}
        </button>
      </div>
    </CenterCard>
  )
}
