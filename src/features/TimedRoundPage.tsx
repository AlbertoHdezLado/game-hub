import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { Timer } from '@/components/Timer';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';
import { useCountdown } from '@/hooks/useCountdown';
import { flattenTabooPacks, flattenWordPacks } from '@/types/timed';
import type { TabooCard, TabooContent } from '@/types/timed';
import type { WordPack, WordPackContent } from '@/types/game';

const settings: Record<string, { file: string; time: number; penalty: number }> = {
  mimica: { file: 'packages.json', time: 60, penalty: 5 },
  'times-up': { file: 'packages.json', time: 60, penalty: 5 },
  tabu: { file: 'tabu.json', time: 60, penalty: 5 },
};

const phaseNames = ['Descripción libre', 'Una palabra', 'Mímica'];

type Mode = 'setup' | 'intro' | 'active' | 'end';

export function TimedRoundPage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  const modeSettings = settings[slug];
  const isTaboo = slug === 'tabu';
  const isTimesUp = slug === 'times-up';
  const [packs, setPacks] = useState<WordPack[] | TabooContent['paquetes']>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teams, setTeams] = useState(2);
  const [turnSeconds, setTurnSeconds] = useState(modeSettings?.time ?? 60);
  const [penalty, setPenalty] = useState(modeSettings?.penalty ?? 5);
  const [mode, setMode] = useState<Mode>('setup');
  const [teamTurn, setTeamTurn] = useState(0);
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
    if (!selectedIds.length || !availableCards.length) {
      setMessage('Selecciona al menos un paquete.');
      return;
    }
    setScores(Array.from({ length: teams }, () => 0));
    setTeamTurn(0);
    setPhase(0);
    setDeck([...availableCards].sort(() => Math.random() - 0.5));
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
    setTeamTurn((current) => (current + 1) % teams);
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
        setDeck([...availableCards].sort(() => Math.random() - 0.5));
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
    setDeck([...availableCards].sort(() => Math.random() - 0.5));
    setMode('intro');
  }

  if (!game || !modeSettings) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;

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
          <div className="pack-selector"><div className="selector-heading"><span>Paquetes</span><button type="button" onClick={() => setSelectedIds(selectedIds.length === packs.length ? [] : packs.map((pack) => pack.id))}>{selectedIds.length === packs.length ? 'Quitar todos' : 'Seleccionar todos'}</button></div>{packs.map((pack) => <label className="pack-option" key={pack.id}><input type="checkbox" checked={selectedIds.includes(pack.id)} onChange={() => setSelectedIds((current) => current.includes(pack.id) ? current.filter((id) => id !== pack.id) : [...current, pack.id])} /><span>{pack.icono} {pack.nombre}</span></label>)}</div>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-button" type="button" onClick={beginGame}>Empezar partida</button>
        </section>}
        {mode === 'intro' && <section className="game-panel turn-intro"><span className="eyebrow">{isTimesUp ? `Fase ${phase + 1} de 3 · ${phaseNames[phase]}` : 'Siguiente turno'}</span><h1>Equipo {teamTurn + 1}</h1><p>Preparad el móvil. Tenéis {turnSeconds} segundos.</p>{message && <p className="form-message">{message}</p>}<button className="primary-button" type="button" onClick={beginTurn}>Empezar turno</button></section>}
        {mode === 'active' && <section className="game-panel active-round"><div className="score-row"><span>Equipo {teamTurn + 1}: {scores[teamTurn]} puntos</span><Timer seconds={timer.seconds} running={timer.running} /></div><div className="active-card">{isTaboo && card && typeof card !== 'string' ? <><strong>{card.palabra}</strong><ul>{card.prohibidas.map((word) => <li key={word}>{word}</li>)}</ul></> : <strong>{typeof card === 'string' ? card : 'Cargando…'}</strong>}</div><p className="turn-score">Aciertos en este turno: {turnScore}</p><div className="action-grid"><button className="action-button action-skip" type="button" onClick={skipCard}>Pasar</button>{isTaboo && <button className="action-button action-foul" type="button" onClick={markFoul}>Falta</button>}<button className="action-button action-correct" type="button" onClick={markCorrect}>Acierto</button></div><button className="text-button" type="button" onClick={() => endTurn('Turno terminado')}>Terminar turno</button></section>}
        {mode === 'end' && <section className="game-panel"><span className="eyebrow">Partida terminada</span><h1>Resultado</h1><div className="final-scores">{scores.map((score, index) => <div key={index}><span>Equipo {index + 1}</span><strong>{score}</strong></div>)}</div><button className="primary-button" type="button" onClick={() => setMode('setup')}>Nueva partida</button></section>}
        {mode !== 'setup' && mode !== 'end' && <button className="text-button back-game" type="button" onClick={() => { timer.stop(); setMode('setup'); }}>Volver a configuración</button>}
      </main>
    </GameThemeProvider>
  );
}
