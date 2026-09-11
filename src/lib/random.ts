export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function randomInt(min: number, max: number) {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return min + Math.floor((randomValue[0] / (2 ** 32)) * (max - min + 1));
}

function randomIndex(length: number) {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return Math.floor((randomValue[0] / 2 ** 32) * length);
}

export function shuffle<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[]): T {
  if (!items.length) throw new Error('No hay contenido disponible');
  return items[randomIndex(items.length)];
}