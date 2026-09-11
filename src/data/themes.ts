import type { ThemeName } from '@/types/game';

export interface GameTheme {
  accent: string;
  accentSoft: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  onAccent: string;
}

export const themes: Record<ThemeName, GameTheme> = {
  red: { accent: '#e8929c', accentSoft: '#f4c7cd', surface: '#271a25', surfaceRaised: '#39202d', border: '#7c3d50', onAccent: '#24151c' },
  violet: { accent: '#c3b1f0', accentSoft: '#e4dcfa', surface: '#241d35', surfaceRaised: '#362a4d', border: '#645096', onAccent: '#211a35' },
  steel: { accent: '#9bb1c8', accentSoft: '#cedae5', surface: '#1b2935', surfaceRaised: '#293b4a', border: '#506a80', onAccent: '#14212b' },
  green: { accent: '#8fd9ac', accentSoft: '#c7f0d5', surface: '#182b26', surfaceRaised: '#244137', border: '#4f8f6b', onAccent: '#14271f' },
  teal: { accent: '#9ee0da', accentSoft: '#d1f3ef', surface: '#172d30', surfaceRaised: '#24484a', border: '#3fa89c', onAccent: '#142a2b' },
  amber: { accent: '#f0c896', accentSoft: '#f8e4c5', surface: '#30251b', surfaceRaised: '#493621', border: '#9a6a38', onAccent: '#2a1d12' },
  flame: { accent: '#f5936a', accentSoft: '#ffd0ba', surface: '#321e1a', surfaceRaised: '#4b2922', border: '#aa5037', onAccent: '#2b1713' },
  gold: { accent: '#f2c94c', accentSoft: '#f8e6a0', surface: '#302a18', surfaceRaised: '#4b411f', border: '#a8872f', onAccent: '#27200e' },
  orange: { accent: '#f0954f', accentSoft: '#ffd0a5', surface: '#302219', surfaceRaised: '#4b3020', border: '#a86130', onAccent: '#2b190f' },
  lime: { accent: '#a8d96a', accentSoft: '#d9f0ad', surface: '#24301b', surfaceRaised: '#344a25', border: '#6e9840', onAccent: '#1b2810' },
  purple: { accent: '#c58be9', accentSoft: '#ead1f8', surface: '#2a1d35', surfaceRaised: '#422b52', border: '#8050a1', onAccent: '#24152e' },
  yellow: { accent: '#e8d66b', accentSoft: '#f5edb2', surface: '#302e19', surfaceRaised: '#49451f', border: '#a2943f', onAccent: '#28240e' },
  indigo: { accent: '#9aa8fa', accentSoft: '#d5dafc', surface: '#1e2438', surfaceRaised: '#2d3653', border: '#596aa8', onAccent: '#171d34' },
  cyan: { accent: '#66d1e4', accentSoft: '#c4f0f6', surface: '#192c34', surfaceRaised: '#264550', border: '#3e8f9d', onAccent: '#12252b' },
  blue: { accent: '#9dc9ff', accentSoft: '#d4e7ff', surface: '#1a2737', surfaceRaised: '#273c55', border: '#527aaa', onAccent: '#142335' },
};
