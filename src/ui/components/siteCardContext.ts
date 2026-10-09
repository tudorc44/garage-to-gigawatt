// M33.3 (doc 35): any site name can open that site's card. The host (siteCard.tsx, mounted by app.tsx) provides this.
import { createContext } from 'preact'

export const SiteCardContext = createContext<{ open: (siteId: string) => void } | null>(null)
