import { render } from 'preact'
import './ui/styles/tokens.css'
import './ui/styles/bundle.css'
import './ui/styles/game.css'
import { App } from './ui/app.tsx'

render(<App />, document.getElementById('app')!)
