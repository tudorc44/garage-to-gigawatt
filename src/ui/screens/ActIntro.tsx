// The Act II intro (act boundary, scope 0.2 §2.1 and §2.14 screen 2; wireframe A2-02). Shown once,
// after the Act I chapter report and before the 2022Q4 Plan phase: what the company carries over.
// The head start (from the Merge choice) and the lifeline (weak runs) come in later milestones.
import { t } from '../../i18n/t.ts'
import { carryOver } from '../../sim/selectors.ts'
import { fmt } from '../format.ts'
import { tierName } from '../names.ts'
import type { ScreenProps } from './Plan.tsx'

export function ActIntroScreen({ state, act }: ScreenProps) {
  const c = carryOver(state)
  const sites = c.sites
    .map((s) => `${tierName(s.tier)} · ${fmt.power(s.energizedKw)}`)
    .join(', ')
  const coins = [
    c.treasury.BTC > 0 ? fmt.crypto(c.treasury.BTC, 'BTC') : null,
    c.treasury.ETH > 0 ? fmt.crypto(c.treasury.ETH, 'ETH') : null,
  ].filter((x) => x !== null)
  const rows: [string, string][] = [
    [t('ui.act2_intro.sites'), sites],
    [t('ui.act2_intro.energized'), fmt.power(c.energizedKw)],
    [t('ui.act2_intro.cash'), fmt.money(c.cashUsd)],
    [t('ui.act2_intro.debt'), fmt.money(c.debtUsd)],
    [
      t('ui.act2_intro.treasury'),
      coins.length === 0
        ? t('ui.act2_intro.treasury_none')
        : t('ui.act2_intro.treasury_value', {
            coins: coins.join(' + '),
            value: fmt.money(c.treasuryUsd),
          }),
    ],
    [
      t('ui.act2_intro.fleet'),
      t('ui.act2_intro.fleet_value', {
        asics: c.asics,
        hash: fmt.hash(c.btcThs, 'TH'),
        gpus: c.gpus,
      }),
    ],
    [t('ui.act2_intro.stake'), fmt.pct(c.founderStake)],
  ]
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act-intro">
          <div class="label">{t('ui.act2_intro.label')}</div>
          <h1 class="screen-title">{t('ui.act2_intro.title')}</h1>
          <p class="pitch">{t('ui.act2_intro.body')}</p>
          <div class="panel act-intro-box">
            <div class="label">{t('ui.act2_intro.carried')}</div>
            <table>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td class="r num">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => act({ type: 'START_ACT_2' })}
            >
              {t('ui.act2_intro.start')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
