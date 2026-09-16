// ============================================
// Nepali Racer - Resolved Stage Plan (P0 Step 1)
// ============================================
// Pure, side-effect-free helper that converts a raw stage record into a
// normalized, runtime-ready "plan". It is intentionally NOT wired into any
// game loop yet — it only normalizes configuration data.
//
// Guarantees:
//   - Does NOT mutate the input stage (returns a fresh object).
//   - Does NOT import Terrain / GameScene / EnvironmentRenderer / Collectibles.
//   - Falls back to existing project defaults (constants.js) when data is absent.
//   - Never forces non-section stages into Fast Track sections.
//   - Never produces NaN start/end values: malformed sections collapse safely
//     and emit a development-only warning.

import { PHYSICS } from '../config/constants.js';

// Existing collectible defaults mirrored from src/data/stages.js createStage
// and src/game/Collectibles.js generate(). There is no exported constant for
// these today, so they are kept here as the single fallback source.
const DEFAULT_COLLECTIBLES = Object.freeze({
  coinChance: 0.7,
  fuelChance: 0.2,
  diamondChance: 0.1
});

// Terse, standards-safe dev warning (Vite defines import.meta.env.DEV at
// build; plain Node/SSR has no import.meta.env — both are handled safely).
function devWarn(...args) {
  try {
    if (import.meta.env && import.meta.env.DEV === true) {
      // eslint-disable-next-line no-console
      console.warn('[StagePlan]', ...args);
    }
  } catch {
    /* ignore — no environment API available */
  }
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteOr(value, fallback) {
  return finite(value) ? value : fallback;
}

function stringOr(value, fallback = null) {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

// Derive a coarse semantic role from a section name for fast-track landmarks.
// This is metadata labelling only — it has no gameplay/terrain effect.
// Prefer the explicit section.role when provided.
function deriveRole(name) {
  const n = (name || '').toLowerCase();
  const tokens = [
    ['hill_cut', 'hill_cut'],
    ['tunnel_approach', 'tunnel_approach'],
    ['tunnel_exit', 'tunnel_exit'],
    ['expressway', 'expressway'],
    ['tunnel', 'tunnel'],
    ['terai', 'terai'],
    ['bridge', 'bridge'],
    ['finish', 'finish'],
    ['valley', 'start'],
    ['climb', 'hill'],
    ['hill', 'hill']
  ];
  for (const [token, role] of tokens) {
    if (n.includes(token)) return role;
  }
  return null;
}

// Normalize one section's geometry.
// Supports the following source formats:
//   { start, end }            -> used as-is
//   { start, length }         -> end = start + length
//   { end, length }           -> start = end - length
//   { length }                -> start = cursor (previous end), end = start + length
// A cursor is threaded through so length-only sections accumulate correctly.
function resolveSectionBounds(section, cursor) {
  const hasStart = finite(section.start);
  const hasLength = finite(section.length);
  const hasEnd = finite(section.end);

  if (hasStart && hasEnd) return { start: section.start, end: section.end };
  if (hasStart && hasLength) return { start: section.start, end: section.start + section.length };
  if (hasEnd && hasLength) return { start: section.end - section.length, end: section.end };
  if (hasLength) return { start: cursor, end: cursor + section.length };
  if (hasStart) return { start: section.start, end: section.start };
  if (hasEnd) return { start: section.end, end: section.end };
  return { start: cursor, end: cursor };
}

function normalizeSections(sections, terrainProfile) {
  if (!Array.isArray(sections) || sections.length === 0) return [];

  const out = [];
  let cursor = 0;

  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object') {
      devWarn(`Skipping malformed section at index ${index} (not an object).`);
      return;
    }

    const bounds = resolveSectionBounds(section, cursor);
    const id = stringOr(section.id, stringOr(section.name, `section_${index}`));
    const profile = stringOr(section.profile, terrainProfile);
    const role = stringOr(section.role, deriveRole(section.name));
    const environment = stringOr(section.environment);

    // Warn when geometry is degenerate (missing start/end/length).
    if (!finite(section.start) && !finite(section.length) && !finite(section.end)) {
      devWarn(`Section "${id}" has no start/length/end; collapsed to a zero-length segment.`);
    } else if (bounds.end < bounds.start) {
      devWarn(`Section "${id}" has a negative span; keeping normalized values as-is.`);
    }

    // Spread first, then explicit fields LAST so normalized values are
    // authoritative while all extra metadata (name, length, custom fields)
    // from the source section is preserved unchanged.
    out.push({
      ...section,
      id,
      start: bounds.start,
      end: bounds.end,
      profile,
      role,
      environment,
      _order: index
    });

    cursor = bounds.end;
  });

  return out;
}

// Build a safe terrain sub-plan from a raw stage.terrain.
function resolveTerrain(stage, envId) {
  const terrain = (stage && typeof stage.terrain === 'object') ? stage.terrain : {};
  const profile = stringOr(terrain.profile);

  return {
    profile,
    segmentWidth: finiteOr(terrain.segmentWidth, 100),
    minHeight: finiteOr(terrain.minHeight, null),
    maxHeight: finiteOr(terrain.maxHeight, null),
    jumpChance: finiteOr(terrain.jumpChance, null),
    valleyChance: finiteOr(terrain.valleyChance, null),
    sections: normalizeSections(terrain.sections, profile)
  };
}

function resolvePhysics(stage) {
  const physics = (stage && typeof stage.physics === 'object') ? stage.physics : {};
  // Fall back to the existing global gravity default; never a magic duplicate.
  return { gravity: finiteOr(physics.gravity, PHYSICS.GRAVITY) };
}

function resolveCollectibles(stage) {
  const raw = (stage && typeof stage.collectibles === 'object') ? stage.collectibles : {};
  return {
    coinChance: finiteOr(raw.coinChance, DEFAULT_COLLECTIBLES.coinChance),
    fuelChance: finiteOr(raw.fuelChance, DEFAULT_COLLECTIBLES.fuelChance),
    diamondChance: finiteOr(raw.diamondChance, DEFAULT_COLLECTIBLES.diamondChance)
  };
}

/**
 * resolveStagePlan(stage) -> normalized plan
 *
 * Converts a raw stage record into a normalized, data-driven runtime plan.
 * Never mutates the input. Safe for missing/partial input (returns a
 * degenerate-but-valid plan rather than throwing).
 */
export function resolveStagePlan(stage) {
  // Missing/empty stage -> safe empty plan (consumers check stageId later).
  if (!stage || typeof stage !== 'object') {
    devWarn('resolveStagePlan called without a valid stage object.');
    return {
      stageId: null,
      targetDistance: 0,
      environment: null,
      terrain: {
        profile: null,
        segmentWidth: 100,
        minHeight: null,
        maxHeight: null,
        jumpChance: null,
        valleyChance: null,
        sections: []
      },
      physics: { gravity: PHYSICS.GRAVITY },
      collectibles: { ...DEFAULT_COLLECTIBLES }
    };
  }

  const environment = stringOr(stage.environment);

  return {
    stageId: stringOr(stage.id),
    targetDistance: finiteOr(stage.targetDistance, finiteOr(stage.distance, 0)),
    environment,
    terrain: resolveTerrain(stage, environment),
    physics: resolvePhysics(stage),
    collectibles: resolveCollectibles(stage)
  };
}

export default resolveStagePlan;

