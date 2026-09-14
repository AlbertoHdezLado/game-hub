import { useEffect, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/legacy/ScreenHeader';
import { GuideModal } from '@/components/legacy/GuideModal';
import { PackagesDropdown } from '@/components/legacy/PackagesDropdown';
import { TeamPlayerRows } from '@/components/legacy/TeamPlayerRows';
import { TeamBoxes } from '@/components/legacy/TeamBoxes';
import { TeamScoreboard } from '@/components/legacy/TeamScoreboard';
import { TurnEndWordPills, type TurnResult } from '@/components/legacy/TurnEndWordPills';
import { loadContent } from '@/lib/content';
import { shuffle } from '@/lib/random';
import { loadSavedPlayerNames, savePlayerNames } from '@/lib/legacy';
import { useGameAudio } from '@/hooks/useGameAudio';
import {
  MAX_TEAMS, MIN_TEAMS, TEAM_NAMES, autoBalanceAllTeams, buildTeams, emptyTeamIndex, formatMMSS,
  leastPopulatedTeam, normalizeTrailingTeamSlot, randomizeAllTeams, realPlayerCount, type BuiltTeam, type TeamRow,
} from '@/lib/teamSetup';
import type { WordPack, WordPackContent } from '@/types/game';
import '@/styles/games/team-shared.css';
import '@/styles/games/times-up.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 30;
const DECK_SIZE = 40;

const PHASES = [
  { title: 'FASE I', subtitle: 'DESCRIBIR', rule: 'Describe la carta como quieras, sin decir la palabra ni derivados.' },
  { title: 'FASE II', subtitle: 'UNA PALABRA', rule: 'Solo puedes decir UNA palabra (tampoco la palabra en sí ni un derivado).' },
  { title: 'FASE III', subtitle: 'MÍMICA', rule: 'Solo gestos y sonidos, sin hablar.' },
];

type Screen = 'setup' | 'phase-intro' | 'game' | 'phase-end' | 'end';
type TurnPhase = 'intro' | 'play' | 'end';

export function TimesUpPage() {
  const [rows, setRows] = useState<TeamRow[]>(() => normalizeTrailingTeamSlot(loadSavedPlayerNames().slice(0, MAX_PLAYERS).map((name) => ({ name, team: 0 })), MAX_PLAYERS, 2));
  const [numTeams, setNumTeams] = useState(2);
  const [packages, setPackages] = useState<WordPack[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [skipSeconds, setSkipSeconds] = useState(5);
  const [setupStep, setSetupStep] = useState(0);
  const [screen, setScreen] = useState<Screen>('setup');
  const [helpOpen, setHelpOpen] = useState(false);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<BuiltTeam[]>([]);
  const [matchNames, setMatchNames] = useState<string[]>([]);
  const [phase, setPhase] = useState(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [turnTeamPointer, setTurnTeamPointer] = useState(0);
  const [currentActorIdx, setCurrentActorIdx] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('intro');
  const [turnCorrect, setTurnCorrect] = useState(0);
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);
  const [carryOverTurn, setCarryOverTurn] = useState<{ actorIdx: number; timeRemaining: number } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [skipPulse, setSkipPulse] = useState(0);

  const audio = useGameAudio();

  useEffect(() => {
    loadContent<WordPackContent>('packages.json').then((data) => {
      setPackages(data.paquetes);
      setSelectedIds(data.paquetes.filter((p) => !/\+18/.test(p.nombre)).map((p) => p.id));
    });
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timerRunning && timeRemaining <= 0) { setTimerRunning(false); endTurn(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, timerRunning]);

  function updateRows(next: TeamRow[]) {
    setRows(next);
    savePlayerNames(next.map((r) => r.name.trim()).filter(Boolean));
  }

  function changeNumTeams(next: number) {
    const value = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, next));
    setNumTeams(value);
    let balanced = autoBalanceAllTeams(rows, value);
    if (balanced.length && !balanced[balanced.length - 1].name.trim()) {
      balanced = balanced.slice();
      balanced[balanced.length - 1] = { ...balanced[balanced.length - 1], team: leastPopulatedTeam(balanced, value) };
    }
    updateRows(balanced);
  }

  const playerCount = realPlayerCount(rows);
  const playersValid = playerCount >= MIN_PLAYERS;
  const emptyTeam = playersValid ? emptyTeamIndex(rows, numTeams) : -1;
  const teamsValid = playersValid && emptyTeam === -1;
  const settingsValid = packages !== null && selectedIds.length > 0;
  const canStart = playersValid && teamsValid && settingsValid;

  function buildWordPool(): string[] {
    const pool: string[] = [];
    packages!.forEach((p) => { if (selectedIds.includes(p.id)) pool.push(...p.palabras); });
    return pool;
  }

  function startTurn(teamPointer: number, teamsState: BuiltTeam[], carried: { actorIdx: number; timeRemaining: number } | null) {
    const team = teamsState[teamPointer];
    let actorIdx: number;
    if (carried) {
      actorIdx = carried.actorIdx;
    } else {
      actorIdx = team.memberIdxs[team.nextMemberPointer % team.memberIdxs.length];
      setTeams(teamsState.map((t, i) => (i === teamPointer ? { ...t, nextMemberPointer: t.nextMemberPointer + 1 } : t)));
    }
    setCurrentActorIdx(actorIdx);
    setTurnCorrect(0);
    setTurnResults([]);
    setTimeRemaining(carried ? carried.timeRemaining : turnSeconds);
    setCarryOverTurn(null);
    setTurnPhase('intro');
  }

  function showPhaseIntro(phaseIdx: number, teamsState: BuiltTeam[]) {
    setPhase(phaseIdx);
    setTeams(teamsState);
    setScreen('phase-intro');
  }

  function handleStart() {
    if (!canStart) return;
    const built = buildTeams(rows, numTeams);
    setPlayerNames(built.playerNames);
    setMatchNames(shuffle(buildWordPool()).slice(0, DECK_SIZE));
    setTurnTeamPointer(Math.floor(Math.random() * built.teams.length));
    showPhaseIntro(0, built.teams);
  }

  function beginPhase() {
    setDeck(shuffle(matchNames));
    setScreen('game');
    startTurn(turnTeamPointer, teams, null);
  }

  function beginTurnPlay() {
    audio.unlock();
    setTimeUp(false);
    setTurnPhase('play');
    setTimerRunning(true);
  }

  function markCorrect() {
    if (!deck.length) return;
    audio.playCorrect();
    const word = deck[0];
    const nextDeck = deck.slice(1);
    setTeams((current) => current.map((t, i) => (i === turnTeamPointer ? { ...t, score: t.score + 1 } : t)));
    setTurnCorrect((c) => c + 1);
    setTurnResults((current) => [...current, { word, correct: true }]);
    setDeck(nextDeck);
    if (nextDeck.length === 0) { setTimerRunning(false); endTurn(true); }
  }

  function skipCard() {
    if (!deck.length) return;
    audio.playSkip();
    const word = deck[0];
    const nextDeck = [...deck.slice(1), word];
    setDeck(nextDeck);
    setTurnResults((current) => [...current, { word, correct: false }]);
    setSkipPulse((n) => n + 1);
    setTimeRemaining((t) => {
      const next = Math.max(0, t - skipSeconds);
      if (next <= 0) { setTimerRunning(false); endTurn(false, false); }
      return next;
    });
  }

  function endTurn(deckExhausted: boolean, hasActiveWord = true) {
    setTimerRunning(false);
    setTurnPhase('end');

    if (deckExhausted) {
      setCarryOverTurn({ actorIdx: currentActorIdx, timeRemaining });
      setScreen('phase-end');
      return;
    }

    let nextDeck = deck;
    if (hasActiveWord && nextDeck.length) {
      const expired = nextDeck[0];
      nextDeck = nextDeck.slice(1);
      setDeck(nextDeck);
      setTurnResults((current) => [...current, { word: expired, correct: false }]);
    }
    if (nextDeck.length === 0) { setScreen('phase-end'); return; }
    setTurnTeamPointer((current) => (current + 1) % teams.length);
    setTimeUp(true);
    audio.playAlarm();
  }

  function toggleResult(index: number) {
    const prevTeamIdx = turnTeamPointer === 0 ? teams.length - 1 : turnTeamPointer - 1;
    setTurnResults((current) => {
      const next = current.slice();
      const result = next[index];
      const scoreChange = result.correct ? -1 : 1;
      next[index] = { ...result, correct: !result.correct };
      setTeams((teamsCurrent) => teamsCurrent.map((t, i) => (i === prevTeamIdx ? { ...t, score: t.score + scoreChange } : t)));
      setTurnCorrect((c) => c + scoreChange);
      return next;
    });
  }

  function continueAfterTurn() {
    startTurn(turnTeamPointer, teams, carryOverTurn);
    setScreen('game');
  }

  function continuePhaseEnd() {
    if (phase >= PHASES.length - 1) { setScreen('end'); return; }
    showPhaseIntro(phase + 1, teams);
  }

  function enterSetup() {
    setTimerRunning(false);
    setSetupStep(0);
    setScreen('setup');
  }

  const prevTeamIdx = turnTeamPointer === 0 ? teams.length - 1 : turnTeamPointer - 1;
  const maxScore = Math.max(0, ...teams.map((t) => t.score));
  const winners = teams.map((t, i) => i).filter((i) => teams[i]?.score === maxScore);

  return (
    <GameThemeProvider slug="times-up">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>TIME&apos;S UP</h1>

            {setupStep === 0 && (
              <div>
                <label><span className="label-icon">👥</span>Jugadores</label>
                <TeamPlayerRows rows={rows} onChange={updateRows} min={MIN_PLAYERS} max={MAX_PLAYERS} numTeams={numTeams} onNormalize={(next) => normalizeTrailingTeamSlot(next, MAX_PLAYERS, numTeams)} />
                <div className="error-msg">{!playersValid ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : ''}</div>
              </div>
            )}

            {setupStep === 1 && (
              <div>
                <label><span className="label-icon">🎯</span>Equipos</label>
                <div className="stepper">
                  <button type="button" onClick={() => changeNumTeams(numTeams - 1)}>−</button>
                  <div className="value">{numTeams}</div>
                  <button type="button" onClick={() => changeNumTeams(numTeams + 1)}>+</button>
                </div>
                <div className="team-boxes-header">
                  <button type="button" className="randomize-teams-btn" onClick={() => updateRows(randomizeAllTeams(rows, numTeams))}><span className="dice-icon" />Aleatorio</button>
                </div>
                <TeamBoxes rows={rows} numTeams={numTeams} onAssign={(idx, team) => updateRows(rows.map((r, i) => (i === idx ? { ...r, team } : r)))} />
                <div className="error-msg">{emptyTeam !== -1 ? `${TEAM_NAMES[emptyTeam]} no tiene jugadores.` : ''}</div>
              </div>
            )}

            {setupStep < 2 && (
              <div className="night-nav">
                {setupStep > 0 && <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep((s) => s - 1)}><span className="back-icon" /></button>}
                <button type="button" className="night-nav-btn" disabled={setupStep === 0 ? !playersValid : !teamsValid} onClick={() => setSetupStep((s) => s + 1)}>Siguiente</button>
              </div>
            )}

            {setupStep === 2 && (
              <div>
                <details className="setup-optional">
                  <summary>Ajustes adicionales</summary>
                  <div className="setup-optional-content">
                    <label><span className="label-icon">🏷️</span>Categorías</label>
                    <PackagesDropdown packages={packages} selectedIds={selectedIds} onChange={setSelectedIds} />

                    <label><span className="label-icon">⏱️</span>Duración de turno</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setTurnSeconds((v) => Math.max(15, v - 5))}>−</button>
                      <div className="value">{formatMMSS(turnSeconds)}</div>
                      <button type="button" onClick={() => setTurnSeconds((v) => Math.min(60, v + 5))}>+</button>
                    </div>

                    <label><span className="label-icon">⏭️</span>Segundos que resta saltar carta</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setSkipSeconds((v) => Math.max(0, v - 1))}>−</button>
                      <div className="value">{skipSeconds}</div>
                      <button type="button" onClick={() => setSkipSeconds((v) => Math.min(30, v + 1))}>+</button>
                    </div>
                  </div>
                </details>

                <div className="error-msg">{!packages ? 'Cargando categorías…' : selectedIds.length === 0 ? 'Selecciona al menos una categoría.' : ''}</div>

                <div className="final-nav">
                  <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep(1)}><span className="back-icon" /></button>
                  <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-phase-intro" hidden={screen !== 'phase-intro'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <h1 style={{ fontSize: '1.6rem' }}>{PHASES[phase].title}: {PHASES[phase].subtitle}</h1>
            <div className="phase-rule-box">{PHASES[phase].rule}</div>
            <div className="phase-intro-cards-remaining"><span className="tu-cards-icon">🂠</span><span>x{matchNames.length}</span></div>
            {phase > 0 && <><label style={{ marginTop: 0 }}><span className="label-icon">🏆</span>Marcador</label><TeamScoreboard scores={teams.map((t) => t.score)} /></>}
            <button type="button" className="btn-main" onClick={beginPhase}>Empezar</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={screen !== 'game'}>
          <div className="card">
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio" onClick={(e) => { e.preventDefault(); enterSetup(); }}><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
                <span className="back-btn" style={{ cursor: 'default' }}>{PHASES[phase].title} / 3</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
                <div className="tu-cards-remaining"><span className="tu-cards-icon">🂠</span><span>x{deck.length}</span></div>
              </div>
            </div>

            {turnPhase === 'intro' && (
              <div>
                <div className={`team-turn-badge team-color-${turnTeamPointer}`}>{TEAM_NAMES[turnTeamPointer]?.toUpperCase()}</div>
                <div className="player-name">{playerNames[currentActorIdx]}</div>
                <p className="pass-hint">Pasa el dispositivo a esta persona.</p>
                <button type="button" className="btn-main" onClick={beginTurnPlay}>Empezar mi turno ▶</button>
              </div>
            )}

            {turnPhase === 'play' && (
              <div>
                <div className={`tu-timer-wrap${timeUp ? ' time-up' : ''}`}>
                  <div key={skipPulse} className="tu-timer">{formatMMSS(Math.max(0, timeRemaining))}</div>
                </div>
                <div className="tu-word">{deck[0] ?? ''}</div>
                <div className="icon-action-row">
                  <button type="button" className="icon-action-btn icon-action-skip" aria-label="Pasar" onClick={skipCard}><span className="icon-action-icon" /></button>
                  <button type="button" className="icon-action-btn icon-action-correct" aria-label="Acierto" onClick={markCorrect}><span className="icon-action-icon" /></button>
                </div>
              </div>
            )}

            {turnPhase === 'end' && (
              <div>
                <div className="end-icon" id="turn-end-icon">⏱️</div>
                <h1 style={{ fontSize: '1.4rem' }}>¡Tiempo!</h1>
                <TurnEndWordPills results={turnResults} teamIdx={prevTeamIdx} pillClassName="tu-word-pill-wrap" onToggle={toggleResult} />
                <TeamScoreboard scores={teams.map((t) => t.score)} />
                <button type="button" className="btn-main" onClick={continueAfterTurn}>Continuar</button>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-phase-end" hidden={screen !== 'phase-end'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="end-icon">🏁</div>
            <h1 style={{ fontSize: '1.5rem' }}>{PHASES[phase].title} TERMINADA</h1>
            <TeamScoreboard scores={teams.map((t) => t.score)} />
            <button type="button" className="btn-main" onClick={continuePhaseEnd}>{phase >= PHASES.length - 1 ? 'Ver resultados finales' : `Comenzar ${PHASES[phase + 1].title}`}</button>
          </div>
        </div>

        <div className="screen" id="screen-end" hidden={screen !== 'end'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="end-icon">🏆</div>
            <h1 style={{ fontSize: '1.6rem' }}>RESULTADOS</h1>
            <p className="subtitle">{winners.length > 1 ? `Empate a ${maxScore} ${maxScore === 1 ? 'punto.' : 'puntos.'}` : `Con ${maxScore} ${maxScore === 1 ? 'punto.' : 'puntos.'}`}</p>
            <TeamScoreboard scores={teams.map((t) => t.score)} highlightWinner showRank />
            <button type="button" className="btn-main" onClick={enterSetup}>Nueva partida</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Formad equipos (se recomienda de 2 en 2, sentados de forma que nunca un equipo juegue dos turnos seguidos). Por turnos, cada jugador describe la carta a su equipo durante un tiempo limitado. La partida tiene <strong>3 fases</strong> con las mismas 40 cartas (elegidas al azar de las categorías que selecciones), cada una con una regla distinta para dar las pistas.</p>
          <h3>Fase I — Descripción libre</h3>
          <p>Describe la carta como quieras, sin decir la palabra ni derivados.</p>
          <h3>Fase II — Una palabra</h3>
          <p>Solo puedes decir <strong>una palabra</strong> (tampoco la palabra en sí ni un derivado).</p>
          <h3>Fase III — Mímica</h3>
          <p>Solo gestos y sonidos, sin hablar.</p>
          <h3>Pasar</h3>
          <p>En cualquier fase puedes pasar de carta si os atascáis: pasa al fondo del mazo y resta unos segundos al cronómetro (configurable).</p>
          <h3>Fin del turno y de la fase</h3>
          <p>El turno acaba cuando se agota el tiempo; entonces pasa el dispositivo al siguiente jugador. La fase termina en cuanto se acaban las 40 cartas, aunque sea a mitad de un turno.</p>
          <h3>Puntuación</h3>
          <p>Cada acierto suma un punto para el equipo. Se suman los puntos de las 3 fases; gana quien más tenga. En caso de empate, la victoria se comparte.</p>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
