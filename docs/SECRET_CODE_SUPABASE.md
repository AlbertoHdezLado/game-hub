# Código Secreto multiplayer

La versión online usa Supabase Anonymous Auth. El navegador necesita estas variables de entorno:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Copia `.env.example` como `.env.local` y sustituye los valores por los del proyecto Supabase. Después aplica `supabase/migrations/202609210001_secret_code_rooms.sql` desde el SQL Editor o con Supabase CLI.

La tabla `secret_code_game_keys` está separada del estado público y solo permite lectura a líderes. Las mutaciones de sala y partida pasan por funciones SQL que comprueban la sesión anónima, el equipo, el turno y el estado de la partida.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` no es necesaria para el cliente web y no debe estar en `.env.local` de Vite ni en variables `NEXT_PUBLIC_*`. Esta clave ignora RLS y solo debe usarse en un proceso backend privado o una Edge Function de Supabase, por ejemplo para ejecutar la limpieza automática de salas expiradas. Nunca la incluyas en código JavaScript servido al navegador.

La limpieza de salas expiradas debe programarse en Supabase para ejecutarse al menos una vez al día:

```sql
delete from public.secret_code_rooms where expires_at < now();
```