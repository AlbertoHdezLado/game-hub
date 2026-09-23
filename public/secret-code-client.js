/* Browser adapter for Secret Code. Room state lives in the backend cache. */
(function(){
  'use strict';

  var API_URL = '/api/secret-code';
  var PLAYER_KEY = 'gamehub.secretCodePlayerId';
  var gameRooms = {};
  var playerId = localStorage.getItem(PLAYER_KEY) || crypto.randomUUID();
  localStorage.setItem(PLAYER_KEY, playerId);

  function request(action, payload, keepalive){
    var body = Object.assign({}, payload || {}, { action: action, player_id: playerId });
    return fetch(API_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: Boolean(keepalive) })
      .then(function(response){ return response.json().then(function(result){ if (!response.ok || result.error) throw new Error(result.error ? result.error.message : 'backend_error'); return result.data; }); });
  }

  function rpc(name, args){
    var actions = {
      secret_code_create_room: 'create', secret_code_join_room: 'join', secret_code_set_team: 'set_team',
      secret_code_claim_leader: 'claim_leader', secret_code_set_team_count: 'set_team_count', secret_code_start_game: 'start_game',
      secret_code_select_word: 'select_word', secret_code_finish_turn: 'finish_turn', secret_code_advance_timeout: 'advance_timeout',
      secret_code_return_to_lobby: 'return_to_lobby'
    };
    var payload = Object.assign({}, args || {});
    if (payload.room_code) payload.room_code = String(payload.room_code).toUpperCase();
    if (payload.target_game){
      payload.target_room = gameRooms[payload.target_game];
      delete payload.target_game;
    }
    return request(actions[name], payload);
  }

  function loadRoomState(roomId){
    return fetch(API_URL + '?action=state&room=' + encodeURIComponent(roomId) + '&player_id=' + encodeURIComponent(playerId))
      .then(function(response){ return response.json().then(function(result){ if (!response.ok || result.error) throw new Error(result.error ? result.error.message : 'room_not_available'); if (result.data.game) gameRooms[result.data.game.id] = roomId; return result.data; }); });
  }

  function subscribeToRoom(roomId, onChange){
    var active = true;
    var timer = null;
    function poll(){
      if (!active) return;
      loadRoomState(roomId).then(onChange).catch(function(){}).finally(function(){ if (active) timer = window.setTimeout(poll, 1500); });
    }
    poll();
    return function(){ active = false; if (timer) window.clearTimeout(timer); };
  }

  function leaveRoom(roomId){ request('leave', { target_room: roomId }, true).catch(function(){}); }

  window.GameHubSecretCode = {
    isConfigured: function(){ return true; },
    ensureSession: function(){ return Promise.resolve({ user: { id: playerId } }); },
    currentUserId: function(){ return Promise.resolve(playerId); },
    rpc: rpc,
    loadRoomState: loadRoomState,
    subscribeToRoom: subscribeToRoom,
    leaveRoom: leaveRoom
  };
})();