// Shared helpers for the Act III walking skeleton (M10). This state is unreachable from play: a
// test/sim harness constructs it directly, exactly the way act2Helpers.ts's act2Company does for
// Act II (a fresh newGame() with act/quarter overridden, not a real playthrough). No head start, no
// carried-over Heat/Anger/rating/etc. — those are Act III game rules doc 27 has answers for that
// this milestone does not wire; see dev-notes' M10.1 STUB list.
import { actFirstQuarter } from '../../src/content/index.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

/** A stub Act III state at the start of its first quarter (2027Q1), built directly (not through play). */
export function act3StubCompany(seed = 1): GameState {
  return {
    ...newGame(seed),
    act: 3,
    quarter: actFirstQuarter(3),
    act3Stub: true,
  }
}
