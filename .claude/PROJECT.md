# Game Hub — Arquitectura y convenciones

## Qué es

App web de juegos de fiesta/mesa para jugar en grupo con un solo móvil (o uno por equipo). El hub está montado con Vite + React en `/`, y los juegos recuperan la implementación vanilla original como documentos estáticos servidos en `/games/<english-slug>/` desde `public/games/<english-slug>/index.html`.

## Stack

- Vite + React + TypeScript para el hub y el enrutado base.
- Cada juego mantiene su HTML + CSS + JS vanilla, estilo ES5 (`var`, funciones anónimas, sin módulos ES6), en `public/games/<english-slug>/index.html`.
- Datos de contenido (palabras, preguntas, cartas, roles...) en `public/data/*.json`, cargados desde los juegos vía `fetch('/data/archivo.json')`.
- `public/analytics.js`: Google Analytics (GA4). Solo recoge datos de verdad si la app está en un dominio real.

## Ficheros compartidos

- **`public/shared.css`** — design system común para los juegos estáticos: variables CSS (`--bg1/2/3`, `--accent`, `--accent2`, `--text`, `--glass`...), layout base (`#app`, `.screen`, `.card`), tipografía. Cada juego sobreescribe `--accent`/`--accent2` (y a veces `--reveal-b`) en su propio `<style>` para teñir su UI con su color de marca.
- **`public/shared.js`** — utilidades compartidas entre juegos:
  - `shuffle`, `clamp`, `escapeHtml`, `popValue` (animación al cambiar un valor numérico).
  - `loadSavedPlayerNames` / `savePlayerNames` — nombres de jugadores persistidos en `localStorage` (`gamehub.playerNames`), compartidos entre Impostor / Hombres Lobo / Detective Club.
  - `loadSavedRoleCounts` / `saveRoleCounts` — configuración de roles de Hombres Lobo persistida (`gamehub.werewolfRoleCounts`).
  - `setupModal` — modal genérico abrir/cerrar (usado por el modal de "Cómo se juega" en todos los juegos).
  - `initHomeExitConfirm` — intercepta todo `a[aria-label="Inicio"]` fuera de `#screen-setup` para pedir confirmación antes de volver al hub (se perdería la partida).
  - `initBackToSetupConfirm(returnToSetup)` — igual pero para el botón "volver a configuración" dentro del propio juego.
  - `createRevealCard` — tarjeta de "toca para revelar" (usada en Impostor, Hombres Lobo, Detective Club).
- **`src/features/HubPage.tsx` + `src/components/GameCard.tsx`** — el hub React. Reproduce el grid legacy de tarjetas (`.mode-card`), cada una con icono, color de tema y enlace limpio a `/games/<english-slug>/`.

## Patrón de pantallas de cada juego

Casi todos los juegos siguen la misma estructura de `<div class="screen" id="screen-XXX">`:

1. `screen-setup` — configuración (nombre de equipo/jugadores, elegir paquetes/categorías, número de jugadores...).
2. `screen-game` (o varias pantallas intermedias: reveal, vote, result...) — la partida en sí.
3. `screen-end` / `screen-final` — pantalla de resultado, con botón para volver a `screen-setup`.

Cambiar de pantalla es simplemente añadir/quitar la clase `hidden` (función `switchScreen()` local a cada juego, no compartida).

Cabecera estándar de cada pantalla (excepto a veces la de setup):
```html
<div class="setup-header">
  <a href="index.html" class="guide-btn" aria-label="Inicio"><span class="home-icon"></span></a>
  <button type="button" class="guide-btn back-to-setup-btn" aria-label="Volver a configuración"><span class="back-icon"></span></button>
  <button type="button" class="guide-btn ayuda-trigger" aria-label="Ayuda">?</button>
</div>
```

## Contenido dirigido por datos (JSON + fallback)

Los juegos con banco de contenido (palabras, preguntas, cartas...) NO llevan el contenido embebido como única fuente — cargan un `.json` propio:

```js
function loadX(){
  return fetch('archivo.json')
    .then(function(r){ if (!r.ok) throw new Error('bad response'); return r.json(); })
    .then(function(data){ DATA = data.algunaClave; })
    .catch(function(){ DATA = DATA_FALLBACK; })   // ver abajo
    .then(function(){ /* render inicial, validar setup */ });
}
```

Cada `<juego>.html` define además una constante `..._FALLBACK` en su propio `<script>`, con un subconjunto pequeño de los mismos datos. Es una red de seguridad para cuando `fetch()` falla (típicamente al abrir el HTML directamente con doble clic — `file://` — donde algunos navegadores bloquean el `fetch` de un JSON local por CORS). **No hace falta mantener el fallback sincronizado 1:1 con el JSON completo** al añadir contenido nuevo: basta con editar el `.json`. Solo toca el fallback si quieres que ese subconjunto mínimo también refleje el cambio (raro que haga falta).

Consecuencia práctica: **para añadir contenido a un juego casi nunca hay que tocar el `.html`**, solo el `.json` — el HTML itera sobre los arrays que recibe, así que una entrada nueva (palabra, pregunta, categoría, paquete...) aparece automáticamente.

## Sistema de temas de color (hub)

En `src/components/GameCard.tsx`, cada tarjeta de juego lleva una clase `theme-<color>` (`theme-red`, `theme-violet`, `theme-steel`, `theme-flame`...) que define su `border-color` y color de icono (`.mode-icon-badge{background-color:...}`). Los colores del hub viven en `src/styles/index.css`.

## Iconos

Cada juego tiene un logo SVG propio en `resources/images/hub/<juego>-logo.svg`, usado como `mask-image` (así se puede recolorear vía CSS con `background-color` en vez de llevar el color "quemado" en el SVG). Si un juego no tuviera logo propio, existe la clase de respaldo `.mode-icon-emoji` (emoji centrado) — actualmente todos los juegos ya tienen su SVG.

## Tarjeta deshabilitada ("Próximamente")

Una tarjeta de juego sin terminar/publicar usa `class="mode-card ... disabled"` y sustituye el `<a href="...">` por un `<span>` con un badge `.coming-soon-badge`. Ver `.claude/HITSTER.md` para el caso concreto de cómo pasar de deshabilitada a activa.

## Versión (número de build)

`public/version.json` (`{ "build": N }`) se muestra en el footer del hub como `0.N`, junto a los créditos. Se incrementa solo, sin ningún paso manual en ningún clon: el workflow `.github/workflows/bump-version.yml` corre en GitHub Actions en cada push a `main`, suma 1 al JSON de versión y hace commit+push de vuelta (marcando el mensaje con `[skip version]` para no disparar el workflow otra vez a sí mismo).

## Botón de sugerencias

`<a href="https://forms.gle/..." class="suggestion-link">💡 Enviar una sugerencia</a>` en el hub React — enlaza a un Google Form externo, no tocar salvo que el usuario pida cambiar el formulario.
