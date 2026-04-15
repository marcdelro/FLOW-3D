/**
 * themeStore.js
 *
 * Zustand store for light/dark mode.
 * Persisted to localStorage so the user's preference survives page refreshes.
 */

import { create } from 'zustand';

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('flow3d-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) { /* localStorage unavailable in some envs */ }
  return 'dark';
}

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('flow3d-theme', next); } catch (_) {}
      return { theme: next };
    }),
}));

export default useThemeStore;
