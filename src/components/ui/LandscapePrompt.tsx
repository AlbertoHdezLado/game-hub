import { useLandscapePrompt } from '@/hooks/useLandscapePrompt';

interface LandscapePromptProps {
  enabled: boolean;
}

export function LandscapePrompt({ enabled }: Readonly<LandscapePromptProps>) {
  const visible = useLandscapePrompt(enabled);
  if (!visible) return null;
  return <div className="landscape-prompt" role="status" aria-label="Orientación recomendada"><span className="landscape-prompt-icon" aria-hidden="true" /><p className="landscape-prompt-title">Gira el móvil</p><p className="landscape-prompt-text">Este juego se disfruta mejor con la pantalla en horizontal.</p></div>;
}