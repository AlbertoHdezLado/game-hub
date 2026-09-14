import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { getGame } from '@/data/games';
import { HubPage } from '@/features/HubPage';

const HOME = '/';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/games/:slug" element={<GameRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

function ExternalRedirect({ to }: Readonly<{ to: string }>) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return <p className="error-state">Cargando Game Hub...</p>;
}

function GameRoute() {
  const { slug = '' } = useParams();
  const game = getGame(slug);

  if (!game || game.disabled) {
    return (
      <p className="error-state">
        Juego no encontrado. <a href={HOME}>Volver al hub</a>
      </p>
    );
  }

  return <ExternalRedirect to={`/games/${slug}/`} />;
}
