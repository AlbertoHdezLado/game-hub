import { useEffect, useState } from 'react';
import { GameCard } from '@/components/GameCard';
import { InfoDialog } from '@/components/InfoDialog';
import { games } from '@/data/games';
import type { GameDefinition } from '@/types/game';

export function HubPage() {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [version, setVersion] = useState('…');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/version.json').then((response) => response.json()).then((data: { build?: number }) => setVersion(`0.${data.build ?? '?'}`)).catch(() => setVersion('?'));
  }, []);

  // icons stay hidden until every one has preloaded, so they all fade in
  // together instead of popping in one by one (mirrors legacy index.html)
  useEffect(() => {
    let settled = 0;
    const total = games.length;
    if (!total) { setReady(true); return; }
    let cancelled = false;
    const timeout = window.setTimeout(() => { if (!cancelled) setReady(true); }, 1500);
    games.forEach((game) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        settled++;
        if (settled === total && !cancelled) { setReady(true); window.clearTimeout(timeout); }
      };
      img.src = `/resources/images/hub/${game.icon}`;
    });
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, []);

  return (
    <div id="app">
      <div className="screen" id="screen-mode">
        <div className="hub-logo" role="img" aria-label="Game Hub" />
        <a href="https://forms.gle/ne3tXqPzfKN98PuK6" target="_blank" rel="noopener noreferrer" className="suggestion-link">💡 Enviar una sugerencia</a>
        <div className={`mode-grid${ready ? ' ready' : ''}`}>
          {games.map((game) => <GameCard key={game.slug} game={game} onInfo={setSelectedGame} />)}
        </div>
        <div className="hub-footer">
          <span>Creado por Alberto Hernández</span>
          <span>v{version}</span>
        </div>
      </div>
      {selectedGame && <InfoDialog game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}
