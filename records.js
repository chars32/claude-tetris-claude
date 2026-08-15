'use strict';

// ---- Tabla de records local ----
// Persiste el top 5 de puntuaciones y estadísticas históricas (mejor combo
// y máximo de líneas limpiadas de una vez) en localStorage.

const RECORDS_KEY = 'tetris-records';
const STATS_KEY = 'tetris-records-stats';
const MAX_RECORDS = 5;
const NAME_MAX_LENGTH = 12;
const DEFAULT_NAME = 'JUGADOR';

const startOverlay = document.getElementById('start-overlay');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const startRecordsTable = document.getElementById('start-records-table');
const startMaxCombo = document.getElementById('start-max-combo');
const startMaxLines = document.getElementById('start-max-lines');

// seguimiento del combo/líneas de la partida actual
let comboCounter = 0;
let gameMaxCombo = 0;

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(entry => entry && typeof entry.score === 'number')
      .map(entry => ({
        name: typeof entry.name === 'string' ? entry.name.slice(0, NAME_MAX_LENGTH) : DEFAULT_NAME,
        score: Number(entry.score) || 0,
        lines: Number(entry.lines) || 0,
        level: Number(entry.level) || 1,
        combo: Number(entry.combo) || 0,
        date: typeof entry.date === 'string' ? entry.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
  } catch (err) {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch (err) {
    // localStorage no disponible, se ignora
  }
}

function loadStats() {
  const fallback = { maxCombo: 0, maxLines: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      maxCombo: Number(parsed.maxCombo) || 0,
      maxLines: Number(parsed.maxLines) || 0,
    };
  } catch (err) {
    return fallback;
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    // localStorage no disponible, se ignora
  }
}

function qualifiesForTop5(score) {
  const records = loadRecords();
  if (records.length < MAX_RECORDS) return true;
  return score > records[records.length - 1].score;
}

function renderRecordsTable(container, records, highlightEntry) {
  container.textContent = '';
  if (records.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'records-empty';
    empty.textContent = 'Todavía no hay records. ¡Sé el primero!';
    container.appendChild(empty);
    return;
  }
  const table = document.createElement('table');
  table.className = 'records-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['#', 'Nombre', 'Puntos', 'Líneas', 'Nivel', 'Combo'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  records.forEach((entry, i) => {
    const row = document.createElement('tr');
    if (
      highlightEntry &&
      entry.score === highlightEntry.score &&
      entry.date === highlightEntry.date &&
      entry.name === highlightEntry.name
    ) {
      row.classList.add('records-highlight');
    }
    const cells = [
      String(i + 1),
      entry.name,
      entry.score.toLocaleString(),
      String(entry.lines),
      String(entry.level),
      String(entry.combo),
    ];
    cells.forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function updateStatsDisplay() {
  const stats = loadStats();
  if (startMaxCombo) startMaxCombo.textContent = stats.maxCombo;
  if (startMaxLines) startMaxLines.textContent = stats.maxLines;
  const gameOverMaxCombo = document.getElementById('gameover-max-combo');
  const gameOverMaxLines = document.getElementById('gameover-max-lines');
  if (gameOverMaxCombo) gameOverMaxCombo.textContent = stats.maxCombo;
  if (gameOverMaxLines) gameOverMaxLines.textContent = stats.maxLines;
}

function renderStartScreen() {
  renderRecordsTable(startRecordsTable, loadRecords());
  updateStatsDisplay();
}

// ---- Hooks invocados desde game.js ----

// Se llama una vez por cada lockPiece(), informando cuántas líneas se
// limpiaron en ese lock (0 si ninguna).
function onLinesClearedForRecords(cleared) {
  const stats = loadStats();
  let changed = false;
  if (cleared > 0) {
    comboCounter++;
    if (comboCounter > gameMaxCombo) gameMaxCombo = comboCounter;
    if (comboCounter > stats.maxCombo) {
      stats.maxCombo = comboCounter;
      changed = true;
    }
    if (cleared > stats.maxLines) {
      stats.maxLines = cleared;
      changed = true;
    }
  } else {
    comboCounter = 0;
  }
  if (changed) {
    saveStats(stats);
    updateStatsDisplay();
  }
}
window.onLinesClearedForRecords = onLinesClearedForRecords;

// Se llama al iniciar una partida nueva, para resetear el combo de la partida.
function resetGameRecordsTracking() {
  comboCounter = 0;
  gameMaxCombo = 0;
}
window.resetGameRecordsTracking = resetGameRecordsTracking;

// Se llama al terminar la partida (game over).
function onGameOverForRecords({ score, lines, level }) {
  const qualifies = qualifiesForTop5(score);
  showGameOverRecordsUI(qualifies, { score, lines, level, combo: gameMaxCombo });
}
window.onGameOverForRecords = onGameOverForRecords;

// ---- UI de records en la pantalla de game over ----

function getOrCreateGameOverContainer() {
  const overlayBox = document.querySelector('#overlay .overlay-box');
  let container = document.getElementById('gameover-records');
  if (!container) {
    container = document.createElement('div');
    container.id = 'gameover-records';
    container.className = 'records-box';
    const restartBtn = document.getElementById('restart-btn');
    overlayBox.insertBefore(container, restartBtn);
  }
  return container;
}

function buildStatsLine(stats, comboId, linesId) {
  const statsLine = document.createElement('div');
  statsLine.className = 'records-stats';

  const comboSpan = document.createElement('span');
  comboSpan.textContent = 'Mejor combo: ';
  const comboStrong = document.createElement('strong');
  comboStrong.id = comboId;
  comboStrong.textContent = String(stats.maxCombo);
  comboSpan.appendChild(comboStrong);

  const linesSpan = document.createElement('span');
  linesSpan.textContent = 'Más líneas de una vez: ';
  const linesStrong = document.createElement('strong');
  linesStrong.id = linesId;
  linesStrong.textContent = String(stats.maxLines);
  linesSpan.appendChild(linesStrong);

  statsLine.appendChild(comboSpan);
  statsLine.appendChild(linesSpan);
  return statsLine;
}

function showGameOverRecordsUI(qualifies, entry) {
  const container = getOrCreateGameOverContainer();
  container.textContent = '';

  const stats = loadStats();
  container.appendChild(buildStatsLine(stats, 'gameover-max-combo', 'gameover-max-lines'));

  if (qualifies) {
    const prompt = document.createElement('p');
    prompt.className = 'records-prompt';
    prompt.textContent = '¡Nuevo record! Ingresa tu nombre:';
    container.appendChild(prompt);

    const form = document.createElement('div');
    form.className = 'records-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'record-name-input';
    input.maxLength = NAME_MAX_LENGTH;
    input.value = DEFAULT_NAME;
    form.appendChild(input);

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.id = 'record-confirm-btn';
    confirmBtn.textContent = 'Guardar';
    form.appendChild(confirmBtn);

    container.appendChild(form);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'records-table-container';
    container.appendChild(tableContainer);
    renderRecordsTable(tableContainer, loadRecords());

    const save = () => {
      const name = (input.value || '').trim().slice(0, NAME_MAX_LENGTH) || DEFAULT_NAME;
      const newEntry = {
        name,
        score: entry.score,
        lines: entry.lines,
        level: entry.level,
        combo: entry.combo,
        date: new Date().toISOString(),
      };
      const records = loadRecords();
      records.push(newEntry);
      records.sort((a, b) => b.score - a.score);
      const trimmed = records.slice(0, MAX_RECORDS);
      saveRecords(trimmed);

      form.remove();
      prompt.remove();
      renderRecordsTable(tableContainer, trimmed, newEntry);
      renderStartScreen();
    };

    confirmBtn.addEventListener('click', save);
    input.addEventListener('keydown', e => {
      if (e.code === 'Enter') save();
    });
  } else {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'records-table-container';
    container.appendChild(tableContainer);
    renderRecordsTable(tableContainer, loadRecords());
  }
}

// ---- Reseteo de records con confirmación ----

function handleResetRecords() {
  if (resetRecordsBtn.dataset.confirming === 'true') {
    saveRecords([]);
    saveStats({ maxCombo: 0, maxLines: 0 });
    resetRecordsBtn.textContent = 'Resetear records';
    delete resetRecordsBtn.dataset.confirming;
    renderStartScreen();
  } else {
    resetRecordsBtn.dataset.confirming = 'true';
    resetRecordsBtn.textContent = '¿Seguro? Click de nuevo';
    setTimeout(() => {
      if (resetRecordsBtn.dataset.confirming === 'true') {
        delete resetRecordsBtn.dataset.confirming;
        resetRecordsBtn.textContent = 'Resetear records';
      }
    }, 4000);
  }
}

resetRecordsBtn.addEventListener('click', handleResetRecords);

playBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  init();
});

renderStartScreen();
