import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { GuideModal } from '@/components/legacy/GuideModal';
import { PackagesDropdown } from '@/components/legacy/PackagesDropdown';
import { loadContent } from '@/lib/content';
import { shuffle } from '@/lib/random';
import '@/styles/games/codigo-secreto.css';

const MIN_TEAMS = 2;
const MAX_TEAMS = 3;
const BOARD_SIZE = 25;

interface WordCategory {
  id: string;
  nombre: string;
  icono?: string;
  palabras: string[];
}

type Role = number | 'neutral' | 'assassin';

export function CodigoSecretoPage() {
  const [categories, setCategories] = useState<WordCategory[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [numTeams, setNumTeams] = useState(2);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [keyWarningOpen, setKeyWarningOpen] = useState(false);
  const [keyEverConfirmed, setKeyEverConfirmed] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [newRoundConfirmOpen, setNewRoundConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopyMsg, setShareCopyMsg] = useState('');
  const [viewOnly, setViewOnly] = useState(false);

  const [board, setBoard] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [startingTeam, setStartingTeam] = useState(0);
  const [keyVisible, setKeyVisible] = useState(false);
  const [coveredCells, setCoveredCells] = useState<Set<number>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const shareLinkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContent<{ categorias: WordCategory[] }>('codigo-secreto-words.json').then((data) => {
      setCategories(data.categorias);
      setSelectedIds(data.categorias.map((c) => c.id));
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('w');
    if (!w) return;
    const words = w.split('|').map((s) => s.trim()).filter(Boolean);
    if (!words.length) return;
    setViewOnly(true);
    setBoard(words);
    setRoles(words.map(() => 'neutral'));
    setStartingTeam(0);
    setStarted(true);
  }, []);

  useLayoutEffect(() => {
    const cells = boardRef.current?.querySelectorAll<HTMLElement>('.cs-cell');
    cells?.forEach((cell) => {
      const maxSize = 0.68, minSize = 0.38, step = 0.02;
      let size = maxSize;
      cell.style.fontSize = `${size}rem`;
      while (size > minSize && (cell.scrollHeight > cell.clientHeight + 1 || cell.scrollWidth > cell.clientWidth + 1)) {
        size -= step;
        cell.style.fontSize = `${size}rem`;
      }
    });
  }, [board]);

  function buildWordPool(): string[] {
    const pool: string[] = [];
    categories?.forEach((c) => { if (selectedIds.includes(c.id)) pool.push(...c.palabras); });
    return pool;
  }

  const wordPool = buildWordPool();
  const settingsValid = categories !== null && selectedIds.length > 0 && wordPool.length >= BOARD_SIZE;
  const errorMsg = !categories ? 'Cargando categorías…' : selectedIds.length === 0 ? 'Selecciona al menos una categoría.' : wordPool.length < BOARD_SIZE ? `Selecciona más categorías: hacen falta al menos ${BOARD_SIZE} palabras.` : '';

  function buildBoard() {
    const pool = shuffle(buildWordPool());
    const nextBoard = pool.slice(0, BOARD_SIZE);
    const starting = Math.floor(Math.random() * numTeams);
    const base = numTeams === 3 ? 6 : 8;
    const nextRoles: Role[] = [];
    for (let t = 0; t < numTeams; t++) {
      const count = base + (t === starting ? 1 : 0);
      for (let i = 0; i < count; i++) nextRoles.push(t);
    }
    nextRoles.push('assassin');
    while (nextRoles.length < BOARD_SIZE) nextRoles.push('neutral');
    setBoard(nextBoard);
    setRoles(shuffle(nextRoles));
    setStartingTeam(starting);
    setKeyVisible(false);
    setCoveredCells(new Set());
  }

  function handleStart() {
    if (!settingsValid) return;
    buildBoard();
    setStarted(true);
  }

  function toggleCovered(index: number) {
    setCoveredCells((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function handleShowKey() {
    if (keyEverConfirmed) { setKeyVisible(true); return; }
    setKeyWarningOpen(true);
  }

  function confirmKeyWarning() {
    setKeyEverConfirmed(true);
    setKeyWarningOpen(false);
    setKeyVisible(true);
  }

  function exitViewOnly() {
    setViewOnly(false);
    window.history.replaceState(null, '', window.location.pathname);
    setStarted(false);
  }

  function handleBackToSetup() {
    if (viewOnly) { exitViewOnly(); return; }
    setExitConfirmOpen(true);
  }

  function buildShareUrl(): string {
    return `${window.location.origin}${window.location.pathname}?w=${encodeURIComponent(board.join('|'))}`;
  }

  function openShare() {
    setShareCopyMsg('');
    setShareOpen(true);
  }

  function copyShareLink() {
    const url = buildShareUrl();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => setShareCopyMsg('Enlace copiado.')).catch(() => setShareCopyMsg('No se pudo copiar. Selecciona el texto y copia manualmente.'));
      return;
    }
    shareLinkRef.current?.select();
    try {
      setShareCopyMsg(document.execCommand('copy') ? 'Enlace copiado.' : 'No se pudo copiar. Selecciona el texto y copia manualmente.');
    } catch {
      setShareCopyMsg('No se pudo copiar. Selecciona el texto y copia manualmente.');
    }
  }

  function nativeShare() {
    const nav = navigator as Navigator & { share?: (data: { title: string; text: string; url: string }) => Promise<void> };
    nav.share?.({ title: 'Código Secreto', text: 'Tablero de Código Secreto', url: buildShareUrl() }).catch(() => undefined);
  }

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const shareUrl = board.length ? buildShareUrl() : '';

  return (
    <GameThemeProvider slug="codigo-secreto">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={started} style={{ maxWidth: 'min(720px, 94vw)' }}>
          <div className="card">
            <div className="setup-header">
              <a href="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></a>
              <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
            </div>
            <h1>CÓDIGO SECRETO</h1>

            <label><span className="label-icon">🎯</span>Equipos</label>
            <div className="stepper">
              <button type="button" onClick={() => setNumTeams((v) => Math.max(MIN_TEAMS, v - 1))}>−</button>
              <div className="value">{numTeams}</div>
              <button type="button" onClick={() => setNumTeams((v) => Math.min(MAX_TEAMS, v + 1))}>+</button>
            </div>

            <details className="setup-optional">
              <summary>Ajustes adicionales</summary>
              <div className="setup-optional-content">
                <label><span className="label-icon">🏷️</span>Categorías</label>
                <PackagesDropdown packages={categories} selectedIds={selectedIds} onChange={setSelectedIds} />
              </div>
            </details>

            <div className="error-msg">{errorMsg}</div>
            <button type="button" className="btn-main" disabled={!settingsValid} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={!started} style={{ maxWidth: 'min(720px, 94vw)' }}>
          <div className="card">
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Salir de la partida" onClick={handleBackToSetup}><span className="back-icon" /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => { setKeyWarningOpen(false); setHelpOpen(true); }}>?</button>
                {!viewOnly && <button type="button" className="guide-btn" aria-label="Compartir tablero" onClick={openShare}><span className="link-icon" /></button>}
              </div>
            </div>

            {!viewOnly && <div className={`cs-start-line${keyVisible ? ` revealed cs-start-line-color-${startingTeam}` : ''}`} />}

            <div className={`cs-board${keyVisible ? ' key-visible' : ''}`} ref={boardRef}>
              {board.map((word, i) => {
                const role = roles[i];
                const roleClass = role === 'neutral' ? 'role-neutral' : role === 'assassin' ? 'role-assassin' : `role-${role}`;
                return (
                  <div
                    key={i}
                    className={`cs-cell ${roleClass}${coveredCells.has(i) ? ' cs-cell-covered' : ''}`}
                    style={{ animationDelay: `${i * 12}ms` }}
                    onClick={() => toggleCovered(i)}
                  >
                    {word}
                  </div>
                );
              })}
            </div>

            {!viewOnly && <div className={`cs-start-line${keyVisible ? ` revealed cs-start-line-color-${startingTeam}` : ''}`} />}

            {!viewOnly && (
              <div className="cs-key-btns">
                {!keyVisible && <button type="button" className="btn-main" onClick={handleShowKey}>🔑 Ver clave</button>}
                {keyVisible && <button type="button" className="cs-key-hide-btn" onClick={() => setKeyVisible(false)}>Ocultar clave</button>}
              </div>
            )}

            {!viewOnly && <button type="button" className="btn-main" onClick={() => setNewRoundConfirmOpen(true)}>🔄 Nueva partida</button>}
          </div>
        </div>

        {keyWarningOpen && (
          <div className="guide-modal-backdrop">
            <div className="guide-modal">
              <h2>🔑 Cuidado</h2>
              <p>No dejes que tu equipo vea esta pantalla — es la clave secreta. Solo debe mirarla quien da las pistas.</p>
              <button type="button" className="btn-main" style={{ marginTop: 10 }} onClick={confirmKeyWarning}>Entendido</button>
            </div>
          </div>
        )}

        {exitConfirmOpen && (
          <div className="guide-modal-backdrop">
            <div className="guide-modal">
              <h2>¿Salir de la partida?</h2>
              <p>Se perderá el tablero actual.</p>
              <button type="button" className="btn-main" style={{ marginTop: 10 }} onClick={() => setExitConfirmOpen(false)}>Volver a la partida</button>
              <button type="button" className="cs-key-hide-btn" style={{ marginTop: 10, width: '100%' }} onClick={() => { setExitConfirmOpen(false); setStarted(false); }}>Salir de la partida</button>
            </div>
          </div>
        )}

        {newRoundConfirmOpen && (
          <div className="guide-modal-backdrop">
            <div className="guide-modal">
              <h2>¿Nueva partida?</h2>
              <p>Se perderá el tablero actual.</p>
              <button type="button" className="btn-main" style={{ marginTop: 10 }} onClick={() => setNewRoundConfirmOpen(false)}>Seguir con esta partida</button>
              <button type="button" className="cs-key-hide-btn" style={{ marginTop: 10, width: '100%' }} onClick={() => { setNewRoundConfirmOpen(false); buildBoard(); }}>Nueva partida</button>
            </div>
          </div>
        )}

        <GuideModal open={shareOpen} onClose={() => setShareOpen(false)}>
          <h2>🔗 Compartir tablero</h2>
          <div className="cs-share-qr-wrap">
            <img alt="Código QR del tablero" width={220} height={220} src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(shareUrl)}`} />
          </div>
          <div className="cs-share-link-row">
            <input ref={shareLinkRef} type="text" readOnly aria-label="Enlace para compartir" value={shareUrl} />
            <button type="button" className="guide-btn" aria-label="Copiar enlace" onClick={copyShareLink}>📋</button>
          </div>
          <p className="count-info">{shareCopyMsg}</p>
          {canNativeShare && <button type="button" className="btn-main" style={{ marginTop: 10 }} onClick={nativeShare}>📤 Compartir enlace</button>}
        </GuideModal>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>2 o 3 equipos compiten por adivinar todas sus palabras del tablero antes que el resto. La app solo genera el tablero de 25 palabras y la clave secreta — el juego real de dar pistas y adivinar se juega de viva voz en la mesa.</p>
          <h3>El dador de pistas</h3>
          <p>Cada equipo tiene a alguien que conoce la clave (puede turnarse). Esa persona da una palabra y un número — por ejemplo "Océano, 2" — para que su equipo adivine dos palabras del tablero relacionadas con "Océano". No puede decir ninguna de las palabras del tablero ni derivados obvios.</p>
          <h3>La clave</h3>
          <p>Pulsa "Ver clave" para colorear el tablero: azul y rojo son las palabras de cada equipo, gris son neutras, y la negra 💀 es el asesino — si un equipo la dice, pierde la partida en el acto. Una línea de color sobre el tablero indica qué equipo empieza. Solo quien da las pistas debe mirar esta pantalla; el resto del equipo mira el tablero sin colorear.</p>
          <h3>Compartir la clave</h3>
          <p>Si jugáis con alguien en remoto, podéis haceros una captura de pantalla con la clave revelada y enviarla por privado — la app no lo hace por vosotros.</p>
          <h3>Fin de la partida</h3>
          <p>Gana el equipo que adivine todas sus palabras primero. Si alguien dice el asesino, pierde su equipo al instante. Todo esto se decide de viva voz; la app no lleva la cuenta.</p>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
