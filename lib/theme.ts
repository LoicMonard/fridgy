import { Gabarito_400Regular, Gabarito_500Medium, Gabarito_600SemiBold, Gabarito_700Bold } from '@expo-google-fonts/gabarito';
import { Graduate_400Regular } from '@expo-google-fonts/graduate';

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const fonts = {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_600SemiBold,
  Gabarito_700Bold,
  Graduate_400Regular,
};

export const fontFamily = {
  body: 'Gabarito_400Regular',
  bodyMedium: 'Gabarito_500Medium',
  bodySemiBold: 'Gabarito_600SemiBold',
  bodyBold: 'Gabarito_700Bold',
  quantity: 'Graduate_400Regular',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

// ─── Colors ───────────────────────────────────────────────────────────────────

const palette = {
  // Brand
  orange300: '#FFAB61',
  orange400: '#FF8C35',
  orange500: '#FF7300',
  orange50:  '#FFF8F0',
  orange100: '#FFE8CC',

  // Neutrals
  white:   '#FFFFFF',
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black:   '#000000',

  // Dark surfaces
  dark50:  '#2C2C2E',
  dark100: '#1C1C1E',
  dark200: '#141414',
  dark300: '#0F0F0F',

  // Semantic
  green500:  '#16A34A',
  green50:   '#DCFCE7',
  amber500:  '#F59E0B',
  amber50:   '#FEF3C7',
  red500:    '#EF4444',
  red50:     '#FEE2E2',
} as const;

export type ColorScheme = 'light' | 'dark';

export const colors = {
  light: {
    // Brand
    primary:   palette.orange500,
    primaryBg: palette.orange50,

    // Backgrounds
    background: palette.gray50,
    surface:    palette.white,
    surfaceAlt: palette.gray100,

    // Text
    text: {
      primary:   palette.gray900,
      secondary: palette.gray700,
      muted:     palette.gray500,
      inverse:   palette.white,
    },

    // Border
    border:       palette.gray200,
    borderStrong: palette.gray300,

    // Semantic — expiry badges
    expiry: {
      urgent:    { text: palette.red500,   bg: palette.red50   }, // aujourd'hui / demain
      warning:   { text: palette.amber500, bg: palette.amber50 }, // 2–7 jours
      safe:      { text: palette.green500, bg: palette.green50 }, // > 7 jours
    },

    // Tab bar
    tabBar: {
      background: palette.white,
      active:     palette.orange500,
      inactive:   palette.gray400,
    },

    // Icon button (LocationFilter)
    iconButton: {
      activeBg:     palette.orange50,
      activeColor:  palette.orange500,
      inactiveBg:   palette.gray100,
      inactiveColor: palette.gray400,
    },
  },

  dark: {
    // Brand
    primary:   palette.orange400,
    primaryBg: '#2A1A00',

    // Backgrounds
    background: palette.dark300,
    surface:    palette.dark100,
    surfaceAlt: palette.dark50,

    // Text
    text: {
      primary:   palette.gray50,
      secondary: palette.gray300,
      muted:     palette.gray500,
      inverse:   palette.gray900,
    },

    // Border
    border:       palette.dark50,
    borderStrong: palette.gray700,

    // Semantic — expiry badges
    expiry: {
      urgent:  { text: '#FF6B6B', bg: '#2D1515' },
      warning: { text: '#FFC46B', bg: '#2D2010' },
      safe:    { text: '#6BCB8B', bg: '#102D1A' },
    },

    // Tab bar
    tabBar: {
      background: palette.dark100,
      active:     palette.orange400,
      inactive:   palette.gray600,
    },

    // Icon button (LocationFilter)
    iconButton: {
      activeBg:      '#2A1A00',
      activeColor:   palette.orange400,
      inactiveBg:    palette.dark50,
      inactiveColor: palette.gray500,
    },
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Expiry threshold ─────────────────────────────────────────────────────────

export const EXPIRY_BADGE_THRESHOLD_DAYS = 7;
