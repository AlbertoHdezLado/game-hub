import { useEffect, useRef, useState } from 'react';
import { GameCard } from '@/components/GameCard';
import { InfoDialog } from '@/components/InfoDialog';
import { games } from '@/data/games';
import type { GameDefinition } from '@/types/game';

export function HubPage() {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [version, setVersion] = useState('…');
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    fetch('/version.json')
      .then((response) => response.json())
      .then((data: { build?: number }) => setVersion(`0.${data.build ?? '?'}`))
      .catch(() => setVersion('?'));
  }, []);

  useEffect(() => {
    let settled = 0;
    const iconUrls = games.map((game) => `/resources/images/hub/${game.icon}`);

    if (!iconUrls.length) {
      setIconsReady(true);
      return;
    }

    const reveal = () => setIconsReady(true);
    const timeoutId = window.setTimeout(reveal, 1500);

    iconUrls.forEach((url) => {
      const image = new Image();
      image.onload = image.onerror = () => {
        settled += 1;
        if (settled === iconUrls.length) {
          window.clearTimeout(timeoutId);
          reveal();
        }
      };
      image.src = url;
    });

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <div className="hub-header">
        <HubHeader />
      </div>
      <a
        href="https://forms.gle/ne3tXqPzfKN98PuK6"
        target="_blank"
        rel="noopener noreferrer"
        className="suggestion-link"
      >
        💡 Enviar una sugerencia
      </a>
      <div className="hub-body">
        <GameGrid iconsReady={iconsReady} onInfo={setSelectedGame} />
      </div>
      <div className="hub-footer"><HubFooter version={version} /></div>

      {selectedGame && <InfoDialog game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </>
  );
}

function HubHeader() {
  return (
    <div className="hub-header-content">
      <div className="hub-logo" aria-label="Game Hub" />
    </div>
  );
}

function GameGrid({ iconsReady, onInfo }: Readonly<{ iconsReady: boolean; onInfo: (game: GameDefinition) => void }>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);

  const updateScrollState = () => {
    const grid = gridRef.current;
    if (!grid) return;

    setCanScrollLeft(hasUserScrolledRef.current && grid.scrollLeft > 8);
    setCanScrollRight(grid.scrollLeft + grid.clientWidth < grid.scrollWidth - 2);
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const frameId = window.requestAnimationFrame(() => {
      hasUserScrolledRef.current = false;
      grid.scrollLeft = 0;
      updateScrollState();
    });
    grid.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      grid.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [iconsReady]);

  const scrollByPage = (direction: number) => {
    if (direction > 0) hasUserScrolledRef.current = true;
    gridRef.current?.scrollBy({ left: direction * gridRef.current.clientWidth * .75, behavior: 'smooth' });
  };

  const markGridInteraction = () => {
    hasUserScrolledRef.current = true;
  };

  return (
    <div className="mode-grid-shell">
      {canScrollLeft && (
        <button type="button" className="carousel-arrow carousel-arrow-left" aria-label="Juegos anteriores" onClick={() => scrollByPage(-1)}>
          <span aria-hidden="true" />
        </button>
      )}
      <div
        ref={gridRef}
        className={`mode-grid${iconsReady ? ' ready' : ''}`}
        onPointerDown={markGridInteraction}
        onWheel={markGridInteraction}
      >
        {games.map((game) => (
          <GameCard key={game.slug} game={game} onInfo={onInfo} />
        ))}
      </div>
      {canScrollRight && (
        <button type="button" className="carousel-arrow carousel-arrow-right" aria-label="Más juegos" onClick={() => scrollByPage(1)}>
          <span aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function HubFooter({ version }: Readonly<{ version: string }>) {
  return (
    <div className="hub-footer-content">
      <span>Creado por Alberto Hernández</span>
      <span>v{version}</span>
    </div>
  );
}
