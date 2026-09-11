import type { GameDefinition } from '@/types/game';

export const games: GameDefinition[] = [
  { slug: 'impostor', title: 'Impostor', description: 'Todos ven la misma palabra... menos el impostor.', icon: 'impostor-logo.svg', theme: 'red', players: '3-12 jugadores', kind: 'roles' },
  { slug: 'hombres-lobo', title: 'Hombres Lobo', description: 'Lobos contra aldeanos: de noche se caza, de día se vota.', icon: 'hombres-lobo-logo.svg', theme: 'violet', players: '5-20 jugadores', kind: 'roles' },
  { slug: 'codigo-secreto', title: 'Código Secreto', description: 'Dos equipos, un tablero de palabras y una clave secreta.', icon: 'codigo-secreto-logo.svg', theme: 'steel', players: '4+ jugadores', kind: 'special' },
  { slug: 'times-up', title: "Time's Up", description: 'Adivinad personajes en tres fases con las mismas cartas.', icon: 'times-up-logo.svg', theme: 'green', players: '4+ jugadores', kind: 'timed' },
  { slug: 'verdad-o-reto', title: 'Verdad o Reto', description: 'Elige verdad o reto y que salga lo que tenga que salir.', icon: 'verdad-o-reto-logo.svg', theme: 'teal', players: '2+ jugadores', kind: 'reveal' },
  { slug: 'mimica', title: 'Mímica', description: 'Actúa sin hablar y que los demás adivinen la palabra.', icon: 'mimica-logo.svg', theme: 'amber', players: '3+ jugadores', kind: 'timed' },
  { slug: 'patata-caliente', title: 'Patata Caliente', description: 'Pasad el móvil mientras respondéis a un tema antes de que explote.', icon: 'patata-caliente-logo.svg', theme: 'flame', players: '2+ jugadores', kind: 'special' },
  { slug: 'yo-nunca', title: 'Yo Nunca', description: 'El clásico de las confesiones. Si lo has hecho, pierdes una vida.', icon: 'yo-nunca-logo.svg', theme: 'gold', players: '3+ jugadores', kind: 'reveal' },
  { slug: 'picolo', title: 'Picolo', description: 'Retos, preguntas, tragos e interacciones para una partida infinita.', icon: 'picolo-logo.svg', theme: 'orange', players: '3+ jugadores', kind: 'special' },
  { slug: 'trivial', title: 'Trivial Pursuit', description: 'Preguntas de cultura general por equipos.', icon: 'trivial-logo.svg', theme: 'lime', players: '2+ equipos', kind: 'teams' },
  { slug: 'tabu', title: 'Tabú', description: 'Describe la palabra sin decir ninguna de las palabras prohibidas.', icon: 'taboo-logo.svg', theme: 'purple', players: '4+ jugadores', kind: 'timed' },
  { slug: 'quien-es-mas-probable', title: '¿Quién es más probable?', description: 'Una frase, un grupo y un dedo señalando.', icon: 'quien-es-mas-probable-que-logo.svg', theme: 'yellow', players: '3+ jugadores', kind: 'reveal' },
  { slug: 'que-harias-si', title: '¿Qué Harías Si...?', description: 'Escenarios imposibles para debatir entre risas.', icon: 'que-harias-si-logo.svg', theme: 'indigo', players: '2+ jugadores', kind: 'reveal' },
  { slug: 'que-preferirias', title: '¿Qué Preferirías?', description: 'Dos opciones al azar para elegir y debatir.', icon: 'que-preferirias-logo.svg', theme: 'cyan', players: '2+ jugadores', kind: 'reveal' },
  { slug: 'detective-club', title: 'Detective Club', description: 'Un jugador no conoce la palabra secreta y debe disimular.', icon: 'detective-club-logo.svg', theme: 'blue', players: '4+ jugadores', kind: 'roles' },
  { slug: 'hitster', title: 'Hitster', description: 'Construye una línea temporal musical y adivina los años.', icon: 'hitster-logo.svg', theme: 'rose', players: '2+ jugadores', kind: 'special', disabled: true },
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
