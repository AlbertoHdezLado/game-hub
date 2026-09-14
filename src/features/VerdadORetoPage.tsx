import { useEffect, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { GuideModal } from '@/components/shared/GuideModal';
import { CategorySelector, type SelectableCategory } from '@/components/shared/CategorySelector';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { RevealCard } from '@/components/shared/RevealCard';
import { ProgressDots } from '@/components/shared/ProgressDots';
import { loadContent } from '@/lib/content';
import { pickRandom } from '@/lib/random';
import { loadSavedPlayerNames, savePlayerNames } from '@/lib/shared';
import '@/styles/games/verdad-o-reto.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 30;

interface TruthOrDareCategory extends SelectableCategory {
  verdades: string[];
  retos: string[];
}

type Screen = 'setup' | 'game' | 'end';

export function VerdadORetoPage() {
  const [categories, setCategories] = useState<TruthOrDareCategory[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>(() => loadSavedPlayerNames().slice(0, MAX_PLAYERS));
  const [setupStep, setSetupStep] = useState(0);
  const [screen, setScreen] = useState<Screen>('setup');
  const [helpOpen, setHelpOpen] = useState(false);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealKind, setRevealKind] = useState<'verdad' | 'reto' | null>(null);
  const [revealText, setRevealText] = useState('');

  useEffect(() => {
    loadContent<{ categorias: TruthOrDareCategory[] }>('truth-or-dare.json').then((data) => {
      setCategories(data.categorias);
      setSelectedIds(data.categorias.filter((c) => !/\+18/.test(c.nombre)).map((c) => c.id));
    });
  }, []);

  function updateNames(next: string[]) {
    setNames(next);
    savePlayerNames(next);
  }

  const playerCount = names.length;
  const playersValid = playerCount >= MIN_PLAYERS;
  const settingsValid = categories !== null && selectedIds.length > 0;
  const canStart = playersValid && settingsValid;

  function pickPrompt(kind: 'verdades' | 'retos'): string {
    const pool: string[] = [];
    categories!.forEach((category) => { if (selectedIds.includes(category.id)) pool.push(...category[kind]); });
    return pickRandom(pool);
  }

  function showPlayer(index: number) {
    setCurrent(index);
    setRevealed(false);
    setRevealKind(null);
    setRevealText('');
  }

  function reveal(kind: 'verdad' | 'reto') {
    setRevealText(pickPrompt(kind === 'verdad' ? 'verdades' : 'retos'));
    setRevealKind(kind);
    setRevealed(true);
  }

  function handleNext() {
    const nextIndex = current + 1;
    if (nextIndex >= playerNames.length) setScreen('end');
    else showPlayer(nextIndex);
  }

  function handleStart() {
    if (!canStart) return;
    setPlayerNames(names);
    showPlayer(0);
    setScreen('game');
  }

  function enterSetup() {
    setSetupStep(0);
    setScreen('setup');
  }

  return (
    <GameThemeProvider slug="verdad-o-reto">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>VERDAD O RETO</h1>

            <div hidden={setupStep !== 0}>
              <label><span className="label-icon">👥</span>Jugadores</label>
              <PlayerInput names={names} onChange={updateNames} min={MIN_PLAYERS} max={MAX_PLAYERS} />
              <div className="error-msg">{playerCount < MIN_PLAYERS ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : ''}</div>
            </div>

            {setupStep === 0 && (
              <div className="night-nav">
                <button type="button" className="night-nav-btn" disabled={!playersValid} onClick={() => setSetupStep(1)}>Siguiente</button>
              </div>
            )}

            <div hidden={setupStep !== 1}>
              <details className="setup-optional">
                <summary>Ajustes adicionales</summary>
                <div className="setup-optional-content">
                  <label><span className="label-icon">🏷️</span>Categorías</label>
                  <CategorySelector categories={categories} selectedIds={selectedIds} onChange={setSelectedIds} />
                </div>
              </details>

              <div className="error-msg">{!categories ? 'Cargando categorías…' : selectedIds.length === 0 ? 'Selecciona al menos una categoría.' : ''}</div>

              <div className="final-nav">
                <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep(0)}><span className="back-icon" /></button>
                <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
              </div>
            </div>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={screen !== 'game'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="player-name">{playerNames[current]}</div>
            <div className="pass-hint">Elige verdad o reto. Nadie más debe elegir por ti.</div>

            <RevealCard
              revealed={revealed}
              contentClassName={revealKind === 'verdad' ? 'safe' : revealKind === 'reto' ? 'danger' : ''}
              maxFontRem={1.4}
              minFontRem={0.85}
              cover={(
                <div className="td-buttons">
                  <button type="button" className="td-btn td-btn-truth" onClick={() => reveal('verdad')}>
                    <span className="td-btn-icon">🤔</span><span>Verdad</span>
                  </button>
                  <button type="button" className="td-btn td-btn-dare" onClick={() => reveal('reto')}>
                    <span className="td-btn-icon">😈</span><span>Reto</span>
                  </button>
                </div>
              )}
            >
              {revealText}
            </RevealCard>

            <button type="button" className="btn-main" disabled={!revealed} onClick={handleNext}>Siguiente jugador</button>
            <ProgressDots total={playerNames.length} current={current} />
          </div>
        </div>

        <div className="screen" id="screen-end" hidden={screen !== 'end'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="end-icon">🔥</div>
            <h1 style={{ fontSize: '1.6rem' }}>RONDA TERMINADA</h1>
            <p className="subtitle">¡Que empiece la próxima tanda de verdades y retos!</p>
            <button type="button" className="btn-main" onClick={enterSetup}>Iniciar nueva ronda</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Un clásico para romper el hielo: cada jugador, en su turno, elige entre responder una verdad o cumplir un reto.</p>
          <h3>Usar la app</h3>
          <ol>
            <li>Añade a los jugadores y elige las categorías de preguntas y retos que queráis usar.</li>
            <li>Pasa el dispositivo: en su turno, cada jugador ve en privado su tarjeta y elige "Verdad" o "Reto".</li>
            <li>Al elegir, se revela la pregunta o el reto para que el grupo lo escuche o lo vea cumplir.</li>
          </ol>
          <h3>Categorías</h3>
          <ul>
            <li><strong>Suave:</strong> preguntas y retos ligeros, aptos para cualquier grupo.</li>
            <li><strong>Fiesta:</strong> más picantes, pensadas para ambiente de fiesta.</li>
            <li><strong>Atrevido (+18):</strong> contenido para adultos.</li>
          </ul>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
