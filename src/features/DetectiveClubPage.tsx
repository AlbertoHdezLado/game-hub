import { useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { GuideModal } from '@/components/shared/GuideModal';
import { PlayerNameRows } from '@/components/shared/PlayerNameRows';
import { RevealCard, RevealButton } from '@/components/shared/RevealCard';
import { effectivePlayerCount, effectivePlayerNames, hasDuplicatePlayerNames, loadSavedPlayerNames, normalizeTrailingSlot, savePlayerNames } from '@/lib/shared';
import { pickRandom, randomInt } from '@/lib/random';
import '@/styles/games/detective-club.css';

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 16;
const RECOMMENDED_MAX_PLAYERS = 8;
const MIN_LAPS = 1;
const MAX_LAPS = 5;

type Screen = 'setup' | 'word' | 'reveal' | 'vote' | 'result' | 'final';

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function buildActiveSchedule(n: number, laps: number): number[] {
  const start = randomInt(0, n - 1);
  const schedule: number[] = [];
  for (let lap = 0; lap < laps; lap++) for (let i = 0; i < n; i++) schedule.push((start + i) % n);
  return schedule;
}

function describeSetup(n: number, laps: number): string {
  if (n < MIN_PLAYERS) return '';
  const rounds = n * laps;
  const detectives = n - 2;
  return `${n} jugadores → 1 activo, 1 conspirador, ${detectives} ${detectives === 1 ? 'detective' : 'detectives'} · ${rounds} rondas (cada jugador es activo ${laps} ${laps === 1 ? 'vez' : 'veces'})`;
}

export function DetectiveClubPage() {
  const [rows, setRows] = useState<string[]>(() => normalizeTrailingSlot(loadSavedPlayerNames().slice(0, MAX_PLAYERS), MAX_PLAYERS));
  const [laps, setLaps] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('setup');
  const [voteWarningOpen, setVoteWarningOpen] = useState(false);

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [conspiradorIdx, setConspiradorIdx] = useState(0);
  const [detectiveIdxs, setDetectiveIdxs] = useState<number[]>([]);
  const [revealOrder, setRevealOrder] = useState<number[]>([]);
  const [revealViewed, setRevealViewed] = useState<boolean[]>([]);
  const [word, setWord] = useState('');
  const [wordDraft, setWordDraft] = useState('');

  const [revealPos, setRevealPos] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [voteStage, setVoteStage] = useState<'gate' | 'result'>('gate');
  const [selectedVoters, setSelectedVoters] = useState<Set<number>>(new Set());

  const [resultData, setResultData] = useState<{ caught: boolean; detail: string; deltas: Record<number, number>; isLast: boolean } | null>(null);

  function updateRows(next: string[]) {
    setRows(next);
    savePlayerNames(effectivePlayerNames(next));
  }

  const playerCount = effectivePlayerCount(rows);
  const hasEmptyName = rows.some((name, idx) => idx !== rows.length - 1 && !name.trim());
  const hasDuplicates = hasDuplicatePlayerNames(rows);
  const playersValid = !hasEmptyName && !hasDuplicates && playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;

  function startRound(sched: number[], r: number, names: string[]) {
    const n = names.length;
    const active = sched[r];
    const others = range(n).filter((i) => i !== active);
    const conspirador = pickRandom(others);
    setActiveIdx(active);
    setConspiradorIdx(conspirador);
    setDetectiveIdxs(range(n).filter((i) => i !== active && i !== conspirador));
    setRevealOrder(others);
    setRevealViewed(others.map(() => false));
    setWordDraft('');
    setScreen('word');
  }

  function handleStart() {
    if (!playersValid) return;
    const names = effectivePlayerNames(rows);
    const sched = buildActiveSchedule(names.length, laps);
    setPlayerNames(names);
    setScores(names.map(() => 0));
    setSchedule(sched);
    setRound(0);
    setVoteWarningOpen(true);
    startRound(sched, 0, names);
  }

  function confirmWord() {
    if (!wordDraft.trim()) return;
    setWord(wordDraft.trim());
    setScreen('reveal');
  }

  function openReveal(pos: number) {
    setRevealPos(pos);
    setRevealed(false);
  }

  function closeReveal() {
    if (revealPos !== null) setRevealViewed((v) => v.map((val, i) => (i === revealPos ? true : val)));
    setRevealPos(null);
  }

  const allViewed = revealViewed.length > 0 && revealViewed.every(Boolean);

  function enterVotePhase() {
    setVoteStage('gate');
    setSelectedVoters(new Set());
    setScreen('vote');
  }

  function toggleVoter(idx: number) {
    setSelectedVoters((current) => {
      const next = new Set(current);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function finishVoting() {
    const correctVotes = selectedVoters.size;
    const detectiveCount = detectiveIdxs.length;
    const caught = correctVotes >= 2;
    const deltas: Record<number, number> = {};
    playerNames.forEach((_, i) => { deltas[i] = 0; });

    const nextScores = scores.slice();
    if (caught) {
      detectiveIdxs.forEach((d) => { if (selectedVoters.has(d)) { nextScores[d] += 3; deltas[d] = 3; } });
    } else {
      nextScores[conspiradorIdx] += 5; deltas[conspiradorIdx] = 5;
      nextScores[activeIdx] += 4; deltas[activeIdx] = 4;
    }
    setScores(nextScores);

    const detail = caught
      ? `${correctVotes} de ${detectiveCount} detectives han acertado.`
      : `${correctVotes === 0 ? 'Ningún detective ha acertado.' : `Solo 1 de ${detectiveCount} detectives ha acertado.`} El conspirador y ${playerNames[activeIdx]} (jugador activo) se llevan los puntos.`;

    setResultData({ caught, detail, deltas, isLast: round + 1 >= schedule.length });
    setScreen('result');
  }

  function handleResultNext() {
    if (resultData?.isLast) { setScreen('final'); return; }
    const nextRound = round + 1;
    setRound(nextRound);
    startRound(schedule, nextRound, playerNames);
  }

  function enterSetup() {
    setScreen('setup');
  }

  function renderScoreboard(highlightWinner: boolean, deltas?: Record<number, number>) {
    const order = playerNames.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const scoresDesc = order.map((i) => scores[i]);
    const maxScore = scoresDesc[0];
    return (
      <div>
        {order.map((i) => {
          const isTop = highlightWinner && scores[i] === maxScore;
          const rankLabel = `${scoresDesc.indexOf(scores[i]) + 1}º`;
          const delta = deltas?.[i] ?? 0;
          return (
            <div key={i} className={`score-row${isTop ? ' winner' : ''}`}>
              <span className="score-name"><span className="score-pill">{rankLabel}</span>{playerNames[i]}</span>
              <span className="score-value">{delta > 0 && <span className="score-delta">+{delta}</span>}{scores[i]}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const revealCardIdx = revealPos !== null ? revealOrder[revealPos] : -1;
  const revealIsConspirador = revealCardIdx === conspiradorIdx;
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const winners = playerNames.filter((_, i) => scores[i] === maxScore);

  return (
    <GameThemeProvider slug="detective-club">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <ScreenHeader onHelp={() => setHelpOpen(true)} />
            <h1>DETECTIVE CLUB</h1>
            <p className="subtitle">Necesitas una baraja de cartas Dixit físicas para jugar</p>

            <label><span className="label-icon">🕵️</span>Jugadores</label>
            <PlayerNameRows rows={rows} onChange={updateRows} min={MIN_PLAYERS} max={MAX_PLAYERS} />
            <div className="error-msg">{hasEmptyName ? 'Todos los jugadores necesitan un nombre.' : hasDuplicates ? 'No puede haber dos jugadores con el mismo nombre.' : (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) ? `Necesitas entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores.` : ''}</div>
            <div className="count-info">{describeSetup(playerCount, laps)}</div>
            {playerCount > RECOMMENDED_MAX_PLAYERS && <div className="warn-note">Se recomiendan hasta 8 jugadores para partidas más dinámicas.</div>}

            <details className="setup-optional">
              <summary>Ajustes adicionales</summary>
              <div className="setup-optional-content">
                <label><span className="label-icon">🔁</span>Vueltas</label>
                <div className="stepper">
                  <button type="button" onClick={() => setLaps((v) => Math.max(MIN_LAPS, v - 1))}>−</button>
                  <div className="value">{laps}</div>
                  <button type="button" onClick={() => setLaps((v) => Math.min(MAX_LAPS, v + 1))}>+</button>
                </div>
                <p className="count-info">Cuántas veces es cada jugador el jugador activo.</p>
              </div>
            </details>

            <button type="button" className="btn-main" disabled={!playersValid} onClick={handleStart}>Iniciar partida</button>
          </div>
        </div>

        <div className="screen" id="screen-word" hidden={screen !== 'word'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="player-badge">TU TURNO</div>
            <div className="player-name">{playerNames[activeIdx]}</div>
            <p className="pass-hint">Pasa el dispositivo a este jugador. Solo debe mirarlo él o ella.</p>
            <label><span className="label-icon">🎴</span>Elige una carta de Dixit y escribe una palabra o pista que la describa</label>
            <input type="text" placeholder="Ej: Playa, Pizza, Batman..." maxLength={40} value={wordDraft} onChange={(e) => setWordDraft(e.target.value)} />
            <button type="button" className="btn-main" disabled={!wordDraft.trim()} onClick={confirmWord}>Confirmar y empezar ronda</button>
          </div>
        </div>

        <div className="screen" id="screen-reveal" hidden={screen !== 'reveal'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <p className="subtitle">Toca tu nombre para ver tu carta. Nadie más debe mirar.</p>
            <div className="roster-list" id="reveal-roster">
              {revealOrder.map((idx, pos) => !revealViewed[pos] && (
                <button type="button" className="roster-row" key={pos} onClick={() => openReveal(pos)}>
                  <span className="roster-row-name">{playerNames[idx]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-main" disabled={!allViewed} onClick={enterVotePhase}>Continuar</button>
          </div>
        </div>

        {revealPos !== null && (
          <div className="guide-modal-backdrop">
            <div className="guide-modal reveal-modal">
              <button type="button" className="guide-modal-close" disabled={!revealed} onClick={closeReveal}>✕</button>
              <RevealCard
                revealed={revealed}
                alarm={revealed && revealIsConspirador}
                contentClassName={revealIsConspirador ? 'impostor' : 'word'}
                cover={<RevealButton onClick={() => setRevealed(true)} icon="👁️" label="Revelar" />}
              >
                {revealIsConspirador ? (
                  <><div>CONSPIRADOR</div><div className="reveal-desc">No conoces la palabra. Escucha con atención y disimula para no delatarte.</div></>
                ) : (
                  <><div>{word}</div><div className="reveal-desc">Eres detective. Memoriza la palabra y luego intenta descubrir al conspirador.</div></>
                )}
              </RevealCard>
            </div>
          </div>
        )}

        <div className="screen" id="screen-vote" hidden={screen !== 'vote'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            {voteStage === 'gate' ? (
              <div>
                <p className="subtitle">Debatid en voz alta y votad a mano alzada</p>
                <p className="pass-hint">Cuando el grupo termine de votar, revela al conspirador.</p>
                <button type="button" className="btn-main" onClick={() => setVoteStage('result')}>🔎 Revelar conspirador</button>
              </div>
            ) : (
              <div>
                <div className="result-icon">🎭</div>
                <div className="result-title">El conspirador es {playerNames[conspiradorIdx]}</div>
                <label><span className="label-icon">🗳️</span>¿Quién votó por el conspirador?</label>
                <div className="chip-list">
                  {detectiveIdxs.map((idx) => (
                    <button type="button" key={idx} className={`chip${selectedVoters.has(idx) ? ' selected' : ''}`} onClick={() => toggleVoter(idx)}>
                      <span className="chip-name">{playerNames[idx]}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-main" onClick={finishVoting}>Confirmar votos</button>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-result" hidden={screen !== 'result'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            {resultData && (
              <>
                <div className="result-icon">{resultData.caught ? '🕵️' : '🎭'}</div>
                <div className={`result-title ${resultData.caught ? 'caught' : 'escaped'}`}>El conspirador era {playerNames[conspiradorIdx]}</div>
                <p className="subtitle" style={{ marginBottom: 14 }}>{resultData.detail}</p>
                <div className="result-deltas">
                  {playerNames.map((name, i) => resultData.deltas[i] > 0 && <span className="result-delta-pill" key={i}>{name} +{resultData.deltas[i]}</span>)}
                </div>
                <label><span className="label-icon">🏆</span>Marcador</label>
                {renderScoreboard(false, resultData.deltas)}
                <button type="button" className="btn-main" onClick={handleResultNext}>{resultData.isLast ? 'Ver resultado final' : 'Siguiente ronda'}</button>
              </>
            )}
          </div>
        </div>

        <div className="screen" id="screen-final" hidden={screen !== 'final'}>
          <div className="card">
            <ScreenHeader variant="game" onBackToSetup={enterSetup} onHelp={() => setHelpOpen(true)} />
            <div className="end-icon">🏆</div>
            <h1 style={{ fontSize: '1.6rem' }}>PARTIDA TERMINADA</h1>
            <p className="subtitle">{winners.length > 1 ? `Empate entre ${winners.join(', ')} con ${maxScore} ${maxScore === 1 ? 'punto.' : 'puntos.'}` : `${winners[0]} gana con ${maxScore} ${maxScore === 1 ? 'punto.' : 'puntos.'}`}</p>
            <label><span className="label-icon">🏆</span>Marcador final</label>
            {renderScoreboard(true)}
            <button type="button" className="btn-main" onClick={enterSetup}>Nueva partida</button>
          </div>
        </div>

        <GuideModal open={voteWarningOpen} onClose={() => setVoteWarningOpen(false)}>
          <h2>⚠️ Antes de votar</h2>
          <p>En esta partida la votación es <strong>manual</strong>: debatid y votad en voz alta o a mano alzada, sin pasar el dispositivo.</p>
          <p>Cuando el grupo esté listo, alguien pulsará <strong>«Revelar conspirador»</strong>. Esa acción <strong>no tiene vuelta atrás</strong> — asegúrate de que la votación ya ha terminado antes de pulsarla.</p>
          <button type="button" className="btn-main" onClick={() => setVoteWarningOpen(false)}>Entendido</button>
        </GuideModal>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>En cada ronda, el <strong>jugador activo</strong> (por turnos, en orden) elige una carta de Dixit y decide una palabra secreta relacionada. Un <strong>conspirador</strong> aleatorio entre el resto no conoce esa palabra. Los detectives deben descubrir quién es el conspirador.</p>
          <h3>Roles</h3>
          <ul>
            <li><strong>Jugador activo:</strong> le toca por turnos. Elige una carta de Dixit, decide la palabra secreta de la ronda y da una pista de una sola palabra sin decirla directamente. No vota.</li>
            <li><strong>Conspirador:</strong> uno al azar entre los demás jugadores. No conoce la palabra. Debe escuchar la ronda y disimular para no delatarse.</li>
            <li><strong>Detectives:</strong> conocen la palabra. Escuchan la pista, debaten en voz alta y luego votan en privado quién creen que es el conspirador.</li>
          </ul>
          <h3>Cómo se juega una ronda</h3>
          <ol>
            <li>El jugador activo de esa ronda escribe en privado la palabra secreta (basada en la carta de Dixit que elija).</li>
            <li>Pasa el dispositivo: el resto de jugadores ve su rol (y la palabra, si le corresponde) en privado y lo oculta antes de pasarlo.</li>
            <li>El jugador activo da su pista en voz alta y muestra la carta elegida.</li>
            <li>Debatid entre todos sobre la pista y la carta elegida.</li>
            <li>Cada detective vota en privado (pasando el dispositivo de nuevo) a quién cree que es el conspirador.</li>
          </ol>
          <h3>Puntuación</h3>
          <p><strong>4 jugadores (1 activo, 1 conspirador, 2 detectives):</strong> si ambos detectives votan al conspirador, cada uno gana 3 puntos. Si solo lo vota uno o ninguno, el conspirador gana 5 puntos y el jugador activo 4.</p>
          <p><strong>5 o más jugadores:</strong> si el conspirador recibe 2 o más votos, cada jugador que haya acertado gana 3 puntos. Si recibe 0 o 1 voto, el conspirador gana 5 puntos y el jugador activo 4.</p>
          <h3>Votación</h3>
          <p>La votación es manual: debatid y votad en voz alta o a mano alzada, sin pasar el dispositivo. Cuando el grupo termine, alguien revela al conspirador (sin vuelta atrás) y marca en la app quién le votó.</p>
          <h3>Duración</h3>
          <p>El primer jugador activo se elige al azar; a partir de ahí el turno pasa en el orden de la lista, de forma cíclica, tantas vueltas como elijas en el ajuste "Vueltas" (por defecto 1). La app reparte los turnos y suma los puntos automáticamente.</p>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
