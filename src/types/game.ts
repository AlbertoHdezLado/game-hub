export type GameSlug =
  | 'impostor'
  | 'hombres-lobo'
  | 'codigo-secreto'
  | 'times-up'
  | 'verdad-o-reto'
  | 'mimica'
  | 'patata-caliente'
  | 'yo-nunca'
  | 'picolo'
  | 'trivial'
  | 'tabu'
  | 'quien-es-mas-probable'
  | 'que-harias-si'
  | 'que-preferirias'
  | 'detective-club';

export type ThemeName = 'red' | 'violet' | 'steel' | 'green' | 'teal' | 'amber' | 'flame' | 'gold' | 'orange' | 'lime' | 'purple' | 'yellow' | 'indigo' | 'cyan' | 'blue';

export interface GameDefinition {
  slug: GameSlug;
  title: string;
  description: string;
  icon: string;
  theme: ThemeName;
  players: string;
  kind: 'reveal' | 'timed' | 'teams' | 'roles' | 'special';
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
