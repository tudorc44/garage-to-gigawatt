// Garage to Gigawatt — SFX wrapper around ZzFX (MIT, the zzfx package). From docs/audio/.
// - Lazy: zzfx is imported and the AudioContext created only after the first user gesture.
// - Silent in the headless sim-runner (no window / AudioContext → every call is a no-op).
// - Groups: ui / game / alerts, each with its own gain; alerts still play when UI is muted,
//   master mute silences everything. Sound never carries information alone.
import { SOUNDS, type SoundName, type SoundGroup } from './sounds.ts'

export interface SfxSettings {
  enabled: boolean
  master: number
  ui: number
  game: number
  alerts: number
  weekTick: boolean
}
const settings: SfxSettings = {
  enabled: true,
  master: 0.6,
  ui: 0.7,
  game: 0.8,
  alerts: 0.9,
  weekTick: false,
}

const SAMPLE_RATE = 44100
const MIN_REPEAT_MS = 60 // same sound not retriggered within 60 ms
const COUNT_UP_MIN_MS = 1000 / 20 // count-up at most 20/s

const headless =
  typeof window === 'undefined' ||
  typeof (globalThis as { AudioContext?: unknown }).AudioContext === 'undefined'
let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
const groupGain: Partial<Record<SoundGroup, GainNode>> = {}
let build: ((...p: number[]) => number[]) | null = null
const cache = new Map<SoundName, AudioBuffer>()
const lastPlayed = new Map<SoundName, number>()

async function unlock() {
  if (headless || ctx) return
  ctx = new AudioContext()
  const { ZZFX } = await import('zzfx')
  build = ZZFX.buildSamples.bind(ZZFX)
  masterGain = ctx.createGain()
  masterGain.connect(ctx.destination)
  ;(['ui', 'game', 'alerts'] as SoundGroup[]).forEach((g) => {
    const n = ctx!.createGain()
    n.connect(masterGain!)
    groupGain[g] = n
  })
  applyGains()
}
if (!headless) {
  const once = () => {
    void unlock()
    window.removeEventListener('pointerdown', once)
    window.removeEventListener('keydown', once)
  }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
}

function applyGains() {
  if (!masterGain) return
  masterGain.gain.value = settings.enabled ? settings.master : 0
  for (const g of ['ui', 'game', 'alerts'] as SoundGroup[])
    groupGain[g]!.gain.value = settings[g]
}

/** Call from the Settings screen. `enabled:false` is the master mute. */
export function setSfxSettings(patch: Partial<SfxSettings>) {
  Object.assign(settings, patch)
  applyGains()
}
export function getSfxSettings(): Readonly<SfxSettings> {
  return settings
}

function bufferFor(name: SoundName): AudioBuffer | null {
  if (!ctx || !build) return null
  let b = cache.get(name)
  if (!b) {
    // randomness (index 1) is baked in once per cache entry; set it to 0 in sounds.ts if variety matters
    const data = build(...SOUNDS[name].params)
    b = ctx.createBuffer(1, data.length, SAMPLE_RATE)
    b.getChannelData(0).set(data)
    cache.set(name, b)
  }
  return b
}

export function play(name: SoundName): void {
  if (headless || !settings.enabled || !ctx) return
  if (name === 'week-tick' && !settings.weekTick) return
  const def = SOUNDS[name]
  if (settings[def.group] <= 0) return
  const now = performance.now()
  const gap = name === 'count-up' ? COUNT_UP_MIN_MS : MIN_REPEAT_MS
  if (now - (lastPlayed.get(name) ?? -Infinity) < gap) return
  lastPlayed.set(name, now)
  if (ctx.state === 'suspended') void ctx.resume()
  const buf = bufferFor(name)
  if (!buf) return
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = def.volume
  src.connect(g).connect(groupGain[def.group]!)
  src.start()
  // merge: the "final click" is layered from ui-click at the tail
  if (name === 'merge')
    setTimeout(
      () => {
        lastPlayed.delete('ui-click')
        play('ui-click')
      },
      buf.duration * 1000 - 150,
    )
}
