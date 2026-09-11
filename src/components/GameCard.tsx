import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { GameDefinition } from '@/types/game';

interface GameCardProps {
  game: GameDefinition;
  onInfo: (game: GameDefinition) => void;
}

export function GameCard({ game, onInfo }: GameCardProps) {
  return (
    <article className={`game-card ${game.disabled ? 'disabled' : ''}`} style={{ '--card-accent': `var(--theme-${game.theme})` } as CSSProperties}>
      <button className="info-button" type="button" aria-label={`Descripción de ${game.title}`} onClick={() => onInfo(game)}>i</button>
      {game.disabled ? <div className="game-card-link" aria-label={`${game.title}, próximamente`}>
        <span className="game-icon" style={{ maskImage: `url(/resources/images/hub/${game.icon})`, WebkitMaskImage: `url(/resources/images/hub/${game.icon})` }} aria-hidden="true" />
        <strong>{game.title}</strong>
        <span className="game-players">{game.players}</span>
        <span className="coming-soon-badge">Próximamente</span>
      </div> : <Link className="game-card-link" to={`/juegos/${game.slug}`}>
        <span className="game-icon" style={{ maskImage: `url(/resources/images/hub/${game.icon})`, WebkitMaskImage: `url(/resources/images/hub/${game.icon})` }} aria-hidden="true" />
        <strong>{game.title}</strong>
        <span className="game-players">{game.players}</span>
      </Link>}
    </article>
  );
}
