import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { TeamTurnBadge } from '@/components/game/TeamTurnBadge';
import { ActionGrid } from '@/components/game/ActionGrid';
import { ScoreRow } from '@/components/game/ScoreRow';
import { PackSelector } from '@/components/ui/PackSelector';
import { Timer } from '@/components/Timer';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';
import { useCountdown } from '@/hooks/useCountdown';
import { usePersistentNames } from '@/hooks/usePersistentNames';
import { flattenTabooPacks, flattenWordPacks } from '@/types/timed';
import { shuffle } from '@/lib/random';
import type { TabooCard, TabooContent } from '@/types/timed';
import type { WordPack, WordPackContent } from '@/types/game';

const settings: Record<string, { file: string; time: number; penalty: number }> = {
  mimica: { file: 'packages.json', time: 60, penalty: 5 },
  'times-up': { file: 'packages.json', time: 60, penalty: 5 },
  tabu: { file: 'tabu.json', time: 60, penalty: 5 },
};

const phaseNames = ['Descripción libre', 'Una palabra', 'Mímica'];
const teamNames = ['Azul', 'Rojo', 'Verde', 'Amarillo'];

type Mode = 'setup' | 'intro' | 'active' | 'end';

export function TimedRoundPage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  const modeSettings = settings[slug];
  const isTaboo = slug === 'tabu';
  const isTimesUp = slug === 'times-up';
  const [packs, setPacks] = useState<WordPack[] | TabooContent['paquetes']>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState(0);
  const [names, setNames] = usePersistentNames(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  const [teamAssignments, setTeamAssignments] = useState<number[]>([0, 1, 0, 1]);
  const [teams, setTeams] = useState(2);
  const [turnSeconds, setTurnSeconds] = useState(modeSettings?.time ?? 60);
  const [penalty, setPenalty] = useState(modeSettings?.penalty ?? 5);
  const [mode, setMode] = useState<Mode>('setup');
  const [teamTurn, setTeamTurn] = useState(0);
  const [actorCursor, setActorCursor] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [phase, setPhase] = useState(0);
  const [deck, setDeck] = useState<Array<string | TabooCard>>([]);
  const [card, setCard] = useState<string | TabooCard | null>(null);
  const [turnScore, setTurnScore] = useState(0);
  const [message, setMessage] = useState('');

  const onExpire = () => endTurn('Se acabó el tiempo');
  const timer = useCountdown(turnSeconds, onExpire);
  const availableCards = useMemo(() => {
    if (isTaboo) return flattenTabooPacks(packs as TabooContent['paquetes'], selectedIds);
    return flattenWordPacks(packs as WordPack[], selectedIds);
  }, [isTaboo, packs, selectedIds]);
  const cleanNames = useMemo(() => names.map((name) => name.trim()).filter(Boolean), [names]);
  const activeAssignments = teamAssignments.slice(0, cleanNames.length).map((team) => Math.min(team, teams - 1));
  const currentActor = cleanNames[actorCursor % Math.max(1, cleanNames.length)] ?? `Equipo ${teamTurn + 1}`;

  useEffect(() => {
    if (!modeSettings) return;
    loadContent<WordPackContent | TabooContent>(modeSettings.file).then((content) => {
      const loaded = content.paquetes;
      setPacks(loaded);
      setSelectedIds(loaded.map((pack) => pack.id));
    }).catch(() => setMessage('No se pudo cargar el contenido.'));
  }, [modeSettings]);

  useEffect(() => {
    if (mode === 'active' && !card) drawCard(deck);
  }, [mode, card, deck]);

  function drawCard(source: Array<string | TabooCard>) {
    if (!source.length) {
      endTurn('Mazo agotado');
      return;
    }
    const next = source[0];
    setDeck(source.slice(1));
    setCard(next);
  }

  function beginGame() {
    if (isTimesUp) {
      const emptyTeam = Array.from({ length: teams }, (_, team) => team).find((team) => !activeAssignments.includes(team));
      if (cleanNames.length < 2) {
        setMessage('Necesitas al menos 2 jugadores.');
        setSetupStep(0);
        return;
      }
      if (emptyTeam !== undefined) {
        setMessage(`${teamNames[emptyTeam]} no tiene jugadores.`);
        setSetupStep(1);
        return;
      }
    }
    if (!selectedIds.length || !availableCards.length) {
      setMessage('Selecciona al menos un paquete.');
      setSetupStep(2);
      return;
    }
    setScores(Array.from({ length: teams }, () => 0));
    setTeamTurn(0);
    setActorCursor(0);
    setPhase(0);
    setDeck(shuffle<string | TabooCard>(availableCards));
    setMode(isTimesUp ? 'intro' : 'intro');
    setMessage('');
  }

  function beginTurn() {
    setTurnScore(0);
    setCard(null);
    timer.reset(turnSeconds);
    setMode('active');
    timer.start();
  }

  function nextTurn() {
    timer.stop();
    if (!isTimesUp) {
      setTeamTurn((current) => (current + 1) % teams);
      setMode('intro');
      return;
    }
    const nextTeam = (teamTurn + 1) % teams;
    setTeamTurn(nextTeam);
    setActorCursor((current) => {
      const nextIndex = cleanNames.findIndex((_, index) => index > current && activeAssignments[index] === nextTeam);
      if (nextIndex !== -1) return nextIndex;
      const firstIndex = activeAssignments.findIndex((team) => team === nextTeam);
      return firstIndex === -1 ? current : firstIndex;
    });
    setMode(isTimesUp ? 'intro' : 'intro');
  }

  function endTurn(reason: string) {
    timer.stop();
    setMessage(reason);
    if (reason === 'Mazo agotado' && isTimesUp) {
      if (phase >= 2) {
        setMode('end');
      } else {
        setPhase((current) => current + 1);
        setDeck(shuffle<string | TabooCard>(availableCards));
        setMode('intro');
      }
      return;
    }
    setMode('intro');
  }

  function markCorrect() {
    setScores((current) => current.map((score, index) => index === teamTurn ? score + 1 : score));
    setTurnScore((current) => current + 1);
    drawCard(deck);
  }

  function skipCard() {
    if (!card) return;
    setDeck((current) => [...current, card]);
    setCard(null);
    timer.subtract(penalty);
    setMessage(`Pasada: -${penalty}s`);
  }

  function markFoul() {
    setScores((current) => current.map((score, index) => index === teamTurn ? score - 1 : score));
    skipCard();
  }

  function finishPhase() {
    if (!isTimesUp || phase >= 2) {
      timer.stop();
      setMode('end');
      return;
    }
    setPhase((current) => current + 1);
    setDeck(shuffle<string | TabooCard>(availableCards));
    setMode('intro');
  }

  function changeTeamCount(nextTeams: number) {
    const value = Math.min(4, Math.max(2, nextTeams));
    setTeams(value);
    setScores(Array.from({ length: value }, () => 0));
    setTeamAssignments((current) => names.map((_, index) => Math.min(current[index] ?? (index % value), value - 1)));
  }

  function randomizeTeams() {
    const shuffledIndexes = shuffle(cleanNames.map((_, index) => index));
    const next = names.map((_, index) => Math.min(teamAssignments[index] ?? (index % teams), teams - 1));
    shuffledIndexes.forEach((playerIndex, order) => { next[playerIndex] = order % teams; });
    setTeamAssignments(next);
  }

  function movePlayerToNextTeam(playerIndex: number) {
    setTeamAssignments((current) => names.map((_, index) => index === playerIndex ? ((current[index] ?? 0) + 1) % teams : Math.min(current[index] ?? (index % teams), teams - 1)));
  }

  function handleNamesChange(nextNames: string[]) {
    setNames(nextNames);
    setTeamAssignments((current) => nextNames.map((_, index) => Math.min(current[index] ?? (index % teams), teams - 1)));
  }

  if (!game || !modeSettings) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;

  if (!isTimesUp) {
    return (
      <GameThemeProvider theme={game.theme}>
        <main className="game-shell timed-shell">
          <header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
          {mode === 'setup' && <section className="game-panel setup-panel">
            <span className="eyebrow">Configuración</span>
            <h1>{game.title}</h1>
            <label className="field-label">Equipos <strong>{teams}</strong><input type="range" min="2" max="4" value={teams} onChange={(event) => { const value = Number(event.target.value); setTeams(value); setScores(Array.from({ length: value }, () => 0)); }} /></label>
            <label className="field-label">Tiempo por turno <strong>{turnSeconds}s</strong><input type="range" min="15" max="120" step="15" value={turnSeconds} onChange={(event) => setTurnSeconds(Number(event.target.value))} /></label>
            <label className="field-label">Penalización al pasar <strong>{penalty}s</strong><input type="range" min="0" max="30" value={penalty} onChange={(event) => setPenalty(Number(event.target.value))} /></label>
            <PackSelector packs={packs.map((pack) => ({ id: pack.id, label: pack.nombre, icon: pack.icono }))} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onToggleAll={() => setSelectedIds(selectedIds.length === packs.length ? [] : packs.map((pack) => pack.id))} />
            {message && <p className="form-message">{message}</p>}
            <button className="primary-button" type="button" onClick={beginGame}>Empezar partida</button>
          </section>}
          {mode === 'intro' && <section className="game-panel turn-intro"><span className="eyebrow">Siguiente turno</span><TeamTurnBadge team={teamTurn} score={scores[teamTurn]} /><h1>Preparad el turno</h1><p>Tenéis {turnSeconds} segundos.</p>{message && <p className="form-message">{message}</p>}<button className="primary-button" type="button" onClick={beginTurn}>Empezar turno</button></section>}
          {mode === 'active' && <section className="game-panel active-round"><ScoreRow trailing={<Timer seconds={timer.seconds} running={timer.running} />}><TeamTurnBadge team={teamTurn} score={scores[teamTurn]} /></ScoreRow><div className="active-card">{isTaboo && card && typeof card !== 'string' ? <><strong>{card.palabra}</strong><ul>{card.prohibidas.map((word) => <li key={word}>{word}</li>)}</ul></> : <strong>{typeof card === 'string' ? card : 'Cargando…'}</strong>}</div><p className="turn-score">Aciertos en este turno: {turnScore}</p><ActionGrid><button className="action-button action-skip" type="button" onClick={skipCard}>Pasar</button>{isTaboo && <button className="action-button action-foul" type="button" onClick={markFoul}>Falta</button>}<button className="action-button action-correct" type="button" onClick={markCorrect}>Acierto</button></ActionGrid><button className="text-button" type="button" onClick={() => endTurn('Turno terminado')}>Terminar turno</button></section>}
          {mode === 'end' && <section className="game-panel"><span className="eyebrow">Partida terminada</span><h1>Resultado</h1><div className="final-scores">{scores.map((score, index) => <div key={index}><span>Equipo {index + 1}</span><strong>{score}</strong></div>)}</div><button className="primary-button" type="button" onClick={() => setMode('setup')}>Nueva partida</button></section>}
          {mode !== 'setup' && mode !== 'end' && <button className="text-button back-game" type="button" onClick={() => { timer.stop(); setMode('setup'); }}>Volver a configuración</button>}
        </main>
      </GameThemeProvider>
    );
  }

  return (
    <GameThemeProvider theme={game.theme}>
      <main className="game-shell timed-shell">
        {mode === 'setup' && <section className="screen legacy-screen"><div className="card">
          <div className="setup-header"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div>
          <h1>{isTimesUp ? "TIME'S UP" : game.title.toUpperCase()}</h1>
          {setupStep === 0 && <div id="setup-step-players"><label><span className="label-icon">👥</span>Jugadores</label><PlayerInput names={names} onChange={handleNamesChange} min={2} max={30} />{message && <div className="error-msg">{message}</div>}</div>}
          {setupStep === 1 && <div id="setup-step-teams"><label><span className="label-icon">🎯</span>Equipos</label><div className="stepper"><button type="button" onClick={() => changeTeamCount(teams - 1)}>−</button><div className="value">{teams}</div><button type="button" onClick={() => changeTeamCount(teams + 1)}>+</button></div><div className="team-boxes-header"><button type="button" className="randomize-teams-btn" onClick={randomizeTeams}><span className="dice-icon" />Aleatorio</button></div><div>{Array.from({ length: teams }, (_, team) => <div className={`team-box team-color-${team}`} key={team}><div className="team-box-header"><span className={`team-box-dot team-color-${team}`} />{teamNames[team]}</div><div className="team-box-chips">{cleanNames.map((name, index) => activeAssignments[index] === team ? <button type="button" className={`team-box-chip team-color-${team}`} key={`${name}-${index}`} onClick={() => movePlayerToNextTeam(index)}>{name}</button> : null)}{!activeAssignments.includes(team) && <span className="team-box-empty">Sin jugadores</span>}</div></div>)}</div>{message && <div className="error-msg">{message}</div>}</div>}
          {setupStep === 2 && <div id="setup-step-settings"><details className="setup-optional" open><summary>Ajustes adicionales</summary><div className="setup-optional-content"><PackSelector packs={packs.map((pack) => ({ id: pack.id, label: pack.nombre, icon: pack.icono }))} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onToggleAll={() => setSelectedIds(selectedIds.length === packs.length ? [] : packs.map((pack) => pack.id))} /><label><span className="label-icon">⏱️</span>Duración de turno</label><div className="stepper"><button type="button" onClick={() => setTurnSeconds((value) => Math.max(15, value - 15))}>−</button><div className="value">{turnSeconds}s</div><button type="button" onClick={() => setTurnSeconds((value) => Math.min(120, value + 15))}>+</button></div><label><span className="label-icon">⏭️</span>Segundos que resta saltar carta</label><div className="stepper"><button type="button" onClick={() => setPenalty((value) => Math.max(0, value - 1))}>−</button><div className="value">{penalty}</div><button type="button" onClick={() => setPenalty((value) => Math.min(30, value + 1))}>+</button></div></div></details>{message && <div className="error-msg">{message}</div>}<div className="final-nav"><button type="button" className="night-nav-btn icon-only" onClick={() => setSetupStep(1)} aria-label="Anterior"><span className="back-icon" /></button><button className="btn-main" type="button" onClick={beginGame}>Iniciar partida</button></div></div>}
          {setupStep < 2 && <div className="night-nav"><button type="button" className="night-nav-btn icon-only" disabled={setupStep === 0} onClick={() => setSetupStep((step) => Math.max(0, step - 1))} aria-label="Anterior"><span className="back-icon" /></button><button type="button" className="night-nav-btn" onClick={() => setSetupStep((step) => Math.min(2, step + 1))}>Siguiente</button></div>}
        </div></section>}
        {mode === 'intro' && <section className="screen legacy-screen"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => { timer.stop(); setMode('setup'); }}><span className="back-icon" /></button></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><h1 className="phase-title">{isTimesUp ? `FASE ${phase + 1}` : 'TURNO'}</h1><div className="phase-rule-box">{isTimesUp ? phaseNames[phase] : 'Preparad el siguiente turno.'}</div><div className="phase-intro-cards-remaining"><span className="tu-cards-icon">🂠</span><span>x{deck.length}</span></div><div className={`team-turn-badge team-color-${teamTurn}`}>{teamNames[teamTurn].toUpperCase()} <span className="mini-score-pill">{scores[teamTurn]}</span></div><div className="player-name" style={{ color: `var(--team-${teamTurn})` }}>{currentActor}</div><p className="pass-hint">Pasa el dispositivo a esta persona.</p>{message && <div className="error-msg">{message}</div>}<button className="btn-main" type="button" onClick={beginTurn}>Empezar mi turno ▶</button></div></section>}
        {mode === 'active' && <section className="screen legacy-screen"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => { timer.stop(); setMode('setup'); }}><span className="back-icon" /></button><span className="back-btn">Fase {phase + 1} / 3</span></div><div className="header-button-group"><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button><div className="tu-cards-remaining"><span className="tu-cards-icon">🂠</span><span>x{deck.length}</span></div></div></div><div className="tu-timer-wrap"><Timer seconds={timer.seconds} running={timer.running} /></div><div className="tu-word">{isTaboo && card && typeof card !== 'string' ? <><strong>{card.palabra}</strong><ul>{card.prohibidas.map((word) => <li key={word}>{word}</li>)}</ul></> : <span>{typeof card === 'string' ? card : 'Cargando…'}</span>}</div><p className="turn-score">Aciertos en este turno: {turnScore}</p><div className="icon-action-row"><button type="button" className="icon-action-btn icon-action-skip" onClick={skipCard} aria-label="Pasar"><span className="icon-action-icon" /></button>{isTaboo && <button type="button" className="icon-action-btn icon-action-foul" onClick={markFoul} aria-label="Falta">!</button>}<button type="button" className="icon-action-btn icon-action-correct" onClick={markCorrect} aria-label="Acierto"><span className="icon-action-icon" /></button></div><button className="text-button" type="button" onClick={() => endTurn('Turno terminado')}>Terminar turno</button></div></section>}
        {mode === 'end' && <section className="screen legacy-screen"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setMode('setup')}><span className="back-icon" /></button></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><div className="end-icon">🏆</div><h1 className="phase-title">RESULTADOS</h1><div>{scores.map((score, index) => <div className="team-score-row" key={index}><span className="team-score-name"><span className={`mini-score-pill team-color-${index}`}>{index + 1}</span>{teamNames[index]}</span><span className="team-score-value">{score}</span></div>)}</div><button className="btn-main" type="button" onClick={() => setMode('setup')}>Nueva partida</button></div></section>}
      </main>
    </GameThemeProvider>
  );
}
