/* ============================================================
   Shared utilities for Impostor / Detective Club / Hombres Lobo
   ============================================================ */

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* player names carry over between game modes (Impostor / Hombres Lobo), persisted
   across sessions via localStorage */
var PLAYER_NAMES_STORAGE_KEY = 'gamehub.playerNames';

function loadSavedPlayerNames(){
  try {
    var arr = JSON.parse(localStorage.getItem(PLAYER_NAMES_STORAGE_KEY) || '[]');
    return Array.isArray(arr) ? arr.filter(function(n){ return typeof n === 'string' && n.trim(); }) : [];
  } catch (e){
    return [];
  }
}

function savePlayerNames(names){
  try {
    localStorage.setItem(PLAYER_NAMES_STORAGE_KEY, JSON.stringify(names));
  } catch (e){
    // storage unavailable (private mode, quota, etc.) — persistence is a nice-to-have, fail silently
  }
}

/* capitalizes the first letter of each word as text is entered, preserving
   the caret position so the value is updated visibly while typing */
function capitalizeInputValue(inputEl){
  var selStart = inputEl.selectionStart, selEnd = inputEl.selectionEnd;
  inputEl.value = inputEl.value.replace(/\p{L}[\p{L}'-]*/gu, function(word){
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  inputEl.setSelectionRange(selStart, selEnd);
}

function forceUppercaseInput(inputEl){
  inputEl.addEventListener('input', function(){ capitalizeInputValue(inputEl); });
}

function forceTitleCaseInput(inputEl){
  inputEl.addEventListener('input', function(){ capitalizeInputValue(inputEl); });
}

function initInputCapitalization(){
  document.addEventListener('input', function(event){
    var inputEl = event.target;
    if (!inputEl || !/^(INPUT|TEXTAREA)$/.test(inputEl.tagName) ||
        inputEl.readOnly || inputEl.disabled ||
        (inputEl.tagName === 'INPUT' && inputEl.type !== 'text')) return;
    capitalizeInputValue(inputEl);
  });
}
initInputCapitalization();

/* Hombres Lobo: the chosen role loadout (roleId -> count) carries over
   between matches the same way the player list does */
var ROLE_COUNTS_STORAGE_KEY = 'gamehub.werewolfRoleCounts';

function loadSavedRoleCounts(){
  try {
    var obj = JSON.parse(localStorage.getItem(ROLE_COUNTS_STORAGE_KEY) || '{}');
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (e){
    return {};
  }
}

function saveRoleCounts(counts){
  try {
    localStorage.setItem(ROLE_COUNTS_STORAGE_KEY, JSON.stringify(counts));
  } catch (e){}
}

function hasDuplicatePlayerNames(rows){
  var seen = {};
  for (var i = 0; i < rows.length; i++){
    var n = rows[i].name.trim().toLowerCase();
    if (!n) continue;
    if (seen[n]) return true;
    seen[n] = true;
  }
  return false;
}

function shuffle(arr){
  for (var i = arr.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function buildShuffledCategoryPool(groups){
  var queues = groups.map(function(group){ return shuffle(group.slice()); });
  var pool = [];
  var hasItems = true;
  while (hasItems){
    hasItems = false;
    var order = [];
    for (var i = 0; i < queues.length; i++) order.push(i);
    shuffle(order).forEach(function(index){
      if (queues[index].length > 0){
        pool.push(queues[index].pop());
        hasItems = true;
      }
    });
  }
  return pool;
}

function buildRandomRoles(total, marked){
  var roles = [];
  for (var i = 0; i < total; i++) roles.push(i < marked);
  return shuffle(roles);
}

/* generic dismissible modal: click trigger(s) to open, click backdrop/close/Escape
   to close. triggerEls can be a single element or a NodeList/array — the "ayuda"
   button is repeated on every screen, all opening the same modal. */
function setupModal(triggerEls, backdropEl, closeEl){
  function open(){ backdropEl.classList.remove('hidden'); }
  function close(){ backdropEl.classList.add('hidden'); }
  var triggers = triggerEls && typeof triggerEls.length === 'number' ? triggerEls : [triggerEls];
  Array.prototype.forEach.call(triggers, function(t){ t.addEventListener('click', open); });
  if (closeEl) closeEl.addEventListener('click', close);
  backdropEl.addEventListener('click', function(e){ if (e.target === backdropEl) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  return { open: open, close: close };
}

function popValue(el){
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function initLandscapePrompt(){
  if (document.body.dataset.landscapeRecommended === undefined) return;

  /* any in-progress screen counts as "game active" — not just #screen-game:
     some modes (Time's Up, Charades...) also flow through phase-intro/end
     screens that deserve the same landscape nudge, only setup and the very
     final results screen don't need the device turned */
  var nonGameScreenIds = {
    'screen-room': true,
    'screen-lobby': true,
    'screen-setup': true,
    'screen-end': true,
    'screen-final': true
  };
  var screens = Array.prototype.filter.call(
    document.querySelectorAll('.screen'),
    function(el){ return !nonGameScreenIds[el.id]; }
  );
  if (!screens.length) return;

  var prompt = document.createElement('div');
  prompt.className = 'landscape-prompt';
  prompt.setAttribute('role', 'status');
  prompt.setAttribute('aria-label', 'Orientación recomendada');
  prompt.innerHTML =
    '<span class="landscape-prompt-icon" aria-hidden="true"></span>' +
    '<p class="landscape-prompt-title">Gira el móvil</p>' +
    '<p class="landscape-prompt-text">Este juego se disfruta mejor con la pantalla en horizontal.</p>';
  document.body.appendChild(prompt);

  function updateVisibility(){
    var active = screens.some(function(el){ return !el.classList.contains('hidden'); });
    document.body.classList.toggle('landscape-game-active', active);
  }

  var observer = new MutationObserver(updateVisibility);
  screens.forEach(function(el){
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  updateVisibility();
}
initLandscapePrompt();

/* the shell's height follows the real visible viewport (visualViewport when
   available) instead of the raw window/100dvh, which on some mobile browsers
   still includes space the address bar/keyboard is currently covering.
   Exception: while a text input is focused, the on-screen keyboard shrinking
   visualViewport would otherwise squeeze the whole flex-column shell down to
   that small height, dragging the pinned .scr-dock button right up against
   the focused input — so during text entry we keep the pre-keyboard height
   instead and let the keyboard simply overlap the bottom of the screen. */
function initViewportHeightSync(){
  var vv = window.visualViewport;
  var typing = false;

  function sync(){
    if (typing) return;
    var height = (vv && vv.height) || window.innerHeight;
    document.documentElement.style.setProperty('--app-vh', height + 'px');
  }

  document.addEventListener('focusin', function(e){
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)){ typing = true; }
  });
  document.addEventListener('focusout', function(e){
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)){
      typing = false;
      sync();
    }
  });

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  if (vv) vv.addEventListener('resize', sync);
  sync();
}
initViewportHeightSync();

/* progress dots under the reveal card */
function createDots(container){
  return {
    build: function(total){
      container.innerHTML = "";
      for (var i = 0; i < total; i++){
        var d = document.createElement('div');
        d.className = 'dot';
        container.appendChild(d);
      }
    },
    update: function(current){
      var dots = container.children;
      for (var i = 0; i < dots.length; i++){
        dots[i].className = 'dot' + (i < current ? ' done' : (i === current ? ' current' : ''));
      }
    }
  };
}

/* In-game screens use one unobtrusive home control instead of an app bar.
   Reuse each screen's existing link before removing the header so every game
   gets the same placement without duplicating markup across all mode files. */
function initIngameHomeControls(){
  var screens = document.querySelectorAll('.screen');
  Array.prototype.forEach.call(screens, function(screen){
    var card = screen.querySelector(':scope > .card');
    if (!card) return;
    var header = card.querySelector(':scope > .setup-header');
    var home = header && header.querySelector('a[aria-label="Inicio"]');
    var help = header && header.querySelector('.ayuda-trigger');
    if (home) home.remove();
    if (help){
      help.classList.add('hidden');
      card.appendChild(help);
    }
    // headers can carry extra game-specific controls/status beyond home/help
    // (Código Secreto's "ver clave"/compartir tablero, Hombres Lobo's
    // día/noche status + "Personajes" button) — the boxed header itself is
    // always discarded below, so pull anything else worth keeping into a
    // small pinned row instead of silently losing it.
    if (header){
      var leftover = [];
      Array.prototype.forEach.call(header.querySelectorAll('button, a'), function(el){
        if (el === help) return;
        // only elements with an id are ever wired up by a game's own script
        // (every real control here — tab-deaths-btn, key-toggle-btn,
        // share-board-btn, back-to-setup-btn... — is looked up by id); the
        // other games' unused/idless back-to-setup-btn markup stays discarded
        if (!el.id) return;
        leftover.push(el);
      });
      Array.prototype.forEach.call(header.querySelectorAll('span'), function(el){
        if (el.children.length) return; // icon glyphs / wrapper spans
        if (el.closest('button, a')) return; // travels with its own control above
        leftover.push(el);
      });
      if (leftover.length){
        var extras = document.createElement('div');
        extras.className = 'ingame-extra-controls';
        leftover.forEach(function(el, index){
          if (screen.id === 'screen-narrator' && index === 1){
            var spacer = document.createElement('span');
            spacer.className = 'ingame-controls-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            extras.appendChild(spacer);
          }
          extras.appendChild(el);
        });
        var balanceTrack = screen.id === 'screen-narrator' && card.querySelector('#narrator-balance-track');
        var controlsHost = card.querySelector('.cs-controls-host');
        if (controlsHost){
          controlsHost.appendChild(extras);
        } else {
          card.insertBefore(extras, card.firstChild);
        }
      }
    }
    if (header) header.remove();
  });
}
initIngameHomeControls();

/* "back to hub" needs confirmation while a match still has progress to lose.
   Setup and final-result screens navigate directly. */
function initHomeExitConfirm(){
  var links = document.querySelectorAll('a[aria-label="Inicio"]');
  if (!links.length) return;

  var backdrop = null, pendingHref = 'index.html';

  function buildModal(){
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'guide-modal-backdrop hidden';
    backdrop.id = 'home-confirm-backdrop';
    backdrop.innerHTML =
      '<div class="guide-modal">' +
        '<button type="button" class="guide-modal-help" aria-label="Ayuda">?</button>' +
        '<h2>¿Salir al inicio?</h2>' +
        '<p>Se perderá el progreso de la partida actual.</p>' +
        '<button type="button" class="btn-main" id="home-confirm-cancel-btn" style="margin-top:14px;">Seguir jugando</button>' +
        '<button type="button" class="night-nav-btn" id="home-confirm-exit-btn" style="width:100%; margin-top:10px;">Salir al inicio</button>' +
      '</div>';
    document.body.appendChild(backdrop);
    document.getElementById('home-confirm-cancel-btn').addEventListener('click', function(){
      backdrop.classList.add('hidden');
    });
    document.getElementById('home-confirm-exit-btn').addEventListener('click', function(){
      allowPageExit();
      window.location.href = pendingHref;
    });
    backdrop.querySelector('.guide-modal-help').addEventListener('click', function(){
      var screen = document.querySelector('.screen:not(.hidden)');
      var help = screen && screen.querySelector('.ayuda-trigger');
      backdrop.classList.add('hidden');
      if (help) help.click();
    });
    backdrop.addEventListener('click', function(e){
      if (e.target === backdrop) backdrop.classList.add('hidden');
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') backdrop.classList.add('hidden');
    });
  }

  Array.prototype.forEach.call(links, function(link){
    var screen = link.closest('.screen');
    if (screen && screen.id === 'screen-setup') return;
    link.addEventListener('click', function(e){
      e.preventDefault();
      buildModal();
      pendingHref = link.getAttribute('href') || 'index.html';
      backdrop.classList.remove('hidden');
    });
  });
}
initHomeExitConfirm();

var pageExitAllowed = false;

function allowPageExit(){
  pageExitAllowed = true;
}

function isGameInProgress(){
  var activeScreen = document.querySelector('.screen:not(.hidden)');
  return !!activeScreen &&
    activeScreen.id !== 'screen-setup' &&
    activeScreen.id !== 'screen-end' &&
    activeScreen.id !== 'screen-final';
}

window.addEventListener('beforeunload', function(event){
  if (pageExitAllowed || !isGameInProgress()) return;
  event.preventDefault();
  event.returnValue = '';
});

/* "back to setup" (back icon next to the home icon) needs the same exit-progress
   confirmation as the home button, but returns to this game's own setup screen
   instead of navigating away — so the actual reset logic (returnToSetup) is
   supplied by each page's own script, only the confirm UI is shared here. */
function initBackToSetupConfirm(returnToSetup){
  var buttons = document.querySelectorAll('.back-to-setup-btn');
  if (!buttons.length) return;

  var backdrop = null;

  function buildModal(){
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'guide-modal-backdrop hidden';
    backdrop.id = 'setup-confirm-backdrop';
    backdrop.innerHTML =
      '<div class="guide-modal">' +
        '<h2>¿Volver a configuración?</h2>' +
        '<p>Se perderá el progreso de la partida actual.</p>' +
        '<button type="button" class="btn-main" id="setup-confirm-cancel-btn" style="margin-top:14px;">Seguir jugando</button>' +
        '<button type="button" class="night-nav-btn" id="setup-confirm-exit-btn" style="width:100%; margin-top:10px;">Volver a configuración</button>' +
      '</div>';
    document.body.appendChild(backdrop);
    document.getElementById('setup-confirm-cancel-btn').addEventListener('click', function(){
      backdrop.classList.add('hidden');
    });
    document.getElementById('setup-confirm-exit-btn').addEventListener('click', function(){
      backdrop.classList.add('hidden');
      returnToSetup();
    });
    backdrop.addEventListener('click', function(e){
      if (e.target === backdrop) backdrop.classList.add('hidden');
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') backdrop.classList.add('hidden');
    });
  }

  Array.prototype.forEach.call(buttons, function(btn){
    btn.addEventListener('click', function(){
      buildModal();
      backdrop.classList.remove('hidden');
    });
  });
}

/* +18 content guard: categories/packages flag themselves as adult content by
   putting "+18" in their display name (see truth-or-dare.json, yo-nunca.json,
   patata-caliente.json, packages.json). Call isAdultContent(item) to check a
   category/package object, and confirmAdultContent(onConfirm) right before
   adding one to a selection — onConfirm only runs if the user accepts, so a
   cancelled confirm just leaves the chip unselected. */
function isAdultContent(item){
  return !!item && /\+18/.test(item.nombre || '');
}

var adultConfirmBackdrop = null;
var adultConfirmPending = null;
function confirmAdultContent(onConfirm){
  adultConfirmPending = onConfirm;
  if (!adultConfirmBackdrop){
    adultConfirmBackdrop = document.createElement('div');
    adultConfirmBackdrop.className = 'guide-modal-backdrop hidden';
    adultConfirmBackdrop.id = 'adult-confirm-backdrop';
    adultConfirmBackdrop.innerHTML =
      '<div class="guide-modal">' +
        '<h2>🔞 Contenido para adultos</h2>' +
        '<p>Esta categoría incluye contenido para mayores de 18 años. ¿Seguro que quieres activarla?</p>' +
        '<button type="button" class="btn-main" id="adult-confirm-accept-btn" style="margin-top:14px;">Sí, activar</button>' +
        '<button type="button" class="night-nav-btn" id="adult-confirm-cancel-btn" style="width:100%; margin-top:10px;">Cancelar</button>' +
      '</div>';
    document.body.appendChild(adultConfirmBackdrop);
    document.getElementById('adult-confirm-accept-btn').addEventListener('click', function(){
      adultConfirmBackdrop.classList.add('hidden');
      if (adultConfirmPending) adultConfirmPending();
    });
    document.getElementById('adult-confirm-cancel-btn').addEventListener('click', function(){
      adultConfirmBackdrop.classList.add('hidden');
    });
    adultConfirmBackdrop.addEventListener('click', function(e){
      if (e.target === adultConfirmBackdrop) adultConfirmBackdrop.classList.add('hidden');
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') adultConfirmBackdrop.classList.add('hidden');
    });
  }
  adultConfirmBackdrop.classList.remove('hidden');
}

function fitRevealContent(content){
  var MAX_FONT_REM = 1.7;
  var MIN_FONT_REM = 0.9;
  content.style.fontSize = MAX_FONT_REM + 'rem';
  var size = MAX_FONT_REM;
  while (size > MIN_FONT_REM &&
    (content.scrollHeight > content.clientHeight ||
     content.scrollWidth > content.clientWidth)){
    size -= 0.1;
    content.style.fontSize = size.toFixed(2) + 'rem';
  }
}

/* tap-to-reveal card: covers reveal-content with reveal-btn until tapped.
   showFor(isAlarm) re-covers instantly (no flash) and arms the optional
   danger-pulse border for the upcoming reveal; call it once per player,
   right after setting reveal-content's text/className for that player. */
function createRevealCard(wrap, content, btn, nextBtn){
  var pendingAlarm = false;

  function onReveal(){
    wrap.classList.add('revealed');
    fitRevealContent(content);
    if (pendingAlarm) wrap.classList.add('alarm');
    nextBtn.disabled = false;
  }

  btn.addEventListener('click', onReveal);

  return {
    showFor: function(isAlarm){
      pendingAlarm = !!isAlarm;
      // cover instantly (no fade) so the outgoing/incoming content never flashes through
      btn.style.transition = 'none';
      wrap.classList.remove('revealed');
      wrap.classList.remove('alarm');
      content.style.fontSize = '';
      void btn.offsetWidth; // force reflow to apply the no-transition cover
      btn.style.transition = '';
      nextBtn.disabled = true;
    }
  };
}

/* Full-screen reveal for private information. The first tap progressively
   uncovers arbitrary content; once the animation finishes, the next tap
   anywhere dismisses the screen. */
function RevealComponent(options){
  this.screen = options.screen;
  this.stage = options.stage;
  this.content = options.content;
  this.trigger = options.trigger;
  this.caption = options.caption || null;
  this.closeHandler = typeof options.onClose === 'function' ? options.onClose : function(){};
  this.revealDuration = options.revealDuration || 450;
  var revealTimer = null;
  var isRevealed = false;
  var component = this;

  function reveal(){
    if (component.screen.classList.contains('revealing') || isRevealed) return;
    fitRevealContent(component.content);
    component.screen.classList.add('revealing');
    var duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : component.revealDuration;
    revealTimer = window.setTimeout(function(){
      component.screen.classList.remove('revealing');
      component.screen.classList.add('revealed');
      isRevealed = true;
    }, duration);
  }

  function close(){
    if (!isRevealed) return;
    component.screen.classList.add('hidden');
    if (component.screen.open && typeof component.screen.close === 'function') component.screen.close();
    component.closeHandler();
  }

  this.trigger.addEventListener('click', function(event){
    event.stopPropagation();
    reveal();
  });
  this.screen.addEventListener('click', function(){
    if (isRevealed) close();
    else reveal();
  });
  this.screen.addEventListener('cancel', function(event){ event.preventDefault(); });

  this.open = function(isAlarm){
    window.clearTimeout(revealTimer);
    isRevealed = false;
    component.screen.classList.remove('revealing', 'revealed');
    component.stage.classList.toggle('alarm-pending', !!isAlarm);
    component.content.style.fontSize = '';
    component.screen.classList.remove('hidden');
    if (!component.screen.open && typeof component.screen.showModal === 'function') component.screen.showModal();
  };
  this.close = close;
}

function WordRevealComponent(options){
  RevealComponent.call(this, options);
}
WordRevealComponent.prototype = Object.create(RevealComponent.prototype);
WordRevealComponent.prototype.constructor = WordRevealComponent;
WordRevealComponent.prototype.show = function(value, className, description){
  this.content.innerHTML = '<div>' + escapeHtml(value) + '</div>' +
    (description ? '<div class="reveal-desc">' + escapeHtml(description) + '</div>' : '');
  this.content.className = 'reveal-content ' + className;
};

function ImageRevealComponent(options){
  RevealComponent.call(this, options);
  this.stage.classList.add('reveal-image-stage');
}
ImageRevealComponent.prototype = Object.create(RevealComponent.prototype);
ImageRevealComponent.prototype.constructor = ImageRevealComponent;
ImageRevealComponent.prototype.show = function(image, title, description, className){
  this.content.innerHTML = '<img class="reveal-portrait" src="' + escapeHtml(image) + '" alt="" draggable="false" oncontextmenu="return false">';
  this.content.className = 'reveal-content ' + className;
  if (this.caption){
    this.caption.innerHTML = escapeHtml(title) + '<span class="reveal-role-description">' + escapeHtml(description) + '</span>';
    this.caption.className = 'reveal-name-caption ' + className;
  }
};

function createRevealScreen(screen, stage, content, trigger, onClose){
  return new RevealComponent({
    screen: screen,
    stage: stage,
    content: content,
    trigger: trigger,
    onClose: onClose
  });
}

/* card-stack component for Time's Up / Mímica: rootEl is a `.flip-card-stack`
   wrapping exactly 3 `.flip-card` slots (each with a `.flip-card-inner` that
   flips to reveal a `.flip-card-word-text` node). The 3 slots never move in
   the DOM — a rotating "depth" class (0 = front, 1/2 = peeking behind, like
   a real stack) is reassigned between them so CSS can animate the promotion,
   while the outgoing front card is swiped left/right to mirror the skip/
   correct action taken on it. `remaining` is how many cards are left
   counting the one about to show, so the stack visually shrinks down to a
   single card near the end of the deck. */
function createCardStack(rootEl, options){
  var slots = Array.prototype.slice.call(rootEl.querySelectorAll('.flip-card'));
  var timer = null;
  var busy = false;
  var renderContent = typeof options === 'function' ? options : options && options.render;

  if (!slots.length){
    var isTabooCard = rootEl.classList.contains('tb-play-card');
    rootEl.classList.remove('prompt-card', 'tb-play-card');
    rootEl.classList.add('flip-card-stack');
    rootEl.classList.add(isTabooCard ? 'taboo-card-stack' : 'prompt-stack');
    rootEl.innerHTML = [0, 1, 2].map(function(){
      return '<div class="flip-card"><div class="flip-card-inner"><div class="flip-card-face flip-card-back-design"></div><div class="flip-card-face flip-card-front-face"><div class="flip-card-word-text"></div></div></div></div>';
    }).join('');
    slots = Array.prototype.slice.call(rootEl.querySelectorAll('.flip-card'));
  }

  function applyDepths(remaining){
    for (var i = 0; i < slots.length; i++){
      var slot = slots[i];
      slot.classList.remove('flip-card-depth-0', 'flip-card-depth-1', 'flip-card-depth-2');
      slot.classList.add('flip-card-depth-' + i);
      slot.classList.toggle('flip-card-slot-empty', i >= remaining);
    }
  }

  function reveal(word, remaining){
    busy = false;
    var front = slots[0];
    var content = front.querySelector('.flip-card-word-text');
    if (renderContent) renderContent(content, word);
    else content.textContent = word;
    var inner = front.querySelector('.flip-card-inner');
    if (inner) inner.classList.add('is-flipped');
    applyDepths(remaining);
  }

  // swipes the current front card away (direction 'left' for skip/miss,
  // 'right' for correct), then rotates the stack so the card behind it
  // becomes the new front and flips face-up to reveal the next word
  function discard(direction, word, remaining){
    if (busy || !slots.length) return false;
    busy = true;
    if (timer){ clearTimeout(timer); timer = null; }
    var outgoing = slots[0];
    outgoing.classList.add(direction === 'left' ? 'flip-card-exit-left' : 'flip-card-exit-right');
    timer = window.setTimeout(function(){
      outgoing.classList.remove('flip-card-exit-left', 'flip-card-exit-right');
      var outgoingInner = outgoing.querySelector('.flip-card-inner');
      if (outgoingInner){
        // reset face-down instantly — otherwise it plays the flip transition
        // in reverse, visible behind the new front card
        outgoingInner.classList.add('flip-card-inner-no-transition');
        outgoingInner.classList.remove('is-flipped');
        void outgoingInner.offsetWidth;
      }
      slots.shift();
      slots.push(outgoing); // snaps straight to the back of the stack, no transition
      reveal(word, remaining);
      if (outgoingInner){
        window.requestAnimationFrame(function(){
          outgoingInner.classList.remove('flip-card-inner-no-transition');
        });
      }
      timer = null;
    }, 220);
    return true;
  }

  return { reveal: reveal, discard: discard, isBusy: function(){ return busy; } };
}
