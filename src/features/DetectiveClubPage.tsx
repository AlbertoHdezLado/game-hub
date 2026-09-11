import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { RevealCard } from '@/components/game/RevealCard';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { usePersistentNames } from '@/hooks/usePersistentNames';
import { getGame } from '@/data/games';

type Phase = 'setup' | 'word' | 'reveal' | 'vote' | 'result' | 'final';

export function DetectiveClubPage() {
  const game = getGame('detective-club');
  const [names, setNames] = usePersistentNames(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']);
  const [laps, setLaps] = useState(1);
  const [active, setActive] = useState(0);
  const [conspirator, setConspirator] = useState<number | null>(null);
  const [word, setWord] = useState('');
  const [draftWord, setDraftWord] = useState('');
  const [viewed, setViewed] = useState<number[]>([]);
  const [voters, setVoters] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('setup');
  const [activeReveal, setActiveReveal] = useState<number | null>(null);
  const [roleVisible, setRoleVisible] = useState(false);
  const [error, setError] = useState('');

  function startMatch() {
    const cleanNames = names.map((name) => name.trim()).filter(Boolean);
    if (cleanNames.length < 4) { setError('Necesitas al menos 4 jugadores.'); return; }
    setNames(cleanNames); setScores(Array.from({ length: cleanNames.length }, () => 0)); setActive(Math.floor(Math.random() * cleanNames.length)); setRound(0); setPhase('word'); setError('');
  }

  function beginRound() {
    const nextConspirator = [...Array(names.length).keys()].filter((index) => index !== active)[Math.floor(Math.random() * (names.length - 1))];
    setConspirator(nextConspirator); setViewed([]); setVoters([]); setDraftWord(''); setWord(''); setPhase('word');
  }

  function confirmWord() {
    if (!draftWord.trim()) return;
    setWord(draftWord.trim()); setViewed([active]); setPhase('reveal');
  }

  function revealRole(index: number) {
    if (!viewed.includes(index)) { setActiveReveal(index); setRoleVisible(false); }
  }

  function closeReveal() {
    if (activeReveal !== null) setViewed((current) => [...current, activeReveal]);
    setActiveReveal(null); setRoleVisible(false);
  }

  function finishReveal() { if (viewed.length === names.length) setPhase('vote'); }

  function revealConspirator() { setPhase('vote'); }

  function confirmVotes() {
    if (conspirator === null) return;
    const caught = voters.filter((index) => index === conspirator).length >= 2;
    setScores((current) => current.map((score, index) => {
      if (caught && voters.includes(index)) return score + 3;
      if (!caught && index === conspirator) return score + 5;
      if (!caught && index === active) return score + 4;
      return score;
    }));
    setPhase('result');
  }

  function nextRound() {
    const nextRound = round + 1;
    if (nextRound >= names.length * laps) { setPhase('final'); return; }
    setRound(nextRound); setActive((current) => (current + 1) % names.length); setPhase('word'); setDraftWord('');
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell"><header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
    {phase === 'setup' && <section className="game-panel setup-panel"><span className="eyebrow">Configuración</span><h1>Detective Club</h1><PlayerInput label="Jugadores" names={names} onChange={setNames} min={4} /><label className="field-label">Vueltas <strong>{laps}</strong><input type="range" min="1" max="3" value={laps} onChange={(event) => setLaps(Number(event.target.value))} /></label>{error && <p className="form-message">{error}</p>}<button className="primary-button" type="button" onClick={startMatch}>Iniciar partida</button></section>}
    {phase === 'word' && <section className="game-panel"><span className="eyebrow">Turno {round + 1}</span><h1>{names[active]}</h1><p className="panel-help">Pasa el dispositivo al jugador activo y escribe una palabra relacionada con la carta de Dixit.</p><label className="names-field">Palabra secreta<input value={draftWord} onChange={(event) => setDraftWord(event.target.value)} autoFocus /></label><button className="primary-button" type="button" disabled={!draftWord.trim()} onClick={confirmWord}>Repartir roles</button></section>}
    {phase === 'reveal' && <section className="game-panel"><span className="eyebrow">Revelado privado</span><h1>Pasad el móvil</h1><p className="panel-help">El jugador activo no recibe tarjeta. Cada detective debe tocar su nombre y ocultar la pantalla antes de pasarla.</p><div className="player-list">{names.map((name, index) => index === active ? <div className="player-item is-done" key={name}><span>{name} · Activo</span><span>✓</span></div> : <button className={viewed.includes(index) ? 'player-item is-done' : 'player-item'} type="button" key={name} onClick={() => revealRole(index)}><span>{name}</span><span>{viewed.includes(index) ? '✓' : 'Revelar'}</span></button>)}</div><button className="primary-button" type="button" disabled={viewed.length !== names.length} onClick={finishReveal}>Empezar debate</button></section>}
    {phase === 'vote' && <section className="game-panel"><span className="eyebrow">Votación manual</span><h1>¿Quién es el conspirador?</h1><p className="panel-help">Debatid en voz alta. Cuando terminéis, revelad el conspirador y marcad quién votó por él.</p><button className="primary-button" type="button" onClick={revealConspirator}>Revelar conspirador</button><div className="vote-reveal-box"><strong>{conspirator === null ? 'Oculto' : names[conspirator]}</strong><div className="player-list">{names.map((name, index) => index !== active && <button className={voters.includes(index) ? 'player-item selected' : 'player-item'} type="button" key={name} onClick={() => setVoters((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}>{name}<span>{voters.includes(index) ? 'Votó al conspirador' : 'Sin voto'}</span></button>)}</div><button className="primary-button" type="button" disabled={conspirator === null} onClick={confirmVotes}>Confirmar votos</button></div></section>}
    {phase === 'result' && <section className="game-panel"><span className="eyebrow">Resultado de la ronda</span><h1>{voters.includes(conspirator ?? -1) && voters.filter((index) => index === conspirator).length >= 2 ? 'Conspirador descubierto' : 'El conspirador escapa'}</h1><p className="result-highlight">Era {conspirator === null ? '' : names[conspirator]}.</p><p className="panel-help">La palabra era: <strong>{word}</strong></p><div className="final-scores">{names.map((name, index) => <div key={name}><span>{name}</span><strong>{scores[index]} pts</strong></div>)}</div><button className="primary-button" type="button" onClick={nextRound}>Siguiente ronda</button></section>}
    {phase === 'final' && <section className="game-panel"><span className="eyebrow">Partida terminada</span><h1>Marcador final</h1><div className="final-scores">{names.map((name, index) => <div key={name}><span>{name}</span><strong>{scores[index]} pts</strong></div>)}</div><button className="primary-button" type="button" onClick={() => setPhase('setup')}>Nueva partida</button></section>}
    {activeReveal !== null && <div className="dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeReveal(); }}><RevealCard playerName={names[activeReveal]} visible={roleVisible} title={activeReveal === conspirator ? 'Conspirador' : 'Detective'} content={activeReveal === conspirator ? 'No conoces la palabra.' : word} onReveal={() => setRoleVisible(true)} onClose={closeReveal} /></div>}
  </main></GameThemeProvider>;
}
