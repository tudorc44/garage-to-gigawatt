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
            // Act III's four scenarios (M11.1): one file each, so no file goes over 500 KB.
            ...[0, 1, 2, 3].map((n) => ({
              name: `market-s${n}`,
              test: new RegExp(
                String.raw`src[\\/]content[\\/]market_(weekly_)?s${n}\.json`,
              ),
            })),
            // Act IV's four futures (M27.3): one file each, likewise.
            ...[1, 2, 3, 4].map((n) => ({
              name: `market-iv-f${n}`,
              test: new RegExp(
                String.raw`src[\\/]content[\\/]market_(weekly_)?iv_f${n}\.json`,
              ),
            })),
            {
              name: 'market',
              test: /src[\\/]content[\\/]market_[^\\/]*\.json/,
            },
            { name: 'text', test: /src[\\/]i18n[\\/].*\.json/ },
            { name: 'content', test: /src[\\/]content[\\/].*\.json/ },
            // M35: energy options and ventures (doc 38), and Act IV's orbit and Moon, in files of their own, so the
            // rules' file stays under 500 KB.
            {
              name: 'sim-energy',
              test: /src[\\/]sim[\\/](energyViews|ventureViews|systems[\\/](energy|energyAssets|texasPower|specialSites|overrun|ventures))[^\\/]*\.ts/,
            },
            {
              name: 'sim-space',
              test: /src[\\/]sim[\\/](orbitViews|moonViews|act4MoneyViews|systems[\\/](orbit|moon|lunar|fleetReliability))[^\\/]*\.ts/,
            },
            // The game's rules (M16.3: the main file passed 500 KB with step 5's systems).
            { name: 'sim', test: /src[\\/]sim[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    // Component tests are .test.tsx and pick happy-dom per file (`// @vitest-environment happy-dom`, M15.2).
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    passWithNoTests: true,
  },
})
