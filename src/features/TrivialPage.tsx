import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { getGame } from '@/data/games';
import { loadContent, pickRandom } from '@/lib/content';

interface Question { pregunta: string; opciones: string[]; correcta: number }
interface Category { nombre: string; preguntas: Question[] }
interface Content { categorias: Category[] }

export function TrivialPage() {
  const game = getGame('trivial');
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState(2);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [teamTurn, setTeamTurn] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => { loadContent<Content>('trivial.json').then((data) => setCategories(data.categorias)); }, []);

  function nextQuestion() {
    const category = pickRandom(categories);
    setQuestion(pickRandom(category.preguntas));
    setSelected(null);
    setAnswered(false);
  }

  function start() { setScores(Array.from({ length: teams }, () => 0)); setTeamTurn(0); setStarted(true); nextQuestion(); }
  function answer(index: number) {
    if (answered || !question) return;
    setSelected(index); setAnswered(true);
    if (index === question.correcta) setScores((current) => current.map((score, team) => team === teamTurn ? score + 1 : score));
  }
  function continueTurn() { if (selected !== question?.correcta) setTeamTurn((current) => (current + 1) % teams); nextQuestion(); }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  return <GameThemeProvider theme={game.theme}><main className="game-shell"><header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header>{!started ? <section className="game-panel"><span className="eyebrow">Configuración</span><h1>Trivial</h1><label className="field-label">Equipos <strong>{teams}</strong><input type="range" min="2" max="4" value={teams} onChange={(event) => setTeams(Number(event.target.value))} /></label><button className="primary-button" type="button" disabled={!categories.length} onClick={start}>Empezar partida</button></section> : <section className="game-panel trivia-panel"><div className="score-row"><span>Turno: Equipo {teamTurn + 1}</span><span>{scores.map((score, index) => `E${index + 1}: ${score}`).join(' · ')}</span></div><span className="eyebrow">Pregunta</span><h1 className="question-title">{question?.pregunta}</h1><div className="answer-grid">{question?.opciones.map((option, index) => <button className={answered && index === question.correcta ? 'answer correct' : answered && index === selected ? 'answer wrong' : 'answer'} type="button" key={option} onClick={() => answer(index)}>{option}</button>)}</div>{answered && <><p className={selected === question?.correcta ? 'answer-feedback correct-text' : 'answer-feedback wrong-text'}>{selected === question?.correcta ? '¡Correcto!' : `La respuesta era: ${question?.opciones[question?.correcta]}`}</p><button className="primary-button" type="button" onClick={continueTurn}>Siguiente pregunta</button></>}</section>}</main></GameThemeProvider>;
}
