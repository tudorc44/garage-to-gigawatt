import { render } from 'preact'
// Fonts, self-hosted via Fontsource (OFL): only the weights the design system uses.
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/500.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/caveat/600.css'
import './ui/styles/tokens.css'
import './ui/styles/bundle.css'
import './ui/styles/game.css'
import { App } from './ui/app.tsx'

render(<App />, document.getElementById('app')!)
