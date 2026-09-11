import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent, pickRandom } from '@/lib/content';
import type { CategoryListContent, GameSlug, TruthOrDareContent, WordPackContent, WouldYouRatherContent } from '@/types/game';

const files: Partial<Record<GameSlug, string>> = {
  'yo-nunca': 'yo-nunca.json',
  'quien-es-mas-probable': 'quien-es-mas-probable.json',
  'que-harias-si': 'que-harias-si.json',
  'verdad-o-reto': 'truth-or-dare.json',
  'que-preferirias': 'que-preferirias.json',
};

type SimpleContent = CategoryListContent | TruthOrDareContent | WordPackContent | WouldYouRatherContent;

function extractPrompt(content: SimpleContent): string {
  if ('paquetes' in content) return pickRandom(pickRandom(content.paquetes).palabras);
  if ('opciones' in content) return pickRandom(content.opciones).texto;
  if (content.categorias.length && 'verdades' in content.categorias[0]) {
    const categories = content.categorias as TruthOrDareContent['categorias'];
    const category = pickRandom(categories);
    const type = Math.random() > 0.5 ? 'verdades' : 'retos';
    return `${type === 'verdades' ? 'Verdad' : 'Reto'}: ${pickRandom(category[type])}`;
  }
  const categories = content.categorias as CategoryListContent['categorias'];
  const category = pickRandom(categories);
  const values = [category.frases, category.escenarios, category.palabras].find((value) => Array.isArray(value)) as string[] | undefined;
  return pickRandom(values ?? []);
}

export function SimpleRevealPage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  const [prompt, setPrompt] = useState('Cargando…');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const file = files[slug as GameSlug];
    if (!file) { setPrompt('Esta pantalla ya está preparada para el siguiente módulo.'); return; }
    loadContent<SimpleContent>(file).then((content) => setPrompt(extractPrompt(content))).catch(() => setPrompt('No se pudo cargar el contenido.'));
  }, [slug]);

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return (
    <GameThemeProvider theme={game.theme}>
      <main className="game-shell">
        <header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
        <section className="game-panel">
          <span className="eyebrow">Ronda nueva</span>
          <h1>{game.title}</h1>
          <button className={`reveal-card ${revealed ? 'is-revealed' : ''}`} type="button" onClick={() => setRevealed(true)}>
            <span className="reveal-label">{revealed ? prompt : 'Toca para revelar'}</span>
          </button>
          <button className="primary-button" type="button" onClick={() => { setRevealed(false); setPrompt('Cargando…'); const file = files[slug as GameSlug]; if (file) loadContent<SimpleContent>(file).then((content) => setPrompt(extractPrompt(content))); }}>Siguiente</button>
        </section>
      </main>
    </GameThemeProvider>
  );
}
