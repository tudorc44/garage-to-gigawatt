// Types for the zzfx package (MIT, github.com/KilledByAPixel/ZzFX), which ships none.
declare module 'zzfx' {
  export const ZZFX: {
    sampleRate: number
    /** Renders a sound from its parameter list into raw samples. */
    buildSamples(...parameters: number[]): number[]
  }
}
