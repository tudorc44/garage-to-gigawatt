// Title screen: new career, with an optional seed. (The end screens are in End.tsx.)
import { useState } from 'preact/hooks'
import { t } from '../../i18n/t.ts'

export function TitleScreen(props: { onStart: (seedText: string) => void }) {
  const [seed, setSeed] = useState('')
  return (
    <div class="screen">
      <div class="center-page">
        <form
          class="panel title-card"
          onSubmit={(e) => {
            e.preventDefault()
            props.onStart(seed.trim())
          }}
        >
          <div class="label">{t('ui.title.act')}</div>
          <h1 class="game-title">{t('ui.brand')}</h1>
          <p class="pitch">{t('ui.title.pitch')}</p>
          <label class="field">
            <span class="label">{t('ui.title.seed')}</span>
            <input
              type="text"
              value={seed}
              placeholder={t('ui.title.seed_placeholder')}
              onInput={(e) => setSeed((e.target as HTMLInputElement).value)}
            />
          </label>
          <div>
            <button type="submit" class="btn btn-primary">
              {t('ui.title.new_career')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
