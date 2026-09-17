import type { GameDefinition } from '@/types/game';

interface GameCardProps {
  game: GameDefinition;
  onInfo: (game: GameDefinition) => void;
}

export function GameCard({ game, onInfo }: Readonly<GameCardProps>) {
  const iconUrl = `/resources/images/hub/${game.icon}`;
  const iconStyle = {
    maskImage: `url('${iconUrl}')`,
    WebkitMaskImage: `url('${iconUrl}')`,
  };

  return (
    <div className={`card mode-card theme-${game.theme}${game.disabled ? ' disabled' : ''}`}>
      <button type="button" className="mode-info-btn" aria-label="Descripción" onClick={() => onInfo(game)}>
        <span className="info-icon" aria-hidden="true" />
      </button>

      {game.disabled ? (
        <span className="mode-card-link" aria-label={`${game.title}, próximamente`}>
          <span className="mode-icon-badge" style={iconStyle} />
          <span className="coming-soon-badge">Próximamente</span>
        </span>
      ) : (
        <a href={`/games/${game.slug}/`} className="mode-card-link" aria-label={game.title}>
          <span className="mode-icon-badge" style={iconStyle} />
        </a>
      )}
    </div>
  );
}

