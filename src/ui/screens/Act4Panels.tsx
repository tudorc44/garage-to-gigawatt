// Act IV's orbit screens (M29.5; doc 33 §17; no wireframes: docs/wireframes/act4/README.md records the layout). Loaded
// as their own lazy chunk (components/act4Lazy.tsx). A4-03 the Orbit board (a nav section): the blocks as deal cards
// (A4-05: Launch, Tenant and Capital slots, insurance, telemetry), opening a block, the launch manifest (A4-04), the
// licences and the registry (A4-08) and the links. A4-02: the exposure warnings on the Plan screen. Every number comes
// from src/sim/orbitViews.ts; the screens show the design life and the telemetry, never a block's true life.
import { useState } from 'preact/hooks'
import { t, tDynamic } from '../../i18n/t.ts'
import type { Message } from '../../i18n/t.ts'
import { orbitBoardView, type BlockView, type OrbitBoardView } from '../../sim/orbitViews.ts'
import { Pips } from '../components/basics.tsx'
import { fmt } from '../format.ts'
import { say, tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

const shellName = (id: string) => tDynamic(`orbit.shell.${id}`, id)
const providerName = (id: string) => tDynamic(`orbit.provider.${id}`, id)
const genName = (id: string) => tDynamic(`ui.orbit.gen.${id}`, id)
const stageName = (id: string) => tDynamic(`ui.orbit.stage.${id}`, id)

/** A small reason line under a blocked button. */
function Why(props: { why: Message | null }) {
  return props.why ? <span class="num-s muted">{say(props.why)}</span> : null
}

/** A button for an orbit action: disabled with its reason as a tooltip; Bandwidth pips when it costs any. */
function OrbitButton(props: {
  label: string
  why: Message | null
  bw?: number
  primary?: boolean
  onClick: () => void
}) {
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

const priceText = (kind: BlockView['kind'], price: number) =>
  kind === 'shell'
    ? t('ui.act3.per_year', { value: t('ui.orbit.per_mw', { value: fmt.money(price) }) })
    : t('ui.act3.per_gpu_hr', { value: fmt.money(price, { exact: true, dp: 2 }) })

// ---------- A4-02: exposure warnings on the Plan screen ----------

/** The launches whose uninsured value is over 15% of your equity (doc 33 §8.3, §13), with the cash left after them. */
export function OrbitExposurePanel({ state }: ScreenProps) {
  const v = orbitBoardView(state)
  if (!v || v.exposures.length === 0) return null
  return (
    <div class="panel p" data-orbit-exposure>
      <h2 class="panel-title">{t('ui.orbit.exposure.title')}</h2>
      {v.exposures.map((b) => (
        <p key={b.id} class="num-s warn">
          {t('ui.orbit.exposure.line', {
            n: b.n,
            quarter: b.launch?.label ? fmt.quarter(b.launch.label) : '—',
            uninsuredUsd: b.exposure!.uninsuredUsd,
            sharePct: b.exposure!.share,
            cashAfterUsd: b.exposure!.cashAfterUsd,
            ltvPct: b.exposure!.ltvAfter,
            limitPct: b.exposure!.ltvLimit,
          })}
        </p>
      ))}
      <p class="num-s muted">{t('ui.orbit.exposure.hint')}</p>
    </div>
  )
}

// ---------- A4-03: the Orbit board ----------

export function OrbitSection({ state, act }: ScreenProps) {
  const v = orbitBoardView(state)
  if (!v) return null
  return (
    <div class="section single" data-orbit-board>
      <div class="panel p">
        <h2 class="panel-title">{t('ui.orbit.title')}</h2>
        <p class="num-s muted">
          {t('ui.orbit.lead', {
            live: v.live.length,
            underway: v.underway.length,
            mult: v.spaceMultiple.toFixed(1),
          })}
          {v.hardMarketUntil && ` ${t('ui.orbit.hard_market', { quarter: fmt.quarter(v.hardMarketUntil) })}`}
        </p>
        <OpenBlockForm v={v} act={act} state={state} />
      </div>
      {v.exposures.length > 0 && <OrbitExposurePanel state={state} act={act} />}
      {[...v.underway, ...v.live].map((b) => (
        <BlockCard key={b.id} b={b} act={act} />
      ))}
      <Manifest v={v} />
      <Licences v={v} act={act} />
      <Links v={v} act={act} />
      {v.gone.length > 0 && (
        <div class="panel p">
          <h2 class="panel-title">{t('ui.orbit.gone.title')}</h2>
          <p class="num-s muted">
            {v.gone.map((b) => t('ui.orbit.gone.item', { n: b.n, stage: stageName(b.stage) })).join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}

/** Open a block: kind, size, shell, generation (0 Bandwidth). */
function OpenBlockForm({ v, act }: { v: OrbitBoardView } & ScreenProps) {
  const [kind, setKind] = useState<'shell' | 'cloud'>('shell')
  const [mw, setMw] = useState(10)
  const [shell, setShell] = useState<'sso' | 'high_leo' | 'high_orbit'>('sso')
  const gens = v.open.generations.filter((g) => g.available)
  const [gen, setGen] = useState(gens.at(-1)?.id ?? 'gen31')
  return (
    <div class="orbit-row" data-orbit-open>
      <label class="num-s">
        {t('ui.orbit.open.kind')}{' '}
        <select value={kind} onChange={(e) => setKind((e.target as HTMLSelectElement).value as 'shell' | 'cloud')}>
          {v.open.kinds.map((k) => (
            <option key={k} value={k}>
              {t(`ui.orbit.kind.${k}`)}
            </option>
          ))}
        </select>
      </label>
      <label class="num-s">
        {t('ui.orbit.open.size')}{' '}
        <select value={mw} onChange={(e) => setMw(Number((e.target as HTMLSelectElement).value))}>
          {v.open.sizes.map((s) => (
            <option key={s} value={s}>
              {fmt.power(s * 1000)}
            </option>
          ))}
        </select>
      </label>
      <label class="num-s">
        {t('ui.orbit.open.shell')}{' '}
        <select value={shell} onChange={(e) => setShell((e.target as HTMLSelectElement).value as typeof shell)}>
          {v.open.shells.map((s) => (
            <option key={s} value={s}>
              {shellName(s)}
            </option>
          ))}
        </select>
      </label>
      <label class="num-s">
        {t('ui.orbit.open.gen')}{' '}
        <select value={gen} onChange={(e) => setGen((e.target as HTMLSelectElement).value as typeof gen)}>
          {gens.map((g) => (
            <option key={g.id} value={g.id}>
              {genName(g.id)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        class="btn btn-primary"
        onClick={() => act({ type: 'OPEN_ORBITAL_BLOCK', kind, mw, shell, gen })}
      >
        {t('ui.orbit.open.go')}
      </button>
    </div>
  )
}

// ---------- A4-05: a block's deal card ----------

function BlockCard({ b, act }: { b: BlockView; act: ScreenProps['act'] }) {
  return (
    <div class="panel p" data-orbit-block={b.id}>
      <div class="row-between">
        <h2 class="panel-title">
          {t('ui.orbit.block.title', {
            n: b.n,
            mw: fmt.power(b.mw * 1000),
            kind: t(`ui.orbit.kind.${b.kind}`),
            shell: shellName(b.shell),
            gen: genName(b.gen),
          })}
        </h2>
        <span class="tag">{stageName(b.stage)}</span>
      </div>
      <p class="num-s muted">
        {t('ui.orbit.block.facts', { mass: Math.round(b.massT).toLocaleString('en-US'), life: b.designLifeYears })}
        {b.lostLaunches > 0 && ` ${t('ui.orbit.block.lost', { n: b.lostLaunches })}`}
      </p>
      {b.stage === 'proposed' && (
        <div class="orbit-slots">
          <LaunchSlot b={b} act={act} />
          <TenantSlot b={b} act={act} />
          <CapitalSlot b={b} act={act} />
        </div>
      )}
      {b.stage !== 'proposed' && <Progress b={b} />}
      {b.tenant && b.stage !== 'proposed' && <TenantLine b={b} />}
      {b.stage !== 'proposed' && b.stage !== 'live' && b.tenant === null && <TenantSlot b={b} act={act} />}
      <Insurance b={b} act={act} />
      {b.stage === 'live' && <Telemetry b={b} />}
      <div class="orbit-row">
        {b.stage === 'proposed' && (
          <OrbitButton
            label={t('ui.orbit.block.cancel')}
            why={b.cancelWhy}
            onClick={() => act({ type: 'CANCEL_ORBITAL_BLOCK', blockId: b.id })}
          />
        )}
        {b.stage === 'live' && (
          <>
            <OrbitButton
              label={t('ui.orbit.block.sell', { priceUsd: fmt.money(b.saleUsd ?? 0) })}
              why={b.sellWhy}
              bw={1}
              onClick={() => act({ type: 'SELL_ORBITAL_BLOCK', blockId: b.id })}
            />
            <Why why={b.sellWhy} />
          </>
        )}
      </div>
    </div>
  )
}

/** The Launch slot: a booking (provider and quarter), or the booking made. */
function LaunchSlot({ b, act }: { b: BlockView; act: ScreenProps['act'] }) {
  const open = b.bookingOptions.filter((o) => !o.why)
  const [pick, setPick] = useState(0)
  const choice = open[Math.min(pick, open.length - 1)]
  return (
    <div class="orbit-slot"data-slot="launch">
      <span class="label">{t('ui.orbit.slot.launch')}</span>
      {b.launch ? (
        <>
          <p class="num-s">
            {t('ui.orbit.launch.booked', {
              provider: providerName(b.launch.provider),
              quarter: fmt.quarter(b.launch.label ?? ''),
              price: fmt.money(b.launch.priceUsdKg, { exact: true }),
              deposit: fmt.money(b.launch.depositUsd),
            })}
          </p>
          {b.launch.slips > 0 && <p class="num-s muted">{t('ui.orbit.launch.slipped', { n: b.launch.slips })}</p>}
          <OrbitButton
            label={t('ui.orbit.launch.cancel')}
            why={b.cancelLaunchWhy}
            onClick={() => act({ type: 'CANCEL_ORBITAL_LAUNCH', blockId: b.id })}
          />
        </>
      ) : open.length === 0 ? (
        <Why why={b.bookingOptions[0]?.why ?? null} />
      ) : (
        <>
          <select value={pick} onChange={(e) => setPick(Number((e.target as HTMLSelectElement).value))}>
            {open.map((o, i) => (
              <option key={`${o.provider}:${o.quarter}`} value={i}>
                {t('ui.orbit.launch.option', {
                  provider: providerName(o.provider),
                  quarter: fmt.quarter(o.label),
                  price: fmt.money(o.priceUsdKg, { exact: true }),
                })}
              </option>
            ))}
          </select>
          <span class="num-s muted">{t('ui.orbit.launch.deposit', { deposit: fmt.money(choice.depositUsd) })}</span>
          <OrbitButton
            label={t('ui.orbit.launch.book')}
            why={choice.why}
            bw={1}
            onClick={() => act({ type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider: choice.provider, quarter: choice.quarter })}
          />
        </>
      )}
    </div>
  )
}

/** The Tenant slot: this quarter's offers, or spot. */
function TenantSlot({ b, act }: { b: BlockView; act: ScreenProps['act'] }) {
  return (
    <div class="orbit-slot"data-slot="tenant">
      <span class="label">{t('ui.orbit.slot.tenant')}</span>
      {b.tenant ? (
        <TenantLine b={b} />
      ) : (
        <>
          {b.offers.map((o) => (
            <div key={o.index} class="num-s">
              <strong>{o.name}</strong> · {t(`ui.orbit.workload.${o.workload}`)} · {priceText(b.kind, o.price)} ·{' '}
              {t('ui.orbit.tenant.term', { years: o.termQuarters / 4 })}
              {o.prepayShare > 0 && ` · ${t('ui.orbit.tenant.prepay', { sharePct: o.prepayShare })}`}{' '}
              <OrbitButton
                label={t('ui.orbit.tenant.sign')}
                why={o.why}
                onClick={() => act({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: o.index })}
              />
            </div>
          ))}
          <OrbitButton
            label={t('ui.orbit.tenant.spot')}
            why={b.spotWhy}
            onClick={() => act({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 'spot' })}
          />
        </>
      )}
    </div>
  )
}

function TenantLine({ b }: { b: BlockView }) {
  const t0 = b.tenant
  if (t0 === null) return null
  if (t0 === 'spot') return <p class="num-s">{t('ui.orbit.tenant.on_spot')}</p>
  return (
    <p class="num-s">
      {t('ui.orbit.tenant.signed', {
        name: t0.name,
        price: priceText(b.kind, t0.price),
        years: t0.termQuarters / 4,
      })}
      {t0.dueLabel && ` · ${t('ui.orbit.tenant.due', { quarter: fmt.quarter(t0.dueLabel) })}`}
      {t0.endLabel && ` · ${t('ui.orbit.tenant.ends', { quarter: fmt.quarter(t0.endLabel) })}`}
      {b.linkShare !== null && b.linksNeeded > 0 && ` · ${t('ui.orbit.tenant.links', { sharePct: b.linkShare })}`}
    </p>
  )
}

/** The Capital slot: own cash (M29; M31 adds the rest). */
function CapitalSlot({ b, act }: { b: BlockView; act: ScreenProps['act'] }) {
  return (
    <div class="orbit-slot"data-slot="capital">
      <span class="label">{t('ui.orbit.slot.capital')}</span>
      <p class="num-s">{t('ui.orbit.capital.build', { costUsd: fmt.money(b.buildCostUsd ?? 0) })}</p>
      {b.capital ? (
        <p class="num-s">{t('ui.orbit.capital.cash')}</p>
      ) : (
        <OrbitButton
          label={t('ui.orbit.capital.arrange')}
          why={b.capitalWhy}
          bw={1}
          onClick={() => act({ type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id })}
        />
      )}
      <p class="num-s muted">
        {b.licenceRoomMw >= b.mw
          ? t('ui.orbit.capital.licence_ok')
          : t('ui.orbit.capital.licence_needed', { shell: shellName(b.shell) })}
      </p>
    </div>
  )
}

/** Where a block is between its build and going live. */
function Progress({ b }: { b: BlockView }) {
  const key =
    b.stage === 'building'
      ? 'ui.orbit.progress.building'
      : b.stage === 'awaiting_launch'
        ? 'ui.orbit.progress.awaiting'
        : b.stage === 'climbing'
          ? 'ui.orbit.progress.climbing'
          : 'ui.orbit.progress.live'
  return (
    <p class="num-s">
      {t(key, {
        built: b.buildDoneLabel ? fmt.quarter(b.buildDoneLabel) : '—',
        launch: b.launch?.label ? fmt.quarter(b.launch.label) : '—',
        provider: b.launch ? providerName(b.launch.provider) : '—',
        live: b.liveLabel ? fmt.quarter(b.liveLabel) : '—',
        capex: fmt.money(b.capexSpentUsd),
        capacityPct: fmt.pct(b.capacity),
      })}
    </p>
  )
}

function Insurance({ b, act }: { b: BlockView; act: ScreenProps['act'] }) {
  const q = b.insuranceQuote
  return (
    <div class="num-s" data-orbit-insurance>
      {b.insured ? (
        <span>
          {t('ui.orbit.insured', {
            cover: fmt.money(b.insured.coverUsd),
            until: b.insured.untilLabel ? fmt.quarter(b.insured.untilLabel) : t('ui.orbit.insured_first_year'),
          })}
        </span>
      ) : (
        <span class="muted">{t('ui.orbit.uninsured')}</span>
      )}{' '}
      {q && (
        <OrbitButton
          label={t('ui.orbit.insure', {
            cover: fmt.money(q.coverUsd),
            premium: fmt.money(q.premiumUsd),
            rate: fmt.pct(q.ratePct / 100, 1),
          })}
          why={b.insureWhy}
          onClick={() => act({ type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })}
        />
      )}
      {b.exposure && (
        <p class={`num-s${b.exposure.warn ? ' warn' : ' muted'}`}>
          {t('ui.orbit.exposure.block', {
            uninsuredUsd: b.exposure.uninsuredUsd,
            sharePct: b.exposure.share,
          })}
        </p>
      )}
    </div>
  )
}

/** Fleet telemetry (doc 33 §6.5): the failures each quarter reported, as a yearly rate, and the average so far. */
function Telemetry({ b }: { b: BlockView }) {
  return (
    <p class="num-s" data-orbit-telemetry>
      {t('ui.orbit.telemetry', {
        readings: b.telemetry.map((x) => fmt.pct(x.failurePctYr / 100, 1)).join(' · ') || '—',
        avg: b.telemetryAvgPctYr === null ? '—' : fmt.pct(b.telemetryAvgPctYr / 100, 1),
        plan: fmt.pct(0.08, 0),
      })}
      {b.gpuHealth !== null && ` · ${t('ui.orbit.gpu_health', { sharePct: Math.min(1, b.gpuHealth), spares: fmt.pct(Math.max(0, b.gpuHealth - 1)) })}`}
      {b.lastEbitdaUsd !== null && ` · ${t('ui.orbit.ebitda', { ebitdaUsd: b.lastEbitdaUsd })}`}
    </p>
  )
}

// ---------- A4-04: the launch manifest ----------

function Manifest({ v }: { v: OrbitBoardView }) {
  return (
    <div class="panel p" data-orbit-manifest>
      <h2 class="panel-title">{t('ui.orbit.manifest.title')}</h2>
      <table class="num-s">
        <thead>
          <tr>
            <th>{t('ui.orbit.manifest.col.quarter')}</th>
            <th class="r">{t('ui.orbit.manifest.col.slots')}</th>
            <th class="r">{t('ui.orbit.manifest.col.yours')}</th>
            <th>{t('ui.orbit.manifest.col.blocks')}</th>
          </tr>
        </thead>
        <tbody>
          {v.manifest.map((m) => (
            <tr key={m.quarter}>
              <td class="num">{fmt.quarter(m.label)}</td>
              <td class="r num">{t('ui.orbit.tonnes', { t: Math.round(m.slotsT).toLocaleString('en-US') })}</td>
              <td class="r num">{t('ui.orbit.tonnes', { t: Math.round(m.bookedT).toLocaleString('en-US') })}</td>
              <td>
                {m.blocks.map((b) => t('ui.orbit.manifest.block', { n: b.n, provider: providerName(b.launch!.provider) })).join(', ') ||
                  (m.bookable ? '' : t('ui.orbit.manifest.too_soon'))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- A4-08: licences and the registry ----------

function Licences({ v, act }: { v: OrbitBoardView; act: ScreenProps['act'] }) {
  return (
    <div class="panel p" data-orbit-licences>
      <h2 class="panel-title">{t('ui.orbit.licences.title')}</h2>
      <p class="num-s muted">
        {t('ui.orbit.licences.lead', {
          mw: v.filing.mw,
          fee: fmt.money(v.filing.feeUsd),
          quarter: fmt.quarter(v.filing.approvalLabel),
          due: fmt.quarter(v.filing.milestone.dueLabel),
          sharePct: v.filing.milestone.sharePct,
        })}
      </p>
      <table class="num-s">
        <thead>
          <tr>
            <th>{t('ui.orbit.licences.col.shell')}</th>
            <th class="r">{t('ui.orbit.licences.col.licensed')}</th>
            <th class="r">{t('ui.orbit.licences.col.used')}</th>
            <th>{t('ui.orbit.licences.col.pending')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {v.licences.map((l) => (
            <tr key={l.shell}>
              <td>{shellName(l.shell)}</td>
              <td class="r num">{fmt.power(l.licensedMw * 1000)}</td>
              <td class="r num">{fmt.power(l.usedMw * 1000)}</td>
              <td>
                {l.pending
                  .map((p) => t('ui.orbit.licences.pending', { mw: fmt.power(p.mw * 1000), quarter: fmt.quarter(p.approvedLabel) }))
                  .join(', ') || '—'}
              </td>
              <td>
                <OrbitButton
                  label={t('ui.orbit.licences.file')}
                  why={l.fileWhy}
                  bw={1}
                  onClick={() => act({ type: 'FILE_ORBITAL_LICENCE', shell: l.shell })}
                />{' '}
                {l.pending.length > 0 && (
                  <OrbitButton
                    label={t('ui.orbit.licences.fast_track', { pc: v.filing.fastTrackPc })}
                    why={l.fastTrackWhy}
                    onClick={() => act({ type: 'FAST_TRACK_LICENCE', shell: l.shell })}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 class="label">{t('ui.orbit.registry.title')}</h3>
      {v.registryOptions.map((r) => (
        <div key={r.id} class="num-s">
          <strong>{tDynamic(`orbit.registry.${r.id}`, r.id)}</strong>
          {' · '}
          {t('ui.orbit.registry.facts', {
            extra: r.extraQuarters,
            premiumPct: r.premiumAddPct,
          })}
          {r.clampdownExempt && ` · ${t('ui.orbit.registry.exempt')}`}{' '}
          {v.registry === r.id ? (
            <span class="tag">{t('ui.orbit.registry.current')}</span>
          ) : (
            <OrbitButton
              label={t('ui.orbit.registry.choose')}
              why={r.why}
              bw={v.registryChangeBw}
              onClick={() => act({ type: 'SET_REGISTRY', registry: r.id })}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------- links ----------

function Links({ v, act }: { v: OrbitBoardView; act: ScreenProps['act'] }) {
  const l = v.links
  return (
    <div class="panel p" data-orbit-links>
      <h2 class="panel-title">{t('ui.orbit.links.title')}</h2>
      <p class="num-s">
        {t('ui.orbit.links.lead', {
          units: l.units,
          next: l.unitsNext,
          needed: l.needed.toFixed(1),
          rent: fmt.money(l.rentUnitUsdYr),
        })}
      </p>
      <div class="orbit-row">
        <button
          type="button"
          class="btn"
          disabled={l.rented === 0}
          onClick={() => act({ type: 'RENT_LINK_UNITS', units: l.rented - 1 })}
        >
          −
        </button>
        <span class="num">{t('ui.orbit.links.rented', { n: l.rented })}</span>
        <button type="button" class="btn" onClick={() => act({ type: 'RENT_LINK_UNITS', units: l.rented + 1 })}>
          +
        </button>
      </div>
      <p class="num-s muted">
        {t('ui.orbit.links.station', {
          cost: fmt.money(l.station.capex_usd),
          units: l.station.units,
          heat: l.station.heat,
        })}
      </p>
      <div class="orbit-row">
        {l.stationSites.map((s) => (
          <OrbitButton
            key={s.siteId}
            label={t('ui.orbit.links.build', { site: tierName(s.tier) })}
            why={s.why}
            bw={1}
            onClick={() => act({ type: 'BUILD_GROUND_STATION', siteId: s.siteId })}
          />
        ))}
      </div>
    </div>
  )
}
