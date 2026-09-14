import { Link } from 'react-router-dom';
import type { GameDefinition } from '@/types/game';

interface GameCardProps {
  game: GameDefinition;
  onInfo: (game: GameDefinition) => void;
}

export function GameCard({ game, onInfo }: GameCardProps) {
  const iconUrl = `/resources/images/hub/${game.icon}`;
  return (
    <div className={`card mode-card theme-${game.theme}${game.disabled ? ' disabled' : ''}`}>
      <button type="button" className="mode-info-btn" aria-label="Descripción" onClick={() => onInfo(game)}>ⓘ</button>
      {game.disabled ? (
        <span className="mode-card-link" aria-label={`${game.title}, próximamente`}>
          <span className="mode-icon-badge" style={{ maskImage: `url('${iconUrl}')`, WebkitMaskImage: `url('${iconUrl}')` }} />
          <span className="coming-soon-badge">Próximamente</span>
        </span>
      ) : (
        <Link to={`/juegos/${game.slug}`} className="mode-card-link" aria-label={game.title}>
          <span className="mode-icon-badge" style={{ maskImage: `url('${iconUrl}')`, WebkitMaskImage: `url('${iconUrl}')` }} />
        </Link>
      )}
    </div>
  );
}

