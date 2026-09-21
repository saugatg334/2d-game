// ============================================
// Nepali Racer - Website Entry
// ============================================
// Landing-page behaviors PLUS the PLAY NOW -> Phaser bridge. This module calls
// the idempotent startGame() from src/game/bootstrap.js; it never constructs a
// Phaser.Game itself. Landing previews are rendered from existing (read-only)
// data so the site always reflects the real roster without duplicating it.

import { startGame } from '../game/bootstrap.js';
import { vehicles } from '../data/vehicles.js';
import { characters } from '../data/characters.js';
import { stages } from '../data/stages.js';

// Curated "attractive selection" for the landing previews (reuses real data ids).
const FEATURED_VEHICLES = [
  'nepal_racer', 'himalayan_rally', 'tempo', 'sajha_bus', 'dirt_bike', 'mountain_suv'
];
const FEATURED_CHARACTERS = [
  'saugat_legendary', 'ktm_rider', 'mountain_rider', 'explorer', 'prabin', 'default_rider'
];
const FEATURED_STAGES = [
  'ktm_valley', 'himalayan_route', 'mustang_road', 'manang'
];

const ESC = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

// Return the listed items when present; otherwise fall back to the first N.
function pick(items, ids) {
  const found = [];
  for (const id of ids) {
    const item = items.find((it) => it.id === id);
    if (item) found.push(item);
  }
  return found.length ? found : items.slice(0, ids.length);
}

function mediaHTML(item, glyph) {
  const src = item && (item.thumbnail || (item.assets && item.assets.thumbnail));
  if (src) {
    return `<img class="site-preview__img" loading="lazy" src="${esc(src)}" alt="${esc(item.name)}" />`;
  }
  return `<div class="site-preview__img site-preview__img--alt">${glyph}</div>`;
}

function cardHTML(item, glyph, sub) {
  return (
    `<div class="site-preview__card">` +
      `<div class="site-preview__media">${mediaHTML(item, glyph)}</div>` +
      `<p class="site-preview__name">${esc(item.name)}</p>` +
      `<p class="site-preview__sub">${esc(sub)}</p>` +
    `</div>`
  );
}

function renderGrid(id, items, glyph, subFn) {
  const grid = document.getElementById(id);
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach((item) => grid.insertAdjacentHTML('beforeend', cardHTML(item, glyph, subFn(item))));
}

function setupNav() {
  const toggle = document.getElementById('site-nav-toggle');
  const links = document.getElementById('site-nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  Array.from(links.querySelectorAll('a')).forEach((a) =>
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

function setGameView(active) {
  const body = document.body;
  if (active) {
    body.classList.add('is-game');
  } else {
    body.classList.remove('is-game');
  }

  // Keep Phaser input in sync so the hidden game never reacts to landing keys.
  // This only toggles Phaser's own input managers — no scene is touched.
  const game = window.game;
  if (game && game.input) {
    try {
      const setInput = (manager, state) => {
        if (manager && typeof manager.setEnabled === 'function') manager.setEnabled(!!state);
      };
      setInput(game.input.keyboard, active);
      setInput(game.input.mouse, active);
      setInput(game.input.touch, active);
    } catch (e) {
      console.warn('Unable to toggle Phaser input state.', e);
    }
  }
}

function playNow(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();

  // startGame() is idempotent: it returns window.game if already created, and is
  // the ONLY place Phaser.Game is constructed.
  const game = startGame();
  if (!game) {
    console.error('Nepali Racer failed to start. See the error overlay for details.');
    return;
  }

  // Close the mobile nav (if open) and switch to the game view.
  const links = document.getElementById('site-nav-links');
  if (links) links.classList.remove('is-open');
  setGameView(true);
}

function backToWebsite() {
  // Do NOT destroy/recreate Phaser — just hide the shell and re-enable the
  // landing page. window.game (and startGame) keep the single instance.
  setGameView(false);
}

function setupPlayNow() {
  Array.from(document.querySelectorAll('[data-action="play"]')).forEach((el) =>
    el.addEventListener('click', playNow)
  );
  const back = document.getElementById('site-back-btn');
  if (back) back.addEventListener('click', backToWebsite);
}

function setCopyrightYear() {
  const el = document.getElementById('site-copyright-year');
  if (el) el.textContent = String(new Date().getFullYear());
}

function init() {
  renderGrid('vehicles-preview-grid', pick(vehicles, FEATURED_VEHICLES), '🚗', (v) => v.category);
  renderGrid('characters-preview-grid', pick(characters, FEATURED_CHARACTERS), '👤', (c) => `${c.category} · ${c.region}`);
  renderGrid('stages-preview-grid', pick(stages, FEATURED_STAGES), '🗺️', (s) => `${s.environment} · ${s.distance}m`);
  setupNav();
  setupPlayNow();
  setCopyrightYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}