const contentCache = new Map<string, unknown>();
export { pickRandom } from '@/lib/random';

export async function loadContent<T>(fileName: string): Promise<T> {
  const cached = contentCache.get(fileName);
  if (cached) return cached as T;
  const response = await fetch(`/data/${fileName}`);
  if (!response.ok) throw new Error(`No se pudo cargar ${fileName}`);
  const content = (await response.json()) as T;
  contentCache.set(fileName, content);
  return content;
}
