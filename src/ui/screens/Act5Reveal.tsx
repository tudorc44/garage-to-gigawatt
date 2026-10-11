// Act V's reveal (M51; doc 43 §15.1, §6): the one screen besides the finale that names the Act V future. It shows only
// on the chapter report, once 2040Q4 is done or the game is over. Everything comes from the reveal record (act5End,
// through act5Outcome): numbers and ids; the words are in text_v.en.json and en.json. Loaded with the Act V screens
// (Act5Entry.tsx's lazy chunk, which production never carries).
import { t, tDynamic } from '../../i18n/t.ts'
import type { GameState } from '../../sim/state.ts'
import { act5Outcome } from '../../sim/systems/act5End.ts'
import { fmt } from '../format.ts'

const ARROW = (s: number) => (s > 0 ? '▲' : s < 0 ? '▼' : '·')
const QUARTERS = Array.from({ length: 20 }, (_, i) => `${2036 + Math.floor(i / 4)}Q${(i % 4) + 1}`)

/** The future, its turn and its decoy; your reading score with the 20-quarter timeline. */
export function Act5Reveal(props: { state: GameState }) {
  const o = act5Outcome(props.state)
  const e = o.end
  const v = e.vFutureId
  const reading = e.reading
  if (!v) return null
  const moves = e.moves ?? []
  return (
    <>
      <section data-reveal-future>
        <h2 class="panel-title">{tDynamic('a5.chapter.future', '', { name: tDynamic(`a5.reveal.${v}.name`, v) })}</h2>
        <p class="num-s">{tDynamic(`a5.reveal.${v}.line`, '')}</p>
        {e.triggerQuarter && (
          <p class="num-s">
            {tDynamic('a5.chapter.trigger', '', { quarter: fmt.quarter(e.triggerQuarter), title: e.triggerTitle ?? '' })}
          </p>
        )}
        {e.decoy && (
          <>
            <p class="num-s muted">
              {t('ui.act4.reveal.decoy', {
                from: fmt.quarter(e.decoy.quarters[0]),
                to: fmt.quarter(e.decoy.quarters.at(-1)!),
              })}{' '}
              {tDynamic(`a5.reveal.${v}.decoy`, '')}
            </p>
            <p class="num-s muted">{tDynamic('a5.chapter.tell', '', { tell: tDynamic(`a5.reveal.${v}.tell`, '') })}</p>
          </>
        )}
      </section>

      {reading && (
        <section data-reveal-reading>
          <h2 class="panel-title">
            {reading.score === null
              ? t('ui.act4.reveal.reading_none')
              : t('ui.act4.reveal.reading', {
                  score: reading.score,
                  title: tDynamic(`act3.reveal.title.${e.readingTitleId}`, ''),
                })}
          </h2>
          {o.wording && <p class="num-s">{t(`ui.act5.reveal.wording.${o.wording}`)}</p>}
          <table class="num-s act4-timeline">
            <tbody>
              <tr>
                <th>{t('ui.act4.reveal.row.quarter')}</th>
                {QUARTERS.map((q, i) => (
                  <td key={q} class={e.triggerQ === i ? 'trigger' : ''} title={q}>
                    {q.slice(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <th>{t('ui.act4.reveal.row.ideal')}</th>
                {QUARTERS.map((q, i) => (
                  <td key={q}>{ARROW(reading.perQuarter.find((p) => p.q === i)?.ideal ?? 0)}</td>
                ))}
              </tr>
              <tr>
                <th>{t('ui.act4.reveal.row.you')}</th>
                {QUARTERS.map((q, i) => {
                  const p = reading.perQuarter.find((x) => x.q === i)
                  return (
                    <td key={q} class={p && p.value >= 1 ? 'gain' : p && p.value === 0 ? 'loss' : ''}>
                      {p ? ARROW(p.stance) : ''}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          <p class="num-s muted">
            {t('ui.act5.reveal.moves', {
              n: moves.filter((m) => m.sign !== 0).length,
              matched: moves.filter((m) => m.mark === 'match').length,
              decoy: moves.filter((m) => m.mark === 'decoy').length,
            })}
          </p>
          {reading.penalty > 0 && <p class="num-s loss">{t('ui.act4.reveal.penalty', { n: reading.penalty })}</p>}
        </section>
      )}
      <p class="num-s muted">{tDynamic('a5.chapter.disclaimer', '')}</p>
    </>
  )
}
