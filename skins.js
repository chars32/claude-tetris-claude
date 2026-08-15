'use strict';

// Registro de temas visuales (skins) para el tablero de Tetris.
// Cada skin define su propia paleta de 8 colores (índices de pieza:
// I, O, T, S, Z, J, L, N), los colores de fondo/rejilla del tablero
// (uno para modo oscuro y otro para modo claro) y su propia función
// de dibujo de bloque `drawBlock(context, x, y, colorIndex, size, alpha)`.
//
// Higiene de canvas: cualquier función de dibujo que toque
// shadowBlur/shadowColor/lineWidth/globalAlpha/strokeStyle DEBE
// restaurarlos antes de retornar (usamos save()/restore()).

const SKIN_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

// Paleta de respaldo para el skin Retro, usada solo si game.js aún no
// definió la constante global COLORS (que es la fuente real de verdad).
const RETRO_FALLBACK_PALETTE = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - blue
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (acero)
];

// Fallback de rectángulo redondeado para navegadores sin ctx.roundRect().
function roundedRectPath(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const SKINS = {
  retro: {
    id: 'retro',
    label: 'Retro',
    // Usa la paleta canónica de game.js (COLORS) para mantenerse
    // pixel-idéntico al render original; cae al respaldo local si por
    // algún motivo COLORS aún no existe en el momento de dibujar.
    get palette() {
      return typeof COLORS !== 'undefined' ? COLORS : RETRO_FALLBACK_PALETTE;
    },
    boardBg: { dark: '#1a1a25', light: '#ffffff' },
    gridLine: { dark: '#22222e', light: '#dfe2f0' },
    // Idéntico al render original: bloque plano con margen de 1px
    // y una franja de brillo de 4px en la parte superior.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.palette[colorIndex];
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.restore();
    },
  },

  neon: {
    id: 'neon',
    label: 'Neón',
    palette: [
      null,
      '#00e5ff', // I
      '#ffea00', // O
      '#e040fb', // T
      '#00e676', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
      '#eceff1', // N
    ],
    boardBg: { dark: '#000000', light: '#0b0b0e' },
    gridLine: { dark: '#141419', light: '#1c1c22' },
    // Bloque saturado con resplandor (glow) mediante shadowBlur/shadowColor.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.palette[colorIndex];
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.shadowBlur = size * 0.6;
      context.shadowColor = color;
      context.fillStyle = color;
      context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      // segundo paso sin sombra para un núcleo nítido
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255,255,255,0.25)';
      context.fillRect(x * size + 2, y * size + 2, size - 4, 3);
      context.restore();
    },
  },

  pastel: {
    id: 'pastel',
    label: 'Pastel',
    palette: [
      null,
      '#a8d8ea', // I
      '#fff2b2', // O
      '#d9b8e8', // T
      '#bce8c9', // S
      '#f6b8c1', // Z
      '#b8c9f4', // J
      '#f7d3a1', // L
      '#dcdfe6', // N
    ],
    boardBg: { dark: '#2a2730', light: '#faf7fb' },
    gridLine: { dark: '#3a3642', light: '#ece7f0' },
    // Bloque suave con esquinas redondeadas.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.palette[colorIndex];
      const rx = x * size + 2;
      const ry = y * size + 2;
      const w = size - 4;
      const h = size - 4;
      const radius = Math.max(2, size * 0.2);
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(rx, ry, w, h, radius);
      } else {
        roundedRectPath(context, rx, ry, w, h, radius);
      }
      context.fill();
      context.restore();
    },
  },

  pixel: {
    id: 'pixel',
    label: 'Pixel Art',
    palette: [
      null,
      '#3ddc97', // I
      '#f4d35e', // O
      '#ee6c9d', // T
      '#5cd6c0', // S
      '#ee6c4d', // Z
      '#5b8def', // J
      '#f2a65a', // L
      '#c8ccd4', // N
    ],
    boardBg: { dark: '#141414', light: '#f5f5f0' },
    gridLine: { dark: '#242424', light: '#e0e0d8' },
    // Bloque con textura tipo dithering (cuadrícula interna en damero)
    // y borde marcado para dar aspecto de pixel art.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.palette[colorIndex];
      const px = x * size + 1;
      const py = y * size + 1;
      const s = size - 2;
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(px, py, s, s);

      const cell = Math.max(2, Math.floor(s / 6));
      context.fillStyle = 'rgba(0,0,0,0.16)';
      for (let iy = 0, row = 0; iy < s; iy += cell, row++) {
        const startX = row % 2 === 0 ? 0 : cell;
        for (let ix = startX; ix < s; ix += cell * 2) {
          const w = Math.min(cell, s - ix);
          const h = Math.min(cell, s - iy);
          if (w > 0 && h > 0) context.fillRect(px + ix, py + iy, w, h);
        }
      }

      context.strokeStyle = 'rgba(0,0,0,0.4)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
      context.restore();
    },
  },
};

function getSkin(name) {
  return SKINS[name] || SKINS[DEFAULT_SKIN];
}

function loadSkinPreference() {
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (saved && SKINS[saved]) return saved;
  } catch (err) {
    // localStorage no disponible, se ignora
  }
  return DEFAULT_SKIN;
}

function saveSkinPreference(name) {
  try {
    localStorage.setItem(SKIN_KEY, name);
  } catch (err) {
    // localStorage no disponible, se ignora
  }
}
