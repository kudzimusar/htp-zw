export const colors = {
  paper: "#FFFFFF",
  paperMuted: "#F6F8FA",
  ink: "#0B1F33",
  inkMuted: "#5B6776",
  navy: "#071A2B",
  blue: "#1263D6",
  teal: "#0A8F8F",
  border: "#DCE3EA",
  live: "#C62828",
  success: "#1F7A4C",
  warning: "#A56600",
  adSurface: "#F2F4F6",
  premium: "#8A6421"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14
} as const;

export const type = {
  brand: 24,
  screen: 30,
  hero: 32,
  story: 19,
  standfirst: 16,
  body: 18,
  label: 12,
  meta: 13
} as const;

export const layout = {
  mobileGutter: 16,
  tabletGutter: 24,
  desktopGutter: 32,
  contentMax: 1180,
  articleMax: 760,
  touchMin: 44
} as const;

export const breakpoints = {
  tablet: 768,
  desktop: 1100
} as const;
