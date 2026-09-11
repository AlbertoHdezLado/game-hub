import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameThemeProvider } from '@/components/GameThemeProvider';
import { MainButton } from '@/components/ui/MainButton';
import { PlayerInput } from '@/components/ui/PlayerInput';
import { getGame } from '@/data/games';
import { loadContent, pickRandom } from '@/lib/content';
import { usePersistentNames } from '@/hooks/usePersistentNames';

interface PicoloCard { tipo: string; texto: string }
interface PicoloContent { cartas: PicoloCard[] }

const typeIcons: Record<string, string> = { trago: '🥃', reparte: '🍹', reto: '😈', pregunta: '🤔', interaccion: '🤝', interacción: '🤝', grupo: '👥', decision: '🙋', decisión: '🙋' };

export function PicoloPage() {
  const game = getGame('picolo');
  const [names, setNames] = usePersistentNames(['Jugador 1', 'Jugador 2', 'Jugador 3']);
  const [card, setCard] = useState<PicoloCard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContent<PicoloContent>('picolo.json').then((data) => setCard(pickRandom(data.cartas))).catch(() => setError('No se pudo cargar el contenido.'));
  }, []);

  function nextCard() {
    loadContent<PicoloContent>('picolo.json').then((data) => setCard(pickRandom(data.cartas))).catch(() => setError('No se pudo cargar el contenido.'));
  }

  if (!game) return <p className="error-state">Juego no encontrado. <Link to="/">Volver al hub</Link></p>;
  const text = card?.texto.replaceAll('{P1}', names[0] ?? 'Alguien').replaceAll('{P2}', names[1] ?? names[0] ?? 'Alguien').replaceAll('{P}', names[0] ?? 'Alguien') ?? 'Cargando…';
  return <GameThemeProvider theme={game.theme}><main className="game-shell"><header className="game-header"><Link className="icon-button" to="/" aria-label="Volver al hub">⌂</Link><span>{game.title}</span><Link className="icon-button" to="/" aria-label="Ayuda">?</Link></header><section className="game-panel infinite-panel"><span className="eyebrow">Carta nueva</span><h1>{game.title}</h1><PlayerInput label="Jugadores" names={names} onChange={setNames} min={2} /><div className="infinite-card picolo-card"><span className="picolo-badge">{typeIcons[card?.tipo ?? ''] ?? '🎲'} {card?.tipo ?? 'Carta'}</span><strong>{text}</strong></div>{error && <p className="form-message">{error}</p>}<MainButton onClick={nextCard}>Siguiente carta</MainButton></section></main></GameThemeProvider>;
}