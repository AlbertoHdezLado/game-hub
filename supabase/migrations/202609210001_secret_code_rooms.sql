create extension if not exists pgcrypto;

create table if not exists public.secret_code_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_by uuid not null default auth.uid(),
  team_count smallint not null default 2 check (team_count between 2 and 3),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.secret_code_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.secret_code_rooms(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  nickname text not null check (char_length(trim(nickname)) between 1 and 30),
  team_index smallint check (team_index between 0 and 2),
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, nickname)
);

create unique index if not exists secret_code_one_leader_per_team
  on public.secret_code_players(room_id, team_index)
  where is_leader;

create table if not exists public.secret_code_games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.secret_code_rooms(id) on delete cascade,
  status text not null default 'playing' check (status in ('playing', 'finished')),
  words text[] not null check (cardinality(words) = 25),
  revealed_indices integer[] not null default '{}',
  revealed_roles text[] not null default '{}',
  starting_team smallint not null check (starting_team between 0 and 2),
  active_team smallint not null check (active_team between 0 and 2),
  turn_started_at timestamptz not null default now(),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds > 0),
  winner_team smallint check (winner_team between 0 and 2),
  end_reason text check (end_reason in ('all_words', 'assassin', 'expired')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (room_id)
);

create table if not exists public.secret_code_game_keys (
  game_id uuid primary key references public.secret_code_games(id) on delete cascade,
  roles text[] not null check (cardinality(roles) = 25)
);

create index if not exists secret_code_players_room_idx on public.secret_code_players(room_id);
create index if not exists secret_code_games_room_idx on public.secret_code_games(room_id);

alter table public.secret_code_rooms enable row level security;
alter table public.secret_code_players enable row level security;
alter table public.secret_code_games enable row level security;
alter table public.secret_code_game_keys enable row level security;

create or replace function public.secret_code_current_player(target_room uuid)
returns public.secret_code_players
language sql stable security definer set search_path = public
as $$
  select p.* from public.secret_code_players p
  where p.room_id = target_room and p.user_id = auth.uid()
  limit 1
$$;

create or replace function public.secret_code_is_room_member(target_room uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.secret_code_players
    where room_id = target_room and user_id = auth.uid()
  )
$$;

drop policy if exists secret_code_rooms_member_read on public.secret_code_rooms;
create policy secret_code_rooms_member_read on public.secret_code_rooms
  for select using (public.secret_code_is_room_member(id) or created_by = auth.uid());

drop policy if exists secret_code_players_member_read on public.secret_code_players;
create policy secret_code_players_member_read on public.secret_code_players
  for select using (public.secret_code_is_room_member(room_id));

drop policy if exists secret_code_games_member_read on public.secret_code_games;
create policy secret_code_games_member_read on public.secret_code_games
  for select using (public.secret_code_is_room_member(room_id));

drop policy if exists secret_code_game_keys_leader_read on public.secret_code_game_keys;
create policy secret_code_game_keys_leader_read on public.secret_code_game_keys
  for select using (
    exists (
      select 1
      from public.secret_code_games g
      join public.secret_code_players p on p.room_id = g.room_id
      where g.id = game_id and p.user_id = auth.uid() and p.is_leader
    )
  );

create or replace function public.secret_code_create_room(
  player_nickname text,
  requested_team_count smallint default 2,
  room_config jsonb default '{}'::jsonb
)
returns public.secret_code_rooms
language plpgsql security definer set search_path = public
as $$
declare
  new_room public.secret_code_rooms;
  new_code text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if requested_team_count not between 2 and 3 then raise exception 'invalid_team_count'; end if;
  loop
    new_code := upper(encode(gen_random_bytes(3), 'hex'));
    begin
      insert into public.secret_code_rooms(code, created_by, team_count, config)
      values (new_code, auth.uid(), requested_team_count, coalesce(room_config, '{}'::jsonb))
      returning * into new_room;
      exit;
    exception when unique_violation then
      -- Retry the short code collision.
    end;
  end loop;
  insert into public.secret_code_players(room_id, user_id, nickname)
  values (new_room.id, auth.uid(), trim(player_nickname));
  return new_room;
end;
$$;

create or replace function public.secret_code_join_room(room_code text, player_nickname text)
returns public.secret_code_rooms
language plpgsql security definer set search_path = public
as $$
declare
  target public.secret_code_rooms;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into target from public.secret_code_rooms
  where code = upper(trim(room_code)) and status = 'lobby' and expires_at > now();
  if target.id is null then raise exception 'room_not_available'; end if;
  insert into public.secret_code_players(room_id, user_id, nickname)
  values (target.id, auth.uid(), trim(player_nickname))
  on conflict (room_id, user_id) do update set nickname = excluded.nickname;
  return target;
end;
$$;

create or replace function public.secret_code_set_team(target_room uuid, requested_team smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.secret_code_is_room_member(target_room) then raise exception 'not_a_member'; end if;
  if exists (select 1 from public.secret_code_rooms where id = target_room and status = 'finished') then raise exception 'game_finished'; end if;
  update public.secret_code_players
  set team_index = requested_team, is_leader = false
  where room_id = target_room and user_id = auth.uid();
end;
$$;

create or replace function public.secret_code_claim_leader(target_room uuid, requested_team smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.secret_code_players where room_id = target_room and user_id = auth.uid() and team_index = requested_team) then raise exception 'must_join_team'; end if;
  update public.secret_code_players set is_leader = false where room_id = target_room and team_index = requested_team;
  update public.secret_code_players set is_leader = true where room_id = target_room and user_id = auth.uid();
end;
$$;

create or replace function public.secret_code_start_game(
  target_room uuid,
  board_words text[],
  board_roles text[],
  first_team smallint,
  turn_seconds integer default null
)
returns public.secret_code_games
language plpgsql security definer set search_path = public
as $$
declare
  result public.secret_code_games;
begin
  if not exists (select 1 from public.secret_code_rooms where id = target_room and created_by = auth.uid() and status = 'lobby') then raise exception 'only_creator_can_start'; end if;
  if cardinality(board_words) <> 25 or cardinality(board_roles) <> 25 then raise exception 'invalid_board'; end if;
  insert into public.secret_code_games(room_id, words, starting_team, active_team, time_limit_seconds)
  values (target_room, board_words, first_team, first_team, turn_seconds)
  returning * into result;
  insert into public.secret_code_game_keys(game_id, roles) values (result.id, board_roles);
  update public.secret_code_rooms set status = 'playing' where id = target_room;
  return result;
end;
$$;

create or replace function public.secret_code_select_word(target_game uuid, word_index integer)
returns public.secret_code_games
language plpgsql security definer set search_path = public
as $$
declare
  game public.secret_code_games;
  player public.secret_code_players;
  role text;
  updated_indices integer[];
  updated_roles text[];
  winning_team smallint;
begin
  select g.* into game from public.secret_code_games g where g.id = target_game for update;
  select p.* into player from public.secret_code_players p where p.room_id = game.room_id and p.user_id = auth.uid();
  if player.id is null or player.is_leader or player.team_index <> game.active_team then raise exception 'not_allowed_to_select'; end if;
  if game.status <> 'playing' or word_index < 1 or word_index > 25 or word_index - 1 = any(game.revealed_indices) then raise exception 'invalid_selection'; end if;
  select roles[word_index] into role from public.secret_code_game_keys where game_id = game.id;
  updated_indices := array_append(game.revealed_indices, word_index - 1);
  updated_roles := array_append(game.revealed_roles, role);
  if role = 'assassin' then
    update public.secret_code_games set revealed_indices = updated_indices, revealed_roles = updated_roles, status = 'finished', end_reason = 'assassin', finished_at = now() where id = game.id returning * into game;
  else
    select r into winning_team from unnest(array[0, 1, 2]) r where not exists (
      select 1 from public.secret_code_game_keys k, unnest(k.roles) with ordinality x(role, position)
      where k.game_id = game.id and x.role = r::text and x.position - 1 <> all(updated_indices)
    ) limit 1;
    update public.secret_code_games set revealed_indices = updated_indices, revealed_roles = updated_roles, status = case when winning_team is null then 'playing' else 'finished' end, winner_team = winning_team, end_reason = case when winning_team is null then null else 'all_words' end, finished_at = case when winning_team is null then null else now() end where id = game.id returning * into game;
  end if;
  if game.status = 'finished' then update public.secret_code_rooms set status = 'finished' where id = game.room_id; end if;
  return game;
end;
$$;

create or replace function public.secret_code_finish_turn(target_game uuid)
returns public.secret_code_games
language plpgsql security definer set search_path = public as $$
declare result public.secret_code_games;
begin
  update public.secret_code_games g set active_team = ((g.active_team + 1) % (select team_count from public.secret_code_rooms where id = g.room_id)), turn_started_at = now()
  where g.id = target_game and g.status = 'playing' and exists (select 1 from public.secret_code_players p where p.room_id = g.room_id and p.user_id = auth.uid() and not p.is_leader and p.team_index = g.active_team)
  returning g.* into result;
  if result.id is null then raise exception 'not_allowed_to_finish_turn'; end if;
  return result;
end;
$$;

create or replace function public.secret_code_advance_timeout(target_game uuid)
returns public.secret_code_games
language plpgsql security definer set search_path = public as $$
declare result public.secret_code_games;
begin
  update public.secret_code_games g set active_team = ((g.active_team + 1) % (select team_count from public.secret_code_rooms where id = g.room_id)), turn_started_at = now()
  where g.id = target_game and g.status = 'playing' and g.time_limit_seconds is not null
    and now() >= g.turn_started_at + make_interval(secs => g.time_limit_seconds)
  returning g.* into result;
  if result.id is null then raise exception 'turn_not_expired'; end if;
  return result;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.secret_code_rooms, public.secret_code_players, public.secret_code_games, public.secret_code_game_keys to authenticated;
grant execute on all functions in schema public to authenticated;

alter publication supabase_realtime add table public.secret_code_rooms;
alter publication supabase_realtime add table public.secret_code_players;
alter publication supabase_realtime add table public.secret_code_games;