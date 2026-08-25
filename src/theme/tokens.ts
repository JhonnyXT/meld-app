export const accentPalette = [
  { id: 'coral', label: 'Coral', value: '#FF4B66' },
  { id: 'orange', label: 'Orange', value: '#e2793d' },
  { id: 'yellow', label: 'Yellow', value: '#d9b53c' },
  { id: 'green', label: 'Green', value: '#4f9d6e' },
  { id: 'blue', label: 'Blue', value: '#4a8fd9' },
  { id: 'purple', label: 'Purple', value: '#9b7bd9' },
] as const;

export type AccentId = (typeof accentPalette)[number]['id'];

export const defaultAccent: AccentId = 'coral';

export interface Palette {
  bg: string;
  surface: string;
  surfaceLow: string;
  surfaceHigh: string;
  /** Pill/etiqueta contextual sólida (ej. Inbox en la barra flotante). */
  pillSolid: string;
  text: string;
  /** Texto secundario: fechas, íconos inactivos, etiquetas de categoría, time labels. */
  textDim: string;
  /** Texto de ítems completados (tachado). */
  textFaint: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  danger: string;
  success: string;
}

const darkBase = {
  bg: '#121212',
  surface: '#1C1C1E',
  surfaceLow: '#1E1E20',
  surfaceHigh: '#2E2E30',
  pillSolid: '#242426',
  text: '#FFFFFF',
  textDim: '#8E8E93',
  textFaint: '#8E8E93',
  border: '#2C2C2E',
  danger: '#ffb4ab',
  success: '#5dde97',
};

const lightBase = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceLow: '#eef0f2',
  surfaceHigh: '#e1e4e8',
  pillSolid: '#e9ebee',
  text: '#201c1e',
  textDim: '#6b6165',
  textFaint: '#9a9094',
  border: '#dfe2e6',
  danger: '#d9294a',
  success: '#1c4a30',
};

function withAccent(base: typeof darkBase, accent: string, accentSoft: string, accentInk: string): Palette {
  return { ...base, accent, accentSoft, accentInk };
}

const accentTonesDark: Record<AccentId, [string, string, string]> = {
  coral: ['#FF4B66', '#3a1c22', '#ffb2b6'],
  orange: ['#e2793d', '#3a2617', '#f4c69a'],
  yellow: ['#d9b53c', '#39301a', '#efdc9c'],
  green: ['#4f9d6e', '#1b2620', '#a9d9bb'],
  blue: ['#4a8fd9', '#1a2530', '#a8cdf4'],
  purple: ['#9b7bd9', '#241f30', '#d3c2f4'],
};

const accentTonesLight: Record<AccentId, [string, string, string]> = {
  coral: ['#d9294a', '#f6d9dd', '#7a1329'],
  orange: ['#c15a1f', '#f3e1d1', '#6b330f'],
  yellow: ['#a8842a', '#f0e7c8', '#5c4915'],
  green: ['#2f7a4f', '#dcefe2', '#1c4a30'],
  blue: ['#2f6dc1', '#dbe8f8', '#1c3f6b'],
  purple: ['#6f4fc1', '#e6dcf8', '#3a2766'],
};

export function getPalette(scheme: 'light' | 'dark', accent: AccentId): Palette {
  if (scheme === 'dark') {
    const [a, soft, ink] = accentTonesDark[accent];
    return withAccent(darkBase, a, soft, ink);
  }
  const [a, soft, ink] = accentTonesLight[accent];
  return withAccent(lightBase, a, soft, ink);
}

/** Colores fijos de categoría (independientes del acento), tal como en el diseño. */
export const categoryColors = {
  work: '#4F84FF',
  personal: '#A55CFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typeScale = {
  caption: 12,
  bodySm: 15,
  body: 15,
  bodyLg: 17,
  title: 20,
  headlineMd: 22,
  displayLg: 34,
  headline: 28,
  timeLabel: 18,
};

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_700Bold',
};
