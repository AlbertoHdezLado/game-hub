import { useEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/legacy/ScreenHeader';
import { GuideModal } from '@/components/legacy/GuideModal';
import { PlayerNameRows } from '@/components/legacy/PlayerNameRows';
import { PackagesDropdown } from '@/components/legacy/PackagesDropdown';
import { RevealCard, RevealButton } from '@/components/legacy/RevealCard';
import { useGameAudio } from '@/hooks/useGameAudio';
import { loadContent } from '@/lib/content';
import {
  buildRandomShuffledRoles, effectivePlayerCount, effectivePlayerNames, hasDuplicatePlayerNames,
  loadSavedPlayerNames, normalizeTrailingSlot, savePlayerNames,
} from '@/lib/legacy';
import type { WordPack, WordPackContent } from '@/types/game';
import '@/styles/games/impostor.css';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;
const MIN_IMPOSTORS = 1;
const MAX_DEBATE_MINUTES = 30;

type SubMode = 'custom' | 'random';
type ImpostorMode = 'none' | 'hint' | 'mrblanco';
type Screen = 'setup' | 'roster' | 'debate';

const IMPOSTOR_MODE_DESC: Record<ImpostorMode, string> = {
  none: 'Los impostores no reciben ninguna palabra.',
  hint: 'Los impostores ven que lo son y reciben una palabra relacionada como pista.',
  mrblanco: 'Los impostores reciben una palabra relacionada SIN saber que son impostores.',
};

function pickRandomWordWithHint(packages: WordPack[], selectedIds: string[]): { word: string; hint: string | null } {
  const pool: { word: string; packageId: string; pkg: WordPack }[] = [];
  packages.forEach((p) => { if (selectedIds.includes(p.id)) p.palabras.forEach((w) => pool.push({ word: w, packageId: p.id, pkg: p })); });
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  let hint = chosen.pkg.relacionadas?.[chosen.word] ?? null;
  if (!hint) {
    let related = pool.filter((item) => item.packageId === chosen.packageId && item.word !== chosen.word);
    if (related.length === 0) related = pool.filter((item) => item.word !== chosen.word);
    hint = related.length ? related[Math.floor(Math.random() * related.length)].word : null;
  }
  return { word: chosen.word, hint };
}

export function ImpostorPage() {
  const [rows, setRows] = useState<string[]>(() => normalizeTrailingSlot(loadSavedPlayerNames().slice(0, MAX_PLAYERS), MAX_PLAYERS));
  const [setupStep, setSetupStep] = useState(0);
  const [subMode, setSubMode] = useState<SubMode>('random');
  const [customWord, setCustomWord] = useState('');
  const [customImpostorCount, setCustomImpostorCount] = useState(1);
  const [randomImpostors, setRandomImpostors] = useState(1);
  const [impostorMode, setImpostorMode] = useState<ImpostorMode>('none');
  const [debateMinutes, setDebateMinutes] = useState(0);
  const [packages, setPackages] = useState<WordPack[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('setup');

  // match state
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [roles, setRoles] = useState<boolean[]>([]);
  const [word, setWord] = useState('');
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [mrBlancoWord, setMrBlancoWord] = useState<string | null>(null);
  const [matchImpostorMode, setMatchImpostorMode] = useState<ImpostorMode>('none');
  const [viewed, setViewed] = useState<boolean[]>([]);
  const [revealIdx, setRevealIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [alive, setAlive] = useState<boolean[]>([]);
  const [isFirstDebate, setIsFirstDebate] = useState(true);
  const [startPlayerName, setStartPlayerName] = useState<string | null>(null);
  const [selectedVoteIdx, setSelectedVoteIdx] = useState<number | null>(null);
  const [voteStage, setVoteStage] = useState<'idle' | 'suspense' | 'revealed'>('idle');
  const [voteWasImpostor, setVoteWasImpostor] = useState(false);
  const [voteDetail, setVoteDetail] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'impostores' | 'civiles' | null>(null);
  const [showVictory, setShowVictory] = useState(false);

  const [debateRemaining, setDebateRemaining] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const audio = useGameAudio();
  const voteTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadContent<WordPackContent>('impostor-words.json').then((data) => {
      setPackages(data.paquetes);
      setSelectedIds(data.paquetes.filter((p) => !/\+18/.test(p.nombre)).map((p) => p.id));
    });
  }, []);

  useEffect(() => {
    if (debateRemaining === null) return;
    if (debateRemaining <= 0) { setTimeUp(true); audio.playAlarm(); return; }
    const id = setTimeout(() => setDebateRemaining((r) => (r ?? 1) - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateRemaining]);

  useEffect(() => () => { if (voteTimeoutRef.current) window.clearTimeout(voteTimeoutRef.current); }, []);

  function updateRows(next: string[]) {
    setRows(next);
    savePlayerNames(effectivePlayerNames(next));
  }

  const playerCount = effectivePlayerCount(rows);
  const hasEmptyName = rows.some((name, idx) => idx !== rows.length - 1 && !name.trim());
  const hasDuplicates = hasDuplicatePlayerNames(rows);
  const playersValid = !hasEmptyName && !hasDuplicates && playerCount >= MIN_PLAYERS;
  const maxImpostors = Math.max(MIN_IMPOSTORS, playerCount - 1);

  const settingsValid = subMode === 'custom'
    ? customWord.trim() !== '' && customImpostorCount < playerCount
    : packages !== null && selectedIds.length > 0 && randomImpostors < playerCount;
  const canStart = playersValid && settingsValid;

  function handleStart() {
    if (!canStart) return;
    const names = effectivePlayerNames(rows);
    let chosenWord = '';
    let chosenRoles: boolean[];
    let hint: string | null = null;
    let mrBlanco: string | null = null;
    let mode: ImpostorMode = 'none';

    if (subMode === 'custom') {
      chosenWord = customWord.trim();
      chosenRoles = buildRandomShuffledRoles(names.length, customImpostorCount);
    } else {
      const picked = pickRandomWordWithHint(packages!, selectedIds);
      chosenWord = picked.word;
      mode = impostorMode;
      if (mode === 'hint') hint = picked.hint;
      else if (mode === 'mrblanco') mrBlanco = picked.hint;
      chosenRoles = buildRandomShuffledRoles(names.length, randomImpostors);
    }

    setPlayerNames(names);
    setRoles(chosenRoles);
    setWord(chosenWord);
    setHintWord(hint);
    setMrBlancoWord(mrBlanco);
    setMatchImpostorMode(mode);
    setViewed(names.map(() => false));
    setAlive(names.map(() => true));
    setGameOver(false);
    setWinner(null);
    setIsFirstDebate(true);
    setScreen('roster');
  }

  function openReveal(idx: number) {
    setRevealIdx(idx);
    setRevealed(false);
  }

  function closeReveal() {
    if (revealIdx !== null) setViewed((v) => v.map((val, i) => (i === revealIdx ? true : val)));
    setRevealIdx(null);
  }

  const allViewed = viewed.length > 0 && viewed.every(Boolean);

  function enterDebate() {
    setScreen('debate');
    beginDebatePhase(true);
  }

  function beginDebatePhase(useIsFirst?: boolean) {
    const first = useIsFirst ?? isFirstDebate;
    audio.unlock();
    setTimeUp(false);
    setSelectedVoteIdx(null);
    setVoteStage('idle');
    if (first) {
      const aliveIdxs = alive.map((a, i) => (a ? i : -1)).filter((i) => i !== -1);
      const starter = aliveIdxs[Math.floor(Math.random() * aliveIdxs.length)];
      setStartPlayerName(playerNames[starter]);
      setIsFirstDebate(false);
    } else {
      setStartPlayerName(null);
    }
    setDebateRemaining(debateMinutes > 0 ? debateMinutes * 60 : null);
  }

  function confirmVote() {
    if (selectedVoteIdx === null) return;
    setDebateRemaining(null);
    setTimeUp(false);

    const idx = selectedVoteIdx;
    const wasImpostor = roles[idx];
    const nextAlive = alive.map((a, i) => (i === idx ? false : a));
    setAlive(nextAlive);

    let impostorsAlive = 0;
    let civiliansAlive = 0;
    roles.forEach((isImp, i) => { if (!nextAlive[i]) return; if (isImp) impostorsAlive++; else civiliansAlive++; });
    const impostorsWin = impostorsAlive > civiliansAlive || (impostorsAlive === 1 && civiliansAlive === 1);

    if (impostorsAlive === 0) { setGameOver(true); setWinner('civiles'); }
    else if (impostorsWin) { setGameOver(true); setWinner('impostores'); }

    const detail = impostorsAlive === 0 ? 'No quedan impostores.' : `Quedan ${impostorsAlive} ${impostorsAlive === 1 ? 'impostor.' : 'impostores.'}`;
    setVoteWasImpostor(wasImpostor);
    setVoteDetail(detail);
    setVoteStage('suspense');
    voteTimeoutRef.current = window.setTimeout(() => setVoteStage('revealed'), 1100);
  }

  function handleVoteNext() {
    setVoteStage('idle');
    if (gameOver) setShowVictory(true);
    else beginDebatePhase();
  }

  function enterSetup() {
    setDebateRemaining(null);
    setSetupStep(0);
    setScreen('setup');
  }

  const votedPlayerName = selectedVoteIdx !== null ? playerNames[selectedVoteIdx] : '';
  const displayWord = revealIdx !== null
    ? (roles[revealIdx] && matchImpostorMode === 'mrblanco' ? (mrBlancoWord ?? word)
      : roles[revealIdx] ? (hintWord ?? 'IMPOSTOR') : word)
    : '';
  const revealIsAlarm = revealIdx !== null && roles[revealIdx] && matchImpostorMode !== 'mrblanco';
  const revealClass = revealIdx !== null ? (roles[revealIdx] && matchImpostorMode !== 'mrblanco' ? 'impostor' : 'word') : '';

  return (
    <GameThemeProvider slug="impostor">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>IMPOSTOR</h1>

            {setupStep === 0 && (
              <div>
                <label><span className="label-icon">👥</span>Jugadores</label>
                <PlayerNameRows rows={rows} onChange={updateRows} min={MIN_PLAYERS} max={MAX_PLAYERS} />
                <div className="error-msg">{hasEmptyName ? 'Todos los jugadores necesitan un nombre.' : hasDuplicates ? 'No puede haber dos jugadores con el mismo nombre.' : playerCount < MIN_PLAYERS ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : ''}</div>
              </div>
            )}

            {setupStep === 0 && (
              <div className="night-nav">
                <button type="button" className="night-nav-btn" disabled={!playersValid} onClick={() => setSetupStep(1)}>Siguiente</button>
              </div>
            )}

            {setupStep === 1 && (
              <div>
                <div className="submode-toggle">
                  <button type="button" className={`submode-btn${subMode === 'random' ? ' active' : ''}`} onClick={() => setSubMode('random')}>Aleatoria</button>
                  <button type="button" className={`submode-btn${subMode === 'custom' ? ' active' : ''}`} onClick={() => setSubMode('custom')}>Personalizada</button>
                </div>

                {subMode === 'custom' && (
                  <div>
                    <label><span className="label-icon">🗣️</span>Palabra secreta</label>
                    <input type="text" placeholder="Ej: Playa, Pizza, Batman..." maxLength={40} value={customWord} onChange={(e) => setCustomWord(e.target.value)} />
                    <p className="count-info">🎲 La app asigna el impostor al azar entre los jugadores.</p>
                    <label><span className="label-icon">🎭</span>Número de impostores</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setCustomImpostorCount((v) => Math.max(MIN_IMPOSTORS, v - 1))}>−</button>
                      <div className="value">{customImpostorCount}</div>
                      <button type="button" onClick={() => setCustomImpostorCount((v) => Math.min(maxImpostors, v + 1))}>+</button>
                    </div>
                  </div>
                )}

                <details className="setup-optional">
                  <summary>Ajustes adicionales</summary>
                  <div className="setup-optional-content">
                    {subMode === 'random' && (
                      <div>
                        <label><span className="label-icon">📦</span>Paquetes</label>
                        <PackagesDropdown packages={packages} selectedIds={selectedIds} onChange={setSelectedIds} />
                      </div>
                    )}
                    <label><span className="label-icon">⏱️</span>Tiempo para debatir</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setDebateMinutes((v) => Math.max(0, v - 1))}>−</button>
                      <div className="value">{debateMinutes === 0 ? 'Sin límite' : `${debateMinutes} min`}</div>
                      <button type="button" onClick={() => setDebateMinutes((v) => Math.min(MAX_DEBATE_MINUTES, v + 1))}>+</button>
                    </div>
                  </div>
                </details>

                {subMode === 'random' && (
                  <div>
                    <label><span className="label-icon">🎭</span>Número de impostores</label>
                    <div className="stepper">
                      <button type="button" onClick={() => setRandomImpostors((v) => Math.max(MIN_IMPOSTORS, v - 1))}>−</button>
                      <div className="value">{randomImpostors}</div>
                      <button type="button" onClick={() => setRandomImpostors((v) => Math.min(maxImpostors, v + 1))}>+</button>
                    </div>

                    <label><span className="label-icon">💡</span>Modo de juego</label>
                    <div className="submode-toggle">
                      <button type="button" className={`submode-btn${impostorMode === 'none' ? ' active' : ''}`} onClick={() => setImpostorMode('none')}>Sin pista</button>
                      <button type="button" className={`submode-btn${impostorMode === 'hint' ? ' active' : ''}`} onClick={() => setImpostorMode('hint')}>Con pista</button>
                      <button type="button" className={`submode-btn${impostorMode === 'mrblanco' ? ' active' : ''}`} onClick={() => setImpostorMode('mrblanco')}>Mr. Blanco</button>
                    </div>
                    <p className="count-info">{IMPOSTOR_MODE_DESC[impostorMode]}</p>
                  </div>
                )}

                {subMode === 'custom' && <div className="count-info">{customImpostorCount} {customImpostorCount === 1 ? 'impostor' : 'impostores'} al azar de {playerCount} jugadores</div>}
                <div className="error-msg">
                  {subMode === 'custom'
                    ? (customWord.trim() === '' ? 'Escribe una palabra secreta.' : customImpostorCount >= playerCount ? 'Debe haber menos impostores que jugadores.' : '')
                    : (!packages ? 'Cargando paquetes…' : selectedIds.length === 0 ? 'Selecciona al menos un paquete.' : randomImpostors >= playerCount ? 'Debe haber menos impostores que jugadores.' : '')}
                </div>

                <div className="final-nav">
                  <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep(0)}><span className="back-icon" /></button>
                  <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={screen !== 'roster'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <p className="subtitle">Toca tu nombre para ver tu rol. Nadie más debe mirar.</p>
            <div className="roster-list" id="reveal-roster">
              {playerNames.map((name, idx) => !viewed[idx] && (
                <button type="button" className="roster-row" key={idx} onClick={() => openReveal(idx)}>
                  <span className="roster-row-name">{name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-main" disabled={!allViewed} onClick={enterDebate}>Empezar debate</button>
          </div>
        </div>

        {revealIdx !== null && (
          <div className="guide-modal-backdrop" onClick={() => (revealed ? closeReveal() : setRevealed(true))}>
            <div className="guide-modal reveal-modal">
              <RevealCard
                revealed={revealed}
                alarm={revealed && revealIsAlarm}
                contentClassName={revealClass}
                maxFontRem={1.7}
                minFontRem={0.9}
                cover={<RevealButton onClick={() => setRevealed(true)} icon="👁️" label="Revelar" />}
              >
                {displayWord}
              </RevealCard>
              <p className="reveal-close-hint">{revealed ? 'Toca la pantalla para cerrar' : ''}</p>
            </div>
          </div>
        )}

        <div className="screen" id="screen-debate" hidden={screen !== 'debate'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <h1 className="debate-title" style={{ fontSize: '1.6rem' }}>A DEBATIR</h1>

            {debateRemaining !== null && (
              <div className={`debate-timer-wrap${timeUp ? ' time-up' : ''}`}>
                <div className="debate-timer">
                  <span className="debate-timer-part">{String(Math.floor(Math.max(0, debateRemaining) / 60)).padStart(2, '0')}</span>
                  <span className="debate-timer-colon">:</span>
                  <span className="debate-timer-part">{String(Math.max(0, debateRemaining) % 60).padStart(2, '0')}</span>
                </div>
              </div>
            )}

            {voteStage === 'idle' ? (
              <div>
                <label>¿Quién creéis que es el impostor?</label>
                <div>
                  {playerNames.map((name, idx) => alive[idx] && (
                    <div key={idx} className={`vote-row${selectedVoteIdx === idx ? ' selected' : ''}`} onClick={() => setSelectedVoteIdx(idx)}>{name}</div>
                  ))}
                </div>
                <button type="button" className="btn-main" disabled={selectedVoteIdx === null} onClick={confirmVote}>Comprobar</button>
              </div>
            ) : (
              <div>
                <div className="vote-result-icon">{voteStage === 'suspense' ? '🤔' : voteWasImpostor ? '🎭' : '😇'}</div>
                <div className={`vote-result-title${voteStage === 'suspense' ? ' suspense' : voteWasImpostor ? ' reveal-impostor pulse-impostor' : ' reveal-civil pulse-civil'}`}>
                  {voteStage === 'suspense' ? `${votedPlayerName} era...` : voteWasImpostor ? '¡IMPOSTOR!' : '¡CIVIL!'}
                </div>
                <p className="subtitle">{voteStage === 'revealed' ? voteDetail : ''}</p>
                {voteStage === 'revealed' && <button type="button" className="btn-main" onClick={handleVoteNext}>Siguiente</button>}
              </div>
            )}
          </div>
        </div>

        {startPlayerName !== null && (
          <div className="guide-modal-backdrop" onClick={() => setStartPlayerName(null)}>
            <div className="guide-modal" style={{ textAlign: 'center' }}>
              <p className="start-player-line" style={{ margin: '0 0 14px' }}>Empieza a hablar: <strong>{startPlayerName}</strong></p>
              <p className="subtitle" style={{ margin: 0 }}>Toca la pantalla para continuar</p>
            </div>
          </div>
        )}

        {showVictory && winner && (
          <div className="guide-modal-backdrop">
            <div className="guide-modal" style={{ textAlign: 'center' }}>
              <h1 className={`debate-title game-over-${winner}`} style={{ fontSize: '1.6rem', marginBottom: 6 }}>{winner === 'impostores' ? 'GANAN LOS IMPOSTORES' : 'GANAN LOS CIVILES'}</h1>
              <p className="subtitle" style={{ marginBottom: 20 }}>La partida ha terminado.</p>
              <button type="button" className="btn-main" onClick={() => { setShowVictory(false); enterSetup(); }}>Nueva partida</button>
            </div>
          </div>
        )}

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Todos los jugadores ven la misma palabra secreta... excepto el impostor (o impostores), que no la conocen y deben disimular.</p>
          <h3>Modo personalizado</h3>
          <ul>
            <li>Escribe tú la palabra secreta.</li>
            <li>Elige cuántos impostores habrá; la app los asigna al azar entre los jugadores.</li>
          </ul>
          <h3>Modo aleatorio</h3>
          <ul>
            <li>Elige los paquetes temáticos que quieras usar y cuántos impostores habrá.</li>
            <li>Elige el modo de pista: <strong>Sin pista</strong> (el impostor solo ve que lo es), <strong>Con pista</strong> (ve que es impostor y además una palabra relacionada) o <strong>Mr. Blanco</strong> (recibe una palabra relacionada pero NUNCA se le dice que es el impostor).</li>
            <li>La app reparte la palabra y los impostores al azar.</li>
          </ul>
          <h3>Cómo jugar la ronda</h3>
          <ol>
            <li>Pasa el dispositivo: cada jugador ve su rol en privado y lo oculta antes de pasarlo.</li>
            <li>Al terminar, la app indica quién empieza a hablar y ya podéis ver la lista para votar.</li>
            <li>Por turnos, cada uno dice una palabra o pista relacionada sin decir la palabra secreta directamente.</li>
            <li>Si configuraste un tiempo de debate, la app avisa con una alarma y el contador parpadea en rojo al agotarse; podéis votar en cualquier momento, con o sin tiempo agotado.</li>
            <li>Votad a quien creáis impostor: se elimina y se revela si acertasteis.</li>
            <li>Si quedan impostores en minoría, se juega otra ronda de palabras y votación con los jugadores vivos. Ganan los civiles si se descubren todos los impostores; ganan los impostores si superan en número a los civiles, o si solo queda 1 impostor contra 1 civil.</li>
          </ol>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
