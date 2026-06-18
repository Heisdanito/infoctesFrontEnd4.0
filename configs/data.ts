// ============================================================
//  configs/data.ts
//  Central theme design system and layout configuration
// ============================================================

export const theme = {
  colors: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    secondary: '#0EA5E9',
    background: '#0D0D1A', // Deep dark layout background
    surface: '#FFFFFF',
    surfaceAlt: '#E8F1FD',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    success: '#2DBD72', // Verified Success Green
    danger: '#FF4757',  // Failed Error Red
    accent: '#3BB4FF',  // Scan Flow Accent Light Blue
    border: '#CBD5E1',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 28,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    full: 999,
  }
};

export const appConfig = {
  name: 'InfoCtess',
  tagline: 'UEW ICT Department',
  logoInitial: 'IC'
};
