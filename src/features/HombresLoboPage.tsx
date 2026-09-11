import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';
import { shuffle } from '@/lib/random';
import { usePersistentNames } from '@/hooks/usePersistentNames';

type Team = 'lobos' | 'aldeanos' | 'solitario';
type Phase = 'setup' | 'reveal' | 'night' | 'vote' | 'result' | 'roster' | 'final';
interface Role { id: string; nombre: string; equipo: Team; descripcion: string; imagen: string; maxCount: number }
interface Player { name: string; role: Role; alive: boolean }
interface RoleContent { roles: Role[] }

const teamClass: Record<Team, string> = { lobos: 'danger', aldeanos: 'safe', solitario: 'wild' };

function roleImage(role: Role) {
  return role.imagen.startsWith('/') ? role.imagen : `/${role.imagen}`;
}

export function HombresLoboPage() {
  const game = getGame('hombres-lobo');
  const [roles, setRoles] = useState<Role[]>([]);
  const [names, setNames] = usePersistentNames(['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Jugador 5', 'Jugador 6']);
  const [setupStep, setSetupStep] = useState(0);
  const [wolfCount, setWolfCount] = useState(2);
  const [specialIds, setSpecialIds] = useState<string[]>([]);
  const [unguidedMode, setUnguidedMode] = useState(false);
  const [voteMinutes, setVoteMinutes] = useState(0);
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
  const selectableRoles = useMemo(() => roles.filter((role) => role.id !== 'aldeano_comun' && role.id !== 'lobo_comun' && role.maxCount > 0), [roles]);
  const cleanNames = useMemo(() => names.map((name) => name.trim()).filter(Boolean), [names]);
  const wolfRole = roles.find((role) => role.id === 'lobo_comun');
  const villagerRole = roles.find((role) => role.id === 'aldeano_comun');
  const selectedSpecials = specialIds.map((id) => roles.find((role) => role.id === id)).filter((role): role is Role => Boolean(role));
  const includedRoles = [...Array.from({ length: wolfCount }, () => wolfRole).filter((role): role is Role => Boolean(role)), ...selectedSpecials];
  const alivePlayers = players.map((player, index) => ({ player, index })).filter(({ player }) => player.alive);

  function startGame() {
    if (!wolfRole || !villagerRole || cleanNames.length < 5) { setError('Necesitas al menos 5 jugadores y los roles base cargados.'); return; }
    if (wolfCount < 1 || wolfCount >= cleanNames.length) { setError('Debe haber al menos un lobo y un aldeano.'); setSetupStep(1); return; }
    const chosenSpecials = specialIds.map((id) => roles.find((role) => role.id === id)).filter((role): role is Role => Boolean(role)).slice(0, cleanNames.length - wolfCount - 1);
    const assigned = shuffle([...Array.from({ length: wolfCount }, () => wolfRole), ...chosenSpecials, ...Array.from({ length: cleanNames.length - wolfCount - chosenSpecials.length }, () => villagerRole)]);
    setPlayers(cleanNames.map((name, index) => ({ name, role: assigned[index], alive: true })));
    setPhase(unguidedMode ? 'roster' : 'reveal'); setError(''); setActiveReveal(null); setRoleVisible(false);
  }

  function addRole(role: Role) {
    if (includedRoles.length >= cleanNames.length) return;
    if (role.equipo === 'lobos') {
      setWolfCount((count) => Math.min(count + 1, cleanNames.length - 1));
      return;
    }
    const currentCount = specialIds.filter((id) => id === role.id).length;
    if (currentCount < role.maxCount) setSpecialIds((current) => [...current, role.id]);
  }

  function removeIncludedRole(index: number) {
    const role = includedRoles[index];
    if (!role || role.id === 'aldeano_comun') return;
    if (role.id === 'lobo_comun') {
      setWolfCount((count) => Math.max(1, count - 1));
      return;
    }
    setSpecialIds((current) => {
      const removeIndex = current.indexOf(role.id);
      return removeIndex === -1 ? current : current.filter((_, itemIndex) => itemIndex !== removeIndex);
    });
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
  return <GameThemeProvider theme={game.theme}><main className="game-shell werewolf-shell legacy-werewolf-shell">
    {phase === 'setup' && <section className="screen legacy-screen" id="screen-setup"><div className={`card ${setupStep === 1 ? 'balance-visible' : ''}`}><div className="setup-header"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><h1>HOMBRES LOBO</h1>{setupStep === 0 && <div id="setup-step-players"><label><span className="label-icon">👥</span>Jugadores</label><PlayerInput names={names} onChange={setNames} min={5} max={20} /><div className="error-msg">{error}</div></div>}{setupStep === 1 && <div id="setup-step-roles"><label><span className="label-icon">🎭</span>Roles incluidos ({includedRoles.length} / {cleanNames.length})</label><div className="role-picker-grid">{includedRoles.map((role, index) => <button type="button" className="role-slot filled" key={`${role.id}-${index}`} onClick={() => removeIncludedRole(index)}><img src={roleImage(role)} alt="" loading="lazy" /><span className="role-picker-name">{role.nombre}</span></button>)}{Array.from({ length: Math.max(0, cleanNames.length - includedRoles.length) }, (_, index) => <div className="role-slot empty" key={index}>?</div>)}</div><div className="error-msg">{error}</div><div className="section-label-row"><label>Toca para añadir un rol</label><button type="button" className="section-help-btn" aria-label="Ayuda">?</button></div><div className="role-picker-grid">{selectableRoles.slice(0, 18).map((role) => <button type="button" className="role-picker-card" key={role.id} onClick={() => addRole(role)} disabled={includedRoles.length >= cleanNames.length}><img src={roleImage(role)} alt="" loading="lazy" /><span className="role-picker-name">{role.nombre}</span></button>)}</div></div>}{setupStep === 2 && <div id="setup-step-final"><details className="setup-optional" open><summary>Ajustes adicionales</summary><div className="setup-optional-content"><label className="switch-toggle"><input type="checkbox" checked={unguidedMode} onChange={(event) => setUnguidedMode(event.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span>Modo no guiado</label><label><span className="label-icon">⏱️</span>Tiempo para votar</label><div className="stepper"><button type="button" onClick={() => setVoteMinutes((value) => Math.max(0, value - 1))}>−</button><div className="value">{voteMinutes === 0 ? 'Sin límite' : `${voteMinutes}:00`}</div><button type="button" onClick={() => setVoteMinutes((value) => Math.min(10, value + 1))}>+</button></div></div></details><div className="final-nav"><button type="button" className="night-nav-btn icon-only" onClick={() => setSetupStep(1)} aria-label="Anterior"><span className="back-icon" /></button><button className="btn-main" type="button" disabled={!roles.length} onClick={startGame}>Iniciar partida</button></div></div>}{setupStep < 2 && <div className="night-nav"><button type="button" className="night-nav-btn icon-only" disabled={setupStep === 0} onClick={() => setSetupStep((step) => Math.max(0, step - 1))} aria-label="Anterior"><span className="back-icon" /></button><button type="button" className="night-nav-btn" onClick={() => setSetupStep((step) => Math.min(2, step + 1))}>Siguiente</button></div>}</div>{setupStep === 1 && <div className="balance-bar-fixed"><div className="balance-track"><div className="balance-fill-lobos" style={{ flexBasis: `${(wolfCount / Math.max(1, cleanNames.length)) * 100}%` }} /><div className="balance-fill-aldeanos" style={{ flexBasis: `${((cleanNames.length - wolfCount) / Math.max(1, cleanNames.length)) * 100}%` }} /></div><div className="balance-legend"><span>🐺 Lobos</span><span className="balance-verdict">{wolfCount > cleanNames.length / 3 ? 'Partida peligrosa' : 'Equilibrio suave'}</span><span>Pueblo 🏘️</span></div></div>}</section>}
    {phase === 'reveal' && <section className="screen legacy-screen" id="screen-game"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setPhase('setup')}><span className="back-icon" /></button></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><p className="subtitle">Toca tu nombre para ver tu carta. Nadie más debe mirar.</p><div className="roster-list">{players.map((player, index) => <button className="role-row roster-row" type="button" key={player.name} onClick={() => { setActiveReveal(index); setRoleVisible(false); }}><span className="roster-name">{player.name}</span><span className="roster-status-icon">🎴</span></button>)}</div><button className="btn-main" type="button" onClick={() => setPhase('night')}>Continuar</button></div></section>}
    {(phase === 'night' || phase === 'vote' || phase === 'result') && <section className="screen legacy-screen" id="screen-narrator"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setPhase('setup')}><span className="back-icon" /></button><span className="back-btn">{phase === 'night' ? '🌙 Noche' : '☀️ Día'}</span></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><div className="narrator-balance-track"><div className="narrator-balance-fill-lobos" style={{ flexBasis: `${(players.filter((player) => player.alive && player.role.equipo === 'lobos').length / Math.max(1, alivePlayers.length)) * 100}%` }} /><div className="narrator-balance-fill-aldeanos" style={{ flexBasis: `${(players.filter((player) => player.alive && player.role.equipo !== 'lobos').length / Math.max(1, alivePlayers.length)) * 100}%` }} /></div>{phase === 'night' && <div id="panel-night"><p className="narrator-cue">Los lobos despiertan y el narrador registra la víctima.</p><div className="roster-list">{alivePlayers.filter(({ player }) => player.role.equipo !== 'lobos').map(({ player, index }) => <button className={`vote-row ${nightTarget === index ? 'selected' : ''}`} type="button" key={player.name} onClick={() => setNightTarget(index)}><span className="death-left"><span className="death-name">{player.name}</span></span><span className="death-role-tag">{player.role.nombre}</span></button>)}</div><button className="btn-main" type="button" disabled={nightTarget === null} onClick={applyNight}>Resolver noche</button></div>}{phase === 'vote' && <div id="panel-vote"><p className="narrator-cue">{lastDeath !== null ? `Esta noche ha muerto ${players[lastDeath]?.name}.` : 'El pueblo debate y vota.'}</p><label>¿A quién ha votado el pueblo para linchar?</label><div>{alivePlayers.map(({ player, index }) => <button className={`vote-row ${voteTarget === index ? 'selected' : ''}`} type="button" key={player.name} onClick={() => setVoteTarget(index)}><span className="death-left"><span className="death-name">{player.name}</span></span><span className="death-role-tag">{player.role.nombre}</span></button>)}</div><button className="btn-main" type="button" disabled={voteTarget === null} onClick={applyVote}>Confirmar votación</button></div>}{phase === 'result' && <div id="vote-continue-view"><p className="narrator-cue">La partida continúa. Preparad la siguiente noche.</p><button className="btn-main" type="button" onClick={continueNight}>Siguiente ronda</button></div>}</div></section>}
    {phase === 'roster' && <section className="screen legacy-screen" id="screen-roster"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setPhase('setup')}><span className="back-icon" /></button><span className="back-btn">Personajes</span></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><label>Vivos</label><div className="roster-list">{players.map((player, index) => <button type="button" className={`vote-row ${player.alive ? '' : 'dead'}`} key={player.name} onClick={() => setPlayers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alive: !item.alive } : item))}><span className="death-left"><span className="death-name">{player.name}</span></span><span className="death-role-tag">{player.role.nombre}</span></button>)}</div></div></section>}
    {phase === 'final' && <section className="screen legacy-screen"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setPhase('setup')}><span className="back-icon" /></button></div><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><div className="end-icon">🏆</div><h1 className={`game-over-title winner-${winner}`}>Ganan los {winner === 'lobos' ? 'lobos' : 'aldeanos'}</h1><div className="game-over-summary">{players.map((player) => <p key={player.name}><strong>{player.name}</strong> · {player.role.nombre}</p>)}</div><button className="btn-main" type="button" onClick={() => setPhase('setup')}>Nueva partida</button></div></section>}
    {activeReveal !== null && <div className="guide-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeReveal(); }}><div className="guide-modal reveal-modal"><button type="button" className="guide-modal-close" onClick={closeReveal}>✕</button><div className="pass-hint">No se lo enseñes a nadie más.</div><div className={`reveal-wrap ${roleVisible ? 'revealed' : ''}`}><div className={`reveal-content ${roleVisible ? 'desc-open' : ''}`} onClick={() => roleVisible && setRoleVisible(false)}><img className="reveal-portrait" src={roleImage(players[activeReveal].role)} alt="" draggable="false" /><div className="reveal-desc-overlay">{players[activeReveal].role.descripcion}</div></div><button type="button" className="reveal-btn" onClick={() => setRoleVisible(true)}><span className="reveal-icon">👁️</span><span className="reveal-text">Revelar</span></button></div><div className={`reveal-name-caption ${roleVisible ? 'visible' : ''} ${teamClass[players[activeReveal].role.equipo]}`}>{players[activeReveal].role.nombre}<span className="reveal-hint">Toca la carta para ocultar la descripción</span></div></div></div>}
  </main></GameThemeProvider>;
}
