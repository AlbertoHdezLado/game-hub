import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { GuideModal } from '@/components/shared/GuideModal';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { loadContent } from '@/lib/content';
import { randomInt, shuffle } from '@/lib/random';
import { loadSavedPlayerNames, savePlayerNames } from '@/lib/shared';
import '@/styles/games/picolo.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 30;

interface PicoloCard {
  tipo: string;
  texto?: string;
  prompt?: string;
  opciones?: string[];
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  trago: { label: 'Trago', icon: '🥃', color: '#e0663f' },
  reparte: { label: 'Reparte', icon: '🍹', color: '#f2c94c' },
  reto: { label: 'Reto', icon: '😈', color: '#a970e0' },
  pregunta: { label: 'Pregunta', icon: '🤔', color: '#5b8fe0' },
  interaccion: { label: 'Interacción', icon: '🤝', color: '#e05d9c' },
  grupo: { label: 'Grupo', icon: '👥', color: '#52c77a' },
  decision: { label: 'Decisión', icon: '🙋', color: '#4fc3d9' },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.7 ? '#2b2b2b' : '#fff';
}

function fillTemplate(tpl: string, playerNames: string[]): string {
  if (tpl.includes('{P1}') || tpl.includes('{P2}')) {
    const idx1 = randomInt(0, playerNames.length - 1);
    let idx2 = idx1;
    while (idx2 === idx1 && playerNames.length > 1) idx2 = randomInt(0, playerNames.length - 1);
    return tpl.replace(/\{P1\}/g, playerNames[idx1]).replace(/\{P2\}/g, playerNames[idx2]);
  }
  if (tpl.includes('{P}')) {
    const idx = randomInt(0, playerNames.length - 1);
    return tpl.replace(/\{P\}/g, playerNames[idx]);
  }
  return tpl;
}

export function PicoloPage() {
  const [names, setNames] = useState<string[]>(() => loadSavedPlayerNames().slice(0, MAX_PLAYERS));
  const [cards, setCards] = useState<PicoloCard[] | null>(null);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [deck, setDeck] = useState<PicoloCard[]>([]);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [decisionResolved, setDecisionResolved] = useState(false);
  const [pulse, setPulse] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContent<{ cartas: PicoloCard[] }>('picolo.json').then((data) => setCards(data.cartas));
  }, []);

  const card = deck[index];
  const meta = card ? (CATEGORY_META[card.tipo] ?? CATEGORY_META.trago) : CATEGORY_META.trago;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.fontSize = '';
    let size = 1.4;
    el.style.fontSize = `${size}rem`;
    while (size > 0.85 && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
      size -= 0.1;
      el.style.fontSize = `${size.toFixed(2)}rem`;
    }
  }, [text]);

  function updateNames(next: string[]) {
    setNames(next);
    savePlayerNames(next);
  }

  const playerCount = names.length;
  const canStart = playerCount >= MIN_PLAYERS && cards !== null;

  function showRound(nextDeck: PicoloCard[], i: number, names: string[]) {
    const c = nextDeck[i];
    setDecisionResolved(false);
    setText(c.tipo === 'decision' ? (c.prompt ?? '') : fillTemplate(c.texto ?? '', names));
  }

  function handleNext() {
    let nextDeck = deck;
    let nextIndex = index + 1;
    if (nextIndex >= deck.length) { nextDeck = shuffle(cards!); nextIndex = 0; setDeck(nextDeck); }
    setIndex(nextIndex);
    showRound(nextDeck, nextIndex, playerNames);
  }

  function resolveDecision() {
    if (!card?.opciones?.length) return;
    const chosenLabel = card.opciones[randomInt(0, card.opciones.length - 1)];
    setText(`¡Beben los que eligieron «${chosenLabel}»!`);
    setPulse((p) => p + 1);
    setDecisionResolved(true);
  }

  function handleStart() {
    if (!canStart) return;
    const initialDeck = shuffle(cards!);
    setPlayerNames(names);
    setDeck(initialDeck);
    setIndex(0);
    showRound(initialDeck, 0, names);
    setStarted(true);
  }

  return (
    <GameThemeProvider slug="picolo">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={started}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>PICOLO</h1>
            <label><span className="label-icon">👥</span>Jugadores</label>
            <PlayerInput names={names} onChange={updateNames} min={MIN_PLAYERS} max={MAX_PLAYERS} />
            <div className="error-msg">{playerCount < MIN_PLAYERS ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : !cards ? 'Cargando cartas…' : ''}</div>
            <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={!started}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={() => setStarted(false)} onHelp={() => setHelpOpen(true)} />

            <div
              className="reveal-wrap revealed"
              style={{
                cursor: 'default',
                borderColor: meta.color,
                background: `linear-gradient(160deg, ${hexToRgba(meta.color, 0.3)}, rgba(0,0,0,0.3))`,
                boxShadow: `0 0 0 1px ${hexToRgba(meta.color, 0.35)} inset, 0 8px 24px ${hexToRgba(meta.color, 0.25)}`,
              }}
            >
              <div className="reveal-content picolo" style={{ color: meta.color }} ref={contentRef}>
                <span className="picolo-badge" style={{ background: meta.color, color: readableTextColor(meta.color) }}>{meta.icon} {meta.label}</span>
                <span key={pulse} className={`picolo-text${decisionResolved ? ' pulse' : ''}`}>{text}</span>
              </div>
            </div>

            {card?.tipo === 'decision' && !decisionResolved ? (
              <button type="button" className="btn-main" onClick={resolveDecision}>👀 Revelar quién bebe</button>
            ) : (
              <button type="button" className="btn-main" onClick={handleNext}>🥃 Siguiente carta</button>
            )}
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>El clásico juego de beber. Van saliendo cartas al azar con retos, preguntas, tragos que repartir e interacciones entre jugadores. Vosotros decidís y gestionáis quién bebe qué — la app no lleva la cuenta de nada.</p>
          <h3>Usar la app</h3>
          <ol>
            <li>Añade a los jugadores por su nombre.</li>
            <li>Pulsa "Iniciar partida" y lee cada carta en voz alta para todo el grupo.</li>
            <li>Pulsa "Siguiente carta" para pasar a la próxima. No hay rondas ni final: jugad tanto como queráis y parad cuando queráis.</li>
          </ol>
          <h3>Tipos de carta</h3>
          <p>Cada carta muestra su temática arriba con un color, para saber de un vistazo qué tipo de carta es:</p>
          <ul>
            <li><strong>🥃 Trago:</strong> alguien bebe directamente.</li>
            <li><strong>🍹 Reparte:</strong> alguien reparte tragos entre el resto.</li>
            <li><strong>😈 Reto:</strong> cumple el reto o bebes.</li>
            <li><strong>🤔 Pregunta:</strong> responde con sinceridad o bebes.</li>
            <li><strong>🤝 Interacción:</strong> dos jugadores hacen algo juntos (un gesto, un pulso, beber a la vez...) o ambos beben.</li>
            <li><strong>👥 Grupo:</strong> quien cumpla una condición bebe (llevar cierto color, nombre con cierta letra, ser el más joven...).</li>
            <li><strong>🙋 Decisión:</strong> todos eligen en secreto entre dos opciones (mano arriba o abajo, por ejemplo) y luego se revela cuál de las dos bebe.</li>
          </ul>
          <h3>Honestidad</h3>
          <p>Como en cualquier juego de beber, todo se basa en la sinceridad y las ganas de jugar de cada uno. Bebed con responsabilidad.</p>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
