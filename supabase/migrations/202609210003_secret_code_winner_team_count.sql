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
  room_team_count smallint;
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
    select team_count into room_team_count from public.secret_code_rooms where id = game.room_id;
    select r into winning_team from generate_series(0, room_team_count - 1) r where not exists (
      select 1 from public.secret_code_game_keys k, unnest(k.roles) with ordinality x(role, position)
      where k.game_id = game.id and x.role = r::text and x.position - 1 <> all(updated_indices)
    ) limit 1;
    update public.secret_code_games set revealed_indices = updated_indices, revealed_roles = updated_roles, status = case when winning_team is null then 'playing' else 'finished' end, winner_team = winning_team, end_reason = case when winning_team is null then null else 'all_words' end, finished_at = case when winning_team is null then null else now() end where id = game.id returning * into game;
  end if;
  if game.status = 'finished' then update public.secret_code_rooms set status = 'finished' where id = game.room_id; end if;
  return game;
end;
$$;