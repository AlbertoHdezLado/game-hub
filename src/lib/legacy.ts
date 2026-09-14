// Verbatim ports of the pure helpers from the legacy shared.js (typed).
import { readStorage, writeStorage } from '@/lib/storage';

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PLAYER_NAMES_STORAGE_KEY = 'gamehub.playerNames';

export function loadSavedPlayerNames(): string[] {
  return readStorage<string[]>(PLAYER_NAMES_STORAGE_KEY, []).filter((n) => typeof n === 'string' && n.trim());
}

export function savePlayerNames(names: readonly string[]): void {
  writeStorage(PLAYER_NAMES_STORAGE_KEY, names);
}

const ROLE_COUNTS_STORAGE_KEY = 'gamehub.werewolfRoleCounts';

export function loadSavedRoleCounts(): Record<string, number> {
  return readStorage<Record<string, number>>(ROLE_COUNTS_STORAGE_KEY, {});
}

export function saveRoleCounts(counts: Record<string, number>): void {
  writeStorage(ROLE_COUNTS_STORAGE_KEY, counts);
}

export function hasDuplicatePlayerNames(names: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    if (seen.has(name)) return true;
    seen.add(name);
  }
  return false;
}

export function buildRandomShuffledRoles(total: number, marked: number): boolean[] {
  const roles: boolean[] = [];
  for (let i = 0; i < total; i++) roles.push(i < marked);
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

export interface AdultContentItem {
  nombre?: string;
}

export function isAdultContent(item: AdultContentItem | null | undefined): boolean {
  return !!item && /\+18/.test(item.nombre ?? '');
}

// ---- player name rows: a trailing empty slot always grows the list, no "add" button ----

export function effectivePlayerCount(rows: readonly string[]): number {
  let n = rows.length;
  if (n > 0 && !rows[n - 1].trim()) n--;
  return n;
}

export function effectivePlayerNames(rows: readonly string[]): string[] {
  return rows.map((name) => name.trim()).filter((name) => name !== '');
}

export function normalizeTrailingSlot(rows: readonly string[], max: number): string[] {
  const next = [...rows];
  while (next.length > 1 && !next[next.length - 1].trim() && !next[next.length - 2].trim()) {
    next.pop();
  }
  if (next.length < max && (next.length === 0 || next[next.length - 1].trim())) {
    next.push('');
  }
  return next;
}

