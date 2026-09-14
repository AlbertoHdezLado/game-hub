import type { GameSlug } from '@/types/game';

export interface GameTheme {
  accent: string;
  accent2: string;
  revealB?: string;
}

// per-game --accent/--accent2/--reveal-b, copied verbatim from each legacy <juego>.html's own <style> :root override
export const gameThemeColors: Partial<Record<GameSlug, GameTheme>> = {
  impostor: { accent: '#9c3f47', accent2: '#bf7078', revealB: '#bf7078' },
  'verdad-o-reto': { accent: '#3fa89c', accent2: '#9ee0da', revealB: '#9ee0da' },
  'yo-nunca': { accent: '#c9a020', accent2: '#f2c94c', revealB: '#f2c94c' },
  'quien-es-mas-probable': { accent: '#d9c14f', accent2: '#f0e2a0', revealB: '#f0e2a0' },
  'que-harias-si': { accent: '#7c86e0', accent2: '#a5aef5', revealB: '#a5aef5' },
  'que-preferirias': { accent: '#4fc3d9', accent2: '#9ee8f0', revealB: '#9ee8f0' },
  mimica: { accent: '#d9974f', accent2: '#f0c896', revealB: '#f0c896' },
  'times-up': { accent: '#4f8f6b', accent2: '#8fd9ac', revealB: '#8fd9ac' },
  tabu: { accent: '#7a45b0', accent2: '#a970e0', revealB: '#a970e0' },
  picolo: { accent: '#e0663f', accent2: '#f5a875', revealB: '#f5a875' },
  'patata-caliente': { accent: '#d9502f', accent2: '#f5936a', revealB: '#f5936a' },
  'detective-club': { accent: '#5b8fe0', accent2: '#8fc1f0', revealB: '#8fc1f0' },
  'codigo-secreto': { accent: '#5f7285', accent2: '#7d94ab', revealB: '#7d94ab' },
  trivial: { accent: '#7a9e4a', accent2: '#b7e07a', revealB: '#b7e07a' },
};

export const defaultGameTheme: GameTheme = { accent: '#5b8fe0', accent2: '#9dc9ff' };

