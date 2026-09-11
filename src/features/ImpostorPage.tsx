import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { RevealCard } from '@/components/game/RevealCard';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { getGame } from '@/data/games';
import { loadContent, pickRandom } from '@/lib/content';
import { shuffle } from '@/lib/random';
import { usePersistentNames } from '@/hooks/usePersistentNames';
import type { WordPack, WordPackContent } from '@/types/game';

type Phase = 'setup' | 'reveal' | 'vote' | 'result';
type ImpostorMode = 'none' | 'hint' | 'white';

export function ImpostorPage() {
  const game = getGame('impostor');
  const [names, setNames] = usePersistentNames(['Jugador 1', 'Jugador 2', 'Jugador 3']);
  const [impostorCount, setImpostorCount] = useState(1);
  const [customWord, setCustomWord] = useState('');
  const [mode, setMode] = useState<ImpostorMode>('none');
  const [packs, setPacks] = useState<WordPack[]>([]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [word, setWord] = useState('');
  const [hint, setHint] = useState('');
  const [impostors, setImpostors] = useState<number[]>([]);
  const [revealedPlayers, setRevealedPlayers] = useState<number[]>([]);
  const [activePlayer, setActivePlayer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [vote, setVote] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent<WordPackContent>('impostor-words.json').then((content) => setPacks(content.paquetes)).catch(() => setError('No se pudo cargar el contenido.'));
  }, []);

  function startGame() {
    const cleanNames = names.map((name) => name.trim()).filter(Boolean);
    if (cleanNames.length < 3) { setError('Necesitas al menos 3 jugadores.'); return; }
    if (impostorCount >= cleanNames.length) { setError('Debe quedar al menos un civil.'); return; }
    const selected = customWord.trim() || pickRandom(pickRandom(packs).palabras);
    const impostorIndexes = shuffle([...Array(cleanNames.length).keys()]).slice(0, impostorCount);
    const selectedPack = packs.find((pack) => pack.palabras.includes(selected));
    setNames(cleanNames);
    setWord(selected);
    setHint(selectedPack?.relacionadas?.[selected] ?? '');
    setImpostors(impostorIndexes);
    setRevealedPlayers([]);
    setPhase('reveal');
    setError('');
  }

  function openPlayer(index: number) {
    setActivePlayer(index);
    setRevealed(false);
  }

  function closePlayer() {
    if (activePlayer !== null && revealed && !revealedPlayers.includes(activePlayer)) setRevealedPlayers((current) => [...current, activePlayer]);
    setActivePlayer(null);
    setRevealed(false);
  }

  function playerRole(index: number) {
    const isImpostor = impostors.includes(index);
    if (!isImpostor) return { title: 'Civil', detail: word };
    if (mode === 'white') return { title: 'Mr. Blanco', detail: hint || 'No tienes palabra secreta.' };
    if (mode === 'hint') return { title: 'Impostor', detail: hint ? `Pista: ${hint}` : 'No conoces la palabra.' };
    return { title: 'Impostor', detail: 'No conoces la palabra secreta.' };
  }

  function confirmVote() {
    if (vote === null) return;
    setResult(vote);
    setPhase('result');
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell">
    <header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
    {phase === 'setup' && <section className="game-panel setup-panel"><span className="eyebrow">Configuración</span><h1>Impostor</h1><PlayerInput label="Jugadores" names={names} onChange={setNames} min={3} max={20} /><label className="field-label">Impostores <strong>{impostorCount}</strong><input type="range" min="1" max={Math.max(1, names.length - 1)} value={impostorCount} onChange={(event) => setImpostorCount(Number(event.target.value))} /></label><label className="names-field">Palabra personalizada <input value={customWord} onChange={(event) => setCustomWord(event.target.value)} placeholder="Vacío = aleatoria" /></label><div className="mode-choice"><span>Modo del impostor</span>{(['none', 'hint', 'white'] as ImpostorMode[]).map((item) => <button className={mode === item ? 'selected' : ''} type="button" key={item} onClick={() => setMode(item)}>{item === 'none' ? 'Sin pista' : item === 'hint' ? 'Con pista' : 'Mr. Blanco'}</button>)}</div>{error && <p className="form-message">{error}</p>}<button className="primary-button" type="button" onClick={startGame} disabled={!packs.length}>Repartir roles</button></section>}
    {phase === 'reveal' && <section className="game-panel"><span className="eyebrow">Revelado privado</span><h1>Pasad el móvil</h1><p className="panel-help">Cada persona toca su nombre, revela su rol y cierra la tarjeta antes de pasar el móvil.</p><div className="player-list">{names.map((name, index) => <button className={revealedPlayers.includes(index) ? 'player-item is-done' : 'player-item'} type="button" key={`${name}-${index}`} onClick={() => openPlayer(index)}><span>{name || `Jugador ${index + 1}`}</span><span>{revealedPlayers.includes(index) ? '✓' : 'Revelar'}</span></button>)}</div><button className="primary-button" type="button" disabled={revealedPlayers.length !== names.length} onClick={() => setPhase('vote')}>Empezar debate</button></section>}
    {phase === 'vote' && <section className="game-panel"><span className="eyebrow">Debate</span><h1>¿Quién es el impostor?</h1><div className="player-list">{names.map((name, index) => <button className={vote === index ? 'player-item selected' : 'player-item'} type="button" key={`${name}-vote`} onClick={() => setVote(index)}>{name}</button>)}</div><button className="primary-button" type="button" disabled={vote === null} onClick={confirmVote}>Comprobar voto</button></section>}
    {phase === 'result' && result !== null && <section className="game-panel"><span className="eyebrow">Resultado</span><h1>{impostors.includes(result) ? '¡Habéis acertado!' : 'El impostor escapa'}</h1><p className="result-highlight">{names[result]} era {impostors.includes(result) ? 'impostor' : 'civil'}.</p><p className="panel-help">La palabra era: <strong>{word}</strong></p><div className="final-scores">{names.map((name, index) => <div key={`${name}-result`}><span>{name}</span><strong>{impostors.includes(index) ? 'Impostor' : 'Civil'}</strong></div>)}</div><button className="primary-button" type="button" onClick={() => setPhase('setup')}>Nueva partida</button></section>}
    {activePlayer !== null && <div className="dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closePlayer(); }}><RevealCard playerName={names[activePlayer]} visible={revealed} title={playerRole(activePlayer).title} content={playerRole(activePlayer).detail} onReveal={() => setRevealed(true)} onClose={closePlayer} /></div>}
  </main></GameThemeProvider>;
}
