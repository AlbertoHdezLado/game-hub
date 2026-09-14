# Cómo añadir contenido a cada juego

Regla general (ver `.claude/PROJECT.md`): edita solo el `.json` del juego. El HTML itera sobre los arrays, así que una entrada nueva aparece sola, sin tocar código. Cada `id` debe ser único dentro de su fichero (se usa como clave interna, ej. para recordar qué paquetes/categorías tenía seleccionadas el usuario). El `icono` es un emoji suelto en un string.

Tras editar un JSON, valídalo (es JSON estricto: comillas dobles, sin comas colgantes). Truco rápido en PowerShell:
```powershell
Get-Content packages.json -Raw | ConvertFrom-Json | Out-Null
```
Si no lanza error, el JSON es válido.

---

## A — Paquete de palabras (`packages.json`)
Usado por: **Impostor, Time's Up, Mímica** (los tres leen el mismo fichero).

```json
{
  "id": "un_id_unico",
  "nombre": "Nombre visible",
  "icono": "🎉",
  "palabras": ["Palabra 1", "Palabra 2", "..."],
  "relacionadas": { "Palabra 1": "Palabra parecida", "Palabra 2": "Otra parecida" }
}
```
- `relacionadas` es **opcional** y solo la usa Impostor (modo "pista": el impostor recibe una palabra parecida en vez de ninguna). Si no la incluyes, Impostor simplemente no ofrece modo pista para esas palabras; Time's Up y Mímica la ignoran siempre.
- Para solo añadir palabras a un paquete existente: añade strings al array `palabras` de ese paquete (y opcionalmente entradas a `relacionadas`).
- Para un paquete nuevo: añade un objeto nuevo al array `paquetes`.

## B — Categorías con lista de frases/palabras/temas
Usado por (misma forma, distinto nombre de clave del array):

| Juego | Fichero | Clave del array |
|---|---|---|
| Código Secreto | `secret-code-words.json` | `palabras` |
| Yo Nunca | `never-have-i-ever.json` | `frases` |
| ¿Quién es más probable? | `most-likely.json` | `frases` |
| ¿Qué Harías Si...? | `what-would-you-do.json` | `escenarios` |
| Patata Caliente | `hot-potato.json` | `temas` |

```json
{ "id": "un_id_unico", "nombre": "Nombre visible", "icono": "🎈", "frases": ["Frase 1", "Frase 2"] }
```
(sustituye `"frases"` por la clave que toque según la tabla). Añadir contenido = añadir strings al array de esa categoría, o una categoría nueva al array raíz (`categorias`).

Nota — **Código Secreto**: cada partida elige un tablero de 25 palabras al azar de las categorías seleccionadas, así que conviene que cada categoría tenga bastantes más de 25 palabras para variedad real.

## C — Verdad o Reto (`truth-or-dare.json`)
Cada categoría lleva **dos** arrays en vez de uno:
```json
{
  "id": "un_id_unico",
  "nombre": "Nombre visible",
  "icono": "😈",
  "verdades": ["¿Pregunta 1?", "¿Pregunta 2?"],
  "retos": ["Reto 1", "Reto 2"]
}
```
Categorías actuales: `suave`, `fiesta`, `atrevido` (+18). Para añadir una intensidad nueva (ej. "extremo"), añade una categoría más con ambos arrays.

## D — Roles de Hombres Lobo (`werewolf-roles.json`)
```json
{
  "id": "id_unico",
  "nombre": "Nombre del rol",
  "equipo": "lobos | aldeanos | solitario",
  "expansion": "base | la_aldea | luna_nueva",
  "imagen": "resources/images/hombres-lobo/archivo.png",
  "descripcion": "Texto de la habilidad, se muestra al ver el detalle del rol.",
  "defaultCount": 0,
  "maxCount": 1,
  "poder": 1.2
}
```
- **`imagen` es obligatoria y requiere subir el fichero PNG a `resources/images/hombres-lobo/`** (se usa como `<img>`, no como máscara — necesita ser una ilustración real, no un icono monocromo). Sin ese fichero el rol se verá roto.
- `equipo` determina en qué bando cuenta el rol para el cálculo de equilibrio lobos/aldeanos.
- `expansion` agrupa el rol bajo un encabezado de expansión en el selector — usa uno de los tres valores existentes o crea uno nuevo si es una expansión distinta (aparecerá como grupo nuevo automáticamente).
- `maxCount` limita cuántas copias de ese rol se pueden añadir a una partida (la mayoría de roles únicos usan `1`; roles genéricos como Aldeano Común usan un número alto).
- `poder` es un valor orientativo (no estrictamente balanceado por el juego) usado para el aviso de equilibrio de la partida — roles más fuertes deberían llevar valores más altos, roles decorativos (equipo `solitario` que no afecta al recuento lobos/aldeanos) usan `0`.
- `defaultCount` casi siempre `0` (el usuario elige cuántos quiere).

## E — Cartas de Picolo (`picolo.json`)
Lista **plana** (sin categorías) de cartas:
```json
{ "tipo": "trago | reparte | grupo | reto | interaccion | pregunta", "texto": "..." }
```
Placeholders en `texto`, sustituidos en tiempo real por nombres de jugadores:
- `{P}` — un jugador (normalmente el jugador en turno).
- `{P1}` / `{P2}` — dos jugadores distintos (para cartas de interacción entre dos personas).

Usa un `tipo` de los ya existentes salvo que quieras una categoría de carta nueva (revisa `picolo.html` para ver si ese `tipo` nuevo necesita lógica de sustitución de jugadores adicional — los tipos actuales ya cubren "un jugador", "dos jugadores" y "todo el grupo sin jugador concreto").

## F — Preguntas de Trivial (`trivia.json`)
```json
{
  "id": "un_id_unico",
  "nombre": "Nombre de categoría",
  "icono": "🧠",
  "preguntas": [
    { "pregunta": "¿...?", "opciones": ["A", "B", "C", "D"], "correcta": 0 }
  ]
}
```
`correcta` es el **índice** (empezando en 0) de la respuesta correcta dentro de `opciones`. Exactamente 4 opciones por pregunta (es lo que espera la UI del juego).

## G — Cartas de Taboo (`taboo.json`)
Igual que el esquema A (paquetes con `id`/`nombre`/`icono`) pero el array se llama `cartas` y cada carta es un objeto, no un string:
```json
{
  "id": "un_id_unico",
  "nombre": "Nombre visible",
  "icono": "🎬",
  "cartas": [
    { "palabra": "Palabra a adivinar", "prohibidas": ["Palabra prohibida 1", "...", "..."] }
  ]
}
```
`prohibidas` suele llevar 4-5 palabras — no hay un mínimo/máximo forzado por el juego, pero mantén el número parecido al resto de cartas del mismo paquete por consistencia visual.

## H — ¿Qué Preferirías? (`would-you-rather.json`)
Lista **plana** de opciones (sin categorías), con un campo `nivel` que agrupa por "deseabilidad":
```json
{ "texto": "Una opción concreta", "nivel": 3 }
```
- `nivel` va de **1** (poco deseable/costoso) a **4** (muy deseable/tentador).
- El juego empareja **dos opciones al azar del mismo `nivel`** para que la disyuntiva quede pareja (nunca enfrenta un poder soñado nivel 4 contra un sacrificio nivel 1). Añade opciones al nivel que corresponda; cuantas más haya por nivel, menos se repetirán las mismas parejas.

## I — Hitster (`music-timeline.json`)
Ver guía dedicada: **`.claude/HITSTER.md`**.
