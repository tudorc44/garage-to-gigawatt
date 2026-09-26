import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works from any folder: GitHub Pages serves the game
  // from /garage-to-gigawatt/, staging and preview from the root.
  base: './',
  plugins: [preact()],
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})
