import { fontFamily } from '@/theme/tokens';

/**
 * Paleta y tipografía FIJAS del onboarding — no lee `ThemeProvider`/`tokens.ts`
 * porque replica un diseño de referencia (Stitch) con sus propios colores,
 * mismo criterio que `AnimatedSplash`.
 *
 * Modo oscuro (pedido explícito 2026-08-29): fondo negro plano `#121212`, el
 * mismo del tema oscuro de la app y del splash, aludiendo al color de marca
 * vía el acento coral. Los mockups (`assets/onboarding/mock-*.png`) YA son
 * capturas del tema oscuro, así que integran bien sobre este fondo — no hubo
 * que rehacerlos. Los nombres de token (`textDark`, `card`, etc.) se
 * conservan del diseño claro anterior aunque ahora tengan valores oscuros,
 * para no tocar cada archivo que los referencia.
 */
export const ONB = {
  bg: '#121212',
  /** Igual a `bg` pero transparente — arranque del scrim `LinearGradient`. */
  scrimClear: 'rgba(18,18,18,0)',
  accent: '#FA3D5C',
  accentSoft: 'rgba(250,61,92,0.18)',
  textDark: '#F5F5F7',
  textDim: '#8E8E93',
  textMedium: '#A1A1A6',
  textLight: '#8E8E93',
  dotInactive: '#3A3A3C',
  card: '#1C1C1E',
  cardBorder: '#2C2C2E',
  font: fontFamily,
} as const;
