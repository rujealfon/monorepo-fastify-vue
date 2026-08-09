// Extra semantic color registered alongside Nuxt UI's defaults (primary,
// secondary, success, info, warning, error) — pass to `ui.theme.colors`.
export const brandColorNames = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const

// Maps each semantic color slot to its brand-* palette defined in theme.css
// (see the @theme block there) — pass to `ui.colors`.
export const brandColors = {
  primary: 'brand-primary',
  secondary: 'brand-secondary',
  accent: 'brand-accent',
  info: 'brand-info',
  success: 'brand-success',
  warning: 'brand-warning',
  error: 'brand-error',
  neutral: 'slate'
} as const
