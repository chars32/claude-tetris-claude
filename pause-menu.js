'use strict';

// ---- Menú de pausa completo ----

const INITIAL_LEVEL_KEY = 'tetris-initial-level';
const MIN_INITIAL_LEVEL = 1;
const MAX_INITIAL_LEVEL = 15;

const pauseOverlay = document.getElementById('pause-overlay');
const pauseMainView = document.getElementById('pause-main-view');
const pauseControlsView = document.getElementById('pause-controls-view');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const pauseBackBtn = document.getElementById('pause-back-btn');
const initialLevelSelect = document.getElementById('pause-level-select');

// Rellena el <select> de nivel inicial (1-15)
for (let lvl = MIN_INITIAL_LEVEL; lvl <= MAX_INITIAL_LEVEL; lvl++) {
  const opt = document.createElement('option');
  opt.value = String(lvl);
  opt.textContent = String(lvl);
  initialLevelSelect.appendChild(opt);
}

function getInitialLevel() {
  try {
    const raw = localStorage.getItem(INITIAL_LEVEL_KEY);
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= MIN_INITIAL_LEVEL && parsed <= MAX_INITIAL_LEVEL) {
      return parsed;
    }
  } catch (err) {
    // localStorage no disponible o con datos corruptos, se ignora
  }
  return MIN_INITIAL_LEVEL;
}

function applyInitialLevel(lvl) {
  initialLevelSelect.value = String(lvl);
}

function initInitialLevel() {
  applyInitialLevel(getInitialLevel());
}

initialLevelSelect.addEventListener('change', () => {
  const lvl = parseInt(initialLevelSelect.value, 10);
  if (!Number.isInteger(lvl) || lvl < MIN_INITIAL_LEVEL || lvl > MAX_INITIAL_LEVEL) return;
  try {
    localStorage.setItem(INITIAL_LEVEL_KEY, String(lvl));
  } catch (err) {
    // almacenamiento no disponible, se ignora
  }
});

initInitialLevel();

// ---- Navegación entre vistas del menú ----

function showPauseView(view) {
  pauseMainView.classList.toggle('hidden', view !== 'main');
  pauseControlsView.classList.toggle('hidden', view !== 'controls');
}

function openPauseMenu() {
  showPauseView('main');
  pauseOverlay.classList.remove('hidden');
  pauseResumeBtn.focus();
}

function closePauseMenu() {
  pauseOverlay.classList.add('hidden');
  const active = document.activeElement;
  if (active && pauseOverlay.contains(active) && typeof active.blur === 'function') {
    active.blur();
  }
}

pauseResumeBtn.addEventListener('click', () => {
  togglePause();
});

pauseRestartBtn.addEventListener('click', () => {
  init();
  closePauseMenu();
});

pauseControlsBtn.addEventListener('click', () => {
  showPauseView('controls');
  pauseBackBtn.focus();
});

pauseBackBtn.addEventListener('click', () => {
  showPauseView('main');
  pauseResumeBtn.focus();
});

// Evita que Enter/Space sobre un botón del menú se filtren como input del
// juego (además del bloqueo por `paused` ya presente en game.js), y atrapa
// el foco con Tab dentro de la vista activa del menú.
pauseOverlay.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.stopPropagation();
  }
  if (e.code === 'Escape' && !pauseControlsView.classList.contains('hidden')) {
    // Dentro de "Ver controles", Escape vuelve a la vista principal en vez
    // de cerrar todo el menú (evita que el listener global en game.js
    // interprete el Escape como "Reanudar").
    e.stopPropagation();
    showPauseView('main');
    pauseResumeBtn.focus();
    return;
  }
  if (e.code !== 'Tab') return;

  const activeView = pauseControlsView.classList.contains('hidden') ? pauseMainView : pauseControlsView;
  const focusable = Array.from(activeView.querySelectorAll('button, select'));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

