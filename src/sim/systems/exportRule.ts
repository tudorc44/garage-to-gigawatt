// The export-rule wildcard's lasting effects (Act III, M17.4; wildcards.json › wc_export_control): for 3
// quarters, GPU purchases cost × 1.05 and the newest generation's lead time is +3 weeks (unless you pre-bought),
// and new leases with AI-lab tenant cards are × 0.97 (the design thread's reading of "AI lab demand −3%").
// Kept apart so the project systems can read it without importing the wildcards.
import { CONTENT } from '../../content/index.ts'
import type { GameState } from '../state.ts'

const effect = () =>
  CONTENT.wildcards.find((w) => w.id === 'wc_export_control')?.effect ?? {}

/** Whether the rule is in force this quarter. */
export function exportRuleOn(state: GameState, quarter = state.quarter): boolean {
  const r = state.act3ExportRule
  return !!r && quarter >= r.from && quarter <= r.until
}

/** GPU purchases × this (1, or 1.05 while the rule is on and you didn't pre-buy). */
export function exportGpuMult(state: GameState, quarter = state.quarter): number {
  return exportRuleOn(state, quarter) && !state.act3ExportRule!.exempt
    ? Number(effect().gpu_purchase_mult ?? 1)
    : 1
}

/** Weeks added to the newest generation's lead time (0, or 3 while the rule is on and you didn't pre-buy). */
export function exportLeadWeeks(state: GameState, quarter = state.quarter): number {
  return exportRuleOn(state, quarter) && !state.act3ExportRule!.exempt
    ? Number(effect().lead_time_weeks_add ?? 0)
    : 0
}

/** New AI-lab leases × this (1, or 0.97 while the rule is on, pre-bought or not). */
export function exportAiLabMult(state: GameState, quarter = state.quarter): number {
  return exportRuleOn(state, quarter)
    ? 1 + Number(effect().tenant_ai_lab_demand ?? 0)
    : 1
}
