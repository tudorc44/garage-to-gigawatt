// The mining club (M70, doc 51 v1.2 §4). Chunk C (data and content) only wires the cards' effect keys to these two entry points;
// chunk D fills them in.
import type { GameState } from '../state.ts'

export type ClubEffect = {
  join?: boolean
  cost_split?: 'shares'
  dispute?: boolean
  buy_out?: 'teo'
  member_sells?: 'teo'
  refuse?: 'teo'
  friendship?: number
  sell_gpus_mult?: number
  preorder?: string
  cloud_contract?: boolean
  end?: 'buy_out' | 'dissolve'
}

export function applyClubEffect(s: GameState, fx: ClubEffect): void {
  void s
  void fx // (chunk D)
}

export function payClubPowerBill(s: GameState, who: 'player' | 'shares'): void {
  void s
  void who // (chunk D)
}
