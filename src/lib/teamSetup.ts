import { shuffle } from '@/lib/random';

export interface TeamRow {
  name: string;
  team: number;
}

export const TEAM_NAMES = ['Azul', 'Rojo', 'Verde', 'Amarillo'];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;

export function realPlayerCount(rows: readonly TeamRow[]): number {
  return rows.filter((r) => r.name.trim()).length;
}

export function leastPopulatedTeam(rows: readonly TeamRow[], numTeams: number): number {
  const counts = new Array(numTeams).fill(0);
  rows.forEach((r) => { if (r.name.trim()) counts[Math.min(r.team, numTeams - 1)]++; });
  let minIdx = 0;
  for (let t = 1; t < numTeams; t++) if (counts[t] < counts[minIdx]) minIdx = t;
  return minIdx;
}

export function normalizeTrailingTeamSlot(rows: readonly TeamRow[], max: number, numTeams: number): TeamRow[] {
  const next = rows.map((r) => ({ ...r }));
  while (next.length > 1 && !next[next.length - 1].name.trim() && !next[next.length - 2].name.trim()) {
    next.pop();
  }
  if (next.length < max && (next.length === 0 || next[next.length - 1].name.trim())) {
    next.push({ name: '', team: leastPopulatedTeam(next, numTeams) });
  }
  return next;
}

export function autoBalanceAllTeams(rows: readonly TeamRow[], numTeams: number): TeamRow[] {
  const next = rows.map((r) => ({ ...r }));
  let i = 0;
  next.forEach((r) => { if (r.name.trim()) { r.team = i % numTeams; i++; } });
  return next;
}

export function randomizeAllTeams(rows: readonly TeamRow[], numTeams: number): TeamRow[] {
  const next = rows.map((r) => ({ ...r }));
  const realIdxs = shuffle(next.map((_, idx) => idx).filter((idx) => next[idx].name.trim()));
  realIdxs.forEach((idx, i) => { next[idx].team = i % numTeams; });
  return next;
}

export interface BuiltTeam {
  score: number;
  memberIdxs: number[];
  nextMemberPointer: number;
}

export function buildTeams(rows: readonly TeamRow[], numTeams: number): { playerNames: string[]; playerTeams: number[]; teams: BuiltTeam[] } {
  const realRows = rows.filter((r) => r.name.trim() !== '').map((r) => ({ name: r.name.trim(), team: Math.min(r.team, numTeams - 1) }));
  const playerNames = realRows.map((r) => r.name);
  const playerTeams = realRows.map((r) => r.team);
  const teams: BuiltTeam[] = [];
  for (let t = 0; t < numTeams; t++) {
    const memberIdxs = shuffle(playerTeams.map((team, idx) => (team === t ? idx : -1)).filter((idx) => idx !== -1));
    teams.push({ score: 0, memberIdxs, nextMemberPointer: 0 });
  }
  return { playerNames, playerTeams, teams };
}

export function emptyTeamIndex(rows: readonly TeamRow[], numTeams: number): number {
  const counts = new Array(numTeams).fill(0);
  rows.forEach((r) => { if (r.name.trim()) counts[Math.min(r.team, numTeams - 1)]++; });
  return counts.indexOf(0);
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
