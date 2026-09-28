// Design tokens. Every color, size and radius in the app comes from here, so the look can be
// changed in one place. Colors come in a light and a dark set with the same names.

/** A semantic color family: `fg` for text/icons/borders, `bg` for a soft tinted background */
export interface Tone {
  fg: string;
  bg: string;
}

export type ToneName = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'rose';

export interface Palette {
  /** Screen background */
  bg: string;
  /** Cards, sheets, inputs */
  surface: string;
  /** Pressed rows, skeletons, secondary buttons */
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  /** Text and icons on top of `primary` */
  onPrimary: string;
  overlay: string;
  tones: Record<ToneName, Tone>;
}

const light: Palette = {
  bg: '#F6F5F3',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEEEB',
  border: '#E5E3DF',
  text: '#1A1917',
  textMuted: '#6B6761',
  textSubtle: '#9A958E',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(15, 15, 20, 0.45)',
  tones: {
    neutral: { fg: '#57534E', bg: '#EFEEEB' },
    primary: { fg: '#4338CA', bg: '#EEF0FF' },
    success: { fg: '#15803D', bg: '#E7F6EC' },
    warning: { fg: '#B45309', bg: '#FDF2E2' },
    danger: { fg: '#DC2626', bg: '#FDECEC' },
    info: { fg: '#1D4ED8', bg: '#E8F0FE' },
    violet: { fg: '#7C3AED', bg: '#F3EDFE' },
    rose: { fg: '#BE123C', bg: '#FDEBF0' },
  },
};

const dark: Palette = {
  bg: '#0E0E10',
  surface: '#1A1A1D',
  surfaceAlt: '#26262A',
  border: '#303035',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',
  primary: '#8B87F7',
  onPrimary: '#0E0E10',
  overlay: 'rgba(0, 0, 0, 0.6)',
  tones: {
    neutral: { fg: '#A8A29E', bg: '#2A2A2E' },
    primary: { fg: '#A5A1FA', bg: '#26244A' },
    success: { fg: '#4ADE80', bg: '#12301D' },
    warning: { fg: '#FBBF24', bg: '#35270F' },
    danger: { fg: '#F87171', bg: '#3A1616' },
    info: { fg: '#60A5FA', bg: '#152743' },
    violet: { fg: '#C4B5FD', bg: '#2C2045' },
    rose: { fg: '#FB7185', bg: '#3A1622' },
  },
};

export const palettes = { light, dark };

/** 4-point spacing scale */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** The type scale; screens use these instead of raw font sizes */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  callout: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
} as const;
