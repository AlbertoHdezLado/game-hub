import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { InfoDialog } from '@/components/InfoDialog';
import { MainButton } from '@/components/ui/MainButton';
import { Stepper } from '@/components/ui/Stepper';
import { getGame } from '@/data/games';
import { loadContent } from '@/lib/content';
import { randomInt, shuffle } from '@/lib/random';

interface HotCategory {
  id: string;
  nombre: string;
  icono?: string;
  temas: string[];
}

interface HotContent {
  categorias: HotCategory[];
}

const MIN_FUSE = 10;
const MAX_FUSE = 90;
const FUSE_STEP = 5;
const BEEP_INITIAL_INTERVAL = 2000;
const BEEP_MIN_INTERVAL = 50;
const BEEP_MAX_SPEED_HOLD_MS = 1000;
const LONG_BEEP_DURATION_MS = 3000;
const EXPLOSION_SOUND_SRC = '/resources/audios/boom.mp3';

const CATEGORIES_FALLBACK: HotCategory[] = [
  {
    id: 'comida',
    nombre: 'Comida',
    icono: '🍕',
    temas: ['Frutas', 'Verduras', 'Postres', 'Comida rápida', 'Bebidas sin alcohol', 'Comida picante'],
  },
  {
    id: 'animales',
    nombre: 'Animales',
    icono: '🦁',
    temas: ['Animales de granja', 'Animales marinos', 'Aves', 'Insectos', 'Mascotas', 'Dinosaurios'],
  },
];

export function PatataCalientePage() {
  const game = getGame('patata-caliente');
  const [categories, setCategories] = useState<HotCategory[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'setup' | 'game'>('setup');
  const [fuseMin, setFuseMin] = useState(20);
  const [fuseMax, setFuseMax] = useState(45);
  const [isArmed, setIsArmed] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [error, setError] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepTimeoutRef = useRef<number | null>(null);
  const longBeepTimeoutRef = useRef<number | null>(null);
  const explodeTimeoutRef = useRef<number | null>(null);
  const longBeepOscRef = useRef<OscillatorNode | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playBeepSound = useCallback((ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }, []);

  const playLongBeepSound = useCallback((ctx: AudioContext, durationMs: number) => {
    const now = ctx.currentTime;
    const dur = durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
    gain.gain.setValueAtTime(0.01, now + dur - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
    return osc;
  }, []);

  const stopLongBeepSound = useCallback(() => {
    if (longBeepOscRef.current) {
      try {
        longBeepOscRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      longBeepOscRef.current = null;
    }
  }, []);

  const playExplosionSound = useCallback(() => {
    if (!explosionAudioRef.current) {
      explosionAudioRef.current = new Audio(EXPLOSION_SOUND_SRC);
      explosionAudioRef.current.volume = 1;
    }
    explosionAudioRef.current.currentTime = 0;
    explosionAudioRef.current.play().catch(() => undefined);
  }, []);

  const clearFuseTimers = useCallback(() => {
    if (beepTimeoutRef.current !== null) {
      window.clearTimeout(beepTimeoutRef.current);
      beepTimeoutRef.current = null;
    }
    if (longBeepTimeoutRef.current !== null) {
      window.clearTimeout(longBeepTimeoutRef.current);
      longBeepTimeoutRef.current = null;
    }
    if (explodeTimeoutRef.current !== null) {
      window.clearTimeout(explodeTimeoutRef.current);
      explodeTimeoutRef.current = null;
    }
    stopLongBeepSound();
  }, [stopLongBeepSound]);

  useEffect(() => {
    loadContent<HotContent>('patata-caliente.json')
      .then((data) => setCategories(data.categorias))
      .catch(() => {
        setCategories(CATEGORIES_FALLBACK);
        setError('No se pudo cargar el contenido remoto, usando temas por defecto.');
      });
  }, []);

  useEffect(() => {
    return () => {
      clearFuseTimers();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => undefined);
      }
    };
  }, [clearFuseTimers]);

  const buildDeck = useCallback((catList: HotCategory[]) => {
    const pool = catList.flatMap((cat) => cat.temas);
    return shuffle(pool);
  }, []);

  const startFuse = useCallback(() => {
    clearFuseTimers();
    const ctx = getAudioContext();
    setIsArmed(true);
    setExploded(false);

    const fuseDuration = randomInt(fuseMin, fuseMax) * 1000;
    const fuseStart = Date.now();
    const longBeepDuration = LONG_BEEP_DURATION_MS;

    const scheduleBeep = () => {
      if (ctx) {
        playBeepSound(ctx);
      }
      const accelerationDuration = fuseDuration - longBeepDuration - BEEP_MAX_SPEED_HOLD_MS;
      const progress = Math.min(1, (Date.now() - fuseStart) / accelerationDuration);
      const beepInterval = BEEP_INITIAL_INTERVAL - (BEEP_INITIAL_INTERVAL - BEEP_MIN_INTERVAL) * progress;
      beepTimeoutRef.current = window.setTimeout(scheduleBeep, beepInterval);
    };

    scheduleBeep();

    longBeepTimeoutRef.current = window.setTimeout(() => {
      if (beepTimeoutRef.current !== null) {
        window.clearTimeout(beepTimeoutRef.current);
        beepTimeoutRef.current = null;
      }
      if (ctx) {
        longBeepOscRef.current = playLongBeepSound(ctx, longBeepDuration);
      }
    }, fuseDuration - longBeepDuration);

    explodeTimeoutRef.current = window.setTimeout(() => {
      clearFuseTimers();
      playExplosionSound();
      setIsArmed(false);
      setExploded(true);
    }, fuseDuration);
  }, [clearFuseTimers, fuseMin, fuseMax, getAudioContext, playBeepSound, playLongBeepSound, playExplosionSound]);

  const startMatch = () => {
    if (!categories.length) return;
    const newDeck = buildDeck(categories);
    setDeck(newDeck);
    setCurrentIndex(0);
    setIsArmed(false);
    setExploded(false);
    clearFuseTimers();
    setPhase('game');
  };

  const nextTheme = () => {
    clearFuseTimers();
    setIsArmed(false);
    setExploded(false);

    let nextDeck = deck;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= nextDeck.length) {
      nextDeck = buildDeck(categories);
      setDeck(nextDeck);
      nextIndex = 0;
    }
    setCurrentIndex(nextIndex);
  };

  const backToSetup = () => {
    clearFuseTimers();
    setIsArmed(false);
    setExploded(false);
    setPhase('setup');
  };

  if (!game) {
    return (
      <p className="error-state">
        Juego no encontrado. <Link to="/">Volver al hub</Link>
      </p>
    );
  }

  const currentTheme = deck[currentIndex] ?? 'Cargando tema…';

  return (
    <GameThemeProvider theme={game.theme}>
      <main className="game-shell">
        <header className="game-header">
          {phase === 'setup' ? (
            <Link className="icon-button" to="/" aria-label="Volver al hub">
              ⌂
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link className="icon-button" to="/" aria-label="Volver al hub">
                ⌂
              </Link>
              <button className="icon-button" type="button" aria-label="Volver a configuración" onClick={backToSetup}>
                ←
              </button>
            </div>
          )}
          <span>{game.title}</span>
          <button className="icon-button" type="button" aria-label="Ayuda" onClick={() => setInfoOpen(true)}>
            ?
          </button>
        </header>

        {phase === 'setup' && (
          <section className="game-panel setup-panel">
            <span className="eyebrow">Configuración</span>
            <h1>Patata Caliente</h1>
            <details className="setup-optional">
              <summary>Ajustes adicionales</summary>
              <label className="field-label">
                Mecha mínima
                <Stepper
                  value={fuseMin}
                  min={MIN_FUSE}
                  max={fuseMax}
                  step={FUSE_STEP}
                  onChange={(val) => setFuseMin(val)}
                  format={(val) => `${val}s`}
                />
              </label>
              <label className="field-label">
                Mecha máxima
                <Stepper
                  value={fuseMax}
                  min={fuseMin}
                  max={MAX_FUSE}
                  step={FUSE_STEP}
                  onChange={(val) => setFuseMax(val)}
                  format={(val) => `${val}s`}
                />
              </label>
            </details>
            {error && <p className="form-message">{error}</p>}
            <button
              className="primary-button"
              type="button"
              disabled={!categories.length}
              onClick={startMatch}
            >
              Iniciar partida
            </button>
          </section>
        )}

        {phase === 'game' && (
          <section className="game-panel infinite-panel">
            {!exploded ? (
              <div className="hot-theme">
                <strong>{currentTheme}</strong>
                <span className={`pc-bomb-icon ${isArmed ? 'armed' : ''}`} aria-hidden="true">
                  💣
                </span>
                {!isArmed && (
                  <MainButton onClick={startFuse}>Encender la mecha</MainButton>
                )}
              </div>
            ) : (
              <div className="pc-boom">
                <div className="end-icon" aria-hidden="true">💥</div>
                <h1 style={{ fontSize: '1.7rem' }}>¡BOOM!</h1>
                <p className="panel-help">Quien tenga el móvil en la mano… ¡pierde esta ronda!</p>
                <MainButton onClick={nextTheme}>Siguiente tema ▶</MainButton>
              </div>
            )}
          </section>
        )}

        {infoOpen && <InfoDialog game={game} onClose={() => setInfoOpen(false)} />}
      </main>
    </GameThemeProvider>
  );
}