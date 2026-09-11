import type { CSSProperties, PropsWithChildren } from 'react';
import { themes } from '@/data/themes';
import type { ThemeName } from '@/types/game';

interface GameThemeProviderProps extends PropsWithChildren {
  theme: ThemeName;
}

export function GameThemeProvider({ theme, children }: GameThemeProviderProps) {
  const palette = themes[theme];
  const style = {
    '--accent': palette.accent,
    '--accent-soft': palette.accentSoft,
    '--surface': palette.surface,
    '--surface-raised': palette.surfaceRaised,
    '--accent-border': palette.border,
    '--on-accent': palette.onAccent,
  } as CSSProperties;

  return <div className="game-theme" style={style}>{children}</div>;
}
