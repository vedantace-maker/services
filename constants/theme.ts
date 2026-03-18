export const Colors = {
  primary: '#FF6B35',
  primaryLight: '#FFF4F0',
  primaryDark: '#E55A24',

  bg: '#F2F3F5',   // ← was #F7F8FA, now warmer off-white
  surface: '#FFFFFF',
  surfaceAlt: '#EDEEF1',   // ← slightly warmer too

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#EFEFEF',   // ← softer dividers

  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

export const Typography = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '500' as const },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  button: { fontSize: 15, fontWeight: '600' as const },
  buttonSm: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  overline: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
  tab: { fontSize: 10, fontWeight: '500' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 14,   // ← was 16, tighter overall
  lg: 20,   // ← was 24, tighter sections
  xl: 28,   // ← was 32
  xxl: 40,   // ← was 48
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};
