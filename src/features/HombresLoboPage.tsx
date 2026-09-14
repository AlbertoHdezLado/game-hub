import { useEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/legacy/ScreenHeader';
import { GuideModal } from '@/components/legacy/GuideModal';
import { PlayerNameRows } from '@/components/legacy/PlayerNameRows';
import { RevealCard, RevealButton } from '@/components/legacy/RevealCard';
import { ProgressDots } from '@/components/legacy/ProgressDots';
import { useGameAudio } from '@/hooks/useGameAudio';
import { loadContent } from '@/lib/content';
import {
  effectivePlayerCount, hasDuplicatePlayerNames, loadSavedPlayerNames,
  loadSavedRoleCounts, normalizeTrailingSlot, saveRoleCounts, savePlayerNames,
} from '@/lib/legacy';
import { shuffle } from '@/lib/random';
import '@/styles/games/hombres-lobo.css';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 30;
const MAX_VOTE_SECONDS = 30 * 60;
const VOTE_SECONDS_STEP = 30;
function formatVoteTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
  return `${m}:${s < 10 ? `0${s}` : s}`;
}

type Team = 'lobos' | 'aldeanos' | 'solitario';
const TEAM_LABELS: Record<Team, string> = { lobos: 'Lobos', aldeanos: 'Aldeanos', solitario: 'Solitario' };
const TEAM_CLASS: Record<Team, string> = { lobos: 'danger', aldeanos: 'safe', solitario: 'wild' };

interface Role {
  id: string; nombre: string; equipo: Team; expansion: string; imagen: string;
  descripcion: string; defaultCount: number; maxCount: number; poder: number;
}

type Cause = 'lobos' | 'votacion' | 'otro' | 'amor' | 'disparo' | 'veneno' | 'fuego';
const CAUSE_LABELS: Record<string, string> = { lobos: 'Lobos', votacion: 'Votación', otro: 'Otra causa', amor: 'Pena de amor', disparo: 'Disparo del Cazador', veneno: 'Veneno de la Bruja', fuego: 'Fuego del Pirómano' };
const CAUSE_ICONS: Record<string, string> = { lobos: '🐺', votacion: '🗳️', otro: '☠️', amor: '💔', disparo: '🔫', veneno: '🧪', fuego: '🔥' };

const NIGHT_ORDER: { id: string; freq: 'primera' | 'cada' | 'alterna' | 'especial' }[] = [
  { id: 'ladron', freq: 'primera' },
  { id: 'cupido', freq: 'primera' },
  { id: 'comediante', freq: 'cada' },
  { id: 'perro_lobo', freq: 'primera' },
  { id: 'nino_salvaje', freq: 'primera' },
  { id: 'dos_hermanas', freq: 'primera' },
  { id: 'tres_hermanos', freq: 'primera' },
  { id: 'vidente', freq: 'cada' },
  { id: 'cuervo', freq: 'cada' },
  { id: 'zorro', freq: 'cada' },
  { id: 'protector', freq: 'cada' },
  { id: 'lobo_comun', freq: 'cada' },
  { id: 'lobo_feroz', freq: 'cada' },
  { id: 'infecto_padre', freq: 'cada' },
  { id: 'lobo_albino', freq: 'alterna' },
  { id: 'bruja', freq: 'cada' },
  { id: 'flautista', freq: 'cada' },
  { id: 'piromano', freq: 'cada' },
  { id: 'guardia', freq: 'cada' },
  { id: 'gitana', freq: 'especial' },
];
const WOLF_PACK_IDS = ['lobo_comun', 'lobo_feroz', 'infecto_padre'];
const OPTIONAL_NIGHT_ROLES = ['zorro', 'bruja', 'piromano', 'lobo_albino'];
const SIBLING_GROUP_IDS = ['dos_hermanas', 'tres_hermanos'];

interface NightStep {
  role: { id: string; nombre: string; equipo: Team; imagen: string; descripcion: string };
  freq: string;
  isComedianteBorrow?: boolean;
}

interface Reminder { id: number; text: string }
interface EventEntry { key: string | null; text: string }

interface GameState {
  playerNames: string[];
  roleIds: string[];
  ladronReserve: string[];
  round: number;
  alive: boolean[];
  deathCause: Record<number, Cause>;
  lovers: [number, number] | null;
  ancianoSurvived: boolean;
  villagePowersLost: boolean;
  reminders: Reminder[];
  nightIdx: number;
  protectedIdx: number | null;
  lastProtectedIdx: number | null;
  brujaLifeUsed: boolean;
  brujaDeathUsed: boolean;
  brujaActedThisRound: boolean;
  brujaLifeUsedThisRound: boolean;
  brujaDeathUsedThisRound: boolean;
  brujaLifeSavedIdx: number | null;
  brujaLifeSavedSource: 'lobos' | 'albino' | null;
  brujaDeathPoisonedIdx: number | null;
  wildChildModelIdx: number | null;
  wildChildTransformed: boolean;
  perroLoboChoice: 'aldeano' | 'lobo' | null;
  perroLoboPlayerIdx: number | null;
  ladronPlayerIdx: number | null;
  ravenMark: number | null;
  pyroSoaked: number[];
  pendingNightKillIdx: number | null;
  pendingAlbinoKillIdx: number | null;
  pendingCazadorShootIdx: number | null;
  zorroPowerLost: boolean;
  deathsThisRound: number[];
  eventLog: EventEntry[];
  nightActionDone: Record<string, boolean>;
  judgeUsed: boolean;
  gitanaUsed: boolean;
  comedianteChoiceId: string | null;
  comedianteChoiceMade: boolean;
}

function freshGameState(playerNames: string[], roleIds: string[], ladronReserve: string[]): GameState {
  return {
    playerNames, roleIds, ladronReserve,
    round: 1,
    alive: playerNames.map(() => true),
    deathCause: {},
    lovers: null,
    ancianoSurvived: false,
    villagePowersLost: false,
    reminders: [],
    nightIdx: 0,
    protectedIdx: null,
    lastProtectedIdx: null,
    brujaLifeUsed: false,
    brujaDeathUsed: false,
    brujaActedThisRound: false,
    brujaLifeUsedThisRound: false,
    brujaDeathUsedThisRound: false,
    brujaLifeSavedIdx: null,
    brujaLifeSavedSource: null,
    brujaDeathPoisonedIdx: null,
    wildChildModelIdx: null,
    wildChildTransformed: false,
    perroLoboChoice: null,
    perroLoboPlayerIdx: null,
    ladronPlayerIdx: null,
    ravenMark: null,
    pyroSoaked: [],
    pendingNightKillIdx: null,
    pendingAlbinoKillIdx: null,
    pendingCazadorShootIdx: null,
    zorroPowerLost: false,
    deathsThisRound: [],
    eventLog: [],
    nightActionDone: {},
    judgeUsed: false,
    gitanaUsed: false,
    comedianteChoiceId: null,
    comedianteChoiceMade: false,
  };
}

type Screen = 'setup' | 'reveal' | 'narrator' | 'roster';
type NarratorTab = 'night' | 'vote';
type VoteView = 'announce' | 'select' | 'judge' | 'continue';

interface DeathGuidance { survives: boolean; msgs: string[]; chainPrompt: 'shoot' | null; loverPartner?: number }
interface DeathCtx { idx: number; role: Role; cause: Cause | null; guidance: DeathGuidance | null }

export function HombresLoboPage() {
  const [rows, setRows] = useState<string[]>(() => normalizeTrailingSlot(loadSavedPlayerNames().slice(0, MAX_PLAYERS), MAX_PLAYERS));
  const [unguidedMode, setUnguidedMode] = useState(false);
  const [voteSeconds, setVoteSeconds] = useState(0);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [setupStep, setSetupStep] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [roleInfoOpen, setRoleInfoOpen] = useState<Role | null>(null);
  const [roleTipOpen, setRoleTipOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('setup');

  const [game, setGame] = useState<GameState | null>(null);
  const [viewed, setViewed] = useState<boolean[]>([]);
  const [revealIdx, setRevealIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);

  const [narratorTab, setNarratorTab] = useState<NarratorTab>('night');
  const [voteView, setVoteView] = useState<VoteView>('announce');
  const [nightNavError, setNightNavError] = useState('');
  const [deathsModalOpen, setDeathsModalOpen] = useState(false);

  const [cupidoSelection, setCupidoSelection] = useState<number[]>([]);
  const [videntePickIdx, setVidentePickIdx] = useState<number | null>(null);
  const [zorroSelection, setZorroSelection] = useState<number[]>([]);
  const [zorroConfirmed, setZorroConfirmed] = useState(false);
  const [brujaActiveTab, setBrujaActiveTab] = useState<'life' | 'death'>('life');

  const [selectedVoteIdx, setSelectedVoteIdx] = useState<number | null>(null);
  const [voteTimerRemaining, setVoteTimerRemaining] = useState<number | null>(null);
  const [voteTimeUp, setVoteTimeUp] = useState(false);

  const [deathCtx, setDeathCtx] = useState<DeathCtx | null>(null);
  const [deathModalOpen, setDeathModalOpen] = useState(false);
  const [deathCauseAssumed, setDeathCauseAssumed] = useState<Cause | null>(null);
  const [deathChainShootIdx, setDeathChainShootIdx] = useState<number | null>(null);
  const [lynchReveal, setLynchReveal] = useState<{ idx: number; onContinue: () => void } | null>(null);
  const [gameOverVisible, setGameOverVisible] = useState(false);

  const afterDeathModalResolve = useRef<(() => void) | null>(null);
  const suppressGameOverCheck = useRef(false);
  const reminderSeq = useRef(1);
  const audio = useGameAudio();

  useEffect(() => {
    loadContent<{ roles: Role[] }>('werewolf-roles.json').then((data) => {
      setRoles(data.roles);
      const saved = loadSavedRoleCounts();
      const next: Record<string, number> = {};
      data.roles.forEach((r) => { next[r.id] = r.id in saved ? Math.min(Math.max(saved[r.id], 0), r.maxCount) : r.defaultCount; });
      setCounts(next);
    });
  }, []);

  useEffect(() => {
    if (voteTimerRemaining === null) return;
    if (voteTimerRemaining <= 0) { setVoteTimeUp(true); audio.playAlarm(); return; }
    const id = setTimeout(() => setVoteTimerRemaining((r) => (r ?? 1) - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteTimerRemaining]);

  function updateGame(mutator: (draft: GameState) => void) {
    setGame((prev) => {
      if (!prev) return prev;
      const draft: GameState = { ...prev };
      mutator(draft);
      return draft;
    });
  }

  function updateRows(next: string[]) {
    setRows(next);
    savePlayerNames(next.map((r) => r.trim()).filter(Boolean));
  }

  const playerCount = effectivePlayerCount(rows);
  const hasEmptyName = rows.some((name, idx) => idx !== rows.length - 1 && !name.trim());
  const hasDuplicates = hasDuplicatePlayerNames(rows);
  const playersValid = !hasEmptyName && !hasDuplicates && playerCount >= MIN_PLAYERS;

  function totalRoleCount(): number {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }
  function roleSlotsNeeded(): number {
    return playerCount + (counts.ladron ? 2 : 0);
  }

  const lobosCount = roles ? roles.filter((r) => r.equipo === 'lobos').reduce((s, r) => s + (counts[r.id] || 0), 0) : 0;
  const aldeanosCount = roles ? roles.filter((r) => r.equipo === 'aldeanos').reduce((s, r) => s + (counts[r.id] || 0), 0) : 0;
  const roleSlots = roleSlotsNeeded();
  const total = totalRoleCount();
  let roleErrorMsg = '';
  if (!roles || roles.length === 0) roleErrorMsg = 'Cargando roles…';
  else if (lobosCount < 1) roleErrorMsg = 'Debes incluir al menos un Hombre Lobo.';
  else if (aldeanosCount < 1) roleErrorMsg = 'Debes incluir al menos un Aldeano.';
  else if (total < roleSlots) roleErrorMsg = `Faltan ${roleSlots - total} rol${roleSlots - total === 1 ? '' : 'es'} por elegir.`;
  else if (total > roleSlots) roleErrorMsg = `Sobran ${total - roleSlots} rol${total - roleSlots === 1 ? '' : 'es'}: quita alguno.`;
  const rolesValid = roleErrorMsg === '';
  const canStart = playersValid && rolesValid;

  function setCount(id: string, value: number) {
    const next = { ...counts, [id]: value };
    setCounts(next);
    saveRoleCounts(next);
  }

  function addRole(role: Role) {
    const slots = roleSlotsNeeded();
    if (SIBLING_GROUP_IDS.includes(role.id)) {
      const need = role.maxCount - (counts[role.id] || 0);
      if (need <= 0 || total + need > slots) return;
      setCount(role.id, role.maxCount);
      return;
    }
    const slotsAfterPick = slots + (role.id === 'ladron' ? 2 : 0);
    if (total >= slotsAfterPick) return;
    setCount(role.id, Math.min((counts[role.id] || 0) + 1, role.maxCount));
  }
  function removeRole(id: string) {
    if (!(id in counts)) return;
    setCount(id, SIBLING_GROUP_IDS.includes(id) ? 0 : Math.max(0, (counts[id] || 0) - 1));
  }

  // team balance bar
  let lobosPower = 0, aldeanosPower = 0;
  roles?.forEach((role) => {
    const c = counts[role.id] || 0;
    if (!c) return;
    const weight = typeof role.poder === 'number' ? role.poder : 1;
    if (role.equipo === 'lobos') lobosPower += c * weight;
    else if (role.equipo === 'aldeanos') aldeanosPower += c * weight;
  });
  const totalPower = lobosPower + aldeanosPower;
  const lobosPct = totalPower > 0 ? (lobosPower / totalPower) * 100 : 50;
  const balanceVerdict = totalPower === 0 ? 'Añade roles para ver el balance' : Math.abs(lobosPct - 50) < 6 ? 'Equilibrado' : lobosPct > 50 ? 'Ventaja Lobos' : 'Ventaja Pueblo';

  function handleStart() {
    if (!canStart || !roles) return;
    const deck: string[] = [];
    roles.forEach((role) => { for (let i = 0; i < (counts[role.id] || 0); i++) deck.push(role.id); });

    let reserve: string[] = [];
    if (counts.ladron) {
      shuffle(deck);
      deck.splice(deck.indexOf('ladron'), 1);
      reserve = deck.splice(0, 2);
      deck.push('ladron');
    }
    const finalDeck = shuffle(deck);
    const names = rows.map((r) => r.trim()).filter((n) => n !== '');

    setGame(freshGameState(names, finalDeck, reserve));
    setViewed(names.map(() => false));
    setScreen('reveal');
  }

  function roleOf(idx: number): Role {
    return roles!.find((r) => r.id === game!.roleIds[idx])!;
  }
  function roleActorIndex(roleId: string): number {
    return game!.roleIds.indexOf(roleId);
  }
  function roleHasAlivePlayer(roleId: string): boolean {
    return game!.roleIds.some((rid, idx) => rid === roleId && game!.alive[idx]);
  }

  function logEvent(text: string, key: string | null = null) {
    updateGame((g) => {
      if (key) g.eventLog = g.eventLog.filter((e) => e.key !== key);
      g.eventLog = [...g.eventLog, { key, text }];
    });
  }
  function clearEventByKey(key: string) {
    updateGame((g) => { g.eventLog = g.eventLog.filter((e) => e.key !== key); });
  }
  function addReminder(text: string) {
    updateGame((g) => { g.reminders = [...g.reminders, { id: reminderSeq.current++, text }]; });
  }

  // ---------- roster reveal ----------
  function openRevealModal(idx: number) {
    setRevealIdx(idx);
    setRevealed(false);
  }
  function closeRevealModal() {
    if (revealIdx !== null) setViewed((v) => v.map((val, i) => (i === revealIdx ? true : val)));
    setRevealIdx(null);
  }
  const allViewed = viewed.length > 0 && viewed.every(Boolean);

  function enterNarrator() {
    if (!game) return;
    setNarratorTab('night');
    setVoteView('announce');
    setNightNavError('');
    setCupidoSelection([]);
    setZorroSelection([]);
    setZorroConfirmed(false);
    setVidentePickIdx(null);
    setBrujaActiveTab('life');
    suppressGameOverCheck.current = false;
    setGameOverVisible(false);
    setScreen('narrator');
  }

  function enterRoster() {
    if (!game) return;
    updateGame((g) => { g.alive = g.playerNames.map(() => true); });
    setScreen('roster');
  }

  function confirmStart() {
    setStartConfirmOpen(false);
    if (unguidedMode) enterRoster();
    else enterNarrator();
  }

  function enterSetup() {
    setSetupStep(0);
    setVoteTimerRemaining(null);
    setScreen('setup');
  }

  // ---------- night step helpers ----------
  function nightOrderEntryActive(o: { id: string; freq: string }, g: GameState): boolean {
    if (!(counts[o.id] || 0)) return false;
    if (o.freq === 'primera' && g.round > 1) return false;
    if (o.id === 'zorro' && g.zorroPowerLost) return false;
    if (o.freq === 'alterna' && g.round % 2 !== 0) return false;
    if (o.freq === 'especial' && (g.gitanaUsed || !g.alive.some((a) => !a))) return false;
    if (!WOLF_PACK_IDS.includes(o.id) && !roleHasAlivePlayer(o.id)) return false;
    const role = roles?.find((r) => r.id === o.id);
    if (g.villagePowersLost && role && role.equipo === 'aldeanos') return false;
    return true;
  }

  function buildNightSteps(g: GameState): NightStep[] {
    if (!roles) return [];
    let packAdded = false;
    const steps: NightStep[] = [];
    NIGHT_ORDER.forEach((o) => {
      if (!nightOrderEntryActive(o, g)) return;
      if (WOLF_PACK_IDS.includes(o.id)) {
        if (packAdded) return;
        packAdded = true;
        const activePackRoles = WOLF_PACK_IDS
          .map((id) => roles.find((r) => r.id === id))
          .filter((r): r is Role => !!r && (counts[r.id] || 0) > 0 && roleHasAlivePlayer(r.id));
        if (!activePackRoles.length) return;
        const baseRole = activePackRoles[0];
        const extraNotes = activePackRoles.slice(1).map((r) => `${r.nombre}: ${r.descripcion}`);
        steps.push({
          role: {
            id: 'lobo_pack',
            nombre: activePackRoles.length > 1 ? 'Los Lobos' : baseRole.nombre,
            equipo: 'lobos',
            imagen: baseRole.imagen,
            descripcion: baseRole.descripcion + (extraNotes.length ? ` ${extraNotes.join(' ')}` : ''),
          },
          freq: 'cada',
        });
        return;
      }
      const stepRole = roles.find((r) => r.id === o.id);
      if (stepRole) steps.push({ role: stepRole, freq: o.freq });
    });
    return insertComedianteActionStep(steps, g);
  }

  function comedianteCandidateRoles(g: GameState): { id: string; nombre: string; imagen: string }[] {
    if (!roles) return [];
    const comedianteIdx = NIGHT_ORDER.findIndex((o) => o.id === 'comediante');
    let seenPack = false;
    const out: { id: string; nombre: string; imagen: string }[] = [];
    NIGHT_ORDER.forEach((o, idx) => {
      if (comedianteIdx !== -1 && idx <= comedianteIdx) return;
      if (!nightOrderEntryActive(o, g)) return;
      if (WOLF_PACK_IDS.includes(o.id)) {
        if (seenPack) return;
        seenPack = true;
        const wolfRole = roles.find((r) => r.id === o.id);
        if (wolfRole) out.push({ id: 'lobo_pack', nombre: 'Los Lobos', imagen: wolfRole.imagen });
        return;
      }
      const role = roles.find((r) => r.id === o.id);
      if (role) out.push({ id: role.id, nombre: role.nombre, imagen: role.imagen });
    });
    return out;
  }

  function insertComedianteActionStep(stepsIn: NightStep[], g: GameState): NightStep[] {
    const steps = stepsIn.filter((s) => !s.isComedianteBorrow);
    if (!g.comedianteChoiceId) return steps;
    const targetIdx = steps.findIndex((s) => s.role.id === g.comedianteChoiceId);
    if (targetIdx === -1) return steps;
    const targetRole = steps[targetIdx].role;
    const comedianteRole = roles?.find((r) => r.id === 'comediante');
    const next = steps.slice();
    next.splice(targetIdx + 1, 0, {
      role: {
        id: 'comediante_borrow',
        nombre: `El Comediante (usa el poder de ${targetRole.nombre})`,
        equipo: 'solitario',
        imagen: comedianteRole?.imagen ?? '',
        descripcion: `El Comediante actúa ahora, solo esta noche, con el poder de ${targetRole.nombre}.`,
      },
      freq: 'cada',
      isComedianteBorrow: true,
    });
    return next;
  }

  const nightSteps = game ? buildNightSteps(game) : [];
  const currentNightStep: NightStep | undefined = nightSteps[game?.nightIdx ?? 0];

  function isNightActionComplete(step: NightStep): boolean {
    if (!game) return true;
    const roleId = step.role.id;
    if (OPTIONAL_NIGHT_ROLES.includes(roleId)) return true;
    switch (roleId) {
      case 'lobo_pack': return game.pendingNightKillIdx !== null;
      case 'protector': return game.protectedIdx !== null;
      case 'cupido': return game.lovers !== null;
      case 'nino_salvaje': return game.wildChildModelIdx !== null || game.wildChildTransformed;
      case 'perro_lobo': return game.perroLoboChoice !== null;
      case 'cuervo': return game.ravenMark !== null;
      case 'vidente': return game.nightActionDone.vidente === true;
      case 'comediante': return game.comedianteChoiceMade === true;
      default: return true;
    }
  }

  function undoStepAction(step: NightStep | undefined) {
    if (!step || !game) return;
    switch (step.role.id) {
      case 'lobo_pack': updateGame((g) => { g.pendingNightKillIdx = null; }); break;
      case 'lobo_albino': updateGame((g) => { g.pendingAlbinoKillIdx = null; }); break;
      case 'protector': updateGame((g) => { g.protectedIdx = null; }); break;
      case 'cuervo': updateGame((g) => { g.ravenMark = null; }); break;
      case 'cupido':
        updateGame((g) => { g.lovers = null; });
        setCupidoSelection([]);
        clearEventByKey('cupido');
        break;
      case 'nino_salvaje':
        updateGame((g) => { if (!g.wildChildTransformed) g.wildChildModelIdx = null; });
        break;
      case 'perro_lobo':
        updateGame((g) => {
          if (g.perroLoboChoice !== null && g.perroLoboPlayerIdx !== null) {
            g.roleIds[g.perroLoboPlayerIdx] = 'perro_lobo';
            g.perroLoboChoice = null;
          }
        });
        break;
      case 'ladron':
        updateGame((g) => {
          if (g.ladronPlayerIdx !== null) {
            const idx = g.ladronPlayerIdx;
            const heldRoleId = g.roleIds[idx];
            if (heldRoleId !== 'ladron') {
              const freeSlot = g.ladronReserve.indexOf('ladron');
              if (freeSlot !== -1) g.ladronReserve[freeSlot] = heldRoleId;
              g.roleIds[idx] = 'ladron';
            }
            g.ladronPlayerIdx = null;
          }
        });
        break;
      case 'vidente':
        updateGame((g) => { g.nightActionDone = { ...g.nightActionDone, vidente: false }; });
        setVidentePickIdx(null);
        break;
      case 'comediante':
        updateGame((g) => { g.comedianteChoiceId = null; g.comedianteChoiceMade = false; });
        break;
      case 'gitana':
        updateGame((g) => { g.gitanaUsed = false; });
        break;
      case 'bruja':
        updateGame((g) => {
          if (g.brujaLifeUsedThisRound) {
            g.brujaLifeUsed = false;
            if (g.brujaLifeSavedSource === 'albino') g.pendingAlbinoKillIdx = g.brujaLifeSavedIdx;
            else g.pendingNightKillIdx = g.brujaLifeSavedIdx;
            g.brujaLifeSavedIdx = null;
            g.brujaLifeSavedSource = null;
            g.brujaLifeUsedThisRound = false;
          }
          if (g.brujaDeathUsedThisRound) {
            g.brujaDeathUsed = false;
            if (g.brujaDeathPoisonedIdx !== null) {
              g.alive[g.brujaDeathPoisonedIdx] = true;
              delete g.deathCause[g.brujaDeathPoisonedIdx];
              g.deathsThisRound = g.deathsThisRound.filter((i) => i !== g.brujaDeathPoisonedIdx);
            }
            g.brujaDeathPoisonedIdx = null;
            g.brujaDeathUsedThisRound = false;
          }
          g.brujaActedThisRound = false;
        });
        clearEventByKey(`bruja-life-r${game.round}`);
        clearEventByKey(`bruja-death-r${game.round}`);
        break;
    }
  }

  function handleNightPrev() {
    if (!game || game.nightIdx <= 0) return;
    const prevIdx = game.nightIdx - 1;
    undoStepAction(nightSteps[game.nightIdx]);
    updateGame((g) => { g.nightIdx = prevIdx; });
    setNightNavError('');
  }
  function handleNightNext() {
    if (!game) return;
    if (currentNightStep && !isNightActionComplete(currentNightStep)) {
      setNightNavError(`Completa la acción de ${currentNightStep.role.nombre} antes de continuar.`);
      return;
    }
    setNightNavError('');
    if (game.nightIdx < nightSteps.length - 1) {
      updateGame((g) => { g.nightIdx += 1; });
    } else {
      beginEndOfRound();
    }
  }

  // ---------- end of round: dawn kill resolution + vote ----------
  function beginEndOfRound() {
    if (!game) return;
    const queue: number[] = [];
    if (game.pendingNightKillIdx !== null) queue.push(game.pendingNightKillIdx);
    if (game.pendingAlbinoKillIdx !== null) queue.push(game.pendingAlbinoKillIdx);
    updateGame((g) => { g.pendingNightKillIdx = null; g.pendingAlbinoKillIdx = null; });
    resolvePendingKillQueue(queue);
  }
  function resolvePendingKillQueue(queue: number[]) {
    if (queue.length === 0) { beginVotePhase(); return; }
    const [idx, ...rest] = queue;
    suppressGameOverCheck.current = true;
    afterDeathModalResolve.current = () => resolvePendingKillQueue(rest);
    openDeathModal(idx, 'lobos');
  }

  function getGameStatus(g: GameState): { over: boolean; winner: 'lobos' | 'aldeanos' | null; lobosAlive: number; aldeanosAlive: number } {
    let lobosAlive = 0, aldeanosAlive = 0;
    g.alive.forEach((isAlive, idx) => {
      if (!isAlive || !roles) return;
      const role = roles.find((r) => r.id === g.roleIds[idx]);
      if (role?.equipo === 'lobos') lobosAlive++;
      else if (role?.equipo === 'aldeanos') aldeanosAlive++;
    });
    let winner: 'lobos' | 'aldeanos' | null = null;
    if (lobosAlive === 0) winner = 'aldeanos';
    else if (lobosAlive >= aldeanosAlive) winner = 'lobos';
    return { over: winner !== null, winner, lobosAlive, aldeanosAlive };
  }

  function checkGameOver() {
    if (!game || suppressGameOverCheck.current) return;
    const status = getGameStatus(game);
    setGameOverVisible(status.over);
  }

  function beginVotePhase() {
    suppressGameOverCheck.current = false;
    audio.unlock();
    setNarratorTab('vote');
    setVoteView('announce');
    checkGameOver();
  }

  function renderDeathAnnouncementText(): { cue: string; anyDeaths: boolean } {
    if (!game) return { cue: '', anyDeaths: false };
    const anyDeaths = game.deathsThisRound.length > 0;
    const cue = !anyDeaths ? '🌅 Esta noche no ha muerto nadie' : game.deathsThisRound.length === 1 ? '🌅 Esta noche ha muerto...' : '🌅 Esta noche han muerto...';
    return { cue, anyDeaths };
  }

  function pickCazadorShootTarget(idx: number) {
    if (!game || game.pendingCazadorShootIdx === null) return;
    const cazadorIdx = game.pendingCazadorShootIdx;
    updateGame((g) => {
      g.pendingCazadorShootIdx = null;
      g.alive[idx] = false;
      g.deathCause[idx] = 'disparo';
      g.deathsThisRound = [...g.deathsThisRound, idx];
    });
    logEvent(`🔫 El Cazador (${game.playerNames[cazadorIdx]}) disparó a ${game.playerNames[idx]} (${roleOf(idx).nombre}) al morir.`);
  }

  function handleAnnounceContinue() {
    if (!game) return;
    if (getGameStatus(game).over) { checkGameOver(); return; }
    setSelectedVoteIdx(null);
    setVoteView('select');
    setVoteTimeUp(false);
    setVoteTimerRemaining(voteSeconds > 0 ? voteSeconds : null);
  }

  function canJudgeRevote(): boolean {
    if (!game) return false;
    if (game.judgeUsed) return false;
    const idx = game.roleIds.indexOf('juez_tartamudo');
    return idx !== -1 && game.alive[idx];
  }

  function handleConfirmVote() {
    if (selectedVoteIdx === null || !game) return;
    setVoteTimerRemaining(null);
    const idx = selectedVoteIdx;
    setSelectedVoteIdx(null);
    suppressGameOverCheck.current = true;
    showLynchReveal(idx, () => {
      afterDeathModalResolve.current = finishVoteResolution;
      openDeathModal(idx, 'votacion');
    });
  }

  function finishVoteResolution() {
    if (canJudgeRevote()) {
      setVoteView('judge');
      return;
    }
    suppressGameOverCheck.current = false;
    checkGameOver();
    if (!getGameStatus(game!).over) setVoteView('continue');
  }

  function handleJudgeSkip() {
    suppressGameOverCheck.current = false;
    checkGameOver();
    if (!getGameStatus(game!).over) setVoteView('continue');
  }
  function handleJudgeUse() {
    if (!game) return;
    const idx = game.roleIds.indexOf('juez_tartamudo');
    updateGame((g) => { g.judgeUsed = true; });
    logEvent(`⚖️ El Juez Tartamudo (${game.playerNames[idx]}) usó su poder: se repite la votación.`);
    setVoteView('select');
    setSelectedVoteIdx(null);
    setVoteTimeUp(false);
    setVoteTimerRemaining(voteSeconds > 0 ? voteSeconds : null);
  }

  function handleRoundContinue() {
    if (!game) return;
    setVoteTimerRemaining(null);
    updateGame((g) => {
      g.round += 1;
      g.lastProtectedIdx = g.protectedIdx;
      g.protectedIdx = null;
      g.ravenMark = null;
      g.nightActionDone = {};
      g.brujaActedThisRound = false;
      g.brujaLifeUsedThisRound = false;
      g.brujaDeathUsedThisRound = false;
      g.brujaLifeSavedIdx = null;
      g.brujaLifeSavedSource = null;
      g.brujaDeathPoisonedIdx = null;
      g.deathsThisRound = [];
      g.comedianteChoiceId = null;
      g.comedianteChoiceMade = false;
      g.nightIdx = 0;
    });
    setCupidoSelection([]);
    setZorroSelection([]);
    setZorroConfirmed(false);
    setVidentePickIdx(null);
    setNarratorTab('night');
  }

  // ---------- lynch reveal (shows a player's card, generic "continue" callback) ----------
  function showLynchReveal(idx: number, onContinue: () => void) {
    setLynchReveal({ idx, onContinue });
  }
  function handleLynchRevealContinue() {
    const cb = lynchReveal?.onContinue;
    setLynchReveal(null);
    cb?.();
  }

  // ---------- death modal (cause + guidance + chain reactions) ----------
  function getDeathGuidance(role: Role, cause: Cause): { survives: boolean; messages: string[]; chainPrompt: 'shoot' | null } {
    const msgs: string[] = [];
    let survives = false;
    let chainPrompt: 'shoot' | null = null;
    if (!game) return { survives, messages: msgs, chainPrompt };
    switch (role.id) {
      case 'cazador':
        if (cause === 'lobos') msgs.push('Al amanecer, en la pantalla de anuncio de muertes, elegirá a quién dispara.');
        else { msgs.push('Debe disparar de inmediato: elige a otro jugador para eliminarlo también.'); chainPrompt = 'shoot'; }
        break;
      case 'anciano':
        if (cause === 'lobos') { if (!game.ancianoSurvived) { survives = true; msgs.push('Resiste el primer ataque de los lobos: no muere esta vez.'); } }
        else if (cause === 'votacion') msgs.push('Si el pueblo lo lincha, todos los jugadores con poder especial pierden su poder inmediatamente.');
        break;
      case 'tonto_de_la_aldea':
        if (cause === 'votacion') { survives = true; msgs.push('Se revela su carta y sobrevive, pero pierde el derecho a voto el resto de la partida.'); }
        break;
      case 'angel':
        if (game.round <= 2) msgs.push('¡Gana la partida en solitario al morir durante las 2 primeras rondas!');
        break;
      case 'caballero_espada_oxidada':
        if (cause === 'lobos') msgs.push('Infecta de óxido al primer lobo a su izquierda: ese jugador morirá en la próxima luna llena.');
        break;
    }
    return { survives, messages: msgs, chainPrompt };
  }

  function computeDeathGuidance(idx: number, role: Role, cause: Cause): DeathGuidance {
    const result = getDeathGuidance(role, cause);
    const msgs = result.messages.slice();
    let loverPartner: number | undefined;
    if (!game) return { survives: result.survives, msgs, chainPrompt: result.chainPrompt };

    if (game.lovers && game.lovers.includes(idx)) {
      const partnerIdx = game.lovers[0] === idx ? game.lovers[1] : game.lovers[0];
      if (game.alive[partnerIdx]) loverPartner = partnerIdx;
    }
    const sirvientaAlive = game.playerNames.some((_, i) => game.alive[i] && i !== idx && game.roleIds[i] === 'abnegada_sirvienta');
    if (sirvientaAlive) msgs.push('👤 La Abnegada Sirvienta sigue viva: puede revelarse ahora y ocupar el lugar de la víctima.');
    let survives = result.survives;
    if (cause === 'lobos' && idx === game.protectedIdx) { survives = true; msgs.push('🛡️ Bloqueado: está protegido esta noche por El Protector, los lobos no pueden matarlo. Elige otra causa de muerte si murió de otra forma.'); }
    if (idx === game.wildChildModelIdx) msgs.push('🐺 Era el modelo del Niño Salvaje: a partir de ahora se convierte en Hombre Lobo.');
    return { survives, msgs, chainPrompt: result.chainPrompt, loverPartner };
  }

  function finalizeDeath(idx: number, role: Role, cause: Cause, guidance: DeathGuidance, chainShootIdx: number | null) {
    const announce = cause === 'lobos';
    updateGame((g) => {
      if (!guidance.survives) {
        g.alive[idx] = false;
        g.deathCause[idx] = cause;
        if (announce) g.deathsThisRound = [...g.deathsThisRound, idx];
      } else if (role.id === 'anciano' && cause === 'lobos') {
        g.ancianoSurvived = true;
      }
      if (guidance.chainPrompt === 'shoot' && chainShootIdx !== null) {
        g.alive[chainShootIdx] = false;
        g.deathCause[chainShootIdx] = 'disparo';
        if (announce) g.deathsThisRound = [...g.deathsThisRound, chainShootIdx];
      }
      if (role.id === 'cazador' && cause === 'lobos' && !guidance.survives) g.pendingCazadorShootIdx = idx;
      if (!guidance.survives && guidance.loverPartner !== undefined && g.alive[guidance.loverPartner]) {
        g.alive[guidance.loverPartner] = false;
        g.deathCause[guidance.loverPartner] = 'amor';
        if (announce) g.deathsThisRound = [...g.deathsThisRound, guidance.loverPartner];
      }
      if (role.id === 'anciano' && cause === 'votacion' && !g.villagePowersLost) g.villagePowersLost = true;
      if (idx === g.wildChildModelIdx && !guidance.survives) {
        const wildChildIdx = g.roleIds.indexOf('nino_salvaje');
        if (wildChildIdx !== -1 && g.alive[wildChildIdx]) { g.roleIds[wildChildIdx] = 'lobo_comun'; g.wildChildTransformed = true; }
      }
    });
    if (role.id === 'cazador' && cause === 'lobos' && !guidance.survives) { /* handled above */ }
    if (chainShootIdx !== null) {
      logEvent(`🔫 El Cazador (${game!.playerNames[idx]}) disparó a ${game!.playerNames[chainShootIdx]} (${roleOf(chainShootIdx).nombre}) al morir.`);
    }
    if (!guidance.survives) {
      if (cause === 'lobos') logEvent(`🐺 Los lobos mataron a ${game!.playerNames[idx]} (${role.nombre}).`);
      else if (cause === 'votacion') logEvent(`🗳️ El pueblo votó a ${game!.playerNames[idx]} (${role.nombre}).`);
      else logEvent(`☠️ ${game!.playerNames[idx]} (${role.nombre}) murió (otra causa).`);
    }
    if (guidance.loverPartner !== undefined && !guidance.survives && game!.alive[guidance.loverPartner]) {
      logEvent(`💔 ${game!.playerNames[guidance.loverPartner]} (${roleOf(guidance.loverPartner).nombre}) murió de pena por amor.`);
    }
    if (role.id === 'caballero_espada_oxidada' && cause === 'lobos' && !guidance.survives) {
      addReminder('El lobo infectado de óxido por el Caballero de la Espada Oxidada morirá en la próxima luna llena.');
    }
    if (role.id === 'anciano' && cause === 'lobos' && !guidance.survives && game!.ancianoSurvived) {
      addReminder('El Anciano ha muerto: ya había resistido un ataque antes, pero anúncialo como una muerte normal, sin dar ese detalle en voz alta.');
    }
    if (role.id === 'anciano' && cause === 'votacion' && !game!.villagePowersLost) {
      addReminder('El pueblo linchó al Anciano: todos los poderes especiales del PUEBLO dejan de funcionar (los lobos no se ven afectados).');
    }
    if (idx === game!.wildChildModelIdx && !guidance.survives) {
      const wildChildIdx = game!.roleIds.indexOf('nino_salvaje');
      if (wildChildIdx !== -1 && game!.alive[wildChildIdx]) addReminder(`El Niño Salvaje (${game!.playerNames[wildChildIdx]}) se ha convertido en Hombre Lobo: murió su modelo a seguir.`);
    }
  }

  function openDeathModal(idx: number, presetCause: Cause | null) {
    const role = roleOf(idx);
    if (presetCause) {
      const g = computeDeathGuidance(idx, role, presetCause);
      if (g.msgs.length === 0 && g.chainPrompt === null) {
        finalizeDeath(idx, role, presetCause, g, null);
        checkGameOver();
        const cb = afterDeathModalResolve.current;
        afterDeathModalResolve.current = null;
        cb?.();
        return;
      }
    }
    setDeathCtx({ idx, role, cause: presetCause, guidance: presetCause ? computeDeathGuidance(idx, role, presetCause) : null });
    setDeathChainShootIdx(null);
    setDeathCauseAssumed(presetCause);
    setDeathModalOpen(true);
  }

  function pickDeathCause(cause: Cause) {
    if (!deathCtx) return;
    const g = computeDeathGuidance(deathCtx.idx, deathCtx.role, cause);
    setDeathCtx({ ...deathCtx, cause, guidance: g });
    setDeathChainShootIdx(null);
  }

  function closeDeathModal() {
    if (deathCtx?.cause) { resolveDeathModal(); return; }
    setDeathModalOpen(false);
    setDeathCtx(null);
    const cb = afterDeathModalResolve.current;
    afterDeathModalResolve.current = null;
    cb?.();
  }

  function resolveDeathModal() {
    if (!deathCtx || !deathCtx.cause || !deathCtx.guidance) return;
    const chainShootIdx = deathCtx.guidance.chainPrompt === 'shoot' ? deathChainShootIdx : null;
    finalizeDeath(deathCtx.idx, deathCtx.role, deathCtx.cause, deathCtx.guidance, chainShootIdx);
    setDeathModalOpen(false);
    setDeathCtx(null);
    checkGameOver();
    const cb = afterDeathModalResolve.current;
    afterDeathModalResolve.current = null;
    if (chainShootIdx !== null) showLynchReveal(chainShootIdx, cb ?? (() => undefined));
    else cb?.();
  }

  // ---------- unguided roster ----------
  function toggleRosterAlive(idx: number) {
    updateGame((g) => { g.alive[idx] = !g.alive[idx]; });
  }

  // ---------- widgets ----------
  function pendingKillSurvives(idx: number): boolean {
    if (!game) return false;
    if (idx === game.protectedIdx) return true;
    if (game.roleIds[idx] === 'anciano' && !game.ancianoSurvived) return true;
    return false;
  }
  function getPendingNightKills(): { idx: number; source: 'lobos' | 'albino' }[] {
    if (!game) return [];
    const list: { idx: number; source: 'lobos' | 'albino' }[] = [];
    if (game.pendingNightKillIdx !== null) list.push({ idx: game.pendingNightKillIdx, source: 'lobos' });
    if (game.pendingAlbinoKillIdx !== null) list.push({ idx: game.pendingAlbinoKillIdx, source: 'albino' });
    return list;
  }

  function actionCupidoToggle(idx: number) {
    const pos = cupidoSelection.indexOf(idx);
    let next = cupidoSelection.slice();
    if (pos !== -1) next.splice(pos, 1);
    else if (next.length < 2) next.push(idx);
    setCupidoSelection(next);
    if (next.length === 2) {
      const [a, b] = next;
      updateGame((g) => { g.lovers = [a, b]; });
      logEvent(`💘 Cupido (${game!.playerNames[roleActorIndex('cupido')]}) enamoró a ${game!.playerNames[a]} (${roleOf(a).nombre}) y ${game!.playerNames[b]} (${roleOf(b).nombre}).`, 'cupido');
    } else {
      updateGame((g) => { g.lovers = null; });
      clearEventByKey('cupido');
    }
  }

  function actionSeerPick(idx: number) {
    if (videntePickIdx === idx) {
      setVidentePickIdx(null);
      updateGame((g) => { g.nightActionDone = { ...g.nightActionDone, vidente: false }; });
      return;
    }
    setVidentePickIdx(idx);
    updateGame((g) => { g.nightActionDone = { ...g.nightActionDone, vidente: true }; });
    showLynchReveal(idx, () => undefined);
  }

  function actionFoxToggle(idx: number) {
    const pos = zorroSelection.indexOf(idx);
    const next = zorroSelection.slice();
    if (pos !== -1) next.splice(pos, 1);
    else if (next.length < 3) next.push(idx);
    setZorroSelection(next);
    setZorroConfirmed(false);
  }
  function actionFoxConfirm() {
    if (zorroSelection.length !== 3 || !game) return;
    setZorroConfirmed(true);
    const hasWolf = zorroSelection.some((i) => roleOf(i).equipo === 'lobos');
    updateGame((g) => { g.zorroPowerLost = !hasWolf; });
    if (!hasWolf) logEvent(`🦊 El Zorro (${game.playerNames[roleActorIndex('zorro')]}) falló su comprobación y perdió su poder.`, 'zorro-power-lost');
    else clearEventByKey('zorro-power-lost');
  }

  function actionGuardPick(idx: number) {
    updateGame((g) => { g.protectedIdx = g.protectedIdx === idx ? null : idx; });
  }

  function actionBrujaLifeToggle(idx: number) {
    if (!game) return;
    if (game.brujaLifeUsedThisRound && game.brujaLifeSavedIdx === idx) {
      updateGame((g) => {
        g.brujaLifeUsed = false; g.brujaActedThisRound = false; g.brujaLifeUsedThisRound = false;
        if (g.brujaLifeSavedSource === 'albino') g.pendingAlbinoKillIdx = idx; else g.pendingNightKillIdx = idx;
        g.brujaLifeSavedIdx = null; g.brujaLifeSavedSource = null;
      });
      clearEventByKey(`bruja-life-r${game.round}`);
      return;
    }
    if (game.brujaLifeUsed || game.brujaActedThisRound) return;
    let source: 'lobos' | 'albino' | null = null;
    if (game.pendingNightKillIdx === idx) source = 'lobos';
    else if (game.pendingAlbinoKillIdx === idx) source = 'albino';
    if (!source) return;
    updateGame((g) => {
      g.brujaLifeUsed = true; g.brujaActedThisRound = true; g.brujaLifeUsedThisRound = true;
      g.brujaLifeSavedIdx = idx; g.brujaLifeSavedSource = source;
      if (source === 'lobos') g.pendingNightKillIdx = null; else g.pendingAlbinoKillIdx = null;
    });
    logEvent(`🧪 La Bruja (${game.playerNames[roleActorIndex('bruja')]}) salvó a ${game.playerNames[idx]} (${roleOf(idx).nombre}) de los lobos.`, `bruja-life-r${game.round}`);
  }
  function actionBrujaDeathToggle(idx: number) {
    if (!game) return;
    if (game.brujaDeathUsedThisRound && game.brujaDeathPoisonedIdx === idx) {
      updateGame((g) => {
        g.brujaDeathUsed = false; g.brujaActedThisRound = false; g.brujaDeathUsedThisRound = false;
        g.alive[idx] = true; delete g.deathCause[idx];
        g.deathsThisRound = g.deathsThisRound.filter((i) => i !== idx);
        g.brujaDeathPoisonedIdx = null;
      });
      clearEventByKey(`bruja-death-r${game.round}`);
      return;
    }
    if (game.brujaDeathUsed || game.brujaActedThisRound) return;
    if (game.pendingNightKillIdx === idx || game.pendingAlbinoKillIdx === idx) return;
    updateGame((g) => {
      g.alive[idx] = false; g.deathCause[idx] = 'veneno';
      g.brujaDeathUsed = true; g.brujaActedThisRound = true; g.brujaDeathUsedThisRound = true;
      g.brujaDeathPoisonedIdx = idx;
      g.deathsThisRound = [...g.deathsThisRound, idx];
    });
    logEvent(`🧪 La Bruja (${game.playerNames[roleActorIndex('bruja')]}) envenenó a ${game.playerNames[idx]} (${roleOf(idx).nombre}).`, `bruja-death-r${game.round}`);
  }

  function actionWildChildPick(idx: number) {
    updateGame((g) => { g.wildChildModelIdx = g.wildChildModelIdx === idx ? null : idx; });
  }
  function actionRavenPick(idx: number) {
    updateGame((g) => { g.ravenMark = g.ravenMark === idx ? null : idx; });
  }
  function actionPyroToggle(idx: number) {
    updateGame((g) => {
      const pos = g.pyroSoaked.indexOf(idx);
      g.pyroSoaked = pos === -1 ? [...g.pyroSoaked, idx] : g.pyroSoaked.filter((i) => i !== idx);
    });
  }
  function actionPyroIgnite() {
    if (!game?.pyroSoaked.length) return;
    updateGame((g) => {
      g.pyroSoaked.forEach((idx) => { g.alive[idx] = false; g.deathCause[idx] = 'fuego'; g.deathsThisRound = [...g.deathsThisRound, idx]; });
      g.pyroSoaked = [];
    });
  }
  function actionWolfKillPick(idx: number) {
    updateGame((g) => { g.pendingNightKillIdx = g.pendingNightKillIdx === idx ? null : idx; });
  }
  function actionAlbinoKillPick(idx: number) {
    updateGame((g) => { g.pendingAlbinoKillIdx = g.pendingAlbinoKillIdx === idx ? null : idx; });
  }
  function actionPerroLoboChoose(choice: 'aldeano' | 'lobo') {
    if (!game) return;
    const idx = game.perroLoboPlayerIdx !== null ? game.perroLoboPlayerIdx : game.roleIds.indexOf('perro_lobo');
    if (idx === -1) return;
    if (game.perroLoboChoice === choice) {
      updateGame((g) => { g.roleIds[idx] = 'perro_lobo'; g.perroLoboChoice = null; g.perroLoboPlayerIdx = null; });
    } else {
      updateGame((g) => { g.roleIds[idx] = choice === 'lobo' ? 'lobo_comun' : 'aldeano_comun'; g.perroLoboChoice = choice; g.perroLoboPlayerIdx = idx; });
    }
  }
  function actionLadronSwap(i: number) {
    if (!game) return;
    const idx = game.ladronPlayerIdx !== null ? game.ladronPlayerIdx : game.roleIds.indexOf('ladron');
    if (idx === -1 || !game.ladronReserve[i]) return;
    updateGame((g) => {
      const heldRoleId = g.roleIds[idx];
      g.ladronPlayerIdx = idx;
      g.roleIds[idx] = g.ladronReserve[i];
      g.ladronReserve[i] = heldRoleId;
    });
  }
  function actionGitanaUse() {
    updateGame((g) => { g.gitanaUsed = !g.gitanaUsed; });
  }
  function actionComedianteChoose(roleId: string) {
    updateGame((g) => { g.comedianteChoiceId = roleId || null; g.comedianteChoiceMade = true; });
  }

  // ---------- render helpers ----------
  function playerButtons(actionFn: (idx: number) => void, selected: number | null | undefined, filter?: (idx: number) => boolean) {
    if (!game) return null;
    return game.playerNames.map((n, idx) => {
      if (filter && !filter(idx)) return null;
      return <button type="button" key={idx} className={`chip${idx === selected ? ' selected' : ''}`} onClick={() => actionFn(idx)}>{n}</button>;
    });
  }

  function renderRoleWidget(step: NightStep | undefined) {
    if (!step || !game) return null;
    switch (step.role.id) {
      case 'comediante': {
        const candidates = comedianteCandidateRoles(game);
        const noneSelected = game.comedianteChoiceMade && !game.comedianteChoiceId;
        return (
          <>
            <label>¿Qué poder toma prestado esta noche?</label>
            <div className="role-picker-grid">
              {candidates.map((r) => (
                <div key={r.id} className={`role-picker-card${game.comedianteChoiceId === r.id ? ' selected' : ''}`} onClick={() => actionComedianteChoose(r.id)}>
                  <img src={`/${r.imagen}`} alt="" loading="lazy" />
                  <div className="role-picker-name">{r.nombre}</div>
                </div>
              ))}
              <div className={`role-picker-card${noneSelected ? ' selected' : ''}`} onClick={() => actionComedianteChoose('')}>
                <div className="role-picker-name">Ninguno (pasa esta noche)</div>
              </div>
            </div>
          </>
        );
      }
      case 'gitana':
        return (
          <>
            <label>Poder de una sola vez por partida.</label>
            <button type="button" className={`chip${game.gitanaUsed ? ' selected' : ''}`} onClick={actionGitanaUse}>{game.gitanaUsed ? '✓ Ya usó su poder esta partida' : 'Marcar como usada esta noche'}</button>
          </>
        );
      case 'cupido':
        return (
          <>
            <label>Elige a los dos enamorados ({cupidoSelection.length}/2)</label>
            <div className="role-widget-checklist">
              {game.playerNames.map((n, idx) => (
                <button type="button" key={idx} className={`chip${cupidoSelection.includes(idx) ? ' selected' : ''}`} onClick={() => actionCupidoToggle(idx)}>{n}</button>
              ))}
            </div>
          </>
        );
      case 'vidente': {
        const selfIdx = roleActorIndex('vidente');
        return (
          <>
            <label>¿A quién mira la Vidente?</label>
            <div className="role-widget-checklist">{playerButtons(actionSeerPick, videntePickIdx, (idx) => idx !== selfIdx && game.alive[idx])}</div>
          </>
        );
      }
      case 'zorro': {
        const selfIdx = roleActorIndex('zorro');
        const hasWolf = zorroSelection.some((i) => roleOf(i).equipo === 'lobos');
        return (
          <>
            <label>Elige tres jugadores a comprobar ({zorroSelection.length}/3)</label>
            <div className="role-widget-checklist">
              {game.playerNames.map((n, idx) => idx !== selfIdx && (
                <button type="button" key={idx} className={`chip${zorroSelection.includes(idx) ? ' selected' : ''}`} onClick={() => actionFoxToggle(idx)}>{n}</button>
              ))}
            </div>
            {zorroSelection.length === 3 && (zorroConfirmed
              ? <div className="role-widget-reveal danger">{hasWolf ? '🐺 Sí, hay un Hombre Lobo.' : '❌ No. Pierde su poder.'}</div>
              : <button type="button" className="btn-main" style={{ marginTop: 8 }} onClick={actionFoxConfirm}>Comprobar</button>)}
          </>
        );
      }
      case 'protector': {
        const selfIdx = roleActorIndex('protector');
        return (
          <>
            <label>¿A quién protege esta noche?</label>
            <div className="role-widget-checklist">{playerButtons(actionGuardPick, game.protectedIdx, (idx) => idx !== selfIdx && idx !== game.lastProtectedIdx)}</div>
          </>
        );
      }
      case 'bruja': {
        const lifeAvailable = !game.brujaLifeUsed;
        const deathAvailable = !game.brujaDeathUsed;
        if (!lifeAvailable && !deathAvailable) return <div className="role-widget-status">Ha usado sus dos pociones: ya no le quedan acciones.</div>;
        const lifeLocked = game.brujaActedThisRound && !game.brujaLifeUsedThisRound;
        const deathLocked = game.brujaActedThisRound && !game.brujaDeathUsedThisRound;
        let tab = brujaActiveTab;
        if (tab === 'life' && (!lifeAvailable || lifeLocked)) tab = 'death';
        if (tab === 'death' && (!deathAvailable || deathLocked)) tab = 'life';
        const tabs = (
          <div className="submode-toggle">
            <button type="button" className={`submode-btn submode-btn-stacked${tab === 'life' ? ' active' : ''}`} disabled={!lifeAvailable || lifeLocked} onClick={() => setBrujaActiveTab('life')}><span className="submode-btn-icon">💚</span>Poción de vida</button>
            <button type="button" className={`submode-btn submode-btn-stacked${tab === 'death' ? ' active' : ''}`} disabled={!deathAvailable || deathLocked} onClick={() => setBrujaActiveTab('death')}><span className="submode-btn-icon">☠️</span>Poción de muerte</button>
          </div>
        );
        if (tab === 'life') {
          if (game.brujaLifeUsedThisRound) {
            const savedIdx = game.brujaLifeSavedIdx!;
            return <>{tabs}<label>¿A quién revive?</label><div className="role-widget-checklist"><button type="button" className="chip selected" onClick={() => actionBrujaLifeToggle(savedIdx)}>{game.playerNames[savedIdx]}</button></div></>;
          }
          const allPending = getPendingNightKills();
          if (allPending.length === 0) return <>{tabs}<div className="role-widget-status">Nadie ha sido marcado para morir esta noche.</div></>;
          const pending = allPending.filter((p) => !pendingKillSurvives(p.idx));
          if (pending.length === 0) return <>{tabs}<div className="role-widget-status">La víctima de esta noche está a salvo de todas formas: no hay a quién revivir.</div></>;
          return <>{tabs}<label>¿A quién revive?</label><div className="role-widget-checklist">{pending.map((p) => <button type="button" key={p.idx} className="chip" onClick={() => actionBrujaLifeToggle(p.idx)}>{game.playerNames[p.idx]}</button>)}</div></>;
        }
        if (game.brujaDeathUsedThisRound) {
          const poisonedIdx = game.brujaDeathPoisonedIdx!;
          return <>{tabs}<label>¿A quién envenena?</label><div className="role-widget-checklist"><button type="button" className="chip selected" onClick={() => actionBrujaDeathToggle(poisonedIdx)}>{game.playerNames[poisonedIdx]}</button></div></>;
        }
        const brujaIdx = roleActorIndex('bruja');
        const pendingIdxs = getPendingNightKills().map((p) => p.idx);
        return <>{tabs}<label>¿A quién envenena?</label><div className="role-widget-checklist">{playerButtons(actionBrujaDeathToggle, null, (idx) => game.alive[idx] && idx !== brujaIdx && !pendingIdxs.includes(idx))}</div></>;
      }
      case 'nino_salvaje': {
        if (game.wildChildTransformed) return <div className="role-widget-status">🐺 Su modelo murió: ya se ha convertido en Hombre Lobo, no necesita más acciones.</div>;
        const selfIdx = game.roleIds.indexOf('nino_salvaje');
        return (
          <>
            <label>¿A quién elige como modelo?</label>
            <div className="role-widget-checklist">{playerButtons(actionWildChildPick, game.wildChildModelIdx, (idx) => idx !== selfIdx)}</div>
            <div className="role-widget-status">Esta elección solo se hace la primera noche.</div>
          </>
        );
      }
      case 'cuervo': {
        const selfIdx = roleActorIndex('cuervo');
        return (
          <>
            <label>¿A quién marca esta noche?</label>
            <div className="role-widget-checklist">{playerButtons(actionRavenPick, game.ravenMark, (idx) => idx !== selfIdx)}</div>
            <div className="role-widget-status">La marca da +2 votos mañana.</div>
          </>
        );
      }
      case 'piromano':
        return (
          <>
            <label>Jugadores rociados con gasolina (toca para marcar)</label>
            <div className="role-widget-checklist">{playerButtons(actionPyroToggle, null, (idx) => game.alive[idx])}</div>
            <button type="button" className="btn-main" style={{ marginTop: 14 }} disabled={!game.pyroSoaked.length} onClick={actionPyroIgnite}>🔥 Prender fuego a los rociados</button>
          </>
        );
      case 'lobo_pack':
        return (
          <>
            <label>¿A quién devoran los lobos esta noche?</label>
            <div className="role-widget-checklist">{playerButtons(actionWolfKillPick, game.pendingNightKillIdx, (idx) => game.alive[idx] && roleOf(idx).equipo !== 'lobos')}</div>
          </>
        );
      case 'lobo_albino': {
        const selfIdx = roleActorIndex('lobo_albino');
        return (
          <>
            <label>¿A qué otro Hombre Lobo elimina en secreto esta noche?</label>
            <div className="role-widget-checklist">{playerButtons(actionAlbinoKillPick, game.pendingAlbinoKillIdx, (idx) => game.alive[idx] && idx !== selfIdx && roleOf(idx).equipo === 'lobos')}</div>
          </>
        );
      }
      case 'perro_lobo':
        return (
          <>
            <label>¿Cómo decide jugar el resto de la partida?</label>
            <div className="role-widget-checklist">
              <button type="button" className={`chip${game.perroLoboChoice === 'aldeano' ? ' selected' : ''}`} onClick={() => actionPerroLoboChoose('aldeano')}>🏘️ Aldeano</button>
              <button type="button" className={`chip${game.perroLoboChoice === 'lobo' ? ' selected' : ''}`} onClick={() => actionPerroLoboChoose('lobo')}>🐺 Lobo</button>
            </div>
            {game.perroLoboChoice && <div className="role-widget-status">Toca de nuevo para cambiarlo.</div>}
          </>
        );
      case 'ladron': {
        const idx = game.ladronPlayerIdx !== null ? game.ladronPlayerIdx : game.roleIds.indexOf('ladron');
        if (idx === -1 || game.ladronReserve.length !== 2) return <div className="role-widget-status">No hay cartas de reserva.</div>;
        const currentRole = roleOf(idx);
        return (
          <>
            <label>¿Cambia su carta ({currentRole.nombre}) por una de estas dos reservadas?</label>
            <div className="role-picker-grid">
              {game.ladronReserve.map((roleId, i) => {
                const role = roles!.find((r) => r.id === roleId)!;
                return (
                  <div key={i} className="role-picker-card" onClick={() => actionLadronSwap(i)}>
                    <img src={`/${role.imagen}`} alt="" loading="lazy" />
                    <div className="role-picker-name">{role.nombre}</div>
                  </div>
                );
              })}
            </div>
          </>
        );
      }
      default:
        return null;
    }
  }

  // ---------- derived UI values ----------
  const status = game ? getGameStatus(game) : null;
  const lobosPctNarrator = status && status.aldeanosAlive > 0 ? Math.min(100, Math.max(0, (status.lobosAlive / status.aldeanosAlive) * 100)) : 100;
  const deathAnnounce = renderDeathAnnouncementText();

  return (
    <GameThemeProvider slug="hombres-lobo">
      <div id="app">
        {/* ---------- SETUP ---------- */}
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className={`card${setupStep === 1 ? ' balance-visible' : ''}`}>
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>HOMBRES LOBO</h1>

            {setupStep === 0 && (
              <div>
                <label><span className="label-icon">👥</span>Jugadores</label>
                <PlayerNameRows rows={rows} onChange={updateRows} min={MIN_PLAYERS} max={MAX_PLAYERS} />
                <div className="error-msg">{hasEmptyName ? 'Todos los jugadores necesitan un nombre.' : hasDuplicates ? 'No puede haber dos jugadores con el mismo nombre.' : playerCount < MIN_PLAYERS ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : ''}</div>
              </div>
            )}

            {setupStep === 1 && roles && (
              <div>
                <label>Roles incluidos ({total} / {roleSlots}){counts.ladron ? ' · incluye 2 cartas de reserva para El Ladrón' : ''}</label>
                <div className="role-picker-grid">
                  {roles.flatMap((role) => Array.from({ length: counts[role.id] || 0 }, (_, i) => (
                    <div key={`${role.id}-${i}`} className="role-slot filled" onClick={() => removeRole(role.id)} title={`Quitar ${role.nombre}`}>
                      <img src={`/${role.imagen}`} alt={role.nombre} loading="lazy" />
                    </div>
                  )))}
                  {Array.from({ length: Math.max(0, roleSlots - total) }, (_, i) => <div key={`empty-${i}`} className="role-slot empty">?</div>)}
                </div>
                <div className="error-msg">{roleErrorMsg}</div>

                <div className="section-label-row">
                  <label style={{ margin: 0 }}>Toca para añadir un rol</label>
                  <button type="button" className="section-help-btn" aria-label="Ayuda" onClick={() => setRoleTipOpen(true)}>?</button>
                </div>
                <div className="role-picker-grid">
                  {roles.filter((role) => {
                    const c = counts[role.id] || 0;
                    if (role.id === 'ladron') return c < role.maxCount;
                    const isGroup = SIBLING_GROUP_IDS.includes(role.id);
                    const remaining = roleSlots - total;
                    const need = isGroup ? role.maxCount - c : 1;
                    return c < role.maxCount && need > 0 && remaining >= need;
                  }).map((role) => (
                    <div key={role.id} className="role-picker-card" onClick={() => addRole(role)} onContextMenu={(e) => { e.preventDefault(); setRoleInfoOpen(role); }}>
                      <img src={`/${role.imagen}`} alt="" loading="lazy" draggable={false} onDoubleClick={() => setRoleInfoOpen(role)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {setupStep < 2 && (
              <div className="night-nav">
                {setupStep > 0 && <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep((s) => s - 1)}><span className="back-icon" /></button>}
                <button type="button" className="night-nav-btn" disabled={setupStep === 0 ? !playersValid : !rolesValid} onClick={() => setSetupStep((s) => s + 1)}>Siguiente</button>
              </div>
            )}

            {setupStep === 2 && (
              <div>
                <details className="setup-optional">
                  <summary>Ajustes adicionales</summary>
                  <div className="setup-optional-content">
                    <label className="switch-toggle">
                      <input type="checkbox" checked={unguidedMode} onChange={(e) => setUnguidedMode(e.target.checked)} />
                      <span className="switch-track"><span className="switch-thumb" /></span>
                      Modo no guiado
                    </label>
                    <label><span className="label-icon">⏱️</span>Tiempo para votar</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setVoteSeconds((v) => Math.max(0, v - VOTE_SECONDS_STEP))}>−</button>
                      <div className="value">{voteSeconds === 0 ? 'Sin límite' : formatVoteTime(voteSeconds)}</div>
                      <button type="button" onClick={() => setVoteSeconds((v) => Math.min(MAX_VOTE_SECONDS, v + VOTE_SECONDS_STEP))}>+</button>
                    </div>
                  </div>
                </details>
                <div className="final-nav">
                  <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep(1)}><span className="back-icon" /></button>
                  <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
                </div>
              </div>
            )}
          </div>

          {setupStep === 1 && (
            <div className="balance-bar-fixed">
              <div className="balance-track">
                <div className="balance-fill-lobos" style={{ flexBasis: `${lobosPct}%` }} />
                <div className="balance-fill-aldeanos" style={{ flexBasis: `${100 - lobosPct}%` }} />
              </div>
              <div className="balance-legend">
                <span>🐺 Lobos</span>
                <span className="balance-verdict">{balanceVerdict}</span>
                <span>Pueblo 🏘️</span>
              </div>
            </div>
          )}
        </div>

        {/* ---------- ROSTER REVEAL ---------- */}
        <div className="screen" id="screen-game" hidden={screen !== 'reveal'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <p className="subtitle">Toca tu nombre para ver tu carta. Nadie más debe mirar.</p>
            <div className="roster-list" id="reveal-roster">
              {game?.playerNames.map((name, idx) => !viewed[idx] && (
                <button type="button" className="roster-row" key={idx} onClick={() => openRevealModal(idx)}>
                  <span className="roster-row-name">{name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-main" disabled={!allViewed} onClick={() => setStartConfirmOpen(true)}>Continuar</button>
          </div>
        </div>

        {revealIdx !== null && game && roles && (
          <div className="guide-modal-backdrop" onClick={() => (revealed ? closeRevealModal() : setRevealed(true))}>
            <div className="guide-modal reveal-modal">
              <div className="pass-hint" style={{ marginBottom: 14 }}>No se lo enseñes a nadie más.</div>
              <RevealCard
                revealed={revealed}
                alarm={revealed && roleOf(revealIdx).equipo === 'lobos'}
                contentClassName={TEAM_CLASS[roleOf(revealIdx).equipo]}
                cover={<RevealButton onClick={() => setRevealed(true)} icon="👁️" label="Revelar" />}
              >
                <img className="reveal-portrait" src={`/${roleOf(revealIdx).imagen}`} alt="" draggable={false} />
                <div className="reveal-desc-overlay">{roleOf(revealIdx).descripcion}</div>
              </RevealCard>
              <div className={`reveal-name-caption${revealed ? ' visible' : ''} ${TEAM_CLASS[roleOf(revealIdx).equipo]}`}>
                {roleOf(revealIdx).nombre}
                <span className="reveal-hint">Toca la carta para ver su descripción</span>
              </div>
            </div>
          </div>
        )}

        {startConfirmOpen && (
          <div className="card-modal-backdrop">
            <div className="card-modal">
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="end-icon">▶️</div>
                <h2 style={{ marginTop: 0 }}>¿Todo listo?</h2>
                <p className="subtitle">Asegúrate de que el dispositivo ha vuelto al narrador y ningún jugador sigue mirando la pantalla de otro.</p>
                <p className="narrator-cue">😴 Di en voz alta: «El pueblo se va a dormir» y continúa.</p>
                <button type="button" className="btn-main" onClick={confirmStart}>Continuar ›</button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- NARRATOR ---------- */}
        <div className="screen" id="screen-narrator" hidden={screen !== 'narrator'}>
          <div className="card">
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio" onClick={(e) => { e.preventDefault(); enterSetup(); }}><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
                <span className="back-btn" style={{ cursor: 'default', marginBottom: 0 }}>{narratorTab === 'night' ? '🌙 Noche' : '☀️ Día'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
                {narratorTab === 'night' && (
                  <div className="round-stepper">
                    <button type="button" className="guide-btn" aria-label="Personajes" onClick={() => setDeathsModalOpen(true)}><span className="people-icon" /></button>
                  </div>
                )}
              </div>
            </div>
            <div className="narrator-balance-track">
              <div className="narrator-balance-fill-lobos" style={{ flexBasis: `${lobosPctNarrator}%` }} />
              <div className="narrator-balance-fill-aldeanos" style={{ flexBasis: `${100 - lobosPctNarrator}%` }} />
            </div>

            {narratorTab === 'night' && game && (
              <div id="panel-night">
                {nightSteps.length === 0 ? (
                  <>
                    <div className="night-empty">No hay roles con acción nocturna esta ronda.</div>
                    <div className="night-nav">
                      <button type="button" className="night-nav-btn icon-only" disabled aria-label="Anterior"><span className="back-icon" /></button>
                      <button type="button" className="night-nav-btn" onClick={beginEndOfRound}>Terminar la noche ›</button>
                    </div>
                  </>
                ) : currentNightStep && (
                  <>
                    <p className="narrator-cue">Se despierta...</p>
                    <div className={`reveal-wrap revealed`} onClick={(e) => (e.currentTarget.querySelector('.reveal-content') as HTMLElement)?.classList.toggle('desc-open')}>
                      <div className={`reveal-content ${TEAM_CLASS[currentNightStep.role.equipo]}`}>
                        <img className="reveal-portrait" src={`/${currentNightStep.role.imagen}`} alt="" draggable={false} />
                        <div className="reveal-desc-overlay">{currentNightStep.role.descripcion}</div>
                      </div>
                    </div>
                    <div className={`reveal-name-caption visible ${TEAM_CLASS[currentNightStep.role.equipo]}`}>
                      {currentNightStep.role.nombre}
                      <span className="reveal-hint">Toca la carta para ver su descripción</span>
                    </div>

                    <div className={`role-widget${renderRoleWidget(currentNightStep) ? '' : ' hidden'}`}>{renderRoleWidget(currentNightStep)}</div>

                    <div className="error-msg">{nightNavError}</div>
                    <div className="night-nav">
                      <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" disabled={game.nightIdx === 0} onClick={handleNightPrev}><span className="back-icon" /></button>
                      <button type="button" className="night-nav-btn" onClick={handleNightNext}>{game.nightIdx === nightSteps.length - 1 ? 'Terminar la noche' : 'Siguiente'}</button>
                    </div>
                    <ProgressDots total={nightSteps.length} current={game.nightIdx} />
                  </>
                )}
              </div>
            )}

            {narratorTab === 'vote' && game && (
              <div id="panel-vote">
                <p className="narrator-cue">☀️ El pueblo se despierta</p>
                {voteView === 'announce' && (
                  <div>
                    <p className="narrator-cue">{deathAnnounce.cue}</p>
                    {deathAnnounce.anyDeaths && (
                      <div className="roster-list">
                        {game.deathsThisRound.map((idx) => {
                          const role = roleOf(idx);
                          return (
                            <div key={idx} className="role-row roster-row" onClick={() => showLynchReveal(idx, () => undefined)}>
                              <img className="role-thumb" src={`/${role.imagen}`} alt="" loading="lazy" />
                              <div className="role-info">
                                <div className="roster-name">{game.playerNames[idx]}</div>
                                <div className="role-name">{role.nombre}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {game.pendingCazadorShootIdx !== null && (
                      <div>
                        <label>El Cazador ha muerto: ¿a quién dispara?</label>
                        <div className="role-widget-checklist">
                          {game.playerNames.map((n, idx) => game.alive[idx] && idx !== game.pendingCazadorShootIdx && (
                            <button type="button" key={idx} className="chip" onClick={() => pickCazadorShootTarget(idx)}>{n}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button type="button" className="btn-main" disabled={game.pendingCazadorShootIdx !== null} onClick={handleAnnounceContinue}>{status?.over ? 'Continuar ›' : 'Continuar al debate ›'}</button>
                  </div>
                )}
                {voteView === 'select' && (
                  <div>
                    <label>¿A quién ha votado el pueblo para linchar?</label>
                    {voteTimerRemaining !== null && (
                      <div className={`vote-timer-wrap${voteTimeUp ? ' time-up' : ''}`}>
                        <div className="vote-timer">
                          <span className="vote-timer-part">{String(Math.floor(Math.max(0, voteTimerRemaining) / 60)).padStart(2, '0')}</span>
                          <span className="vote-timer-colon">:</span>
                          <span className="vote-timer-part">{String(Math.max(0, voteTimerRemaining) % 60).padStart(2, '0')}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      {game.playerNames.map((name, idx) => game.alive[idx] && (
                        <div key={idx} className={`vote-row${idx === selectedVoteIdx ? ' selected' : ''}`} onClick={() => setSelectedVoteIdx(idx === selectedVoteIdx ? null : idx)}><span>{name}</span></div>
                      ))}
                    </div>
                    <button type="button" className="btn-main" disabled={selectedVoteIdx === null} onClick={handleConfirmVote}>Confirmar votación</button>
                  </div>
                )}
                {voteView === 'judge' && (
                  <div>
                    <p className="narrator-cue">🤫 {game.playerNames[game.roleIds.indexOf('juez_tartamudo')]} (El Juez Tartamudo) pide en secreto repetir la votación...</p>
                    <label>¿Usa su poder para repetir la votación?</label>
                    <div className="night-nav">
                      <button type="button" className="night-nav-btn" onClick={handleJudgeSkip}>No</button>
                      <button type="button" className="night-nav-btn" onClick={handleJudgeUse}>Sí, repetir votación</button>
                    </div>
                  </div>
                )}
                {voteView === 'continue' && (
                  <button type="button" className="btn-main" onClick={handleRoundContinue}>Siguiente ronda</button>
                )}
              </div>
            )}
          </div>
        </div>

        {deathsModalOpen && game && (
          <div className="card-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeathsModalOpen(false); }}>
            <div className="card-modal" style={{ textAlign: 'left' }}>
              <button type="button" className="card-modal-close" onClick={() => setDeathsModalOpen(false)}>✕</button>
              <h2 style={{ margin: '0 0 14px', textAlign: 'center' }}>Personajes</h2>
              {game.reminders.length > 0 && (
                <div>
                  <label style={{ marginTop: 0 }}>Recordatorios</label>
                  {game.reminders.map((r) => (
                    <div className="reminder-row" key={r.id}>
                      <span>{r.text}</span>
                      <button type="button" className="reminder-dismiss" onClick={() => updateGame((g) => { g.reminders = g.reminders.filter((x) => x.id !== r.id); })}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <label>Vivos</label>
              <div>
                {game.playerNames.map((name, idx) => game.alive[idx] && (
                  <div className="vote-row" key={idx}><span>{name}</span><span className="death-role-tag">{roleOf(idx).nombre}</span></div>
                ))}
              </div>
              <label>Eliminados</label>
              <div>
                {game.playerNames.map((name, idx) => {
                  if (game.alive[idx]) return null;
                  const cause = game.deathCause[idx];
                  return (
                    <div className="vote-row dead" key={idx}>
                      <span className="death-left"><span className="death-cause-icon">{CAUSE_ICONS[cause] ?? '❓'}</span><span className="death-name">{name}</span></span>
                      <span className="death-right"><span className="death-role-tag">{roleOf(idx).nombre}</span><span className="death-cause-tag">{CAUSE_LABELS[cause] ?? 'Causa desconocida'}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------- UNGUIDED ROSTER ---------- */}
        <div className="screen" id="screen-roster" hidden={screen !== 'roster'}>
          <div className="card">
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio" onClick={(e) => { e.preventDefault(); enterSetup(); }}><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
                <span className="back-btn" style={{ cursor: 'default' }}>📋 Sin guía</span>
              </div>
              <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
            </div>
            <h1 style={{ fontSize: '1.5rem' }}>JUGADORES Y ROLES</h1>
            <p className="subtitle">Modo no guiado: toca a un jugador para marcarlo como eliminado o revivirlo. Vivos: {game?.alive.filter(Boolean).length ?? 0} / {game?.playerNames.length ?? 0}.</p>
            <div className="roster-list">
              {game?.playerNames.map((name, idx) => {
                const role = roleOf(idx);
                const dead = !game.alive[idx];
                return (
                  <div key={idx} className={`role-row roster-row${dead ? ' is-dead' : ''}`} onClick={() => toggleRosterAlive(idx)}>
                    <img className="role-thumb" src={`/${role.imagen}`} alt="" loading="lazy" />
                    <div className="role-info">
                      <div className="roster-name">{name}</div>
                      <div className="role-name">{role.nombre}</div>
                      <div className="role-team-tag">{TEAM_LABELS[role.equipo]}</div>
                    </div>
                    <span className="roster-status-icon">{dead ? '💀' : '✅'}</span>
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn-main" onClick={enterSetup}>Iniciar nueva ronda</button>
          </div>
        </div>

        {/* ---------- death modal ---------- */}
        {deathModalOpen && deathCtx && (
          <div className="card-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeDeathModal(); }}>
            <div className="card-modal">
              <button type="button" className="card-modal-close" onClick={closeDeathModal}>✕</button>
              <div className="card-modal-name">{game?.playerNames[deathCtx.idx]}</div>
              <div className={`card-modal-team ${TEAM_CLASS[deathCtx.role.equipo]}`}>{deathCtx.role.nombre}</div>

              {!deathCauseAssumed && (
                <div className="cause-chip-list">
                  <button type="button" className={`chip${deathCtx.cause === 'lobos' ? ' selected' : ''}`} onClick={() => pickDeathCause('lobos')}>🐺 Devorado por los lobos</button>
                  <button type="button" className={`chip${deathCtx.cause === 'votacion' ? ' selected' : ''}`} onClick={() => pickDeathCause('votacion')}>🗳️ Linchado en la votación</button>
                  <button type="button" className={`chip${deathCtx.cause === 'otro' ? ' selected' : ''}`} onClick={() => pickDeathCause('otro')}>☠️ Otra causa (veneno, disparo…)</button>
                </div>
              )}
              {deathCauseAssumed && <div className="role-widget-status">{CAUSE_ICONS[deathCauseAssumed]} {CAUSE_LABELS[deathCauseAssumed]}</div>}

              {deathCtx.cause && deathCtx.guidance && (
                <div id="death-guidance">
                  {deathCtx.guidance.msgs.length ? deathCtx.guidance.msgs.map((m, i) => <p key={i}>{m}</p>) : <p>Sin indicaciones especiales: puede morir con normalidad.</p>}
                </div>
              )}

              {deathCtx.cause && deathCtx.guidance?.chainPrompt === 'shoot' && (
                <div id="death-chain-shoot">
                  <label>¿A quién dispara el Cazador?</label>
                  <div className="role-widget-checklist">
                    {game?.playerNames.map((n, i) => game.alive[i] && i !== deathCtx.idx && (
                      <button type="button" key={i} className={`chip${deathChainShootIdx === i ? ' selected' : ''}`} onClick={() => setDeathChainShootIdx(i)}>{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {deathCtx.cause && <button type="button" className="btn-main" onClick={resolveDeathModal}>{deathCtx.guidance?.survives ? 'Marcar como resuelto (sigue vivo)' : 'Confirmar muerte'}</button>}
            </div>
          </div>
        )}

        {/* ---------- lynch reveal ---------- */}
        {lynchReveal && game && (
          <div className="card-modal-backdrop">
            <div className="card-modal">
              <div className="card" style={{ textAlign: 'center' }}>
                <div className={`reveal-wrap revealed`}>
                  <div className={`reveal-content ${TEAM_CLASS[roleOf(lynchReveal.idx).equipo]}`}>
                    <img className="reveal-portrait" src={`/${roleOf(lynchReveal.idx).imagen}`} alt="" draggable={false} />
                  </div>
                </div>
                <div className="card-modal-name">{game.playerNames[lynchReveal.idx]}</div>
                <div className={`card-modal-team ${TEAM_CLASS[roleOf(lynchReveal.idx).equipo]}`}>{roleOf(lynchReveal.idx).nombre}</div>
                <button type="button" className="btn-main" style={{ marginTop: 14 }} onClick={handleLynchRevealContinue}>Continuar ›</button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- game over ---------- */}
        {gameOverVisible && status?.over && (
          <div className="card-modal-backdrop">
            <div className="card-modal">
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="end-icon">{status.winner === 'lobos' ? '🐺' : '🏘️'}</div>
                <h1 className={`game-over-title winner-${status.winner}`}>{status.winner === 'lobos' ? 'GANAN LOS LOBOS' : 'GANAN LOS ALDEANOS'}</h1>
                <p className="subtitle">La partida ha terminado.</p>
                <div className="game-over-summary">
                  {game && game.eventLog.length ? game.eventLog.map((e, i) => <p key={i}>{e.text}</p>) : <p>Sin eventos registrados.</p>}
                </div>
                <button type="button" className="btn-main" onClick={() => { setGameOverVisible(false); enterSetup(); }}>Iniciar nueva ronda</button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- role info / tip modals ---------- */}
        {roleInfoOpen && (
          <div className="card-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setRoleInfoOpen(null); }}>
            <div className="card-modal">
              <button type="button" className="card-modal-close" onClick={() => setRoleInfoOpen(null)}>✕</button>
              <img src={`/${roleInfoOpen.imagen}`} alt="" draggable={false} />
              <div className="card-modal-name">{roleInfoOpen.nombre}</div>
              <div className={`card-modal-team ${TEAM_CLASS[roleInfoOpen.equipo]}`}>{TEAM_LABELS[roleInfoOpen.equipo]}</div>
              <div className="card-modal-desc">{roleInfoOpen.descripcion}</div>
            </div>
          </div>
        )}
        {roleTipOpen && (
          <div className="card-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setRoleTipOpen(false); }}>
            <div className="card-modal" style={{ textAlign: 'center' }}>
              <button type="button" className="card-modal-close" onClick={() => setRoleTipOpen(false)}>✕</button>
              <p style={{ margin: '46px 0 6px' }}>Para ver el rol y la descripción de una carta, haz doble toque o clic derecho sobre ella.</p>
            </div>
          </div>
        )}

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Los <strong>Lobos</strong> ganan si igualan o superan en número a los Aldeanos vivos. Los <strong>Aldeanos</strong> ganan si consiguen eliminar a todos los Lobos antes de que eso ocurra.</p>
          <h3>Fases de la partida</h3>
          <ul>
            <li><strong>Noche:</strong> los lobos y los roles con poder nocturno actúan en secreto, fuera de la app — el narrador dirige esa parte en persona.</li>
            <li><strong>Día:</strong> el pueblo debate en voz alta y vota a quién linchar.</li>
          </ul>
          <h3>Usar la app</h3>
          <ol>
            <li>Añade a los jugadores y toca las cartas de rol que quieras incluir, una a una, hasta completar tantas como jugadores haya. Necesitas al menos un Hombre Lobo y un Aldeano.</li>
            <li>La barra inferior te avisa si el reparto favorece a los Lobos o al Pueblo.</li>
            <li>Si quieres, fija un <strong>tiempo para votar</strong>: al llegar la votación del día se mostrará una cuenta atrás que avisa con una alarma al agotarse (podéis votar en cualquier momento, con o sin tiempo agotado).</li>
            <li>Activa <strong>modo no guiado</strong> si prefieres dirigir la partida tú mismo: la app solo te enseñará la lista de jugadores con su rol, sin guía nocturna ni votación, pero podrás tocar a cada jugador para marcarlo como vivo o eliminado.</li>
            <li>Pulsa "Iniciar partida" y pasa el dispositivo: cada jugador ve su carta en privado y la oculta antes de pasarlo.</li>
          </ol>
          <h3>Roles disponibles</h3>
          <div className="guide-roles-catalog">
            {roles ? roles.map((role) => (
              <div className="role-row" key={role.id}>
                <img className="role-thumb" src={`/${role.imagen}`} alt="" loading="lazy" />
                <div className="role-info">
                  <div className="role-name">{role.nombre}</div>
                  <div className="role-team-tag">{TEAM_LABELS[role.equipo]}</div>
                  <div className="guide-role-desc">{role.descripcion}</div>
                </div>
              </div>
            )) : <p className="chip-loading">Cargando roles…</p>}
          </div>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
