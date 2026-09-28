// The prologue's end: its chapter report, then Act I.
import { t, tDynamic } from '../../../i18n/t.ts'
import { prologueChapterView } from '../../../sim/prologue/views.ts'
import { fmt } from '../../format.ts'
import { CenterCard, Tile, coins, type PrologueProps } from './common.tsx'

export function Chapter({ state, act }: PrologueProps) {
  const v = prologueChapterView(state)
  return (
    <CenterCard>
      <div class="label">{t('ui.p0.chapter_label')}</div>
      <h1 class="screen-title">
        {tDynamic(`p0.chapter_title.${v.title}`, v.title)}
      </h1>
      <div class="end-tiles">
        <Tile label={t('ui.p0.c.net_worth')} value={fmt.money(v.netWorthUsd)} />
        <Tile
          label={t('ui.p0.c.mined')}
          value={coins(v.mined.BTC, 'BTC')}
          sub={
            v.mined.ETH > 0
              ? coins(v.mined.ETH, 'ETH')
              : t('ui.p0.c.blocks', { n: v.blocksFound })
          }
        />
        <Tile
          icon="exchange"
          label={t('ui.p0.c.lost_exchange')}
          value={coins(v.lost.exchange.BTC, 'BTC')}
          warn={v.lost.exchange.BTC > 0}
        />
        <Tile
          icon="lost-key"
          label={t('ui.p0.c.lost_keys')}
          value={coins(v.lost.wallet.BTC, 'BTC')}
          warn={v.lost.wallet.BTC > 0}
        />
      </div>
      <p class="num-s">
        {t('ui.p0.c.coins_2010', {
          btc: coins(v.mined2010, 'BTC'),
          peak: fmt.money(v.peak2021Usd),
          worth: fmt.money(v.worth2021Usd),
        })}
      </p>
      <div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => act({ type: 'CONTINUE_TO_ACT_1' })}
        >
          {t('ui.p0.to_act1')}
        </button>
      </div>
    </CenterCard>
  )
}
