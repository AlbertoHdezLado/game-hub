import { useEffect, useRef, useState } from 'react';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { GuideModal } from '@/components/shared/GuideModal';
import { TeamPlayerRows } from '@/components/shared/TeamPlayerRows';
import { TeamBoxes } from '@/components/shared/TeamBoxes';
import { loadContent } from '@/lib/content';
import { randomInt as cryptoRandomInt, shuffle } from '@/lib/random';
import {
  MAX_TEAMS, MIN_TEAMS, TEAM_NAMES, autoBalanceAllTeams, buildTeams, emptyTeamIndex,
  initialTeamRows, leastPopulatedTeam, normalizeTrailingTeamSlot, randomizeAllTeams, realPlayerCount, type TeamRow,
} from '@/lib/teamSetup';
import { loadSavedPlayerNames, savePlayerNames } from '@/lib/shared';
import '@/styles/games/team-shared.css';
import '@/styles/games/trivial.css';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 30;
const MAX_ROUNDS = 72;
const MIN_WEDGE_GAP = 3;
const MAX_WEDGE_GAP = 5;

interface Question { pregunta: string; opciones: string[]; correcta: number }
interface Category { id: string; nombre: string; icono: string; preguntas: Question[] }

const CATEGORY_COLOR: Record<string, string> = {
  historia: '#f2c94c', ciencia: '#8fd9ac', geografia: '#5b8fe0',
  cine_y_musica: '#e05d9c', deportes: '#f0954f', arte_y_literatura: '#a970e0',
};
function categoryColor(id: string): string { return CATEGORY_COLOR[id] ?? '#9dc9ff'; }

interface Team {
  score: number;
  memberIdxs: number[];
  nextMemberPointer: number;
  wedges: string[];
  turnsPlayed: number;
  nextWedgeTurn: number;
}

function randomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max);
}

export function TrivialPage() {
  const [rows, setRows] = useState<TeamRow[]>(() => initialTeamRows(loadSavedPlayerNames(), MAX_PLAYERS, 2));
  const [numTeams, setNumTeams] = useState(2);
  const [setupStep, setSetupStep] = useState(0);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [screen, setScreen] = useState<'setup' | 'game' | 'end'>('setup');

  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categoryQueues, setCategoryQueues] = useState<Record<string, Question[]>>({});
  const [round, setRound] = useState(0);
  const [turnTeamPointer, setTurnTeamPointer] = useState(0);
  const [currentActorIdx, setCurrentActorIdx] = useState(0);
  const [categoryChoices, setCategoryChoices] = useState<Category[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [isWedgeRound, setIsWedgeRound] = useState(false);
  const [wedgeWonMsg, setWedgeWonMsg] = useState<string | null>(null);
  const [nextTurnOpen, setNextTurnOpen] = useState(false);
  const [turnPlayVisible, setTurnPlayVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentOptions, setCurrentOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [answered, setAnswered] = useState(false);
  const [answeredIdx, setAnsweredIdx] = useState<number | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [winnerTeamIdx, setWinnerTeamIdx] = useState<number | null>(null);
  const teamBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContent<{ categorias: Category[] }>('trivia.json').then((data) => setCategories(data.categorias));
  }, []);

  function updateRows(next: TeamRow[]) {
    setRows(next);
    savePlayerNames(next.map((r) => r.name.trim()).filter(Boolean));
  }

  function changeNumTeams(next: number) {
    const value = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, next));
    setNumTeams(value);
    let balanced = autoBalanceAllTeams(rows, value);
    if (balanced.length && !balanced[balanced.length - 1].name.trim()) {
      balanced = balanced.slice();
      balanced[balanced.length - 1] = { ...balanced[balanced.length - 1], team: leastPopulatedTeam(balanced, value) };
    }
    updateRows(balanced);
  }

  const playerCount = realPlayerCount(rows);
  const playersValid = playerCount >= MIN_PLAYERS;
  const emptyTeam = playersValid ? emptyTeamIndex(rows, numTeams) : -1;
  const teamsValid = playersValid && emptyTeam === -1;
  const canStart = teamsValid && categories !== null;

  function categoryById(id: string): Category {
    return categories!.find((c) => c.id === id)!;
  }

  function drawQuestion(categoryId: string, queues: Record<string, Question[]>): { question: Question; queues: Record<string, Question[]> } {
    let queue = queues[categoryId];
    const nextQueues = { ...queues };
    if (!queue || queue.length === 0) {
      queue = shuffle(categoryById(categoryId).preguntas);
    }
    const [question, ...rest] = queue;
    nextQueues[categoryId] = rest;
    return { question, queues: nextQueues };
  }

  function showCategoryChoice(teamsState: Team[], teamPointer: number) {
    const team = teamsState[teamPointer];
    const wedgeRound = team.turnsPlayed + 1 === team.nextWedgeTurn;
    setIsWedgeRound(wedgeRound);

    const pool = shuffle(categories!);
    let choices: Category[];
    if (wedgeRound) {
      const missing = pool.filter((c) => !team.wedges.includes(c.id));
      choices = missing.slice(0, 2);
      if (choices.length < 2) pool.forEach((c) => { if (choices.length < 2 && !choices.includes(c)) choices.push(c); });
    } else {
      choices = pool.slice(0, 2);
    }
    setCategoryChoices(choices);
    setNextTurnOpen(true);
  }

  function startTurn(teamsState: Team[], teamPointer: number, rotateActor: boolean) {
    const team = teamsState[teamPointer];
    let actorIdx = currentActorIdx;
    let nextTeams = teamsState;
    if (rotateActor) {
      actorIdx = team.memberIdxs[team.nextMemberPointer % team.memberIdxs.length];
      nextTeams = teamsState.map((t, i) => (i === teamPointer ? { ...t, nextMemberPointer: t.nextMemberPointer + 1 } : t));
      setTeams(nextTeams);
    }
    setCurrentActorIdx(actorIdx);
    setAnswered(false);
    setAnsweredIdx(null);
    setTurnPlayVisible(false);
    showCategoryChoice(nextTeams, teamPointer);
  }

  function handleStart() {
    if (!canStart) return;
    const built = buildTeams(rows, numTeams);
    const initialTeams: Team[] = built.teams.map((t) => ({ ...t, wedges: [], turnsPlayed: 0, nextWedgeTurn: randomInt(MIN_WEDGE_GAP, MAX_WEDGE_GAP) }));
    const startPointer = cryptoRandomInt(0, initialTeams.length - 1);
    setPlayerNames(built.playerNames);
    setTeams(initialTeams);
    setTurnTeamPointer(startPointer);
    setCategoryQueues({});
    setRound(0);
    setWinnerTeamIdx(null);
    setScreen('game');
    startTurn(initialTeams, startPointer, true);
  }

  function chooseCategory(category: Category) {
    setCurrentCategoryId(category.id);
    setNextTurnOpen(false);
    const { question, queues } = drawQuestion(category.id, categoryQueues);
    setCategoryQueues(queues);
    setCurrentQuestion(question);
    const options = question.opciones.map((text, i) => ({ text, isCorrect: i === question.correcta }));
    setCurrentOptions(shuffle(options));
    setAnswered(false);
    setAnsweredIdx(null);
    setTurnPlayVisible(true);
  }

  function animateWedgeWin(teamIdx: number, categoryId: string) {
    const targetEl = teamBarRef.current?.querySelector<HTMLElement>(`.tv-team-bar-item[data-team="${teamIdx}"] .tv-team-bar-wedge[data-category-id="${categoryId}"]`);
    if (!targetEl) return;
    targetEl.style.visibility = 'hidden';
    const cat = categoryById(categoryId);
    const rect = targetEl.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const bigSize = Math.min(vw, vh) * 0.34;
    const bigX = vw / 2 - bigSize / 2, bigY = vh / 2 - bigSize / 2;
    const endX = rect.left, endY = rect.top, endSize = rect.width;

    const fly = document.createElement('div');
    fly.className = 'wedge-fly';
    fly.style.background = categoryColor(categoryId);
    fly.textContent = cat.icono;
    document.body.appendChild(fly);

    const anim = fly.animate([
      { left: `${bigX}px`, top: `${bigY}px`, width: `${bigSize}px`, height: `${bigSize}px`, fontSize: `${bigSize * 0.5}px`, opacity: 0, offset: 0 },
      { left: `${bigX}px`, top: `${bigY}px`, width: `${bigSize}px`, height: `${bigSize}px`, fontSize: `${bigSize * 0.5}px`, opacity: 1, offset: 0.15 },
      { left: `${bigX}px`, top: `${bigY}px`, width: `${bigSize}px`, height: `${bigSize}px`, fontSize: `${bigSize * 0.5}px`, opacity: 1, offset: 0.55 },
      { left: `${endX}px`, top: `${endY}px`, width: `${endSize}px`, height: `${endSize}px`, fontSize: `${endSize * 0.5}px`, opacity: 1, offset: 1 },
    ], { duration: 1200, easing: 'cubic-bezier(.32,.78,.32,1)', fill: 'forwards' });

    anim.onfinish = () => {
      fly.remove();
      targetEl.style.visibility = '';
      targetEl.classList.add('wedge-pop');
    };
  }

  function answerOption(idx: number) {
    if (answered || !currentQuestion || !currentCategoryId) return;
    setAnswered(true);
    setAnsweredIdx(idx);
    const picked = currentOptions[idx];
    const teamIdx = turnTeamPointer;

    let wedgeWon = false;
    const nextTeams = teams.map((t, i) => {
      if (i !== teamIdx) return t;
      let next = { ...t, score: picked.isCorrect ? t.score + 1 : t.score };
      if (picked.isCorrect && isWedgeRound && !t.wedges.includes(currentCategoryId)) {
        next = { ...next, wedges: [...t.wedges, currentCategoryId] };
        wedgeWon = true;
        if (next.wedges.length === categories!.length) setWinnerTeamIdx(teamIdx);
      }
      next.turnsPlayed += 1;
      if (isWedgeRound) next.nextWedgeTurn = next.turnsPlayed + randomInt(MIN_WEDGE_GAP, MAX_WEDGE_GAP);
      return next;
    });
    setTeams(nextTeams);
    setWedgeWonMsg(wedgeWon ? `¡Ganaste la insignia de ${categoryById(currentCategoryId).nombre}!` : null);
    setRound((r) => r + 1);
    setLastAnswerCorrect(picked.isCorrect);

    if (wedgeWon) {
      requestAnimationFrame(() => animateWedgeWin(teamIdx, currentCategoryId));
    }
  }

  function handleContinue() {
    if (winnerTeamIdx !== null || round >= MAX_ROUNDS) { setScreen('end'); return; }
    if (lastAnswerCorrect) {
      startTurn(teams, turnTeamPointer, false);
    } else {
      const nextPointer = (turnTeamPointer + 1) % teams.length;
      setTurnTeamPointer(nextPointer);
      startTurn(teams, nextPointer, true);
    }
  }

  function enterSetup() {
    setSetupStep(0);
    setScreen('setup');
  }

  function renderWedgeTracker(team: Team, className = 'tv-wedge-tracker') {
    return (
      <div className={className}>
        {categories!.map((c) => {
          const won = team.wedges.includes(c.id);
          return <span key={c.id} className={`tv-wedge${won ? ' won' : ''}`} style={won ? { background: categoryColor(c.id), borderColor: categoryColor(c.id) } : undefined} title={c.nombre}>{c.icono}</span>;
        })}
      </div>
    );
  }

  function renderScoreboard(highlightWinner: boolean, showRank: boolean) {
    const order = teams.map((_, i) => i).sort((a, b) => teams[b].score - teams[a].score);
    const scoresDesc = order.map((i) => teams[i].score);
    const maxScore = scoresDesc[0];
    return (
      <div>
        {order.map((t) => {
          const isTop = highlightWinner && teams[t].score === maxScore;
          const pillLabel = showRank ? `${scoresDesc.indexOf(teams[t].score) + 1}º` : t + 1;
          return (
            <div key={t} className={`team-score-row${isTop ? ' winner' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="team-score-name"><span className={`mini-score-pill team-color-${t}`}>{pillLabel}</span>{TEAM_NAMES[t]}</span>
                <span className="team-score-value">{teams[t].score}</span>
              </div>
              {renderWedgeTracker(teams[t], 'tv-wedge-tracker')}
            </div>
          );
        })}
      </div>
    );
  }

  const currentTeam = teams[turnTeamPointer];
  const currentCategory = currentCategoryId ? categoryById(currentCategoryId) : null;
  const maxWedges = teams.length ? Math.max(...teams.map((t) => t.wedges.length)) : 0;
  const contenders = teams.map((_, i) => i).filter((i) => teams[i]?.wedges.length === maxWedges);
  let endWinners = contenders;
  if (contenders.length > 1) {
    const maxScoreAmong = Math.max(...contenders.map((i) => teams[i].score));
    endWinners = contenders.filter((i) => teams[i].score === maxScoreAmong);
  }

  return (
    <GameThemeProvider slug="trivial">
      <div id="app">
        <div className="screen" id="screen-setup" hidden={screen !== 'setup'}>
          <div className="card">
            <div className="setup-header">
              <a href="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></a>
              <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
            </div>
            <h1>TRIVIAL PURSUIT</h1>

            {setupStep === 0 && (
              <div>
                <label><span className="label-icon">👥</span>Jugadores</label>
                <TeamPlayerRows rows={rows} onChange={updateRows} min={MIN_PLAYERS} max={MAX_PLAYERS} numTeams={numTeams} onNormalize={(next) => normalizeTrailingTeamSlot(next, MAX_PLAYERS, numTeams)} />
                <div className="error-msg">{!playersValid ? `Necesitas al menos ${MIN_PLAYERS} jugadores.` : ''}</div>
              </div>
            )}

            {setupStep === 1 && (
              <div>
                <label><span className="label-icon">🎯</span>Equipos</label>
                <div className="stepper">
                  <button type="button" onClick={() => changeNumTeams(numTeams - 1)}>−</button>
                  <div className="value">{numTeams}</div>
                  <button type="button" onClick={() => changeNumTeams(numTeams + 1)}>+</button>
                </div>
                <div className="team-boxes-header">
                  <button type="button" className="randomize-teams-btn" onClick={() => updateRows(randomizeAllTeams(rows, numTeams))}><span className="dice-icon" />Aleatorio</button>
                </div>
                <TeamBoxes rows={rows} numTeams={numTeams} onAssign={(idx, team) => updateRows(rows.map((r, i) => (i === idx ? { ...r, team } : r)))} />
                <div className="error-msg">{emptyTeam !== -1 ? `${TEAM_NAMES[emptyTeam]} no tiene jugadores.` : ''}</div>
                <div className="error-msg">{!categories ? 'Cargando categorías…' : ''}</div>
                <div className="final-nav">
                  <button type="button" className="night-nav-btn icon-only" aria-label="Anterior" onClick={() => setSetupStep(0)}><span className="back-icon" /></button>
                  <button type="button" className="btn-main" disabled={!canStart} onClick={handleStart}>Iniciar partida</button>
                </div>
              </div>
            )}

            {setupStep === 0 && (
              <div className="night-nav">
                <button type="button" className="night-nav-btn" disabled={!playersValid} onClick={() => setSetupStep(1)}>Siguiente</button>
              </div>
            )}
          </div>
        </div>

        <div className="screen" id="screen-game" hidden={screen !== 'game'}>
          <div className="card">
            <div className="tv-team-bar" ref={teamBarRef}>
              {teams.map((team, t) => (
                <div key={t} className={`tv-team-bar-item team-color-${t}`} data-team={t}>
                  <span className="tv-team-bar-wedges">
                    {categories?.map((c) => {
                      const won = team.wedges.includes(c.id);
                      return <span key={c.id} className={`tv-team-bar-wedge${won ? ' won' : ''}`} style={won ? { background: categoryColor(c.id) } : undefined} data-category-id={c.id} title={c.nombre}>{c.icono}</span>;
                    })}
                  </span>
                </div>
              ))}
            </div>
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio" onClick={(e) => { e.preventDefault(); enterSetup(); }}><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
                <span className="back-btn" style={{ cursor: 'default' }}>TRIVIAL PURSUIT</span>
              </div>
              <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
            </div>

            {turnPlayVisible && currentQuestion && (
              <div>
                <div className="tv-category-current">{currentCategory?.icono} {currentCategory?.nombre}</div>
                <div className="tv-question">{currentQuestion.pregunta}</div>
                <div className="tv-options">
                  {currentOptions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`tv-option${answered ? ' disabled' : ''}${answered && opt.isCorrect ? ' correct' : ''}${answered && !opt.isCorrect && i === answeredIdx ? ' incorrect' : ''}`}
                      onClick={() => answerOption(i)}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
                {answered && <button type="button" className="btn-main" onClick={handleContinue}>{winnerTeamIdx !== null ? 'Ver resultado' : 'Siguiente'}</button>}
              </div>
            )}
          </div>
        </div>

        {nextTurnOpen && currentTeam && (
          <div className="guide-modal-backdrop">
            <div className={`guide-modal${isWedgeRound ? ' insignia-round' : ''}`} id="next-turn-modal" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <a href="/" className="guide-btn" aria-label="Inicio" onClick={(e) => { e.preventDefault(); enterSetup(); }}><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
              </div>
              <div className={`team-turn-badge team-color-${turnTeamPointer}`}>{TEAM_NAMES[turnTeamPointer]?.toUpperCase()}</div>
              <div className="player-name">{playerNames[currentActorIdx]}</div>
              {wedgeWonMsg && <p className="wedge-won-msg pop">{wedgeWonMsg}</p>}
              {isWedgeRound && <div className="tv-wedge-banner">¡Ronda de insignia! Acierta y te llevas la categoría elegida.</div>}
              <p className="pass-hint">Selecciona una categoría</p>
              <div className="tv-category-options">
                {categoryChoices.map((c) => {
                  const color = categoryColor(c.id);
                  return (
                    <button key={c.id} type="button" className="tv-category-option" style={{ borderColor: `${color}55`, background: `${color}22` }} onClick={() => chooseCategory(c)}>
                      <span className="tv-category-option-icon">{c.icono}</span>
                      <span>{c.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="screen" id="screen-end" hidden={screen !== 'end'}>
          <div className="card">
            <div className="setup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a href="/" className="guide-btn" aria-label="Inicio"><span className="home-icon" /></a>
                <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={enterSetup}><span className="back-icon" /></button>
              </div>
              <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={() => setHelpOpen(true)}>?</button>
            </div>
            <div className="end-icon">🏆</div>
            <h1 style={{ fontSize: '1.6rem' }}>
              {winnerTeamIdx !== null ? `¡${TEAM_NAMES[winnerTeamIdx]?.toUpperCase()} GANA!` : endWinners.length > 1 ? '¡VICTORIA COMPARTIDA!' : `¡${TEAM_NAMES[endWinners[0]]?.toUpperCase()} GANA!`}
            </h1>
            <p className="subtitle">
              {winnerTeamIdx !== null
                ? `Ha conseguido las ${categories?.length ?? 6} insignias.`
                : 'La partida se alargó demasiado — gana quien más insignias consiguió.'}
            </p>
            {renderScoreboard(true, true)}
            <button type="button" className="btn-main" onClick={enterSetup}>Nueva partida</button>
          </div>
        </div>

        <GuideModal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <h2>Cómo se juega</h2>
          <h3>Objetivo</h3>
          <p>Formad equipos. Las categorías son siempre las mismas: 🏛️ Historia, 🔬 Ciencia, 🌍 Geografía, 🎬 Cine y música, 🏅 Deportes y 🎨 Arte y literatura. Gana el primer equipo que consiga una insignia de cada categoría.</p>
          <h3>Turno</h3>
          <p>En cada turno, un miembro distinto del equipo (rotando por orden) sostiene el móvil. Antes de ver la pregunta, el equipo elige entre 2 categorías propuestas al azar. Luego lee la pregunta en voz alta para que todo el equipo decida la respuesta.</p>
          <h3>Rachas</h3>
          <p>Si acertáis, seguís jugando: os toca otra vez, con otras 2 categorías para elegir. Si falláis, el turno pasa al equipo siguiente. La app siempre muestra cuál era la respuesta correcta después de contestar.</p>
          <h3>Insignias</h3>
          <p>Cada 3-5 rondas la carta se pone dorada: es una ronda de insignia. Si acertáis esa pregunta, os lleváis la insignia de la categoría elegida (una vez por categoría). El marcador de tu equipo muestra qué insignias lleváis ya.</p>
          <h3>Fin de la partida</h3>
          <p>Gana el primer equipo en completar las 6 insignias. Si la partida se alarga demasiado sin que nadie las complete, gana quien tenga más insignias; en caso de empate, decide la puntuación.</p>
        </GuideModal>
      </div>
    </GameThemeProvider>
  );
}
