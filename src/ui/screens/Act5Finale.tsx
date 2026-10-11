// The campaign finale at 2040 (M57.2; doc 43 §15.3): the career ledger with Act V's row, the career multiple on the
// starting wealth (2040's net worth after the exit), the megawatt line ending in 2040 (firm, flexible, orbital, leased),
// and the epilogue from epilogue_v.json (and the chip's line). Every number and line comes from finaleViewV; the words
// are en.json's, or the epilogue file's own lines filled here. "Retire at 2035" keeps Act4Finale.
import { fillText, t, tDynamic } from '../../i18n/t.ts'
import { finaleViewV } from '../../sim/finaleViews.ts'
import type { GameState } from '../../sim/state.ts'
import { fmt } from '../format.ts'

// A venture's name ("the small modular reactor") placed in an epilogue line: capitalised at a sentence start, and not
// doubled after the line's own "The".
const tidy = (s: string) => s.replace(/\bThe the /g, 'The ').replace(/^the /, 'The ')

const multiple =(x: number) => (x >= 100 ? `${Math.round(x).toLocaleString('en-US')}×` : `${x.toFixed(1)}×`)

export function Act5Finale(props: { state: GameState; onNew: () => void }) {
  const v = finaleViewV(props.state)
  const mw = v.megawattsV
  const endMw = mw ? mw.firm + mw.flexible + mw.orbital + mw.landlord : 0
  const params = {
    start_kw: fmt.power(v.start.kw),
    start_place: t(`ui.finale.place.${v.start.kind}`),
    end_mw: Math.round(endMw).toLocaleString('en-US'),
    mw_title: mw ? tDynamic(`ui.finale.mw_adj.${mw.titleId}`, mw.titleId) : '',
  }
  return (
    <div class="screen">
      <div class="center-page">
        <div class="panel end-card chapter-card act4-finale" data-act5-finale>
          <div class="label">{t('ui.finale.label')}</div>
          <h1 class="screen-title">{t(v.survived ? 'ui.finale.title_2040' : 'ui.finale.title_out')}</h1>
          <section data-finale-ledger>
            <h2 class="panel-title">{t('ui.finale.ledger')}</h2>
            <table class="num-s">
              <thead>
                <tr>
                  <th>{t('ui.finale.col.act')}</th>
                  <th class="r">{t('ui.finale.col.year')}</th>
                  <th class="r">{t('ui.finale.col.net_worth')}</th>
                  <th class="r">{t('ui.finale.col.mw')}</th>
                  <th>{t('ui.finale.col.title')}</th>
                </tr>
              </thead>
              <tbody>
                {v.rows.map((r) => (
                  <tr key={r.act}>
                    <td>{t(`ui.finale.act.${r.act}`)}</td>
                    <td class="r num">{r.year}</td>
                    <td class="r num">{r.netWorthUsd === null ? '—' : fmt.money(r.netWorthUsd)}</td>
                    <td class="r num">{r.mw === null ? '—' : fmt.power(r.mw * 1000)}</td>
                    <td>{r.title ? tDynamic(r.title, '') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section data-finale-multiple>
            <p class="num">
              {t('ui.finale.multiple', {
                from: fmt.money(v.start.wealthUsd),
                to: fmt.money(v.netWorthUsd),
                x: v.careerMultiple === null ? '—' : multiple(v.careerMultiple),
              })}
            </p>
            {mw && (
              <p class="num-s">
                {t('ui.finale.megawatts_2040', {
                  start: fmt.power(v.start.kw),
                  firm: fmt.power(mw.firm * 1000),
                  flexible: fmt.power(mw.flexible * 1000),
                  orbit: fmt.power(mw.orbital * 1000),
                  leased: fmt.power(mw.landlord * 1000),
                })}
              </p>
            )}
          </section>
          <section data-finale-epilogue>
            {v.epilogueV.map((l, i) => (
              <p key={i} class="epilogue-line">
                {l.key ? tDynamic(l.key, '') : tidy(fillText(l.text, { ...params, ...(l.ventureType ? { ventureType: l.ventureType } : {}), year: l.year ?? '' }))}
              </p>
            ))}
          </section>
          <p class="num-s muted">{t('ui.finale.after_2040_note')}</p>
          <div class="row-between">
            <span class="num-s muted">{t('ui.finale.thanks')}</span>
            <button type="button" class="btn btn-primary" onClick={props.onNew}>
              {t('ui.act4.back_to_title')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
