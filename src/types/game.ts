export type GameSlug =
  | 'impostor'
  | 'werewolf'
  | 'secret-code'
  | 'times-up'
  | 'truth-or-dare'
  | 'charades'
  | 'hot-potato'
  | 'never-have-i-ever'
  | 'picolo'
  | 'trivia'
  | 'taboo'
  | 'most-likely'
  | 'what-would-you-do'
  | 'would-you-rather'
  | 'detective-club'
  | 'hitster';

export type ThemeName = 'red' | 'violet' | 'steel' | 'green' | 'teal' | 'amber' | 'flame' | 'gold' | 'orange' | 'lime' | 'purple' | 'yellow' | 'indigo' | 'cyan' | 'blue' | 'rose';

export interface GameDefinition {
  slug: GameSlug;
  title: string;
  description: string;
  icon: string;
  theme: ThemeName;
  players: string;
  kind: 'reveal' | 'timed' | 'teams' | 'roles' | 'special';
  disabled?: boolean;
}

export interface Category<T> {
  id?: string;
  nombre: string;
  icono?: string;
  [key: string]: unknown;
}

export interface WordPack {
  id: string;
  nombre: string;
  icono: string;
  palabras: string[];
  relacionadas?: Record<string, string>;
}

export interface WordPackContent {
  paquetes: WordPack[];
}

export interface TruthOrDareContent {
  categorias: Array<{ nombre: string; verdades: string[]; retos: string[] }>;
}

export interface WouldYouRatherContent {
  opciones: Array<{ texto: string; nivel: number }>;
}

export interface CategoryListContent {
  categorias: Array<Category<string[]> & { frases?: string[]; escenarios?: string[]; temas?: string[]; palabras?: string[] }>;
}
