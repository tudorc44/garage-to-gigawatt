// M33.3 (doc 35): any site name can open that site's card. The host (siteCard.tsx, mounted by app.tsx) provides this:
// `open`, and (M34.2, 3e) the company's sites by short name, so a sentence can link the names it mentions.
import { createContext } from 'preact'

export const SiteCardContext = createContext<{
  open: (siteId: string) => void
  /** short name → site id, for every site the company holds now */
  names: Map<string, string>
} | null>(null)
