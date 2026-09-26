/**
 * Design Tokens from docs/front-end-spec.md (Section 6).
 */
export const DESIGN_TOKENS = {
  bgCanvas: '#F8FAFC',       // Light Alabaster
  surfaceCard: '#FFFFFF',    // Pure White Bento Card
  textPrimary: '#0F172A',    // Slate 900 (17.45:1 contrast against #FFFFFF, > 14.8:1 spec)
  textSecondary: '#475569',  // Slate 600 (7.58:1 contrast against #FFFFFF)
  sunPrimary: '#F59E0B',     // Solar Amber
  sunSurface: '#FEF3C7',     // Amber 100
  sunText: '#92400E',        // Amber 800 (High contrast on Amber 100)
  shadePrimary: '#0EA5E9',   // Sky Azure
  shadeSurface: '#E0F2FE',   // Sky 100
  shadeText: '#075985',      // Sky 800 (High contrast on Sky 100)
  brandAccent: '#6366F1',    // Indigo Glow
  brandDark: '#312E81',      // Indigo 900 (High contrast primary button > 11:1)
  statusNight: '#312E81'     // Deep Midnight
} as const;
