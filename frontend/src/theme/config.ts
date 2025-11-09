import rawTokens from './tokens.json';

export const color = rawTokens.color;
export const spacing = rawTokens.spacing;
export const radius = rawTokens.radius;
export const shadow = rawTokens.shadow;
export const typography = rawTokens.typography;
export const zIndex = rawTokens.zIndex;

export type SemanticColorCategory = keyof typeof color.semantic;
export type SemanticColorKey<Category extends SemanticColorCategory = SemanticColorCategory> =
  keyof (typeof color.semantic)[Category];

export type TypographyScaleKey = keyof typeof typography.scale;

type TypographyScaleValue = (typeof typography.scale)[TypographyScaleKey];

export const getTextStyle = (variant: TypographyScaleKey): TypographyScaleValue => {
  return typography.scale[variant];
};

export const tokens = {
  color,
  spacing,
  radius,
  shadow,
  typography,
  zIndex,
};

export const semanticColorKeys: Record<SemanticColorCategory, SemanticColorKey[]> = Object.entries(
  color.semantic
).reduce(
  (acc, [category, values]) => {
    acc[category as SemanticColorCategory] = Object.keys(values) as SemanticColorKey[];
    return acc;
  },
  {} as Record<SemanticColorCategory, SemanticColorKey[]>
);

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
