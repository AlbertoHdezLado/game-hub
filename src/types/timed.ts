import type { WordPack } from '@/types/game';

export interface TabooCard {
  palabra: string;
  prohibidas: string[];
}

export interface TabooPack {
  id: string;
  nombre: string;
  icono: string;
  cartas: TabooCard[];
}

export interface TabooContent {
  paquetes: TabooPack[];
}

export type TimedCard = string | TabooCard;

export function flattenWordPacks(packs: WordPack[], selectedIds: string[]) {
  return packs.filter((pack) => selectedIds.includes(pack.id)).flatMap((pack) => pack.palabras);
}

export function flattenTabooPacks(packs: TabooPack[], selectedIds: string[]) {
  return packs.filter((pack) => selectedIds.includes(pack.id)).flatMap((pack) => pack.cartas);
}
