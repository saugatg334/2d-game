// ============================================
// Nepali Racer - Stage Visual Identity Resolver (P12)
// ============================================
// Pure, data-driven view of a stage's region-theme identity for the P12
// "stage identity" pass. Single source of truth shared by SceneryRenderer
// and qa/StageVisualIdentityHarness.mjs so the tested identity IS the
// rendered identity.
//
// Design rule (P12 Phase 3): each region entry in regionThemes carries the
// identity DATA; this resolver only reads it — no per-stage if/else branches
// in GameScene or renderers. Themes without identity data still resolve to
// the pre-P12 DEFAULT identity so every non-KTM-Valley stage renders exactly
// as before (regression-safe fallback).
//
// Plain data + pure functions only. No Phaser, no scene state, no Math.random
// — fully deterministic and unit-testable.

import { resolveRegionTheme, resolveBackgroundProfile } from '../data/regionThemes.js';

export const ROAD_MATERIALS = Object.freeze(['paved', 'dirt', 'rocky']);

// Pre-P12 identity contract (what every theme already rendered before this
// pass). Non-participating themes get EXACTLY this shape.
function defaultIdentity(id) {
  return {
    themeId: id || 'DEFAULT',
    isDefault: true,
    skyGradient: { top: '#87ceeb', bottom: '#cfe8f5' },
    farSilhouette: { kind: 'rolling-hills', jagged: 0.3, snow: null, haze: 0.1, urbanBand: null },
    midLandmarks: [
      { kind: 'temple', spacing: 4200 },
      { kind: 'bridge', spacing: 2600 },
      { kind: 'tunnel', spacing: 3400 },
      { kind: 'wall', spacing: 720 },
      { kind: 'flag', spacing: 900 }
    ],
    roadMaterial: 'dirt',
    roadFeatures: { wires: true, wireSpan: 900 },
    templeStyle: 'generic',
    groundTint: null,
    poleSpacing: 520
  };
}

// Recursively validate: every field present, finite/valid, no NaN/undefined.
export function isIdentityValid(identity) {
  if (!identity || typeof identity !== 'object') return false;
  if (typeof identity.themeId !== 'string' || identity.themeId.length === 0) return false;
  if (typeof identity.isDefault !== 'boolean') return false;
  const sky = identity.skyGradient;
  if (!sky || !isColor(sky.top) || !isColor(sky.bottom)) return false;
  const far = identity.farSilhouette;
  if (!far || typeof far.kind !== 'string' || far.kind.length === 0) return false;
  if (!isFiniteNumber(far.jagged) || far.jagged < 0 || far.jagged > 1) return false;
  if (far.haze !== null && !isFiniteNumber(far.haze)) return false;
  const mid = identity.midLandmarks;
  if (!Array.isArray(mid) || mid.length === 0) return false;
  for (const lm of mid) {
    if (!lm || typeof lm.kind !== 'string' || lm.kind.length === 0) return false;
    if (!isFiniteNumber(lm.spacing) || lm.spacing <= 0) return false;
  }
  if (!ROAD_MATERIALS.includes(identity.roadMaterial)) return false;
  const rf = identity.roadFeatures;
  if (!rf || typeof rf.wires !== 'boolean') return false;
  if (!isFiniteNumber(rf.wireSpan) || rf.wireSpan <= 0) return false;
  if (identity.templeStyle !== 'generic' && identity.templeStyle !== 'pagoda') return false;
  if (identity.groundTint !== null && !isColor(identity.groundTint)) return false;
  if (!isFiniteNumber(identity.poleSpacing) || identity.poleSpacing <= 0) return false;
  return true;
}

function isColor(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// KTM_URBAN identity (P12 pilot). Field semantics mirror BG_PROFILES.KTM_URBAN
// and REGION_THEMES.KTM_URBAN — those registries stay the style/palette
// source; this block adds only what the identity contract needs.
const IDENTITY_OVERRIDES = {
  KTM_URBAN: {
    isDefault: false,
    farSilhouette: {
      kind: 'valley-hills',     // Shivapuri/Phulchowki-style rounded valley rim
      jagged: 0.2,
      snow: null,
      haze: 0.12,
      urbanBand: { color: '#3e4a66', alpha: 0.35, height: 0.045 }
    },
    // Pagoda temple roofs + brick buildings, sparsely spaced (audit-confirmed
    // band 2200-6000m — denser than the 4200m generic default, still sparse).
    midLandmarks: [
      { kind: 'temple', spacing: 2600 },
      { kind: 'house', spacing: 3000 },
      { kind: 'wall', spacing: 720 },
      { kind: 'flag', spacing: 900 }
    ],
    roadMaterial: 'paved',
    roadFeatures: { wires: true, wireSpan: 900 },
    templeStyle: 'pagoda',
    groundTint: '#4d5a3a'
  }
};

/**
 * Blend a hex color toward a tint color by amount (0..1). Defensive: any
 * malformed input returns baseHex unchanged so Terrain's numeric fallback
 * chain keeps working exactly as before.
 * @returns {string} '#rrggbb'
 */
export function blendTint(baseHex, tintHex, amount) {
  if (!isColor(baseHex) || !isColor(tintHex)) return baseHex;
  const t = isFiniteNumber(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  const parse = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
  const b = parse(baseHex);
  const tn = parse(tintHex);
  const mix = b.map((c, i) => Math.round(c + (tn[i] - c) * t));
  return '#' + mix.map(c => c.toString(16).padStart(2, '0')).join('');
}

// P12 Phase 2 pilot gate: stages whose resolved identity is non-default.
// Generalization pass = add stage ids (or drop the gate once every region
// has authored identity data).
const PILOT_STAGE_IDS = new Set(['ktm_valley']);

/**
 * resolveStageVisualIdentity(stage) -> identity object
 *
 * Reads the stage's regionTheme (via the existing safe region-theme resolver)
 * and returns the per-theme identity data. Unknown/missing themes resolve to
 * the pre-P12 default identity; KTM_URBAN resolves the P12 pilot identity.
 * Deterministic: the same stage always yields the same object.
 *
 * P12 pilot gate: the KTM_URBAN identity currently applies ONLY to the pilot
 * stage (ktm_valley). Sibling stages of the same region (e.g. khokana) and
 * every other stage keep the pre-P12 default identity until their region's
 * rollout pass — generalization just widens PILOT_STAGE_IDS per region.
 *
 * @param {object} stage raw stage record (uses .id and .regionTheme only)
 * @returns {object} identity (validated shape, see isIdentityValid)
 */
export function resolveStageVisualIdentity(stage) {
  const stageId = (stage && typeof stage.id === 'string') ? stage.id : '';
  const themeId = (stage && typeof stage.regionTheme === 'string' && stage.regionTheme !== '')
    ? stage.regionTheme
    : 'DEFAULT';
  // Per-frame callers (Terrain.render) memoize here: bounded by stage count,
  // deterministic, zero allocation after the first call per stage.
  const cacheKey = stageId + '|' + themeId;
  const cached = IDENTITY_CACHE.get(cacheKey);
  if (cached) return cached;

  const theme = resolveRegionTheme(themeId); // safe fallback inside
  const override = IDENTITY_OVERRIDES[themeId];
  if (!override || !PILOT_STAGE_IDS.has(stageId)) {
    const def = defaultIdentity(theme.id);
    IDENTITY_CACHE.set(cacheKey, def);
    return def;
  }

  // Sky + far-layer style come from the existing P7E-4 BG_PROFILES entry
  // (single source of truth — no duplicated palette values here).
  const bg = resolveBackgroundProfile(themeId);
  const identity = {
    themeId: theme.id,
    isDefault: false,
    skyGradient: { top: bg.sky.top, bottom: bg.sky.bottom },
    farSilhouette: {
      kind: override.farSilhouette.kind,
      jagged: bg.jagged,
      snow: bg.snow ? { ...bg.snow } : null,
      haze: bg.haze,
      urbanBand: override.farSilhouette.urbanBand ? { ...override.farSilhouette.urbanBand } : null
    },
    midLandmarks: override.midLandmarks.map(lm => ({ ...lm })),
    roadMaterial: override.roadMaterial,
    roadFeatures: { ...defaultIdentity(theme.id).roadFeatures, ...override.roadFeatures },
    templeStyle: override.templeStyle,
    groundTint: override.groundTint,
    poleSpacing: 520
  };
  IDENTITY_CACHE.set(cacheKey, identity);
  return identity;
}

// Bounded memo cache (one entry per stage, max 50 in current data).
const IDENTITY_CACHE = new Map();

export default resolveStageVisualIdentity;
