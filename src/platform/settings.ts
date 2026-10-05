// Player settings (wireframes §12), kept in the browser. Storage can be missing or blocked, so
// reads fall back to the defaults and writes fail softly.
export interface Settings {
  /** Master sound switch (docs/audio: alerts only go silent with this off). */
  sound: boolean
  /** The live quarter's starting speed. */
  speed: 1 | 2 | 4
  /**
   * M18.4 (DT): an Act III chapter report was reached on this device (survived or out), which unlocks Scenario
   * Mode. Per device, with the settings.
   */
  act3Finished: boolean
  /** M32.4: an Act IV chapter report was reached on this device (survived or out): unlocks Act IV's Scenario Mode. */
  act4Finished: boolean
}

const KEY = 'g2g.settings'
export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speed: 1,
  act3Finished: false,
  act4Finished: false,
}

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const s = JSON.parse(raw) as Partial<Settings>
    return {
      sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
      speed: s.speed === 2 || s.speed === 4 ? s.speed : 1,
      act3Finished: s.act3Finished === true,
      act4Finished: s.act4Finished === true,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    return true
  } catch {
    return false
  }
}
