# Catálogo de juegos

16 juegos en el hub React (`/`). Todos activos salvo **Hitster**, deshabilitado con badge "Próximamente" (ver `.claude/HITSTER.md`). Los juegos se sirven desde `public/games/<english-slug>/index.html` y se enlazan como `/games/<english-slug>/`.

| # | Juego | HTML | Tema | Fichero de datos | Esquema* | Paquetes/categorías hoy |
|---|-------|------|------|-------------------|----------|--------------------------|
| 1 | Impostor | `public/games/impostor/index.html` | red | `public/data/packages.json` (compartido) | A | 29 paquetes |
| 2 | Hombres Lobo | `public/games/werewolf/index.html` | violet | `public/data/werewolf-roles.json` | D | 32 roles |
| 3 | Código Secreto | `public/games/secret-code/index.html` | steel | `public/data/secret-code-words.json` | B | 9 categorías |
| 4 | Time's Up | `public/games/times-up/index.html` | green | `public/data/packages.json` (compartido) | A | 29 paquetes |
| 5 | Verdad o Reto | `public/games/truth-or-dare/index.html` | teal | `public/data/truth-or-dare.json` | C | 3 categorías (suave/fiesta/atrevido) |
| 6 | Mímica | `public/games/charades/index.html` | amber | `public/data/packages.json` (compartido) | A | 29 paquetes |
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

- **`packages.json` es compartido por 3 juegos**: Impostor, Time's Up y Mímica. Añadir un paquete ahí lo hace disponible en los tres a la vez (tiene sentido: los tres son "adivina la palabra/actúa la palabra" con el mismo banco de palabras). El campo `relacionadas` (mapa palabra → palabra parecida) solo lo usa Impostor, para el modo "pista" — Time's Up y Mímica lo ignoran si está, y no pasa nada si un paquete no lo tiene.
- **Detective Club** no tiene fichero de datos: usa cartas Dixit físicas + palabra que teclea el jugador activo. No hay "contenido" que ampliar aquí.
- **Hitster** es el único juego completamente funcional en código pero deshabilitado en el hub — el bloqueo es puramente de contenido (pocas canciones). Ver guía dedicada.
- Cada juego con JSON propio tiene también un array `..._FALLBACK` embebido en su `<script>` (ver `.claude/PROJECT.md` § Contenido dirigido por datos) — no hace falta tocarlo al añadir contenido normal.
