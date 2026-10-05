// The end of Act IV (M27.5, the walking skeleton; doc 33 §15). Builds the record the Act IV chapter report and the
// campaign finale read, once, when 2035Q4 is done or the game is over in Act IV. M32 makes this the only reader of the
// hidden files (the reading score, the lunar truth, the orbital reliability truth) besides their own sim systems, and
// adds the reveal, the reading score and the titles.
import { CONTENT } from '../../content/index.ts'
import type { Act4End, GameState } from '../state.ts'

export function buildAct4End(state: GameState, gameOver = false): Act4End {
  const valuation = state.reports.at(-1)?.valuationUsd ?? state.cash
  const founderNetWorthUsd = Math.max(0, state.founderStake * valuation)
  const entry = state.act4Entry?.founderNetWorthUsd
  return {
    futureId: state.futureId!,
    endQuarter: CONTENT.quarters[state.quarter],
    gameOver,
    founderNetWorthUsd,
    growthMultiple: entry && entry > 0 ? founderNetWorthUsd / entry : null,
  }
}
