import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { GuideModal } from '@/components/shared/GuideModal';
import { CategorySelector, type SelectableCategory } from '@/components/shared/CategorySelector';
import { loadContent } from '@/lib/content';
import { shuffle } from '@/lib/random';
import { getGame } from '@/data/games';
import '@/styles/games/yo-nunca.css';
import '@/styles/games/quien-es-mas-probable.css';
import '@/styles/games/que-harias-si.css';

interface PhraseCategory extends SelectableCategory {
  frases?: string[];
  escenarios?: string[];
}

interface Variant {
  jsonFile: string;
  field: 'frases' | 'escenarios';
  title: string;
  phraseClassName: string;
  autoFit?: { max: number; min: number };
  guide: ReactNode;
}

const VARIANTS: Record<string, Variant> = {
  'yo-nunca': {
    jsonFile: 'never-have-i-ever.json',
    field: 'frases',
    title: 'YO NUNCA',
    phraseClassName: 'yn-phrase',
    guide: (
      <>
        <h3>Objetivo</h3>
        <p>Un clásico para romper el hielo. Aparece una frase "Nunca he...". Léela en voz alta: quien SÍ lo haya hecho, baja un dedo (empezando con una mano entera, 5 dedos).</p>
        <h3>Usar la app</h3>
        <ol>
          <li>Elige las categorías que queráis usar y pulsa "Iniciar partida".</li>
          <li>Lee cada frase en voz alta para todo el grupo.</li>
          <li>Quien SÍ haya hecho lo que dice la frase, baja un dedo. A quien se le acaben los dedos, queda fuera de esa ronda de manos (o simplemente sigue jugando por diversión — la app no lo controla).</li>
          <li>Pulsa "Siguiente" para pasar a la próxima frase.</li>
        </ol>
        <h3>Honestidad</h3>
        <p>La app no puede comprobar quién ha hecho qué: todo se basa en la sinceridad de cada jugador.</p>
        <h3>Categorías</h3>
        <ul>
          <li><strong>Suave:</strong> frases ligeras, aptas para cualquier grupo.</li>
          <li><strong>Fiesta:</strong> un punto más atrevidas, pensadas para ambiente de fiesta.</li>
          <li><strong>Atrevido (+18):</strong> contenido para adultos.</li>
        </ul>
      </>
    ),
  },
  'quien-es-mas-probable': {
    jsonFile: 'most-likely.json',
    field: 'frases',
    title: '¿QUIÉN ES MÁS PROBABLE?',
    phraseClassName: 'qp-phrase',
    autoFit: { max: 1.5, min: 0.85 },
    guide: (
      <>
        <h3>Objetivo</h3>
        <p>Un juego para romper el hielo, sin ganadores ni puntos. Aparece una pregunta tipo "¿Quién es más probable que...?". Leedla en voz alta, discutid entre todos y señalad a quien encaja mejor.</p>
        <h3>Usar la app</h3>
        <ol>
          <li>Elige las categorías que queráis usar.</li>
          <li>En cada pregunta, todos la ven a la vez — no hay nada que ocultar.</li>
          <li>Cuando el grupo se decida, pulsa "Siguiente" para pasar a la próxima. Las preguntas no se acaban nunca.</li>
        </ol>
      </>
    ),
  },
  'que-harias-si': {
    jsonFile: 'what-would-you-do.json',
    field: 'escenarios',
    title: '¿QUÉ HARÍAS SI...?',
    phraseClassName: 'qh-phrase',
    autoFit: { max: 1.4, min: 0.85 },
    guide: (
      <>
        <h3>Objetivo</h3>
        <p>Un juego para generar debate y risas: aparece un escenario hipotético, se lee en voz alta y quien quiera responde qué haría. El resto puede opinar, rebatir o rematar con lo que haría en su lugar.</p>
        <h3>Usar la app</h3>
        <ol>
          <li>Elige las categorías de escenarios que queráis usar.</li>
          <li>Se muestra un escenario en pantalla, para que todo el grupo lo lea o lo escuche.</li>
          <li>Cuando terminéis de comentarlo, pulsad "Siguiente" para pasar al próximo.</li>
        </ol>
        <h3>Categorías</h3>
        <ul>
          <li><strong>Cotidiano:</strong> situaciones del día a día, cercanas y reales.</li>
          <li><strong>Disparatado:</strong> escenarios absurdos e imposibles, para el humor.</li>
          <li><strong>Dilemas morales:</strong> decisiones difíciles, para debatir en grupo.</li>
          <li><strong>Fantástico:</strong> magia, poderes y mundos imaginarios.</li>
        </ul>
      </>
    ),
  },
};

function buildDeck(categories: PhraseCategory[], selectedIds: string[], field: 'frases' | 'escenarios'): string[] {
  const pool: string[] = [];
  categories.forEach((category) => {
    if (selectedIds.includes(category.id)) pool.push(...(category[field] ?? []));
  });
  return shuffle(pool);
}

export function CategoryPhrasePage() {
  const { slug = '' } = useParams();
  const variant = VARIANTS[slug];
  const game = getGame(slug);

  const [categories, setCategories] = useState<PhraseCategory[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const phraseRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = phraseRef.current;
    if (!el || !variant?.autoFit) return;
    const { max, min } = variant.autoFit;
    let size = max;
    el.style.fontSize = `${size}rem`;
    while (size > min && el.scrollHeight > el.clientHeight + 1) {
      size -= 0.05;
      el.style.fontSize = `${size}rem`;
    }
  }, [variant, deck, index]);

  useEffect(() => {
    if (!variant) return;
    loadContent<{ categorias: PhraseCategory[] }>(variant.jsonFile).then((data) => {
      setCategories(data.categorias);
      setSelectedIds(data.categorias.filter((c) => !/\+18/.test(c.nombre)).map((c) => c.id));
    });
  }, [variant]);

  if (!variant || !game) return <p className="error-state">Juego no encontrado.</p>;

  const canStart = categories !== null && selectedIds.length > 0;

  function enterSetup() {
    setStarted(false);
  }

  function showNext() {
    setIndex((current) => {
      const next = current + 1;
      if (next >= deck.length) {
        setDeck(buildDeck(categories!, selectedIds, variant.field));
        return 0;
      }
      return next;
    });
  }

  function handleStart() {
    if (!canStart) return;
    setDeck(buildDeck(categories!, selectedIds, variant.field));
    setIndex(0);
    setStarted(true);
  }

  return (
    <GameThemeProvider slug={slug}>
      <div id="app">
        <div className="screen" id="screen-setup" hidden={started}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>{variant.title}</h1>

            <details className="setup-optional">
              <summary>Ajustes adicionales</summary>
              <div className="setup-optional-content">
                <label><span className="label-icon">🏷️</span>Categorías</label>
                <CategorySelector categories={categories} selectedIds={selectedIds} onChange={setSelectedIds} />
              </div>
            </details>

            <div className="error-msg">{!categories ? 'Cargando categorías…' : selectedIds.length === 0 ? 'Selecciona al menos una categoría.' : ''}</div>

            <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={!started}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div ref={phraseRef} className={variant.phraseClassName}>{deck[index] ?? ''}</div>
            <button type="button" className="btn-main" onClick={showNext}>Siguiente</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          {variant.guide}
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
