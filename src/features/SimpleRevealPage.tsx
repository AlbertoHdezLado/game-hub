import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { Card } from '@/components/ui/Card';
import { MainButton } from '@/components/ui/MainButton';
import { ChipList, type ChipItem } from '@/components/ui/ChipList';
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

function extractPrompt(content: SimpleContent, selectedIds: readonly string[], truthType?: 'verdades' | 'retos'): string {
  if ('paquetes' in content) return pickRandom(pickRandom(content.paquetes).palabras);
  if ('opciones' in content) {
    const first = pickRandom(content.opciones);
    const alternatives = content.opciones.filter((option) => option !== first && option.nivel === first.nivel);
    const second = pickRandom(alternatives.length ? alternatives : content.opciones.filter((option) => option !== first));
    return `${first.texto}\nO\n${second.texto}`;
  }
  if (content.categorias.length && 'verdades' in content.categorias[0]) {
    const allCategories = content.categorias as TruthOrDareContent['categorias'];
    const categories = allCategories.filter((category, index) => {
      const categoryId = 'id' in category && typeof category.id === 'string' ? category.id : String(index);
      return selectedIds.includes(categoryId);
    });
    const category = pickRandom(categories);
    const type = truthType ?? (pickRandom(['verdades', 'retos'] as const));
    return `${type === 'verdades' ? 'Verdad' : 'Reto'}: ${pickRandom(category[type])}`;
  }
  const allCategories = content.categorias as CategoryListContent['categorias'];
  const categories = allCategories.filter((category, index) => selectedIds.includes(category.id ?? String(index)));
  const category = pickRandom(categories);
  const values = [category.frases, category.escenarios, category.palabras].find((value) => Array.isArray(value)) as string[] | undefined;
  return pickRandom(values ?? []);
}

export function SimpleRevealPage() {
  const { slug = '' } = useParams();
  const game = getGame(slug);
  const [prompt, setPrompt] = useState('Cargando…');
  const [revealed, setRevealed] = useState(false);
  const [content, setContent] = useState<SimpleContent | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [truthChoice, setTruthChoice] = useState<'verdades' | 'retos' | null>(null);

  useEffect(() => {
    const file = files[slug as GameSlug];
    if (!file) { setPrompt('Esta pantalla ya está preparada para el siguiente módulo.'); return; }
    loadContent<SimpleContent>(file).then((loaded) => {
      setContent(loaded);
      const categories = 'categorias' in loaded ? loaded.categorias : [];
      setSelectedIds(categories.map((category, index) => ('id' in category && category.id) || String(index)));
    }).catch(() => setPrompt('No se pudo cargar el contenido.'));
  }, [slug]);

  function nextPrompt() {
    if (!content) return;
    setPrompt(extractPrompt(content, selectedIds));
    setTruthChoice(null);
    setRevealed(false);
  }

  function chooseTruth(type: 'verdades' | 'retos') {
    if (!content) return;
    setTruthChoice(type);
    setPrompt(extractPrompt(content, selectedIds, type));
    setRevealed(true);
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return (
    <GameThemeProvider theme={game.theme}>
      <main className="game-shell">
        <header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>
        {!started ? <Card className="game-panel setup-panel">
          <span className="eyebrow">Configuración</span>
          <h1>{game.title}</h1>
          {content && 'categorias' in content && <details className="setup-optional" open><summary>Categorías</summary><ChipList items={content.categorias.map((category, index) => ({ id: ('id' in category && category.id) || String(index), label: category.nombre, icon: 'icono' in category ? String(category.icono ?? '') : undefined } as ChipItem))} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} /></details>}
          <MainButton disabled={!content || ('categorias' in content && selectedIds.length === 0)} onClick={() => { setStarted(true); nextPrompt(); }}>Empezar</MainButton>
        </Card> : <Card className="game-panel">
          <span className="eyebrow">Ronda nueva</span>
          <h1>{game.title}</h1>
          {slug === 'verdad-o-reto' && !revealed ? <div className="reveal-card td-reveal-choice"><button className="td-btn td-btn-truth" type="button" onClick={() => chooseTruth('verdades')}>💬<span>Verdad</span></button><button className="td-btn td-btn-dare" type="button" onClick={() => chooseTruth('retos')}>😈<span>Reto</span></button></div> : <button className={`reveal-card ${revealed ? 'is-revealed' : ''}`} type="button" onClick={() => setRevealed(true)}><span className="reveal-label">{revealed ? prompt : 'Toca para revelar'}</span></button>}
          {truthChoice && <span className="eyebrow">{truthChoice === 'verdades' ? 'Verdad' : 'Reto'}</span>}
          <MainButton onClick={nextPrompt}>Siguiente</MainButton>
        </Card>}
      </main>
    </GameThemeProvider>
  );
}
