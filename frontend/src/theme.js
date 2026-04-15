/**
 * theme.js
 *
 * Color token objects for FLOW-3D dark and light themes.
 * Import whichever theme object you need from the active themeStore value.
 *
 * Naming convention:
 *   bg*       — surface / background colors (bg, bgSecondary, bgTertiary)
 *   border*   — border / divider colors
 *   text*     — text colors (text, textSecondary, textMuted)
 *   accent*   — primary interactive accent (blue/teal family)
 *   danger*   — destructive action colors
 */

export const darkTheme = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  bg: '#0f1117',            // page / outermost background
  bgSecondary: '#161b27',   // sidebar, header row 1
  bgTertiary: '#1c2333',    // header row 2, card backgrounds
  bgCard: '#1e2536',        // elevated cards
  bgInput: '#111827',       // input fields
  bgInputHover: '#1c2333',
  bgHover: '#1e2740',       // hover state for list rows

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#2a3347',
  borderLight: '#1e2a3d',

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#e8eaf0',
  textSecondary: '#94a3b8',
  textMuted: '#4b5a72',

  // ── Accents ───────────────────────────────────────────────────────────────
  accent: '#3b82f6',           // blue-500
  accentHover: '#60a5fa',      // blue-400
  accentBg: 'rgba(59,130,246,0.12)',
  accentBgHover: 'rgba(59,130,246,0.2)',
  accentGlow: '0 0 20px rgba(59,130,246,0.25)',

  // ── Danger ────────────────────────────────────────────────────────────────
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.1)',

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleOn: '#3b82f6',
  toggleOff: '#374151',
  toggleThumb: '#ffffff',

  // ── Specific component overrides ──────────────────────────────────────────
  headerBg: '#161b27',
  headerBgRow2: '#111520',
  sidebarBg: '#161b27',
  canvasBg: '#0d1019',
  tabBarBg: '#111520',
  tabActiveBg: '#161b27',
  tabActiveText: '#e8eaf0',
  tabInactiveText: '#4b5a72',
  cardBg: '#1e2536',
  inputBg: '#111827',
  unitBadgeBg: '#1c2333',

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadowSm: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.5)',
};

export const lightTheme = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  bg: '#f0f4f8',
  bgSecondary: '#ffffff',
  bgTertiary: '#f8fafc',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  bgInputHover: '#f8fafc',
  bgHover: '#eff6ff',

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  // ── Accents ───────────────────────────────────────────────────────────────
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentBg: 'rgba(37,99,235,0.08)',
  accentBgHover: 'rgba(37,99,235,0.14)',
  accentGlow: '0 0 20px rgba(37,99,235,0.15)',

  // ── Danger ────────────────────────────────────────────────────────────────
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.08)',

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleOn: '#2563eb',
  toggleOff: '#cbd5e1',
  toggleThumb: '#ffffff',

  // ── Specific component overrides ──────────────────────────────────────────
  headerBg: '#ffffff',
  headerBgRow2: '#f8fafc',
  sidebarBg: '#ffffff',
  canvasBg: '#e8eef6',
  tabBarBg: '#f1f5f9',
  tabActiveBg: '#ffffff',
  tabActiveText: '#0f172a',
  tabInactiveText: '#64748b',
  cardBg: '#ffffff',
  inputBg: '#ffffff',
  unitBadgeBg: '#f1f5f9',

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadowSm: '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.1)',
};

/**
 * Returns the correct theme object given a theme string.
 * @param {'dark'|'light'} name
 */
export function getTheme(name) {
  return name === 'light' ? lightTheme : darkTheme;
}
