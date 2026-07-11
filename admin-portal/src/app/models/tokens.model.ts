export interface TokenColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  text: string;
  textMuted: string;
  bg: string;
  bgAlt: string;
}

export interface TokenSpacing {
  base: number;
  button: number;
  section: number;
  card: number;
  input: number;
}

export interface TokenFontSizes {
  body: number;
  heading: number;
  small: number;
}

export interface TokenFonts {
  primary: string;
  secondary: string;
  sizes: TokenFontSizes;
  weights: number[];
}

export interface TokenPayload {
  merchantId: string;
  colors: TokenColors;
  spacing: TokenSpacing;
  fonts: TokenFonts;
  mode: 'light' | 'dark';
}

export interface TokenSaveResponse {
  ok: boolean;
  message?: string;
  code?: string;
}
