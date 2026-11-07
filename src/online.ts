export interface OnlineEntry {
  title: string
  extract: string
  url: string
}

const API = 'https://de.wiktionary.org/w/api.php'

// Live lookup in the German Wiktionary. The API allows cross-origin requests with origin=*.
export async function lookupOnline(word: string, signal?: AbortSignal): Promise<OnlineEntry | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: '1',
    exsectionformat: 'plain',
    redirects: '1',
    titles: word.trim(),
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const res = await fetch(`${API}?${params}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const page = data?.query?.pages?.[0]
  if (!page || page.missing || !page.extract) return null
  return {
    title: page.title,
    extract: String(page.extract).trim(),
    url: 'https://de.wiktionary.org/wiki/' + encodeURIComponent(String(page.title).replace(/ /g, '_')),
  }
}

// Duden has no public API, so we only link to its search page.
export function dudenSearchUrl(word: string): string {
  return 'https://www.duden.de/suchen/dudenonline/' + encodeURIComponent(word.trim())
}
