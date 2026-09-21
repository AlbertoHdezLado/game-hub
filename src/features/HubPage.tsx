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
    <div id="app">
      <div className="screen" id="screen-mode">
        <HubHeader />
        <GameGrid iconsReady={iconsReady} onInfo={setSelectedGame} />
        <HubFooter version={version} />
      </div>

      {selectedGame && <InfoDialog game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}

function HubHeader() {
  return (
    <div className="hub-logo" aria-label="Game Hub" />
  );
}

function GameGrid({ iconsReady, onInfo }: Readonly<{ iconsReady: boolean; onInfo: (game: GameDefinition) => void }>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const updateScrollState = () => {
    const grid = gridRef.current;
    if (!grid) return;

    setCanScrollLeft(grid.scrollLeft > 2);
    setCanScrollRight(grid.scrollLeft + grid.clientWidth < grid.scrollWidth - 2);
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    updateScrollState();
    grid.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      grid.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [iconsReady]);

  const scrollByPage = (direction: number) => {
    gridRef.current?.scrollBy({ left: direction * gridRef.current.clientWidth * .75, behavior: 'smooth' });
  };

  return (
    <div className="mode-grid-shell">
      {canScrollLeft && (
        <button type="button" className="carousel-arrow carousel-arrow-left" aria-label="Juegos anteriores" onClick={() => scrollByPage(-1)}>
          <span aria-hidden="true" />
        </button>
      )}
      <div ref={gridRef} className={`mode-grid${iconsReady ? ' ready' : ''}`}>
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
    <div className="hub-footer">
      <a
        href="https://forms.gle/ne3tXqPzfKN98PuK6"
        target="_blank"
        rel="noopener noreferrer"
        className="suggestion-link"
      >
        💡 Enviar una sugerencia
      </a>
      <span>Creado por Alberto Hernández</span>
      <span>v{version}</span>
    </div>
  );
}
