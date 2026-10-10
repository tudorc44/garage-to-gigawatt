// M43.A: one art slot in a panel frame: the image (lazy, cover-cropped to a maximum height), an optional caption, the
// credit line, and a "Test art" tag in the corner while the slot is test art. Nothing when the build hides the slot
// (test art in production). Imported only from Act IV's lazy chunks.
import { t } from '../../i18n/t.ts'
import { artFor, type ArtSlotId } from '../art.ts'

export function ArtFrame(props: { slot: ArtSlotId; caption?: string; maxHeight?: number }) {
  const a = artFor(props.slot)
  if (!a) return null
  const big = a.files[a.files.length - 1]
  return (
    <figure class="panel art-frame" data-art={props.slot}>
      <div class="art-frame-img" style={{ maxHeight: `${props.maxHeight ?? 260}px` }}>
        <img
          src={big.src}
          srcset={a.files.map((f) => `${f.src} ${f.width}w`).join(', ')}
          sizes="(max-width: 1200px) 90vw, 1152px"
          width={big.width}
          height={Math.round(big.width / a.aspect)}
          alt={t(a.alt)}
          loading="lazy"
          decoding="async"
        />
        {a.test && <span class="tag art-test-tag">{t('ui.art.test_tag')}</span>}
      </div>
      <figcaption>
        {props.caption && <span class="num-s">{props.caption}</span>}
        <span class="num-s muted art-credit">{t(a.credit)}</span>
      </figcaption>
    </figure>
  )
}
