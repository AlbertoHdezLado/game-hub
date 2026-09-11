import { Link } from 'react-router-dom';
import type { GameDefinition } from '@/types/game';

interface InfoDialogProps {
  game: GameDefinition | null;
  onClose: () => void;
}

export function InfoDialog({ game, onClose }: InfoDialogProps) {
  if (!game) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="game-info-title" onClick={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
        <span className="dialog-kicker">{game.kind}</span>
        <h2 id="game-info-title">{game.title}</h2>
        <p>{game.description}</p>
        <Link className="primary-button" to={`/juegos/${game.slug}`} onClick={onClose}>Jugar</Link>
      </section>
    </div>
  );
}
