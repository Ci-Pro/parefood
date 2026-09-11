/**
 * PareFood Design System — Typography Tokens
 */

export const typography = {
  fontFamily: {
    regular: undefined as string | undefined,
    medium: undefined as string | undefined,
    semibold: undefined as string | undefined,
    bold: undefined as string | undefined,
  },

  sizes: {
    display: 36,
    heading: 28,
    title: 20,
    subtitle: 17,
    body: 15,
    caption: 13,
    small: 11,
  },

  lineHeights: {
    display: 44,
    heading: 36,
    title: 28,
    subtitle: 24,
    body: 22,
    caption: 18,
    small: 16,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type Typography = typeof typography;