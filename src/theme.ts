// Light, dark or OS theme. style.css selects the colours with data-theme on <html>.
export type Theme = 'auto' | 'light' | 'dark'

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem('theme')
    return t === 'light' || t === 'dark' ? t : 'auto'
  } catch {
    return 'auto' // storage is blocked: follow the OS
  }
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem('theme', t)
  } catch {
    // The theme then lasts only until the app closes.
  }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = t
}
