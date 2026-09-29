export const colors = {
  canvas: '#F2F2F2',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#525252',
  textTertiary: '#8A8A8A',
  divider: 'rgba(0,0,0,0.12)',
  border: 'rgba(0,0,0,0.2)',
  action: '#0074DE',
  brand: '#008CFF',
  sky: '#4BB4FF',
  skySoft: '#E3F2FF',
  black: '#000000',
  blackHover: '#292929',
  pillGray: '#EBEBEB',
  success: '#0F9D58',
  danger: '#D0342C',
  dangerSoft: '#FDECEB',
  purple: '#9969FA',
  pink: '#E074FF',
  hotPink: '#FF33BB',
  orange: '#FB5E1B',
  yellow: '#FCBA1E',
  lime: '#B2E847',
  green: '#42E69F',
  cyan: '#4CF0EB',
  indigo: '#3F34EE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  field: 12,
  card: 24,
  pill: 999,
  sheet: 28,
  search: 22,
} as const;

export const type = {
  tab: 11,
  caption: 13,
  body: 16,
  bodyLarge: 17,
  feed: 19,
  title: 24,
  display: 34,
  amount: 44,
} as const;

export const layout = {
  gutter: 16,
  maxWidth: 520,
  buttonHeight: 52,
  compactButtonHeight: 40,
  avatar: 44,
} as const;

export const cardDesigns: Record<
  string,
  { label: string; from: string; to: string; text: string }
> = {
  sky: { label: 'Sky', from: '#4BB4FF', to: '#0074DE', text: '#FFFFFF' },
  lime: { label: 'Lime', from: '#B2E847', to: '#42E69F', text: '#000000' },
  sunset: { label: 'Sunset', from: '#FCBA1E', to: '#FB5E1B', text: '#000000' },
  orchid: { label: 'Orchid', from: '#E074FF', to: '#9969FA', text: '#FFFFFF' },
  midnight: {
    label: 'Midnight',
    from: '#292929',
    to: '#000000',
    text: '#FFFFFF',
  },
};
