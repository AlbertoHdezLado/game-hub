create or replace function public.secret_code_return_to_lobby(target_room uuid)
returns public.secret_code_rooms
language plpgsql security definer set search_path = public
as $$
declare
  room public.secret_code_rooms;
begin
  select * into room
  from public.secret_code_rooms
  where id = target_room and status = 'finished'
  for update;

  if room.id is null or not public.secret_code_is_room_member(target_room) then
    raise exception 'not_allowed_to_return_to_lobby';
  end if;

  delete from public.secret_code_games where room_id = target_room;
  update public.secret_code_rooms
  set status = 'lobby'
  where id = target_room
  returning * into room;
  return room;
end;
$$;

revoke all on function public.secret_code_return_to_lobby(uuid) from public;
grant execute on function public.secret_code_return_to_lobby(uuid) to authenticated;