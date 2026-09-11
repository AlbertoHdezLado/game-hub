import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent, pickRandom } from '@/lib/content';
import type { GameSlug } from '@/types/game';

interface PicoloCard { tipo: string; texto: string }
interface PicoloContent { cartas: PicoloCard[] }
interface HotCategory { temas: string[] }
interface HotContent { categorias: HotCategory[] }

export function InfiniteCardPage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  const isHot = slug === 'patata-caliente';
  const [names, setNames] = useState(['Jugador 1', 'Jugador 2', 'Jugador 3']);
  const [content, setContent] = useState<string | PicoloCard>('Cargando…');
  const [running, setRunning] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const file = isHot ? 'patata-caliente.json' : 'picolo.json';
    loadContent<HotContent | PicoloContent>(file).then((data) => {
      if ('categorias' in data) setPool(data.categorias.flatMap((category) => category.temas));
      else setContent(pickRandom(data.cartas));
    }).catch(() => setError('No se pudo cargar el contenido.'));
  }, [isHot]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          setExploded(true);
          new Audio('/resources/audios/boom.mp3').play().catch(() => undefined);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  function nextPicoloCard() {
    const file = 'picolo.json';
    loadContent<PicoloContent>(file).then((data) => setContent(pickRandom(data.cartas))).catch(() => setError('No se pudo cargar el contenido.'));
  }

  function nextHotTheme() {
    const nextPool = pool.length ? pool : ['Cosas que encuentras en una casa'];
    const index = Math.floor(Math.random() * nextPool.length);
    setContent(nextPool[index]);
    setPool(nextPool.filter((_, itemIndex) => itemIndex !== index));
    setExploded(false);
    setSeconds(12 + Math.floor(Math.random() * 19));
    setRunning(true);
  }

  function renderPicoloText(card: PicoloCard) {
    const first = names[0] ?? 'Alguien';
    const second = names[1] ?? first;
    return card.texto.replaceAll('{P1}', first).replaceAll('{P2}', second).replaceAll('{P}', first);
  }

  if (!game || !(['picolo', 'patata-caliente'] as GameSlug[]).includes(slug as GameSlug)) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell">
    <header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
    <section className="game-panel infinite-panel">
      <span className="eyebrow">{isHot ? 'Ronda rápida' : 'Carta nueva'}</span>
      <h1>{game.title}</h1>
      {!isHot && <label className="names-field">Jugadores<input value={names.join(', ')} onChange={(event) => setNames(event.target.value.split(',').map((name) => name.trim()).filter(Boolean))} placeholder="Ana, Luis, Marta" /></label>}
      {isHot && <div className={`hot-theme ${exploded ? 'has-exploded' : ''}`}><strong>{typeof content === 'string' ? content : content.texto}</strong>{running && <span>00:{seconds.toString().padStart(2, '0')}</span>}{exploded && <b>¡EXPLOTA!</b>}</div>}
      {!isHot && <div className="infinite-card"><span className="card-type">{typeof content === 'string' ? '' : content.tipo}</span><strong>{typeof content === 'string' ? content : renderPicoloText(content)}</strong></div>}
      {error && <p className="form-message">{error}</p>}
      <button className="primary-button" type="button" onClick={isHot ? nextHotTheme : nextPicoloCard}>{isHot ? 'Siguiente tema' : 'Siguiente carta'}</button>
    </section>
  </main></GameThemeProvider>;
}
