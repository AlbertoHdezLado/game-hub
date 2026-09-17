import { useEffect, useState } from 'react';
import type { GameDefinition } from '@/types/game';

interface InfoDialogProps {
  game: GameDefinition | null;
  onClose: () => void;
}

export function InfoDialog({ game, onClose }: Readonly<InfoDialogProps>) {
  const [guideHtml, setGuideHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;

    let cancelled = false;
    setGuideHtml(null);
    fetch(`/games/${game.slug}/`)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar la guía');
        return response.text();
      })
      .then((html) => {
        if (cancelled) return;
        const document = new DOMParser().parseFromString(html, 'text/html');
        const guide = document.querySelector('#guide-modal-backdrop .guide-modal');
        guide?.querySelector('.guide-modal-close')?.remove();
        setGuideHtml(guide?.innerHTML ?? null);
      })
      .catch(() => {
        if (!cancelled) setGuideHtml(null);
      });

    return () => { cancelled = true; };
  }, [game]);

  if (!game) return null;
  const iconUrl = `/resources/images/hub/${game.icon}`;
  return (
    <div className="desc-overlay-backdrop">
      <button type="button" className="desc-overlay-close" aria-label="Cerrar" onClick={onClose}>✕</button>
      <dialog className="desc-overlay" aria-labelledby="game-info-title" open>
        <span className="desc-overlay-icon" style={{ maskImage: `url('${iconUrl}')`, WebkitMaskImage: `url('${iconUrl}')`, backgroundColor: `var(--theme-${game.theme})` }} />
        <div className="desc-overlay-title" id="game-info-title">{game.title}</div>
        <p className="desc-overlay-text">{game.description}</p>
        <div className="desc-overlay-content">
          {guideHtml ? <div dangerouslySetInnerHTML={{ __html: guideHtml }} /> : <p>Cargando instrucciones...</p>}
        </div>
      </dialog>
    </div>
  );
}
