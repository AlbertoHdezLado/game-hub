/* Browser adapter for static games. The Supabase UMD bundle is loaded before this file. */
(function(){
  'use strict';

  var config = window.GAME_HUB_SUPABASE_CONFIG || {};
  var client = null;
  var sessionPromise = null;

  function getClient(){
    if (client) return client;
    if (!config.url || !config.anonKey || !window.supabase){
      throw new Error('Supabase no está configurado. Revisa .env.local.');
    }
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return client;
  }

  function ensureSession(){
    if (sessionPromise) return sessionPromise;
    sessionPromise = getClient().auth.getSession().then(function(result){
      if (result.data.session) return result.data.session;
      return getClient().auth.signInAnonymously().then(function(response){
        if (response.error) throw response.error;
        return response.data.session;
      });
    }).catch(function(error){
      sessionPromise = null;
      throw error;
    });
    return sessionPromise;
  }

  function rpc(name, args){
    return ensureSession().then(function(){ return getClient().rpc(name, args || {}); }).then(function(result){
      if (result.error) throw result.error;
      return result.data;
    });
  }

  function subscribeToRoom(roomId, onChange){
    var channel = getClient().channel('secret-code-room-' + roomId);
    [{ table: 'secret_code_rooms', column: 'id' }, { table: 'secret_code_players', column: 'room_id' }, { table: 'secret_code_games', column: 'room_id' }].forEach(function(entry){
      channel.on('postgres_changes', {
        event: '*', schema: 'public', table: entry.table, filter: entry.column + '=eq.' + roomId
      }, onChange);
    });
    channel.subscribe();
    return function(){ getClient().removeChannel(channel); };
  }

  function loadRoomState(roomId){
    return ensureSession().then(function(){
      return Promise.all([
        getClient().from('secret_code_rooms').select('*').eq('id', roomId).single(),
        getClient().from('secret_code_players').select('*').eq('room_id', roomId).order('joined_at'),
        getClient().from('secret_code_games').select('*').eq('room_id', roomId).maybeSingle(),
        getClient().from('secret_code_game_keys').select('*')
      ]);
    }).then(function(results){
      for (var i = 0; i < results.length; i++) if (results[i].error) throw results[i].error;
      var game = results[2].data;
      var keys = game ? results[3].data.filter(function(row){ return row.game_id === game.id; })[0] || null : null;
      return { room: results[0].data, players: results[1].data, game: game, keys: keys };
    });
  }

  function currentUserId(){
    return ensureSession().then(function(){ return getClient().auth.getUser(); }).then(function(result){
      if (result.error) throw result.error;
      return result.data.user.id;
    });
  }

  window.GameHubSupabase = {
    isConfigured: function(){ return Boolean(config.url && config.anonKey && window.supabase); },
    ensureSession: ensureSession,
    currentUserId: currentUserId,
    rpc: rpc,
    loadRoomState: loadRoomState,
    subscribeToRoom: subscribeToRoom
  };
})();