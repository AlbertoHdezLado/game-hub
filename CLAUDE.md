# Game Hub

Colección de juegos de fiesta/mesa en Vite + React para el hub, con juegos legacy vanilla servidos como páginas estáticas limpias en `public/games/<slug>/index.html`. La app muestra el hub en `/` y cada juego en `/games/<english-slug>/`, sin exponer `.html` en las URLs.

Contexto completo del proyecto en `.claude/`:

- **[.claude/PROJECT.md](.claude/PROJECT.md)** — arquitectura, stack, convenciones compartidas (shared.css/shared.js), patrón de pantallas, sistema de temas y iconos.
- **[.claude/GAMES.md](.claude/GAMES.md)** — catálogo de los 16 juegos: fichero HTML, fichero de datos, esquema JSON, estado.
- **[.claude/ADDING_CONTENT.md](.claude/ADDING_CONTENT.md)** — cómo añadir contenido (palabras, preguntas, cartas, roles...) a cada juego, agrupado por tipo de esquema.
- **[.claude/HITSTER.md](.claude/HITSTER.md)** — guía específica de Hitster: cómo añadir canciones/ediciones y cómo activarlo en el hub (está deshabilitado con badge "Próximamente" aunque el juego funciona al 100%, solo le falta catálogo de canciones).

Lee estos ficheros antes de tocar contenido de un juego o el hub.
