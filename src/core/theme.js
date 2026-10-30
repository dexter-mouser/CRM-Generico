import { prefs } from './store.js';
export function initTheme() { const t = prefs.get('theme'); if (t) document.documentElement.dataset.theme = t; }
export function toggleTheme() {
  const d = document.documentElement;
  const dark = d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  d.dataset.theme = dark ? 'light' : 'dark';
  prefs.set('theme', d.dataset.theme);
}
