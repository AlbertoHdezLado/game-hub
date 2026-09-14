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
import '@/styles/games/mimica.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 30;
const MAX_ROUNDS = 10;

type Screen = 'setup' | 'game' | 'end';
type TurnPhase = 'intro' | 'play' | 'end';

export function MimicaPage() {
  const [rows, setRows] = useState<TeamRow[]>(() => normalizeTrailingTeamSlot(loadSavedPlayerNames().slice(0, MAX_PLAYERS).map((name) => ({ name, team: 0 })), MAX_PLAYERS, 2));
  const [numTeams, setNumTeams] = useState(2);
  const [packages, setPackages] = useState<WordPack[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rounds, setRounds] = useState(3);
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [skipSeconds, setSkipSeconds] = useState(5);
  const [setupStep, setSetupStep] = useState(0);
  const [screen, setScreen] = useState<Screen>('setup');
  const [helpOpen, setHelpOpen] = useState(false);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [playerScores, setPlayerScores] = useState<number[]>([]);
  const [teams, setTeams] = useState<BuiltTeam[]>([]);
  const [turnOrder, setTurnOrder] = useState<number[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [currentActorIdx, setCurrentActorIdx] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('intro');
  const [turnCorrect, setTurnCorrect] = useState(0);
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);
  const [wordDeck, setWordDeck] = useState<string[]>([]);
  const [wordDeckIdx, setWordDeckIdx] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [skipPulse, setSkipPulse] = useState(0);

  const audio = useGameAudio();
  const teamIdx = turnOrder[turnIdx] ?? 0;

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
    if (timerRunning && timeRemaining <= 0) { setTimerRunning(false); endTurn(); }
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

  function drawNextWord(deck: string[], idx: number): { word: string; deck: string[]; idx: number } {
    if (idx >= deck.length) { deck = shuffle(deck); idx = 0; }
    return { word: deck[idx], deck, idx: idx + 1 };
  }

  function startTurn(order: number[], idx: number, teamsState: BuiltTeam[]) {
    const team = teamsState[order[idx]];
    const actorIdx = team.memberIdxs[team.nextMemberPointer % team.memberIdxs.length];
    const nextTeams = teamsState.map((t, i) => (i === order[idx] ? { ...t, nextMemberPointer: t.nextMemberPointer + 1 } : t));
    setTeams(nextTeams);
    setCurrentActorIdx(actorIdx);
    setTurnCorrect(0);
    setTurnResults([]);
    setTimeRemaining(turnSeconds);
    setTurnPhase('intro');
  }

  function handleStart() {
    if (!canStart) return;
    const built = buildTeams(rows, numTeams);
    const order: number[] = [];
    for (let r = 0; r < rounds; r++) for (let t = 0; t < numTeams; t++) order.push(t);
    setPlayerNames(built.playerNames);
    setPlayerScores(built.playerNames.map(() => 0));
    setTurnOrder(order);
    setTurnIdx(0);
    setWordDeck(shuffle(buildWordPool()));
    setWordDeckIdx(0);
    setScreen('game');
    startTurn(order, 0, built.teams);
  }

  function beginTurnPlay() {
    audio.unlock();
    setTimeUp(false);
    const { word, deck, idx } = drawNextWord(wordDeck, wordDeckIdx);
    setWordDeck(deck);
    setWordDeckIdx(idx);
    setCurrentWord(word);
    setTurnPhase('play');
    setTimerRunning(true);
  }

  function markCorrect() {
    audio.playCorrect();
    setTeams((current) => current.map((t, i) => (i === teamIdx ? { ...t, score: t.score + 1 } : t)));
    setPlayerScores((current) => current.map((s, i) => (i === currentActorIdx ? s + 1 : s)));
    setTurnCorrect((c) => c + 1);
    setTurnResults((current) => [...current, { word: currentWord, correct: true }]);
    const { word, deck, idx } = drawNextWord(wordDeck, wordDeckIdx);
    setWordDeck(deck);
    setWordDeckIdx(idx);
    setCurrentWord(word);
  }

  function skipCard() {
    audio.playSkip();
    setTurnResults((current) => [...current, { word: currentWord, correct: false }]);
    setSkipPulse((n) => n + 1);
    setTimeRemaining((t) => {
      const next = Math.max(0, t - skipSeconds);
      if (next <= 0) { setTimerRunning(false); endTurn(); }
      return next;
    });
    const { word, deck, idx } = drawNextWord(wordDeck, wordDeckIdx);
    setWordDeck(deck);
    setWordDeckIdx(idx);
    setCurrentWord(word);
  }

  function endTurn() {
    setTimerRunning(false);
    setTimeUp(true);
    audio.playAlarm();
    setTurnPhase('end');
  }

  function toggleResult(index: number) {
    setTurnResults((current) => {
      const next = current.slice();
      const result = next[index];
      const scoreChange = result.correct ? -1 : 1;
      next[index] = { ...result, correct: !result.correct };
      setTeams((teamsCurrent) => teamsCurrent.map((t, i) => (i === teamIdx ? { ...t, score: t.score + scoreChange } : t)));
      setTurnCorrect((c) => c + scoreChange);
      return next;
    });
  }

  function continueAfterTurn() {
    const nextIdx = turnIdx + 1;
    if (nextIdx >= turnOrder.length) { setScreen('end'); return; }
    setTurnIdx(nextIdx);
    startTurn(turnOrder, nextIdx, teams);
  }

  function enterSetup() {
    setTimerRunning(false);
    setSetupStep(0);
    setScreen('setup');
  }

  const maxScore = Math.max(0, ...teams.map((t) => t.score));
  const winners = teams.map((t, i) => i).filter((i) => teams[i]?.score === maxScore);
  const maxPlayerScore = playerScores.length ? Math.max(...playerScores) : 0;
  const minPlayerScore = playerScores.length ? Math.min(...playerScores) : 0;
  const topNames = playerNames.filter((_, i) => playerScores[i] === maxPlayerScore);
  const lowNames = playerNames.filter((_, i) => playerScores[i] === minPlayerScore);

  return (
    <GameThemeProvider slug="mimica">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>MÍMICA</h1>

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

                    <label><span className="label-icon">🔁</span>Rondas por equipo</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setRounds((v) => Math.max(1, v - 1))}>−</button>
                      <div className="value">{rounds}</div>
                      <button type="button" onClick={() => setRounds((v) => Math.min(MAX_ROUNDS, v + 1))}>+</button>
                    </div>

                    <label><span className="label-icon">⏱️</span>Tiempo por turno</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setTurnSeconds((v) => Math.max(15, v - 15))}>−</button>
                      <div className="value">{formatMMSS(turnSeconds)}</div>
                      <button type="button" onClick={() => setTurnSeconds((v) => Math.min(300, v + 15))}>+</button>
                    </div>

                    <label><span className="label-icon">⏭️</span>Segundos que resta saltar palabra</label>
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

        <div className="screen" id="screen-game" hidden={screen !== 'game'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />

            {turnPhase === 'intro' && (
              <div>
                <div className={`team-turn-badge team-color-${teamIdx}`}>{TEAM_NAMES[teamIdx]?.toUpperCase()}</div>
                <div className="player-name">{playerNames[currentActorIdx]}</div>
                <p className="pass-hint">Pasa el dispositivo a esta persona. Que actúe sin hablar mientras su equipo adivina.</p>
                <button type="button" className="btn-main" onClick={beginTurnPlay}>Empezar mi minuto ▶</button>
              </div>
            )}

            {turnPhase === 'play' && (
              <div>
                <div className={`mimica-timer-wrap${timeUp ? ' time-up' : ''}`}>
                  <div key={skipPulse} className="mimica-timer">{formatMMSS(Math.max(0, timeRemaining))}</div>
                </div>
                <div className="mimica-word">{currentWord}</div>
                <div className="icon-action-row">
                  <button type="button" className="icon-action-btn icon-action-skip" aria-label="Saltar" onClick={skipCard}><span className="icon-action-icon" /></button>
                  <button type="button" className="icon-action-btn icon-action-correct" aria-label="Acierto" onClick={markCorrect}><span className="icon-action-icon" /></button>
                </div>
              </div>
            )}

            {turnPhase === 'end' && (
              <div>
                <div className="end-icon">⏱️</div>
                <h1 style={{ fontSize: '1.4rem' }}>¡Tiempo!</h1>
                <p className="subtitle">{playerNames[currentActorIdx]} jugó para {TEAM_NAMES[teamIdx]} y acertó {turnCorrect} {turnCorrect === 1 ? 'palabra.' : 'palabras.'}</p>
                <TurnEndWordPills results={turnResults} teamIdx={teamIdx} pillClassName="mimica-word-pill-wrap" onToggle={toggleResult} />
                <TeamScoreboard scores={teams.map((t) => t.score)} />
                <button type="button" className="btn-main" onClick={continueAfterTurn}>{turnIdx >= turnOrder.length - 1 ? 'Ver resultados' : 'Continuar'}</button>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-end" hidden={screen !== 'end'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="end-icon">🏆</div>
            <h1 style={{ fontSize: '1.6rem' }}>RESULTADOS</h1>
            <TeamScoreboard scores={teams.map((t) => t.score)} highlightWinner showRank />
            <div>
              {playerScores.length > 0 && (maxPlayerScore === minPlayerScore ? (
                <div className="end-player-extreme"><span className="end-player-extreme-label">🤝 Todos empatados</span><span className="end-player-extreme-value">{maxPlayerScore} {maxPlayerScore === 1 ? 'palabra' : 'palabras'}</span></div>
              ) : (
                <>
                  <div className="end-player-extreme"><span className="end-player-extreme-label">🏅 {topNames.join(', ')}</span><span className="end-player-extreme-value">{maxPlayerScore} {maxPlayerScore === 1 ? 'palabra' : 'palabras'}</span></div>
                  <div className="end-player-extreme"><span className="end-player-extreme-label">🥴 {lowNames.join(', ')}</span><span className="end-player-extreme-value">{minPlayerScore} {minPlayerScore === 1 ? 'palabra' : 'palabras'}</span></div>
                </>
              ))}
            </div>
            <button type="button" className="btn-main" onClick={enterSetup}>Nueva partida</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Cada equipo se turna para actuar. Quien tiene el turno ve una palabra y debe representarla sin hablar, sin hacer sonidos y sin deletrearla, mientras su equipo intenta adivinarla en voz alta. ¡Tenéis un tiempo limitado para acertar tantas palabras como podáis!</p>
          <h3>Usar la app</h3>
          <ol>
            <li>Añade a los jugadores por su nombre. Después, en "Equipos", arrástralos a la caja de cada equipo (hasta 4 equipos) o usa el dado 🎲 para repartirlos al azar.</li>
            <li>Elige las categorías, cuántas rondas jugará cada equipo, cuánto dura cada turno y cuántos segundos resta pasar una palabra.</li>
            <li>Pasa el dispositivo a quien le toca actuar y pulsa "Empezar mi minuto".</li>
            <li>Cada palabra acertada suma un punto para el equipo y se guarda en la lista de aciertos del turno. Si os atascáis, saltadla: pasar palabra resta algunos segundos al cronómetro (configurable).</li>
            <li>Al acabar el tiempo, pasa el turno al siguiente equipo. Gana quien más puntos tenga al terminar todos los turnos; al final verás también quién acertó más y menos palabras.</li>
          </ol>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
