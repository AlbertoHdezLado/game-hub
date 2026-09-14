import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/legacy/ScreenHeader';
import { GuideModal } from '@/components/legacy/GuideModal';
import { loadContent } from '@/lib/content';
import { randomInt, shuffle } from '@/lib/random';
import '@/styles/games/patata-caliente.css';

const MIN_FUSE = 10;
const MAX_FUSE = 90;
const FUSE_STEP = 5;
const BEEP_INITIAL_INTERVAL = 2000;
const BEEP_MIN_INTERVAL = 50;
const BEEP_MAX_SPEED_HOLD_MS = 1000;
const LONG_BEEP_DURATION_MS = 3000;
const EXPLOSION_SOUND_SRC = '/resources/audios/boom.mp3';

interface HotCategory {
  id: string;
  nombre: string;
  icono?: string;
  temas: string[];
}

export function PatataCalientePage() {
  const [categories, setCategories] = useState<HotCategory[] | null>(null);
  const [fuseMin, setFuseMin] = useState(20);
  const [fuseMax, setFuseMax] = useState(45);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [deck, setDeck] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);
  const [exploded, setExploded] = useState(false);
  const phraseRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepTimeoutRef = useRef<number | null>(null);
  const longBeepTimeoutRef = useRef<number | null>(null);
  const explodeTimeoutRef = useRef<number | null>(null);
  const longBeepOscRef = useRef<OscillatorNode | null>(null);
  const explosionAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadContent<{ categorias: HotCategory[] }>('patata-caliente.json').then((data) => setCategories(data.categorias));
  }, []);

  useLayoutEffect(() => {
    const el = phraseRef.current;
    if (!el) return;
    let size = 1.7;
    el.style.fontSize = `${size}rem`;
    while (size > 1 && el.scrollHeight > el.clientHeight + 1) {
      size -= 0.05;
      el.style.fontSize = `${size}rem`;
    }
  }, [deck, index]);

  const clearFuseTimers = useCallback(() => {
    if (beepTimeoutRef.current !== null) { window.clearTimeout(beepTimeoutRef.current); beepTimeoutRef.current = null; }
    if (longBeepTimeoutRef.current !== null) { window.clearTimeout(longBeepTimeoutRef.current); longBeepTimeoutRef.current = null; }
    if (explodeTimeoutRef.current !== null) { window.clearTimeout(explodeTimeoutRef.current); explodeTimeoutRef.current = null; }
    if (longBeepOscRef.current) { try { longBeepOscRef.current.stop(); } catch { /* already stopped */ } longBeepOscRef.current = null; }
  }, []);

  useEffect(() => () => clearFuseTimers(), [clearFuseTimers]);

  function unlockAudio() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { audioCtxRef.current = null; }
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }

  function playBeepSound() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
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
  }

  function playLongBeepSound(durationMs: number) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
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
    longBeepOscRef.current = osc;
  }

  function playExplosionSound() {
    if (!explosionAudioRef.current) {
      explosionAudioRef.current = new Audio(EXPLOSION_SOUND_SRC);
      explosionAudioRef.current.volume = 1;
    }
    explosionAudioRef.current.currentTime = 0;
    explosionAudioRef.current.play().catch(() => undefined);
  }

  function buildDeck(cats: HotCategory[]): string[] {
    return shuffle(cats.flatMap((c) => c.temas));
  }

  function startFuse() {
    unlockAudio();
    clearFuseTimers();
    setArmed(true);
    setExploded(false);

    const fuseDuration = randomInt(fuseMin, fuseMax) * 1000;
    const fuseStart = Date.now();
    const longBeepDuration = LONG_BEEP_DURATION_MS;

    function scheduleBeep() {
      playBeepSound();
      const accelerationDuration = fuseDuration - longBeepDuration - BEEP_MAX_SPEED_HOLD_MS;
      const progress = Math.min(1, (Date.now() - fuseStart) / accelerationDuration);
      const beepInterval = BEEP_INITIAL_INTERVAL - (BEEP_INITIAL_INTERVAL - BEEP_MIN_INTERVAL) * progress;
      beepTimeoutRef.current = window.setTimeout(scheduleBeep, beepInterval);
    }
    scheduleBeep();

    longBeepTimeoutRef.current = window.setTimeout(() => {
      if (beepTimeoutRef.current !== null) { window.clearTimeout(beepTimeoutRef.current); beepTimeoutRef.current = null; }
      playLongBeepSound(longBeepDuration);
    }, fuseDuration - longBeepDuration);

    explodeTimeoutRef.current = window.setTimeout(() => {
      clearFuseTimers();
      playExplosionSound();
      setArmed(false);
      setExploded(true);
    }, fuseDuration);
  }

  function showRound() {
    setArmed(false);
    setExploded(false);
    clearFuseTimers();
  }

  function handleStart() {
    if (!categories) return;
    setDeck(buildDeck(categories));
    setIndex(0);
    showRound();
    setStarted(true);
  }

  function handleNext() {
    showRound();
    setIndex((current) => {
      const next = current + 1;
      if (next >= deck.length) { setDeck(buildDeck(categories!)); return 0; }
      return next;
    });
  }

  function enterSetup() {
    clearFuseTimers();
    setArmed(false);
    setExploded(false);
    setStarted(false);
  }

  return (
    <GameThemeProvider slug="patata-caliente">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={started}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>PATATA CALIENTE</h1>

            <button type="button" className="packages-dropdown-btn" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>
              <span className="packages-dropdown-summary">Ajustes adicionales</span>
              <span className="packages-dropdown-chevron">▾</span>
            </button>
            {settingsOpen && (
              <div className="packages-dropdown-panel">
                <label><span className="label-icon">⏱️</span>Mecha mínima</label>
                <div className="stepper">
                  <button type="button" onClick={() => setFuseMin((v) => Math.max(MIN_FUSE, v - FUSE_STEP))}>−</button>
                  <div className="value">{fuseMin}s</div>
                  <button type="button" onClick={() => setFuseMin((v) => Math.min(fuseMax, v + FUSE_STEP))}>+</button>
                </div>
                <label><span className="label-icon">⏱️</span>Mecha máxima</label>
                <div className="stepper">
                  <button type="button" onClick={() => setFuseMax((v) => Math.max(fuseMin, v - FUSE_STEP))}>−</button>
                  <div className="value">{fuseMax}s</div>
                  <button type="button" onClick={() => setFuseMax((v) => Math.min(MAX_FUSE, v + FUSE_STEP))}>+</button>
                </div>
              </div>
            )}

            <button type="button" className="btn-main" disabled={!categories} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={!started}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />

            {!exploded ? (
              <div id="pc-round">
                <div className="pc-theme" ref={phraseRef}>{deck[index] ?? ''}</div>
                <div className={`pc-bomb-icon${armed ? ' armed' : ''}`}>💣</div>
                {!armed && <button type="button" className="btn-main" onClick={startFuse}>Encender la mecha</button>}
              </div>
            ) : (
              <div id="pc-boom">
                <div className="end-icon">💥</div>
                <h1 style={{ fontSize: '1.7rem' }}>¡BOOM!</h1>
                <p className="subtitle">Quien tenga el móvil en la mano… ¡pierde esta ronda!</p>
                <button type="button" className="btn-main" onClick={handleNext}>Siguiente tema ▶</button>
              </div>
            )}
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>No hace falta configurar jugadores ni equipos: la app solo controla la bomba. Aparece un tema; entre todos decís en voz alta palabras relacionadas mientras os pasáis el móvil como una patata caliente.</p>
          <h3>Usar la app</h3>
          <ol>
            <li>La app elige un tema al azar. Si queréis, podéis ajustar el rango de duración de la mecha.</li>
            <li>Pulsa "Encender la mecha" cuando estéis listos para empezar a pasaros el móvil.</li>
            <li>El pitido se acelera al azar sin avisar cuánto queda — nadie sabe cuándo va a explotar.</li>
            <li>Cuando explota, quien tenga el móvil en la mano en ese momento pierde esa ronda.</li>
            <li>Pulsa "Siguiente tema" para seguir jugando con un tema nuevo. Los temas no se repiten hasta agotar todo el mazo.</li>
          </ol>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
