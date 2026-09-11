import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HubPage } from '@/features/HubPage';
import { SimpleRevealPage } from '@/features/SimpleRevealPage';
import { TimedRoundPage } from '@/features/TimedRoundPage';
import { InfiniteCardPage } from '@/features/InfiniteCardPage';
import { ImpostorPage } from '@/features/ImpostorPage';
import { TrivialPage } from '@/features/TrivialPage';
import { CodigoSecretoPage } from '@/features/CodigoSecretoPage';
import { DetectiveClubPage } from '@/features/DetectiveClubPage';
import { HombresLoboPage } from '@/features/HombresLoboPage';

export function App() {
  return <BrowserRouter><Routes><Route path="/" element={<HubPage />} /><Route path="/juegos/:slug" element={<GameRoute />} /></Routes></BrowserRouter>;
}

function GameRoute() {
  const slug = window.location.pathname.split('/').pop() ?? '';
  if (slug === 'mimica' || slug === 'times-up' || slug === 'tabu') return <TimedRoundPage />;
  if (slug === 'picolo' || slug === 'patata-caliente') return <InfiniteCardPage />;
  if (slug === 'impostor') return <ImpostorPage />;
  if (slug === 'trivial') return <TrivialPage />;
  if (slug === 'codigo-secreto') return <CodigoSecretoPage />;
  if (slug === 'detective-club') return <DetectiveClubPage />;
  if (slug === 'hombres-lobo') return <HombresLoboPage />;
  return <SimpleRevealPage />;
}
