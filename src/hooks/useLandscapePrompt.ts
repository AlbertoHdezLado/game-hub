import { useEffect, useState } from 'react';

export function useLandscapePrompt(enabled: boolean) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(orientation: portrait) and (max-width: 600px)');
    const update = () => setIsPortrait(enabled && query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [enabled]);

  return isPortrait;
}