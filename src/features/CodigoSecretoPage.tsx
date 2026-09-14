import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';
import { shuffle } from '@/lib/random';

interface Category { id: string; nombre: string; palabras: string[] }
interface Content { categorias: Category[] }
type Role = 'red' | 'blue' | 'green' | 'neutral' | 'assassin';

const roleClass: Record<Role, string> = { red: 'role-1', blue: 'role-0', green: 'role-2', neutral: 'role-neutral', assassin: 'role-assassin' };

export function CodigoSecretoPage() {
  const game = getGame('codigo-secreto');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [covered, setCovered] = useState<boolean[]>([]);
  const [keyVisible, setKeyVisible] = useState(false);
  const [teams, setTeams] = useState(2);
  const [startingTeam, setStartingTeam] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { loadContent<Content>('secret-code-words.json').then((data) => { setCategories(data.categorias); setSelectedIds(data.categorias.map((category) => category.id)); }); }, []);

  function createBoard() {
    const pool = shuffle(categories.filter((category) => selectedIds.includes(category.id)).flatMap((category) => category.palabras));
    const board = [...new Set(pool)].slice(0, 25);
    if (board.length < 25) { setError('Selecciona categorías con al menos 25 palabras.'); return; }
    const rolePool: Role[] = teams === 3
      ? [...Array.from({ length: 7 }, () => 'red' as Role), ...Array.from({ length: 7 }, () => 'blue' as Role), ...Array.from({ length: 7 }, () => 'green' as Role), ...Array.from({ length: 3 }, () => 'neutral' as Role), 'assassin']
      : [...Array.from({ length: 8 }, () => 'red' as Role), ...Array.from({ length: 8 }, () => 'blue' as Role), ...Array.from({ length: 8 }, () => 'neutral' as Role), ...Array.from({ length: 1 }, () => 'assassin' as Role)];
    const nextRoles = shuffle(rolePool);
    setWords(board); setRoles(nextRoles); setCovered(Array.from({ length: board.length }, () => false)); setKeyVisible(false); setStartingTeam(Math.floor(Math.random() * teams)); setError('');
  }

  function toggleCategory(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function categorySummary() {
    if (selectedIds.length === categories.length) return 'Todas las categorías';
    if (!selectedIds.length) return 'Selecciona categorías';
    if (selectedIds.length === 1) return categories.find((category) => category.id === selectedIds[0])?.nombre ?? '1 categoría';
    return `${selectedIds.length} categorías seleccionadas`;
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell code-shell shared-code-shell">{!words.length ? <section className="screen shared-screen" id="screen-setup"><div className="card"><div className="setup-header"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button></div><h1>CÓDIGO SECRETO</h1><label><span className="label-icon">🎯</span>Equipos</label><div className="stepper"><button type="button" onClick={() => setTeams(2)}>−</button><div className="value">{teams}</div><button type="button" onClick={() => setTeams(3)}>+</button></div><details className="setup-optional"><summary>Ajustes adicionales</summary><div className="setup-optional-content"><label><span className="label-icon">🏷️</span>Categorías</label><button type="button" className="packages-dropdown-btn" aria-expanded={packagesOpen} onClick={() => setPackagesOpen((open) => !open)}><span className="packages-dropdown-summary">{categorySummary()}</span><span className="packages-dropdown-chevron">▾</span></button>{packagesOpen && <div className="packages-dropdown-panel"><button type="button" className="chip-toggle-all" onClick={() => setSelectedIds(selectedIds.length === categories.length ? [] : categories.map((category) => category.id))}>{selectedIds.length === categories.length ? 'Quitar todas' : 'Seleccionar todas'}</button><div className="chip-list">{categories.map((category) => <button type="button" className={`chip ${selectedIds.includes(category.id) ? 'selected' : ''}`} key={category.id} onClick={() => toggleCategory(category.id)}><span className="chip-icon">🏷️</span><span className="chip-name">{category.nombre}</span></button>)}</div></div>}</div></details><div className="error-msg">{error}</div><button className="btn-main" type="button" disabled={!categories.length} onClick={createBoard}>Iniciar partida</button></div></section> : <section className="screen shared-screen" id="screen-game"><div className="card"><div className="setup-header"><div className="header-button-group"><Link to="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></Link><button type="button" className="guide-btn back-to-setup-btn" aria-label="Salir de la partida" onClick={() => { setWords([]); setRoles([]); }}><span className="back-icon" /></button></div><div className="header-button-group"><button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda">?</button><button type="button" className="guide-btn" aria-label="Compartir tablero"><span className="link-icon" /></button></div></div><div className={`cs-start-line ${keyVisible ? `revealed cs-start-line-color-${startingTeam}` : ''}`} /><div className={`cs-board ${keyVisible ? 'key-visible' : ''}`}>{words.map((word, index) => <button type="button" className={`cs-cell ${roleClass[roles[index]]} ${covered[index] ? 'cs-cell-covered' : ''}`} style={{ animationDelay: `${index * 12}ms` }} key={`${word}-${index}`} onClick={() => setCovered((current) => current.map((item, itemIndex) => itemIndex === index ? !item : item))}>{word}</button>)}</div><div className={`cs-start-line ${keyVisible ? `revealed cs-start-line-color-${startingTeam}` : ''}`} /><div className="cs-key-btns"><button type="button" className="btn-main" onClick={() => setKeyVisible(true)}>🔑 Ver clave</button>{keyVisible && <button type="button" className="cs-key-hide-btn" onClick={() => setKeyVisible(false)}>Ocultar clave</button>}</div><button className="btn-main" type="button" onClick={createBoard}>🔄 Nueva partida</button></div></section>}</main></GameThemeProvider>;
}
