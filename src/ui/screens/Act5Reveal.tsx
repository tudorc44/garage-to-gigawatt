// Act V's reveal (M51; doc 43 §15.1, §6): the one screen besides the finale that names the Act V future. It shows only
// on the chapter report, once 2040Q4 is done or the game is over. Everything comes from the reveal record (act5End,
// through act5Outcome): numbers and ids; the words are in text_v.en.json and en.json. Loaded with the Act V screens
// (Act5Entry.tsx's lazy chunk, which production never carries).
import { t, tDynamic } from '../../i18n/t.ts'
import type { Act5End, GameState } from '../../sim/state.ts'
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

const FATE_KEY: Record<string, string> = { built: 'built', cancelled: 'cancelled', folded: 'folded', slipped: 'slipped' }

/**
 * The rest of the chapter report (M57.2; doc 43 §15.1-15.2): the founder's exit and the outlook it was settled at (the
 * game's assumption about after 2040, revealed only here), the career, reading and megawatt titles, the ventures' fates
 * and the rivals' (the hidden file's sentences, under the standing disclaimer).
 */
export function Act5Outcome(props: { end: Act5End }) {
  const e = props.end
  const mw = e.megawatts
  return (
    <>
      {e.exitChoice && (
        <section data-reveal-exit>
          <h2 class="panel-title">{t('ui.act5.exit.title')}</h2>
          <p class="num-s">
            {t(`ui.act5.reveal.exit.${e.exitChoice}`, {
              before: fmt.money(e.preExitNetWorthUsd ?? 0),
              after: fmt.money(e.founderNetWorthUsd),
              bid: e.bidFactor === null || e.bidFactor === undefined ? '—' : `${e.bidFactor.toFixed(2)}×`,
              outlook: `${(e.outlookFactor ?? 1).toFixed(2)}×`,
            })}
          </p>
          <p class="num-s muted">{t('ui.act5.reveal.exit_note')}</p>
        </section>
      )}
      <table class="num-s" data-reveal-titles>
        <tbody>
          <tr>
            <td>{t('ui.act4.reveal.career')}</td>
            <td class="r">{e.careerTitleId ? tDynamic(`ui.chapter2.title.${e.careerTitleId}`, e.careerTitleId) : '—'}</td>
          </tr>
          <tr>
            <td>{t('ui.act5.reveal.reading_title')}</td>
            <td class="r">{e.readingTitleId ? tDynamic(`act3.reveal.title.${e.readingTitleId}`, e.readingTitleId) : '—'}</td>
          </tr>
          {mw && (
            <tr data-mw-title>
              <td>{t('ui.act5.reveal.mw_title')}</td>
              <td class="r">
                {tDynamic(`ui.act5.mw_title.${mw.titleId}`, mw.titleId)}{' '}
                <span class="muted">
                  {t('ui.act5.reveal.mw_mix', {
                    firm: fmt.power(mw.firm * 1000),
                    flexible: fmt.power(mw.flexible * 1000),
                    orbit: fmt.power(mw.orbital * 1000),
                    leased: fmt.power(mw.landlord * 1000),
                  })}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {e.ventureFates && e.ventureFates.length > 0 && (
        <section data-reveal-ventures-v>
          <h2 class="panel-title">{t('ui.act5.reveal.ventures')}</h2>
          {e.ventureFates.map((v, i) => (
            <p key={i} class="num-s">
              {tDynamic(`ui.act5.reveal.venture.${FATE_KEY[v.fate] ?? 'slipped'}`, v.fate, {
                ventureType: v.type,
                year: v.firstPower ?? '—',
                stakePct: v.stake,
                usd: fmt.money(v.valueUsd),
              })}
            </p>
          ))}
        </section>
      )}
      {e.rivalFates && e.rivalFates.length > 0 && (
        <section data-reveal-rivals>
          <h2 class="panel-title">{t('ui.act4.reveal.rivals')}</h2>
          {e.rivalFates.map((r) => (
            <p key={r.rival} class="num-s">
              <strong>{tDynamic(`rival.${r.rival}`, r.rival)}</strong>
              {r.valueUsd !== null && !r.failed ? ` (${fmt.money(r.valueUsd)})` : ''}: {r.fate}
            </p>
          ))}
          <p class="num-s muted">{t('ui.act4.reveal.fates_note')}</p>
        </section>
      )}
    </>
  )
}
