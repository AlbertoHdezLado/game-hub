import { useEffect, useState } from 'react';
import { GameCard } from '@/components/GameCard';
import { InfoDialog } from '@/components/InfoDialog';
import { games } from '@/data/games';
import type { GameDefinition } from '@/types/game';

export function HubPage() {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [version, setVersion] = useState('…');

  useEffect(() => {
    fetch('/version.json').then((response) => response.json()).then((data: { build?: number }) => setVersion(`0.${data.build ?? '?'}`)).catch(() => setVersion('?'));
  }, []);

  return (
    <main className="hub-shell">
      <header className="hub-header">
        <div className="hub-logo" role="img" aria-label="Game Hub" />
        <p className="hub-subtitle">Elige una partida y pasad el móvil.</p>
      </header>
      <section className="game-grid" aria-label="Juegos disponibles">
        {games.map((game) => <GameCard key={game.slug} game={game} onInfo={setSelectedGame} />)}
      </section>
      <footer className="hub-footer"><a href="/legacy/index.html">Versión anterior</a><span>Game Hub · v{version}</span></footer>
      <InfoDialog game={selectedGame} onClose={() => setSelectedGame(null)} />
    </main>
  );
}
