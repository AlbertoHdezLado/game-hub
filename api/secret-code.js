import { createClient } from 'redis';

const rooms = globalThis.__secretCodeRooms || (globalThis.__secretCodeRooms = new Map());
const ROOM_TTL_MS = 60 * 60 * 1000;
const PLAYER_ACTIVE_TTL_MS = 10 * 1000;
let redisClientPromise;

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

function jsonResponse(data) {
  return new Response(JSON.stringify({ data }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function newId() {
  return crypto.randomUUID();
}

function cacheConfigured() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    process.env.REDIS_URL
  );
}

async function cacheCommand(command) {
  if (process.env.REDIS_URL && !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
    if (!redisClientPromise) {
      const client = createClient({ url: process.env.REDIS_URL });
      client.on('error', function() {});
      redisClientPromise = client.connect().then(function(){ return client; });
    }
    const client = await redisClientPromise;
    if (command[0] === 'GET') return client.get(command[1]);
    if (command[0] === 'DEL') return client.del(command[1]);
    if (command[0] === 'SET') return client.set(command[1], command[2], { EX: Number(command[4]) });
  }
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error('cache_unavailable');
  const result = await response.json();
  return result.result;
}

async function loadRoom(code) {
  const normalizedCode = String(code || '').toUpperCase();
  let room;
  if (cacheConfigured()) {
    const value = await cacheCommand(['GET', `secret-code:room:${normalizedCode}`]);
    room = value ? JSON.parse(value) : null;
  } else {
    room = rooms.get(normalizedCode) || null;
  }
  const now = Date.now();
  const lastActivityAt = room && (room.updatedAt || room.expiresAt - ROOM_TTL_MS);
  if (room && (!lastActivityAt || now - lastActivityAt >= ROOM_TTL_MS)) {
    await deleteRoom(room);
    return null;
  }
  return room;
}

async function saveRoom(room) {
  room.updatedAt = Date.now();
  room.expiresAt = room.updatedAt + ROOM_TTL_MS;
  if (cacheConfigured()) {
    await cacheCommand(['SET', `secret-code:room:${room.code}`, JSON.stringify(room), 'EX', Math.ceil(ROOM_TTL_MS / 1000)]);
  } else {
    rooms.set(room.code, room);
  }
  return room;
}

async function deleteRoom(room) {
  if (!room) return;
  if (cacheConfigured()) await cacheCommand(['DEL', `secret-code:room:${room.code}`]);
  else rooms.delete(room.code);
}

function getPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId) || null;
}

function requirePlayer(room, playerId) {
  const player = getPlayer(room, playerId);
  if (!player) throw new Error('not_a_member');
  return player;
}

function isPlayerActive(player) {
  return Boolean(player.lastSeenAt && Date.now() - player.lastSeenAt <= PLAYER_ACTIVE_TTL_MS);
}

function normalizedNickname(nickname) {
  return String(nickname || '').trim().toLowerCase();
}

function hasActiveLeader(room, teamIndex) {
  return room.players.some((player) => player.teamIndex === teamIndex && player.isLeader && isPlayerActive(player));
}

function publicState(room, viewerId) {
  const viewer = viewerId ? getPlayer(room, viewerId) : null;
  const creator = getPlayer(room, room.createdBy);
  return {
    room: {
      id: room.id,
      code: room.code,
      created_by: room.createdBy,
      created_by_nickname: creator ? creator.nickname : '',
      team_count: room.teamCount,
      config: room.config,
      status: room.game ? (room.game.status === 'finished' ? 'finished' : 'playing') : 'lobby'
    },
    players: room.players.map((player) => ({
      id: player.id,
      user_id: player.id,
      nickname: player.nickname,
      team_index: player.teamIndex,
      is_leader: player.isLeader,
      is_active: isPlayerActive(player),
      joined_at: player.joinedAt
    })),
    game: room.game ? {
      id: room.game.id,
      status: room.game.status,
      words: room.game.words,
      revealed_indices: room.game.revealedIndices,
      revealed_roles: room.game.revealedRoles,
      starting_team: room.game.startingTeam,
      active_team: room.game.activeTeam,
      turn_started_at: room.game.turnStartedAt,
      time_limit_seconds: room.game.timeLimitSeconds,
      winner_team: room.game.winnerTeam,
      end_reason: room.game.endReason
    } : null,
    keys: room.game && viewer && viewer.isLeader ? { game_id: room.game.id, roles: room.game.roles } : null
  };
}

function readyTeams(room) {
  for (let team = 0; team < room.teamCount; team += 1) {
    const members = room.players.filter((player) => player.teamIndex === team);
    if (!members.some((player) => player.isLeader) || members.length < 2) return false;
  }
  return true;
}

async function createRoom(body) {
  let code;
  do { code = randomCode(); } while (await loadRoom(code));
  const playerId = String(body.player_id || newId());
  const room = {
    id: code,
    code,
    createdBy: playerId,
    teamCount: Number(body.requested_team_count || 2),
    config: body.room_config || {},
    players: [{ id: playerId, nickname: String(body.player_nickname || '').trim(), teamIndex: null, isLeader: false, joinedAt: Date.now(), lastSeenAt: Date.now() }],
    game: null,
    expiresAt: Date.now() + ROOM_TTL_MS,
    updatedAt: Date.now()
  };
  if (room.teamCount < 2 || room.teamCount > 3 || !room.players[0].nickname) throw new Error('invalid_room');
  await saveRoom(room);
  return { ...room, team_count: room.teamCount };
}

async function joinRoom(body) {
  const room = await loadRoom(body.room_code);
  if (!room) throw new Error('room_not_available');
  const playerId = String(body.player_id || newId());
  const nickname = String(body.player_nickname || '').trim();
  if (!nickname) throw new Error('invalid_nickname');
  if (room.players.some((member) => member.id !== playerId && normalizedNickname(member.nickname) === normalizedNickname(nickname))) {
    throw new Error('nickname_already_present');
  }
  let player = getPlayer(room, playerId);
  if (player) {
    player.nickname = nickname;
  } else {
    const leaderlessTeam = room.game
      ? Array.from({ length: room.teamCount }, (_, teamIndex) => teamIndex).find((teamIndex) => !hasActiveLeader(room, teamIndex))
      : undefined;
    player = { id: playerId, nickname: String(body.player_nickname || '').trim(), teamIndex: leaderlessTeam === undefined ? null : leaderlessTeam, isLeader: leaderlessTeam !== undefined, joinedAt: Date.now(), lastSeenAt: Date.now() };
    room.players.push(player);
  }
  if (!room.createdBy) room.createdBy = player.id;
  player.lastSeenAt = Date.now();
  await saveRoom(room);
  return { ...room, team_count: room.teamCount };
}

async function updateRoom(body, action) {
  const room = await loadRoom(body.target_room);
  if (!room) throw new Error('room_not_available');
  const player = requirePlayer(room, body.player_id);
  player.lastSeenAt = Date.now();
  if (action === 'set_team') {
    const team = Number(body.requested_team);
    if (team < 0 || team >= room.teamCount) throw new Error('invalid_team');
    player.teamIndex = team;
    player.isLeader = false;
  } else if (action === 'claim_leader') {
    const team = Number(body.requested_team);
    if (player.teamIndex !== team) throw new Error('must_join_team');
    if (room.game && hasActiveLeader(room, team) && !player.isLeader) throw new Error('active_leader_present');
    room.players.forEach((member) => { if (member.teamIndex === team) member.isLeader = false; });
    player.isLeader = true;
  } else if (action === 'set_team_count') {
    if (!player.isLeader && room.createdBy !== player.id) throw new Error('leader_required');
    const count = Number(body.requested_team_count);
    if (count < 2 || count > 3) throw new Error('invalid_team_count');
    if (count < room.teamCount && room.players.some((member) => member.teamIndex >= count)) throw new Error('team_not_empty');
    room.teamCount = count;
  }
  await saveRoom(room);
  return publicState(room, body.player_id);
}

async function startGame(body) {
  const room = await loadRoom(body.target_room);
  if (!room || room.createdBy !== body.player_id || room.game) throw new Error('only_creator_can_start');
  if (!readyTeams(room)) throw new Error('teams_not_ready');
  if (!Array.isArray(body.board_words) || body.board_words.length !== 25 || !Array.isArray(body.board_roles) || body.board_roles.length !== 25) throw new Error('invalid_board');
  const now = new Date().toISOString();
  room.game = { id: newId(), status: 'playing', words: body.board_words, roles: body.board_roles, revealedIndices: [], revealedRoles: [], startingTeam: Number(body.first_team), activeTeam: Number(body.first_team), turnStartedAt: now, timeLimitSeconds: body.turn_seconds ? Number(body.turn_seconds) : null, winnerTeam: null, endReason: null };
  await saveRoom(room);
  return publicState(room, body.player_id);
}

async function selectWord(body) {
  const room = await loadRoom(body.target_game || body.target_room);
  if (!room || !room.game) throw new Error('game_not_found');
  const player = requirePlayer(room, body.player_id);
  const index = Number(body.word_index) - 1;
  if (player.isLeader || player.teamIndex !== room.game.activeTeam || index < 0 || index >= 25 || room.game.revealedIndices.includes(index)) throw new Error('not_allowed_to_select');
  const role = room.game.roles[index];
  room.game.revealedIndices.push(index);
  room.game.revealedRoles.push(role);
  if (role === 'assassin') { room.game.status = 'finished'; room.game.endReason = 'assassin'; }
  else {
    const teamComplete = [0, 1, 2].find((team) => team < room.teamCount && room.game.roles.every((item, itemIndex) => item !== String(team) || room.game.revealedIndices.includes(itemIndex)));
    if (teamComplete != null) { room.game.status = 'finished'; room.game.winnerTeam = teamComplete; room.game.endReason = 'all_words'; }
    else if (role !== String(room.game.activeTeam)) {
      room.game.activeTeam = (room.game.activeTeam + 1) % room.teamCount;
      room.game.turnStartedAt = new Date().toISOString();
    }
  }
  await saveRoom(room);
  return publicState(room, body.player_id);
}

async function mutateGame(body, action) {
  const room = await loadRoom(body.target_game || body.target_room);
  if (!room || !room.game) throw new Error('game_not_found');
  requirePlayer(room, body.player_id);
  if (action === 'finish_turn') room.game.activeTeam = (room.game.activeTeam + 1) % room.teamCount;
  if (action === 'advance_timeout' && room.game.timeLimitSeconds && Date.now() - Date.parse(room.game.turnStartedAt) >= room.game.timeLimitSeconds * 1000) {
    room.game.activeTeam = (room.game.activeTeam + 1) % room.teamCount;
    room.game.turnStartedAt = new Date().toISOString();
  }
  await saveRoom(room);
  return publicState(room, body.player_id);
}

async function leaveRoom(body) {
  const room = await loadRoom(body.target_room);
  if (!room) return null;
  room.players = room.players.filter((player) => player.id !== body.player_id);
  if (room.createdBy === body.player_id) {
    room.createdBy = room.players.length
      ? room.players[Math.floor(Math.random() * room.players.length)].id
      : null;
  }
  if (!room.players.some((player) => player.isLeader)) {
    const replacement = room.players.find((player) => player.teamIndex != null);
    if (replacement) replacement.isLeader = true;
  }
  await saveRoom(room);
  return publicState(room, body.player_id);
}

async function handle(request) {
  const body = request.method === 'GET' ? Object.fromEntries(new URL(request.url).searchParams) : await request.json();
  const action = body.action;
  if (action === 'create') return jsonResponse(await createRoom(body));
  if (action === 'join') return jsonResponse(await joinRoom(body));
  if (action === 'state') {
    const room = await loadRoom(body.room);
    if (!room) throw new Error('room_not_available');
    const player = getPlayer(room, body.player_id);
    if (player) {
      player.lastSeenAt = Date.now();
      await saveRoom(room);
    }
    return jsonResponse(publicState(room, body.player_id));
  }
  if (action === 'set_team') return jsonResponse(await updateRoom(body, 'set_team'));
  if (action === 'claim_leader') return jsonResponse(await updateRoom(body, 'claim_leader'));
  if (action === 'set_team_count') return jsonResponse(await updateRoom(body, 'set_team_count'));
  if (action === 'start_game') return jsonResponse(await startGame(body));
  if (action === 'select_word') return jsonResponse(await selectWord(body));
  if (action === 'finish_turn' || action === 'advance_timeout') return jsonResponse(await mutateGame(body, action));
  if (action === 'return_to_lobby') {
    const room = await loadRoom(body.target_room);
    if (!room || !room.game) throw new Error('game_not_found');
    requirePlayer(room, body.player_id);
    room.game = null;
    await saveRoom(room);
    return jsonResponse(publicState(room, body.player_id));
  }
  if (action === 'leave') return jsonResponse(await leaveRoom(body));
  throw new Error('unknown_action');
}

export default async function handler(req, res) {
  try {
    const request = {
      method: req.method,
      url: `https://${req.headers.host || 'localhost'}${req.url}`,
      json: async () => typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
    };
    const response = await handle(request);
    res.status(response.status || 200);
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(await response.text());
  } catch (error) {
    const response = errorResponse(error.message || 'backend_error');
    res.status(response.status || 400);
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(await response.text());
  }
}
