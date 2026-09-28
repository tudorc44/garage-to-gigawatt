import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works from any folder: GitHub Pages serves the game
  // from /garage-to-gigawatt/, staging and preview from the root.
  base: './',
  plugins: [preact()],
  build: {
    rolldownOptions: {
      output: {
        // The game's data (weekly market prices, card text) is most of the size and changes far less
        // often than the code, so it gets its own files: the browser caches them across updates.
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules/ },
            { name: 'market', test: /src[\\/]content[\\/]market_[^\\/]*\.json/ },
            { name: 'text', test: /src[\\/]i18n[\\/].*\.json/ },
            { name: 'content', test: /src[\\/]content[\\/].*\.json/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
})
