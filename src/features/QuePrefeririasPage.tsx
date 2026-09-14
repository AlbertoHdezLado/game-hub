import { useEffect, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { GuideModal } from '@/components/shared/GuideModal';
import { loadContent } from '@/lib/content';
import { randomInt } from '@/lib/random';
import '@/styles/games/que-preferirias.css';

interface Option {
  texto: string;
  nivel: number;
}

// picks 2 distinct options at random from the same nivel (desirability tier), never
// mixing a dream power with a costly sacrifice — mirrors shared pickPair()
function pickPair(options: Option[]): [string, string] {
  const byLevel = new Map<number, string[]>();
  options.forEach((option) => {
    const list = byLevel.get(option.nivel) ?? [];
    list.push(option.texto);
    byLevel.set(option.nivel, list);
  });
  const levels = [...byLevel.keys()].filter((level) => (byLevel.get(level)?.length ?? 0) >= 2);
  const pool = [...(byLevel.get(levels[randomInt(0, levels.length - 1)]) ?? [])];
  const indexA = randomInt(0, pool.length - 1);
  const optionA = pool[indexA];
  pool.splice(indexA, 1);
  const optionB = pool[randomInt(0, pool.length - 1)];
  return [optionA, optionB];
}

export function QuePrefeririasPage() {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [pair, setPair] = useState<[string, string]>(['', '']);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    loadContent<{ opciones: Option[] }>('would-you-rather.json').then((data) => setOptions(data.opciones));
  }, []);

  const canStart = !!options && options.length >= 2;

  function handleStart() {
    if (!options || options.length < 2) return;
    setPair(pickPair(options));
    setStarted(true);
  }

  function showNext() {
    if (options) setPair(pickPair(options));
  }

  return (
    <GameThemeProvider slug="que-preferirias">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={started}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>¿QUÉ PREFERIRÍAS?</h1>
            <p className="subtitle">Dos opciones al azar, sin ganadores ni puntos. Elige una en voz alta y debatid por qué.</p>
            <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={!started}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={() => setStarted(false)} onHelp={() => setHelpOpen(true)} />
            <p className="subtitle" style={{ marginTop: 0 }}>¿Qué preferirías...?</p>
            <div className="qpref-option qpref-option-a">{pair[0]}</div>
            <div className="qpref-divider">O</div>
            <div className="qpref-option qpref-option-b">{pair[1]}</div>
            <button type="button" className="btn-main" onClick={showNext}>Siguiente</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Un juego para romper el hielo, sin ganadores ni puntos. Aparecen dos opciones — elige cuál preferirías y debatid por qué en voz alta.</p>
          <h3>Usar la app</h3>
          <ol>
            <li>Pulsa "Iniciar partida".</li>
            <li>Cada ronda combina dos opciones al azar de una gran pila de posibilidades, así que casi nunca sale la misma pareja dos veces.</li>
            <li>Cuando el grupo termine de decidir y debatir, pulsa "Siguiente" para pasar a la próxima. No hay rondas ni final: jugad tanto como queráis.</li>
          </ol>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
