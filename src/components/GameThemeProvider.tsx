import type { CSSProperties, PropsWithChildren } from 'react';
import { appGamePalette } from '@/data/themes';
import type { ThemeName } from '@/types/game';

interface GameThemeProviderProps extends PropsWithChildren {
  slug?: string;
  theme?: ThemeName;
}

export function GameThemeProvider({ children, slug }: Readonly<GameThemeProviderProps>) {
  const palette = appGamePalette;
  const style = {
    '--accent': palette.accent,
    '--accent2': palette.accent2,
    '--reveal-a': palette.accent2,
    '--reveal-b': palette.accent,
    '--accent-soft': palette.accentSoft,
    '--surface': palette.surface,
    '--surface-raised': palette.surfaceRaised,
    '--accent-border': palette.border,
    '--on-accent': palette.onAccent,
  } as CSSProperties;

  return <div className="game-theme" data-game-slug={slug} style={style}>{children}</div>;
}
