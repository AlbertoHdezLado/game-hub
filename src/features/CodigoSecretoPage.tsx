import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';

interface Category { id: string; nombre: string; palabras: string[] }
interface Content { categorias: Category[] }
type Role = 'red' | 'blue' | 'green' | 'neutral' | 'assassin';

export function CodigoSecretoPage() {
  const game = getGame('codigo-secreto');
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [keyVisible, setKeyVisible] = useState(false);
  const [teams, setTeams] = useState(2);

  useEffect(() => { loadContent<Content>('codigo-secreto-words.json').then((data) => setCategories(data.categorias)); }, []);

  function createBoard() {
    const pool = categories.flatMap((category) => category.palabras).sort(() => Math.random() - 0.5);
    const board = [...new Set(pool)].slice(0, 25);
    if (board.length < 25) return;
    const rolePool: Role[] = teams === 3
      ? [...Array.from({ length: 7 }, () => 'red' as Role), ...Array.from({ length: 7 }, () => 'blue' as Role), ...Array.from({ length: 7 }, () => 'green' as Role), ...Array.from({ length: 3 }, () => 'neutral' as Role), 'assassin']
      : [...Array.from({ length: 8 }, () => 'red' as Role), ...Array.from({ length: 8 }, () => 'blue' as Role), ...Array.from({ length: 8 }, () => 'neutral' as Role), ...Array.from({ length: 1 }, () => 'assassin' as Role)];
    const nextRoles = rolePool.sort(() => Math.random() - 0.5);
    setWords(board); setRoles(nextRoles); setKeyVisible(false);
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell code-shell"><header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>{!words.length ? <section className="game-panel"><span className="eyebrow">Generador de tablero</span><h1>Código Secreto</h1><label className="field-label">Equipos <strong>{teams}</strong><input type="range" min="2" max="3" value={teams} onChange={(event) => setTeams(Number(event.target.value))} /></label><button className="primary-button" type="button" disabled={!categories.length} onClick={createBoard}>Crear tablero</button></section> : <section className="game-panel board-panel"><div className="score-row"><span>{teams} equipos</span><button className="text-button" type="button" onClick={() => setKeyVisible((current) => !current)}>{keyVisible ? 'Ocultar clave' : 'Ver clave'}</button></div><div className={`secret-board ${keyVisible ? 'key-visible' : ''}`}>{words.map((word, index) => <button className={`secret-cell role-${roles[index]}`} type="button" key={`${word}-${index}`} onClick={() => setRoles((current) => current.map((role, roleIndex) => roleIndex === index ? 'neutral' : role))}>{word}</button>)}</div><button className="primary-button" type="button" onClick={createBoard}>Nuevo tablero</button></section>}</main></GameThemeProvider>;
}
