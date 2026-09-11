import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '@/lib/storage';

const storageKey = 'gamehub.playerNames';

export function usePersistentNames(initialNames: readonly string[]) {
  const [names, setNames] = useState<string[]>(() => {
    const saved = readStorage<string[]>(storageKey, []);
    return saved.length ? saved : [...initialNames];
  });

  useEffect(() => {
    writeStorage(storageKey, names);
  }, [names]);

  return [names, setNames] as const;
}