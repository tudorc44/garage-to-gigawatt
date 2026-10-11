// The end of Act V (M49, the walking skeleton; doc 43 §15). The record the chapter report reads: the founder's net
// worth and the growth multiple against act5Entry. The reveal (the future, the plant truth), the reading score, the
// titles and the founder's exit come with the futures engine and the exit milestone; until then nothing here reads a
// hidden file.
import { CONTENT } from '../../content/index.ts'
import type { Act5End, GameState } from '../state.ts'

export function buildAct5End(state: GameState, gameOver = false): Act5End {
  const valuation = state.reports.at(-1)?.valuationUsd ?? state.cash
  const founderNetWorthUsd = Math.max(0, state.founderStake * valuation)
  const entry = state.act5Entry?.founderNetWorthUsd
  return {
    endQuarter: CONTENT.quarters[state.quarter],
    gameOver,
    founderNetWorthUsd,
    growthMultiple: entry && entry > 0 ? founderNetWorthUsd / entry : null,
  }
}
