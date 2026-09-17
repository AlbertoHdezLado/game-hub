import { useEffect, useState } from 'react';
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
    <>
      <div className="hub-logo" aria-label="Game Hub" />
      <a
        href="https://forms.gle/ne3tXqPzfKN98PuK6"
        target="_blank"
        rel="noopener noreferrer"
        className="suggestion-link"
      >
        Enviar una sugerencia
      </a>
    </>
  );
}

function GameGrid({ iconsReady, onInfo }: Readonly<{ iconsReady: boolean; onInfo: (game: GameDefinition) => void }>) {
  return (
    <div className={`mode-grid${iconsReady ? ' ready' : ''}`}>
      {games.map((game) => (
        <GameCard key={game.slug} game={game} onInfo={onInfo} />
      ))}
    </div>
  );
}

function HubFooter({ version }: Readonly<{ version: string }>) {
  return (
    <div className="hub-footer">
      <span>Creado por Alberto Hernández</span>
      <span>v{version}</span>
    </div>
  );
}
