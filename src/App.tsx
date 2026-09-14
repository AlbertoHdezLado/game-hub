import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom';
import { HubPage } from '@/features/HubPage';
import { CategoryPhrasePage } from '@/features/CategoryPhrasePage';
import { QuePrefeririasPage } from '@/features/QuePrefeririasPage';
import { VerdadORetoPage } from '@/features/VerdadORetoPage';
import { MimicaPage } from '@/features/MimicaPage';
import { TimesUpPage } from '@/features/TimesUpPage';
import { TabuPage } from '@/features/TabuPage';
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
  let page = <p className="error-state">Juego no encontrado. <a href="/">Volver al hub</a></p>;
  if (slug === 'yo-nunca' || slug === 'quien-es-mas-probable' || slug === 'que-harias-si') page = <CategoryPhrasePage />;
  if (slug === 'que-preferirias') page = <QuePrefeririasPage />;
  if (slug === 'verdad-o-reto') page = <VerdadORetoPage />;
  if (slug === 'mimica') page = <MimicaPage />;
  if (slug === 'times-up') page = <TimesUpPage />;
  if (slug === 'tabu') page = <TabuPage />;
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
