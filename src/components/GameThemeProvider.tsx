import type { CSSProperties, PropsWithChildren } from 'react';
import { defaultGameTheme, gameThemeColors } from '@/data/themes';
import type { ThemeName } from '@/types/game';

interface GameThemeProviderProps extends PropsWithChildren {
  slug?: string;
  /** @deprecated kept optional while remaining feature pages are still being ported to per-slug legacy colors */
  theme?: ThemeName;
}

// applies the same --accent/--accent2/--reveal-b overrides each legacy <juego>.html sets in its own <style>
export function GameThemeProvider({ slug, children }: Readonly<GameThemeProviderProps>) {
  const palette = (slug && gameThemeColors[slug as keyof typeof gameThemeColors]) || defaultGameTheme;
  const style = {
    '--accent': palette.accent,
    '--accent2': palette.accent2,
    ...(palette.revealB ? { '--reveal-b': palette.revealB } : {}),
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
