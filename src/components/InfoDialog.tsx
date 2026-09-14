import type { GameDefinition } from '@/types/game';

interface InfoDialogProps {
  game: GameDefinition | null;
  onClose: () => void;
}

export function InfoDialog({ game, onClose }: InfoDialogProps) {
  if (!game) return null;
  const iconUrl = `/resources/images/hub/${game.icon}`;
  return (
    <div className="desc-overlay-backdrop" role="presentation">
      <button type="button" className="desc-overlay-close" aria-label="Cerrar" onClick={onClose}>✕</button>
      <div className="desc-overlay" role="dialog" aria-modal="true" aria-labelledby="game-info-title">
        <span className="desc-overlay-icon" style={{ maskImage: `url('${iconUrl}')`, WebkitMaskImage: `url('${iconUrl}')`, backgroundColor: `var(--theme-${game.theme})` }} />
        <div className="desc-overlay-title" id="game-info-title">{game.title}</div>
        <p className="desc-overlay-text">{game.description}</p>
      </div>
    </div>
  );
}
