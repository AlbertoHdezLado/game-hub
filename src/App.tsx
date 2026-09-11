import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { HubPage } from '@/features/HubPage';
import { SimpleRevealPage } from '@/features/SimpleRevealPage';
import { TimedRoundPage } from '@/features/TimedRoundPage';
import { PicoloPage } from '@/features/PicoloPage';
import { PatataCalientePage } from '@/features/PatataCalientePage';
import { ImpostorPage } from '@/features/ImpostorPage';
import { TrivialPage } from '@/features/TrivialPage';
import { CodigoSecretoPage } from '@/features/CodigoSecretoPage';
import { DetectiveClubPage } from '@/features/DetectiveClubPage';
import { HombresLoboPage } from '@/features/HombresLoboPage';
import { LandscapePrompt } from '@/components/ui/LandscapePrompt';

export function App() {
  return <BrowserRouter><Routes><Route path="/" element={<HubPage />} /><Route path="/juegos/:slug" element={<GameRoute />} /></Routes></BrowserRouter>;
}

function GameRoute() {
  const { slug = '' } = useParams();
  let page = <SimpleRevealPage />;
  if (slug === 'mimica' || slug === 'times-up' || slug === 'tabu') page = <TimedRoundPage />;
  if (slug === 'picolo') page = <PicoloPage />;
  if (slug === 'patata-caliente') page = <PatataCalientePage />;
  if (slug === 'impostor') page = <ImpostorPage />;
  if (slug === 'trivial') page = <TrivialPage />;
  if (slug === 'codigo-secreto') page = <CodigoSecretoPage />;
  if (slug === 'detective-club') page = <DetectiveClubPage />;
  if (slug === 'hombres-lobo') page = <HombresLoboPage />;
  if (slug === 'hitster') page = <p className="error-state">Hitster estará disponible próximamente. <a href="/">Volver al hub</a></p>;
  const landscapeRecommended = slug === 'codigo-secreto' || slug === 'times-up' || slug === 'mimica';
  return <><LandscapePrompt enabled={landscapeRecommended} />{page}</>;
}
