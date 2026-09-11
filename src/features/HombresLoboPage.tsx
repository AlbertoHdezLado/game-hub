import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';

type Team = 'lobos' | 'aldeanos' | 'solitario';
type Phase = 'setup' | 'reveal' | 'night' | 'vote' | 'result' | 'final';
interface Role { id: string; nombre: string; equipo: Team; descripcion: string; imagen: string; maxCount: number }
interface Player { name: string; role: Role; alive: boolean }
interface RoleContent { roles: Role[] }

const nightRoleIds = new Set(['lobo_comun', 'lobo_feroz', 'vidente', 'bruja', 'protector', 'cupido', 'zorro']);

export function HombresLoboPage() {
  const game = getGame('hombres-lobo');
  const [roles, setRoles] = useState<Role[]>([]);
  const [names, setNames] = useState(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5', 'Jugador 6']);
  const [wolfCount, setWolfCount] = useState(2);
  const [specialIds, setSpecialIds] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [activeReveal, setActiveReveal] = useState<number | null>(null);
  const [roleVisible, setRoleVisible] = useState(false);
  const [nightTarget, setNightTarget] = useState<number | null>(null);
  const [voteTarget, setVoteTarget] = useState<number | null>(null);
  const [lastDeath, setLastDeath] = useState<number | null>(null);
  const [winner, setWinner] = useState<Team | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadContent<RoleContent>('werewolf-roles.json').then((data) => setRoles(data.roles)); }, []);
  const selectableRoles = useMemo(() => roles.filter((role) => role.equipo === 'aldeanos' && role.id !== 'aldeano_comun' && role.maxCount > 0), [roles]);
  const alivePlayers = players.map((player, index) => ({ player, index })).filter(({ player }) => player.alive);

  function startGame() {
    const cleanNames = names.map((name) => name.trim()).filter(Boolean);
    const wolfRole = roles.find((role) => role.id === 'lobo_comun');
    const villagerRole = roles.find((role) => role.id === 'aldeano_comun');
    if (!wolfRole || !villagerRole || cleanNames.length < 5) { setError('Necesitas al menos 5 jugadores y los roles base cargados.'); return; }
    if (wolfCount >= cleanNames.length) { setError('Debe quedar al menos un aldeano.'); return; }
    const chosenSpecials = specialIds.map((id) => roles.find((role) => role.id === id)).filter((role): role is Role => Boolean(role)).slice(0, cleanNames.length - wolfCount - 1);
    const assigned = [...Array.from({ length: wolfCount }, () => wolfRole), ...chosenSpecials, ...Array.from({ length: cleanNames.length - wolfCount - chosenSpecials.length }, () => villagerRole)].sort(() => Math.random() - 0.5);
    setPlayers(cleanNames.map((name, index) => ({ name, role: assigned[index], alive: true })));
    setPhase('reveal'); setError(''); setActiveReveal(null); setRoleVisible(false);
  }

  function closeReveal() { setActiveReveal(null); setRoleVisible(false); }
  function applyNight() {
    if (nightTarget === null) return;
    setPlayers((current) => current.map((player, index) => index === nightTarget ? { ...player, alive: false } : player));
    setLastDeath(nightTarget); setNightTarget(null); setPhase('vote');
  }
  function applyVote() {
    if (voteTarget === null) return;
    const nextPlayers = players.map((player, index) => index === voteTarget ? { ...player, alive: false } : player);
    setPlayers(nextPlayers); setLastDeath(voteTarget); setVoteTarget(null);
    const status = getWinner(nextPlayers);
    if (status) { setWinner(status); setPhase('final'); } else setPhase('result');
  }
  function getWinner(current: Player[]): Team | null {
    const livingWolves = current.filter((player) => player.alive && player.role.equipo === 'lobos').length;
    const livingVillagers = current.filter((player) => player.alive && player.role.equipo === 'aldeanos').length;
    if (livingWolves === 0) return 'aldeanos';
    if (livingWolves >= livingVillagers) return 'lobos';
    return null;
  }
  function continueNight() {
    const status = getWinner(players);
    if (status) { setWinner(status); setPhase('final'); } else setPhase('night');
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell werewolf-shell"><header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
    {phase === 'setup' && <section className="game-panel setup-panel"><span className="eyebrow">Configuración</span><h1>Hombres Lobo</h1><label className="names-field">Jugadores separados por comas<input value={names.join(', ')} onChange={(event) => setNames(event.target.value.split(','))} /></label><label className="field-label">Lobos <strong>{wolfCount}</strong><input type="range" min="1" max={Math.max(1, names.length - 1)} value={wolfCount} onChange={(event) => setWolfCount(Number(event.target.value))} /></label><div className="role-catalog"><span>Roles especiales opcionales</span>{selectableRoles.slice(0, 8).map((role) => <label className="pack-option" key={role.id}><input type="checkbox" checked={specialIds.includes(role.id)} onChange={() => setSpecialIds((current) => current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id])} /><span>{role.nombre}</span></label>)}</div>{error && <p className="form-message">{error}</p>}<button className="primary-button" type="button" disabled={!roles.length} onClick={startGame}>Repartir roles</button></section>}
    {phase === 'reveal' && <section className="game-panel"><span className="eyebrow">Revelado privado</span><h1>Pasad el móvil</h1><p className="panel-help">Cada jugador toca su nombre, mira su rol y lo oculta antes de pasar el móvil.</p><div className="player-list">{players.map((player, index) => <button className="player-item" type="button" key={player.name} onClick={() => { setActiveReveal(index); setRoleVisible(false); }}><span>{player.name}</span><span>Revelar</span></button>)}</div><button className="primary-button" type="button" onClick={() => setPhase('night')}>Empezar noche</button></section>}
    {phase === 'night' && <section className="game-panel"><span className="eyebrow">🌙 Noche</span><h1>El narrador decide</h1><p className="panel-help">Los lobos eligen en silencio a un aldeano para devorar. Esta versión registra la víctima desde el dispositivo del narrador.</p><div className="player-list">{alivePlayers.filter(({ player }) => player.role.equipo !== 'lobos').map(({ player, index }) => <button className={nightTarget === index ? 'player-item selected' : 'player-item'} type="button" key={player.name} onClick={() => setNightTarget(index)}>{player.name}</button>)}</div><button className="primary-button" type="button" disabled={nightTarget === null} onClick={applyNight}>Resolver noche</button></section>}
    {phase === 'vote' && <section className="game-panel"><span className="eyebrow">☀️ Día</span><h1>Votación</h1>{lastDeath !== null && <p className="panel-help">Esta noche ha muerto {players[lastDeath]?.name}.</p>}<div className="player-list">{alivePlayers.map(({ player, index }) => <button className={voteTarget === index ? 'player-item selected' : 'player-item'} type="button" key={player.name} onClick={() => setVoteTarget(index)}>{player.name}</button>)}</div><button className="primary-button" type="button" disabled={voteTarget === null} onClick={applyVote}>Confirmar linchamiento</button></section>}
    {phase === 'result' && <section className="game-panel"><span className="eyebrow">Ronda resuelta</span><h1>Amanece</h1><p className="panel-help">La partida continúa. Preparad la siguiente noche.</p><button className="primary-button" type="button" onClick={continueNight}>Siguiente noche</button></section>}
    {phase === 'final' && <section className="game-panel"><span className="eyebrow">Partida terminada</span><h1>Ganan los {winner === 'lobos' ? 'lobos' : 'aldeanos'}</h1><div className="final-scores">{players.map((player) => <div key={player.name}><span>{player.name}</span><strong>{player.role.nombre}</strong></div>)}</div><button className="primary-button" type="button" onClick={() => setPhase('setup')}>Nueva partida</button></section>}
    {activeReveal !== null && <div className="dialog-backdrop" role="presentation" onClick={closeReveal}><section className="reveal-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><span className="eyebrow">{players[activeReveal].name}</span>{!roleVisible ? <><h2>Tu rol está oculto</h2><button className="primary-button" type="button" onClick={() => setRoleVisible(true)}>Revelar</button></> : <><h2>{players[activeReveal].role.nombre}</h2><p className="role-word">{players[activeReveal].role.descripcion}</p><button className="primary-button" type="button" onClick={closeReveal}>Ocultar y pasar</button></>}</section></div>}
  </main></GameThemeProvider>;
}
