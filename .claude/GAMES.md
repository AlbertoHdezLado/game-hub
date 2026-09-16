# Catálogo de juegos

16 juegos en el hub React (`/`). Todos activos salvo **Hitster**, deshabilitado con badge "Próximamente" (ver `.claude/HITSTER.md`). Los juegos se sirven desde `public/games/<english-slug>/index.html` y se enlazan como `/games/<english-slug>/`.

| # | Juego | HTML | Tema | Fichero de datos | Esquema* | Paquetes/categorías hoy |
|---|-------|------|------|-------------------|----------|--------------------------|
| 1 | Impostor | `public/games/impostor/index.html` | red | `public/data/impostor-words.json` | A | 28 paquetes |
| 2 | Hombres Lobo | `public/games/werewolf/index.html` | violet | `public/data/werewolf-roles.json` | D | 32 roles |
| 3 | Código Secreto | `public/games/secret-code/index.html` | steel | `public/data/secret-code-words.json` | B | 9 categorías |
| 4 | Time's Up | `public/games/times-up/index.html` | green | `public/data/times-up-words.json` | A | 28 paquetes |
| 5 | Verdad o Reto | `public/games/truth-or-dare/index.html` | teal | `public/data/truth-or-dare.json` | C | 3 categorías (suave/fiesta/atrevido) |
| 6 | Mímica | `public/games/charades/index.html` | amber | `public/data/charades-words.json` | A | 25 paquetes (curados para ser mimeables en silencio) |
| 7 | Yo Nunca | `public/games/never-have-i-ever/index.html` | gold | `public/data/never-have-i-ever.json` | B | 3 categorías |
| 8 | Picolo | `public/games/picolo/index.html` | orange | `public/data/picolo.json` | E | lista plana de cartas |
| 9 | Trivial Pursuit | `public/games/trivia/index.html` | lime | `public/data/trivia.json` | F | 6 categorías |
| 10 | Taboo | `public/games/taboo/index.html` | purple | `public/data/taboo.json` | G | 5 paquetes |
| 11 | ¿Quién es más probable? | `public/games/most-likely/index.html` | yellow | `public/data/most-likely.json` | B | 4 categorías |
| 12 | ¿Qué Harías Si...? | `public/games/what-would-you-do/index.html` | indigo | `public/data/what-would-you-do.json` | B | 4 categorías |
| 13 | ¿Qué Preferirías? | `public/games/would-you-rather/index.html` | cyan | `public/data/would-you-rather.json` | H | lista plana de opciones |
| 14 | Patata Caliente | `public/games/hot-potato/index.html` | flame | `public/data/hot-potato.json` | B | 10 categorías |
| 15 | Detective Club | `public/games/detective-club/index.html` | blue | — (sin JSON) | — | la palabra la escribe el jugador activo cada ronda, basada en una carta Dixit física; no hay banco de contenido que editar |
| 16 | Hitster | `public/games/hitster/index.html` | rose | `public/data/music-timeline.json` | I | 2 ediciones · 19-20 canciones cada una (contenido MUY escaso — por eso está deshabilitado) |

\* Letra de esquema = sección correspondiente en `.claude/ADDING_CONTENT.md`.

## Notas importantes

- **Impostor, Time's Up y Mímica ya NO comparten fichero.** Antes leían todos de `packages.json`; ahora cada uno tiene su propio JSON (`impostor-words.json`, `times-up-words.json`, `charades-words.json`) con el mismo esquema A, para poder curar el contenido según la mecánica de cada juego sin afectar a los otros dos (ver más abajo). Añadir una palabra a uno de ellos ya NO la añade a los otros — hay que replicarla a mano si tiene sentido en varios juegos.
- El campo `relacionadas` (mapa palabra → palabra parecida) solo lo usa Impostor, para el modo "pista". Time's Up y Mímica no lo tienen ni lo necesitan.
- **`charades-words.json` está deliberadamente recortado respecto a los otros dos**: excluye por completo las categorías `colores` (no se puede mimar un color) y `marcas` (nombres de marca sin acción física clara), y en `emociones`/`cine_y_television` se quitaron las palabras demasiado abstractas o jerga de rodaje (p. ej. "Sinopsis", "Showrunner", "Continuidad") que no se pueden representar con gestos/sonidos. Si añades contenido a Mímica, pregúntate primero: ¿se puede representar esto sin hablar, solo con gestos y sonidos? Si la respuesta es "solo explicándolo con palabras", no lo metas ahí (mejor en Impostor o Time's Up, que si permiten hablar en 2 de sus 3 rondas).
- **Detective Club** no tiene fichero de datos: usa cartas Dixit físicas + palabra que teclea el jugador activo. No hay "contenido" que ampliar aquí.
- **Hitster** es el único juego completamente funcional en código pero deshabilitado en el hub — el bloqueo es puramente de contenido (pocas canciones). Ver guía dedicada.
- Cada juego con JSON propio tiene también un array `..._FALLBACK` embebido en su `<script>` (ver `.claude/PROJECT.md` § Contenido dirigido por datos) — no hace falta tocarlo al añadir contenido normal.
