// ============================================
// Nepali Racer - Region Theme Registry (P7E-2)
// ============================================
// Centralized, data-driven visual identity for each Nepal region. Plain data
// only — no rendering logic lives here. Terrain.js consumes the resolved
// theme; StagePlan.resolveStagePlan() exposes it via plan.visual.
//
// Color fields are '#rrggbb' strings (same convention as stages.js themes).
// All density fields are 0..1 multipliers consumed by later phases
// (P7E-3 scenery). roadFeatures feed Terrain.roadStyleFor().
// P7E-4 adds resolveBackgroundProfile(): compact per-theme parallax data
// (sky gradient, 3 silhouette layers, snow caps, cloud density response)
// consumed by EnvironmentRenderer's normal-stage background branch.
//
// FAST_TRACK is included as a schema-complete identity entry for mapping
// completeness, but the Fast Track runtime path is intentionally untouched:
// its visuals are owned by EnvironmentRenderer and the legacy Terrain dirt
// branch. Only normal stages consume this registry.

export const DEFAULT_THEME_ID = 'DEFAULT';

// ============================================
// P7E-4: Per-theme background/parallax profiles (compact data, deterministic).
// Consumed by EnvironmentRenderer's normal-stage parallax branch. Plain data
// only — no rendering logic. Every theme id MUST have an entry (BG_PROFILE
// below falls back to the DEFAULT profile defensively, never to undefined).
//
// Field meaning:
//   sky:            2-stop vertical gradient (top / horizon) in the same
//                   '#rrggbb' convention as the rest of the registry.
//   far / mid / near: layer silhouette fill colors, far -> near.
//   ridge:          vertical silhouette band for the 3 mountain/hill layers:
//                   [baseY, crestY] as fractions of viewport height (0=top).
//   jagged:         0=rounded rolling hills, 1=sharp angular peaks (drives the
//                   deterministic ridge waveform + snow-cap suitability).
//   snow:           null = no snow caps, otherwise { color, y (frac of crest
//                   height), alpha } for themes with distant snowy peaks.
//   haze:           alpha of the atmospheric band drawn just above the far
//                   horizon (0 disables).
//   parallax:       horizontal scroll factors [clouds, far, mid, near] —
//                   strictly increasing (farther layers move slower).
//   horizonFill:    fraction of the viewport height the sky gradient covers
//                   (the silhouette layers always end at the viewport bottom,
//                   matching the road-side ground fill below them).
//
// NOTE (road contrast): every profile keeps the horizon band light/hazy and
// the silhouettes mid-tone, so the dark asphalt band and its light edge
// markings from Terrain.renderNormalRoad stay readable in all themes.
const BG_PROFILES = {
  DEFAULT: {
    sky: { top: '#87ceeb', bottom: '#cfe8f5' },
    far: '#7a8fb5', mid: '#5f7d8c', near: '#4a7c59',
    ridge: { far: [0.62, 0.44], mid: [0.72, 0.56], near: [0.84, 0.68] },
    jagged: 0.3, snow: null, haze: 0.1,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.24, near: 0.42 },
    horizonFill: 0.72
  },

  // Kathmandu Valley: blue/purple urban sky, layered valley-rim hills, NO
  // dominating snow wall; distant urban/valley silhouette band.
  KTM_URBAN: {
    sky: { top: '#6f7fb8', bottom: '#c9b8d8' },
    far: '#8a95b8', mid: '#64749a', near: '#54703f',
    ridge: { far: [0.66, 0.50], mid: [0.76, 0.60], near: [0.87, 0.72] },
    jagged: 0.2, snow: null, haze: 0.12,
    parallax: { clouds: 0.05, far: 0.11, mid: 0.23, near: 0.40 },
    horizonFill: 0.70,
    urbanSilhouette: { color: '#3e4a66', alpha: 0.35, height: 0.045 }
  },

  // East-West Highway: broad flat warm horizon, distant low hills, sparse
  // clouds, open landscape (layers kept low and gentle).
  TERAI_EW: {
    sky: { top: '#9cc3d9', bottom: '#f2e2b8' },
    far: '#a8a878', mid: '#8fa06b', near: '#6b8e3f',
    ridge: { far: [0.76, 0.66], mid: [0.83, 0.74], near: [0.90, 0.82] },
    jagged: 0.1, snow: null, haze: 0.14,
    parallax: { clouds: 0.05, far: 0.10, mid: 0.20, near: 0.36 },
    horizonFill: 0.80
  },

  // Pokhara: rounded lush green hills + prominent distant mountain
  // silhouettes with occasional snow peaks; deep valley layering.
  POKHARA: {
    sky: { top: '#8fc3e8', bottom: '#d8ecf5' },
    far: '#b8c4d4', mid: '#5f8a6b', near: '#3f7a45',
    ridge: { far: [0.60, 0.40], mid: [0.73, 0.56], near: [0.86, 0.70] },
    jagged: 0.55, snow: { color: '#f4f8fb', y: 0.30, alpha: 0.85 },
    haze: 0.12,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.26, near: 0.44 },
    horizonFill: 0.70
  },

  // Mustang: dry brown/red angular layers, sharp rugged silhouettes,
  // high-altitude sparse clouds.
  MUSTANG: {
    sky: { top: '#a8c4d4', bottom: '#e8d8b8' },
    far: '#9a7a60', mid: '#8a6b55', near: '#7a5540',
    ridge: { far: [0.60, 0.42], mid: [0.72, 0.54], near: [0.85, 0.68] },
    jagged: 0.9, snow: null, haze: 0.08,
    parallax: { clouds: 0.05, far: 0.13, mid: 0.27, near: 0.46 },
    horizonFill: 0.70
  },

  // Annapurna: large snow-capped peaks behind lower dark rocky mountains,
  // cold sky palette.
  ANNAPURNA: {
    sky: { top: '#a5c8e0', bottom: '#e2eef5' },
    far: '#dfe8f0', mid: '#6b7a85', near: '#55606b',
    ridge: { far: [0.55, 0.34], mid: [0.72, 0.56], near: [0.86, 0.70] },
    jagged: 0.85, snow: { color: '#ffffff', y: 0.24, alpha: 0.95 },
    haze: 0.10,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.26, near: 0.44 },
    horizonFill: 0.68
  },

  // Makwanpur: dense green forested hill layers, no Himalayan wall.
  MAKWANPUR: {
    sky: { top: '#92bed8', bottom: '#d4e8dc' },
    far: '#5a7a95', mid: '#3f6b45', near: '#2f5a35',
    ridge: { far: [0.64, 0.48], mid: [0.75, 0.58], near: [0.87, 0.72] },
    jagged: 0.25, snow: null, haze: 0.12,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.25, near: 0.42 },
    horizonFill: 0.72
  },

  // River corridor: steep layered gorge hills, deep valley feeling, rocky
  // silhouettes.
  RIVER_CORRIDOR: {
    sky: { top: '#9cc0d8', bottom: '#d8e4dc' },
    far: '#7a8a95', mid: '#55704a', near: '#44583c',
    ridge: { far: [0.58, 0.40], mid: [0.71, 0.52], near: [0.84, 0.66] },
    jagged: 0.6, snow: null, haze: 0.10,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.26, near: 0.45 },
    horizonFill: 0.70
  },

  // Chitwan: flat/low horizon, dense jungle silhouette, warm green air.
  CHITWAN: {
    sky: { top: '#a5c9b8', bottom: '#e2ecd2' },
    far: '#5a8a6b', mid: '#35603a', near: '#24502a',
    ridge: { far: [0.78, 0.68], mid: [0.85, 0.76], near: [0.92, 0.84] },
    jagged: 0.15, snow: null, haze: 0.14,
    parallax: { clouds: 0.05, far: 0.10, mid: 0.21, near: 0.38 },
    horizonFill: 0.82
  },

  // Madhesh Terai: broad flat horizon, warm/golden atmosphere, distant low
  // hills, open sky.
  TERAI_MADHESH: {
    sky: { top: '#a8cbd4', bottom: '#f2dcae' },
    far: '#9a9a70', mid: '#82794f', near: '#6b8a45',
    ridge: { far: [0.78, 0.67], mid: [0.85, 0.76], near: [0.91, 0.83] },
    jagged: 0.1, snow: null, haze: 0.16,
    parallax: { clouds: 0.05, far: 0.10, mid: 0.20, near: 0.36 },
    horizonFill: 0.80
  },

  // BP Highway / Sindhuli: layered winding hill silhouettes, green/brown
  // palette, moderate depth.
  BP_SINDHULI: {
    sky: { top: '#90bcd5', bottom: '#dce8da' },
    far: '#5f7d92', mid: '#4a6b48', near: '#3a6b40',
    ridge: { far: [0.64, 0.46], mid: [0.75, 0.57], near: [0.87, 0.71] },
    jagged: 0.45, snow: null, haze: 0.10,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.25, near: 0.43 },
    horizonFill: 0.72
  },

  // Ilam / Kanyam: multiple lush green hill layers + mist/cloud accents.
  TEA_ILAM: {
    sky: { top: '#b5ccd4', bottom: '#e4efe6' },
    far: '#8aa5b5', mid: '#558a55', near: '#3f7a45',
    ridge: { far: [0.68, 0.52], mid: [0.78, 0.62], near: [0.88, 0.74] },
    jagged: 0.15, snow: null, haze: 0.18,
    parallax: { clouds: 0.05, far: 0.11, mid: 0.23, near: 0.40 },
    horizonFill: 0.74
  },

  // Lumbini / Butwal: warm plains, low hills transitioning upward, open sky.
  LUMBINI_WEST: {
    sky: { top: '#a5c6cf', bottom: '#eedfc0' },
    far: '#9a8f6b', mid: '#7a8a55', near: '#5f8a45',
    ridge: { far: [0.75, 0.63], mid: [0.82, 0.71], near: [0.90, 0.80] },
    jagged: 0.12, snow: null, haze: 0.15,
    parallax: { clouds: 0.05, far: 0.10, mid: 0.21, near: 0.38 },
    horizonFill: 0.80
  },

  // Palpa / Tansen: steep layered green hills, deep valley feeling.
  PALPA_TANSEN: {
    sky: { top: '#8fb8d4', bottom: '#d8e6da' },
    far: '#55708a', mid: '#3f6346', near: '#33603a',
    ridge: { far: [0.58, 0.40], mid: [0.71, 0.50], near: [0.84, 0.64] },
    jagged: 0.4, snow: null, haze: 0.10,
    parallax: { clouds: 0.05, far: 0.13, mid: 0.27, near: 0.46 },
    horizonFill: 0.68
  },

  // Kagbeni: dry red/brown canyon-like cliffs, dramatic high-altitude valley,
  // sparse clouds.
  KAGBENI: {
    sky: { top: '#b0c8d8', bottom: '#e8dcc4' },
    far: '#8a6b55', mid: '#7d5f4d', near: '#6b5240',
    ridge: { far: [0.58, 0.38], mid: [0.71, 0.50], near: [0.84, 0.62] },
    jagged: 0.95, snow: null, haze: 0.08,
    parallax: { clouds: 0.05, far: 0.14, mid: 0.28, near: 0.48 },
    horizonFill: 0.68
  },

  // Karnali: rugged dark mountain chains, deep valley, sparse vegetation.
  KARNALI: {
    sky: { top: '#9fbfd4', bottom: '#d8e2e0' },
    far: '#6b7a88', mid: '#556458', near: '#4a6048',
    ridge: { far: [0.58, 0.38], mid: [0.71, 0.51], near: [0.84, 0.65] },
    jagged: 0.8, snow: { color: '#eef4f6', y: 0.18, alpha: 0.5 },
    haze: 0.09,
    parallax: { clouds: 0.05, far: 0.13, mid: 0.27, near: 0.47 },
    horizonFill: 0.68
  },

  // Fast Track identity entry: the Fast Track runtime path is owned by the
  // existing EnvironmentRenderer and never consumes BG_PROFILES. Provided for
  // registry completeness only (same policy as REGION_THEMES.FAST_TRACK).
  FAST_TRACK: {
    sky: { top: '#85c1e9', bottom: '#d4e6f5' },
    far: '#a9cce3', mid: '#5e8a6b', near: '#1e8449',
    ridge: { far: [0.66, 0.50], mid: [0.76, 0.60], near: [0.87, 0.72] },
    jagged: 0.3, snow: null, haze: 0.1,
    parallax: { clouds: 0.05, far: 0.12, mid: 0.24, near: 0.42 },
    horizonFill: 0.72
  }
};

/**
 * Resolve a theme's P7E-4 background profile. Deterministic: the same theme id
 * always returns the same object. Defensive fallback to the DEFAULT profile
 * keeps malformed ids from ever reaching the renderer.
 * @param {string} themeId
 * @returns {object} profile from BG_PROFILES (never null/undefined)
 */
export function resolveBackgroundProfile(themeId) {
  if (typeof themeId === 'string' && Object.prototype.hasOwnProperty.call(BG_PROFILES, themeId)) {
    return BG_PROFILES[themeId];
  }
  return BG_PROFILES.DEFAULT;
}

export { BG_PROFILES };

export const REGION_THEMES = {
  // Safe fallback (pre-7E-2 rolling-hills look)
  DEFAULT: {
    id: 'DEFAULT',
    description: 'Generic green mid-hill fallback identity.',
    road: { width: 24, asphalt: '#343c43', inner: '#465059', shoulder: '#5f5142', edge: '#dfe6ea', center: '#f4d03f' },
    ground: { base: '#87a05a', accent: '#5aa02c' },
    vegetation: { type: 'broadleaf', density: 0.5, primary: '#3d6b35', secondary: '#5d8a4a' },
    background: { sky: '#87ceeb', farMountain: '#7a8fb5', nearMountain: '#4a7c59', cloudDensity: 0.3 },
    scenery: { trees: 0.2, houses: 0.1, farms: 0.1, rocks: 0.1, poles: 0.1, signs: 0.1 },
    roadFeatures: { guardrail: false, reflectors: false, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Kathmandu Valley / Khokana — dense urban/rural-edge, darker asphalt
  KTM_URBAN: {
    id: 'KTM_URBAN',
    description: 'Kathmandu Valley: dense urban edge, utility poles, valley-rim mountains.',
    road: { width: 26, asphalt: '#23282e', inner: '#333a41', shoulder: '#4a4a48', edge: '#e8edf0', center: '#f4d03f' },
    ground: { base: '#6b7a4f', accent: '#4f7a3a' },
    vegetation: { type: 'broadleaf', density: 0.6, primary: '#3d6b35', secondary: '#5d8a4a' },
    background: { sky: '#8fb3cc', farMountain: '#6b7fa3', nearMountain: '#54703f', cloudDensity: 0.4 },
    scenery: { trees: 0.3, houses: 0.8, farms: 0.2, rocks: 0, poles: 0.9, signs: 0.6 },
    roadFeatures: { guardrail: false, reflectors: true, centerMarking: 'full', shoulderStyle: 'paved' }
  },

  // East-West Highway / Itahari — wide warm Terai highway
  TERAI_EW: {
    id: 'TERAI_EW',
    description: 'East-West Highway: wide warm Terai highway, sparse large trees.',
    road: { width: 30, asphalt: '#3a4046', inner: '#4a5158', shoulder: '#6a5b44', edge: '#f0f2e9', center: '#f4d03f' },
    ground: { base: '#c2a35c', accent: '#8fae4a' },
    vegetation: { type: 'broadleaf', density: 0.35, primary: '#4d7c3f', secondary: '#6b9a4f' },
    background: { sky: '#9cc3d9', farMountain: '#8fa06b', nearMountain: '#6b8e3f', cloudDensity: 0.3 },
    scenery: { trees: 0.3, houses: 0.3, farms: 0.7, rocks: 0, poles: 0.5, signs: 0.7 },
    roadFeatures: { guardrail: false, reflectors: true, centerMarking: 'full', shoulderStyle: 'paved' }
  },

  // Pokhara / Sarangkot / Begnas — lush green lake valley
  POKHARA: {
    id: 'POKHARA',
    description: 'Pokhara: lush green hills, dense vegetation, distant snow silhouettes.',
    road: { width: 24, asphalt: '#343c43', inner: '#465059', shoulder: '#5f5142', edge: '#dfe6ea', center: '#f4d03f' },
    ground: { base: '#7a9a4f', accent: '#4a8a3a' },
    vegetation: { type: 'broadleaf', density: 0.8, primary: '#2e6b30', secondary: '#4a8a45' },
    background: { sky: '#8fc3e8', farMountain: '#b8c4d4', nearMountain: '#3f7a45', cloudDensity: 0.5 },
    scenery: { trees: 0.7, houses: 0.3, farms: 0.2, rocks: 0.1, poles: 0.3, signs: 0.3, river: 0.1 },
    roadFeatures: { guardrail: false, reflectors: false, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Mustang / Jomsom / Beni — dry brown/red, exposed rock, strong rails
  MUSTANG: {
    id: 'MUSTANG',
    description: 'Mustang: dry red-brown desert mountains, sparse dust-blasted vegetation.',
    road: { width: 20, asphalt: '#4a4038', inner: '#5a4f45', shoulder: '#6b5a4a', edge: '#d8cfc0', center: '#e8c56a' },
    ground: { base: '#a06b45', accent: '#b8874f' },
    vegetation: { type: 'sparse', density: 0.15, primary: '#7a6b3f', secondary: '#8a7a4f' },
    background: { sky: '#a8c4d4', farMountain: '#8a6b55', nearMountain: '#7a5540', cloudDensity: 0.1 },
    scenery: { trees: 0.05, houses: 0.1, farms: 0, rocks: 0.8, poles: 0.1, signs: 0.2 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'minimal', shoulderStyle: 'gravel' }
  },

  // Himalayan Route / Manang / Annapurna — high cold alpine
  ANNAPURNA: {
    id: 'ANNAPURNA',
    description: 'Annapurna: high snow-capped silhouettes, rocky alpine terrain.',
    road: { width: 20, asphalt: '#3a4148', inner: '#48525a', shoulder: '#5a5a55', edge: '#eef3f6', center: '#f4d03f' },
    ground: { base: '#8a8a80', accent: '#6b8a5a' },
    vegetation: { type: 'pine', density: 0.2, primary: '#3a5a45', secondary: '#55705a' },
    background: { sky: '#a5c8e0', farMountain: '#e8eef4', nearMountain: '#6b7a85', cloudDensity: 0.4 },
    scenery: { trees: 0.2, houses: 0.05, farms: 0, rocks: 0.6, poles: 0.1, signs: 0.3 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'minimal', shoulderStyle: 'gravel' }
  },

  // Hetauda / Tribhuvan / Makwanpur / KTM-Pokhara — forested winding hills
  MAKWANPUR: {
    id: 'MAKWANPUR',
    description: 'Makwanpur: dense forested hills, winding mountain highway.',
    road: { width: 24, asphalt: '#343c43', inner: '#45505a', shoulder: '#4f5a42', edge: '#dfe6ea', center: '#f4d03f' },
    ground: { base: '#5a7a45', accent: '#3d6b30' },
    vegetation: { type: 'broadleaf', density: 0.85, primary: '#2a5a28', secondary: '#3d7a35' },
    background: { sky: '#92bed8', farMountain: '#5a7a95', nearMountain: '#2f5a35', cloudDensity: 0.45 },
    scenery: { trees: 0.8, houses: 0.2, farms: 0, rocks: 0.2, poles: 0.2, signs: 0.3 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Muglin / Prithvi / Narayangadh-Muglin / Khurkot — river gorge corridor
  RIVER_CORRIDOR: {
    id: 'RIVER_CORRIDOR',
    description: 'River corridor: rocky gorge slopes, guardrails, water below.',
    road: { width: 22, asphalt: '#3a4045', inner: '#4a525a', shoulder: '#66625a', edge: '#e5e9ec', center: '#f4d03f' },
    ground: { base: '#7a7a6b', accent: '#5a7a4a' },
    vegetation: { type: 'pine', density: 0.4, primary: '#3f6b40', secondary: '#5a8a50' },
    background: { sky: '#9cc0d8', farMountain: '#7a8a95', nearMountain: '#55704a', cloudDensity: 0.45 },
    scenery: { trees: 0.5, houses: 0.1, farms: 0, rocks: 0.7, poles: 0.2, signs: 0.4, river: 0.3 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Chitwan / Narayangadh / Bharatpur — jungle
  CHITWAN: {
    id: 'CHITWAN',
    description: 'Chitwan: dense jungle, tall trees, flat green road corridor.',
    road: { width: 24, asphalt: '#3a4043', inner: '#4a5350', shoulder: '#4f5a40', edge: '#e5ece5', center: '#f4d03f' },
    ground: { base: '#4f6b3a', accent: '#35542a' },
    vegetation: { type: 'broadleaf', density: 0.95, primary: '#1f4a22', secondary: '#2f6b30' },
    background: { sky: '#a5c9b8', farMountain: '#5a8a6b', nearMountain: '#24502a', cloudDensity: 0.5 },
    scenery: { trees: 0.9, houses: 0.2, farms: 0, rocks: 0.05, poles: 0.2, signs: 0.3 },
    roadFeatures: { guardrail: false, reflectors: false, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Bardibas / Janakpur / Birgunj / Biratnagar / Birtamod — hot flat Madhesh
  TERAI_MADHESH: {
    id: 'TERAI_MADHESH',
    description: 'Madhesh Terai: hot flat farmland, villages, warm ground palette.',
    road: { width: 28, asphalt: '#3d4248', inner: '#4d545a', shoulder: '#6b5c45', edge: '#eef0e5', center: '#f4d03f' },
    ground: { base: '#b89a5c', accent: '#a08a3f' },
    vegetation: { type: 'broadleaf', density: 0.3, primary: '#5a7c3a', secondary: '#7a9a4a' },
    background: { sky: '#a8cbd4', farMountain: '#9a9a70', nearMountain: '#6b8a45', cloudDensity: 0.25 },
    scenery: { trees: 0.25, houses: 0.5, farms: 0.9, rocks: 0, poles: 0.4, signs: 0.5 },
    roadFeatures: { guardrail: false, reflectors: true, centerMarking: 'full', shoulderStyle: 'paved' }
  },

  // BP Highway / Sindhuli — layered green/brown winding mountain road
  BP_SINDHULI: {
    id: 'BP_SINDHULI',
    description: 'BP Highway / Sindhuli: layered hills, cliffs, retaining walls.',
    road: { width: 22, asphalt: '#363d44', inner: '#465059', shoulder: '#57604a', edge: '#e0e7ea', center: '#f4d03f' },
    ground: { base: '#6b8a4f', accent: '#8a6b45' },
    vegetation: { type: 'broadleaf', density: 0.7, primary: '#35663a', secondary: '#6b7a45' },
    background: { sky: '#90bcd5', farMountain: '#5f7d92', nearMountain: '#3a6b40', cloudDensity: 0.5 },
    scenery: { trees: 0.6, houses: 0.1, farms: 0, rocks: 0.4, poles: 0.2, signs: 0.5 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Ilam / Kanyam — tea gardens, misty rolling green
  TEA_ILAM: {
    id: 'TEA_ILAM',
    description: 'Ilam / Kanyam: tea gardens, misty rolling hills, lush green rows.',
    road: { width: 22, asphalt: '#353c42', inner: '#455057', shoulder: '#4f6b45', edge: '#e3ebe4', center: '#f4d03f' },
    ground: { base: '#4f8a45', accent: '#3a7a38' },
    vegetation: { type: 'tea', density: 0.9, primary: '#2e7a35', secondary: '#4f9a4a' },
    background: { sky: '#b5ccd4', farMountain: '#8aa5b5', nearMountain: '#3f7a45', cloudDensity: 0.7 },
    scenery: { trees: 0.3, houses: 0.2, farms: 0.5, rocks: 0.05, poles: 0.2, signs: 0.3 },
    roadFeatures: { guardrail: false, reflectors: false, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Lumbini / Butwal — warm plains transitioning to hills
  LUMBINI_WEST: {
    id: 'LUMBINI_WEST',
    description: 'Lumbini / Butwal: warm plains, fields, village roadside vegetation.',
    road: { width: 26, asphalt: '#3d4247', inner: '#4d555b', shoulder: '#6b5e48', edge: '#eef0e6', center: '#f4d03f' },
    ground: { base: '#b09458', accent: '#7fa045' },
    vegetation: { type: 'broadleaf', density: 0.4, primary: '#557c3a', secondary: '#7a9a4a' },
    background: { sky: '#a5c6cf', farMountain: '#9a8f6b', nearMountain: '#5f8a45', cloudDensity: 0.3 },
    scenery: { trees: 0.3, houses: 0.4, farms: 0.8, rocks: 0, poles: 0.4, signs: 0.4 },
    roadFeatures: { guardrail: false, reflectors: true, centerMarking: 'full', shoulderStyle: 'paved' }
  },

  // Palpa / Tansen / Gorkha / Bandipur / Tanahun / Dharan / Dhankuta — steep green ridge roads
  PALPA_TANSEN: {
    id: 'PALPA_TANSEN',
    description: 'Palpa / Tansen: steep green hills, stone walls, ridge-town roads.',
    road: { width: 22, asphalt: '#343b42', inner: '#444e56', shoulder: '#54604a', edge: '#e0e7ea', center: '#f4d03f' },
    ground: { base: '#5f7c48', accent: '#8a6b45' },
    vegetation: { type: 'broadleaf', density: 0.75, primary: '#2e6335', secondary: '#4a7a40' },
    background: { sky: '#8fb8d4', farMountain: '#55708a', nearMountain: '#33603a', cloudDensity: 0.45 },
    scenery: { trees: 0.6, houses: 0.3, farms: 0.1, rocks: 0.3, poles: 0.25, signs: 0.4 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'rural', shoulderStyle: 'gravel' }
  },

  // Kagbeni — high-altitude dry valley, red rock formations
  KAGBENI: {
    id: 'KAGBENI',
    description: 'Kagbeni: high dry Himalayan valley, red rock, sparse settlement.',
    road: { width: 18, asphalt: '#4a423a', inner: '#5a5148', shoulder: '#6b6055', edge: '#ddd6c8', center: '#e0b568' },
    ground: { base: '#96754f', accent: '#b08a5a' },
    vegetation: { type: 'sparse', density: 0.1, primary: '#8a7a4f', secondary: '#9a8a5f' },
    background: { sky: '#b0c8d8', farMountain: '#7d5f4d', nearMountain: '#6b5240', cloudDensity: 0.1 },
    scenery: { trees: 0.05, houses: 0.15, farms: 0, rocks: 0.7, poles: 0.1, signs: 0.2 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'minimal', shoulderStyle: 'gravel' }
  },

  // Karnali Highway / Jumla — remote rugged mountain road
  KARNALI: {
    id: 'KARNALI',
    description: 'Karnali / Jumla: rugged remote mountain highway, strong guardrails.',
    road: { width: 20, asphalt: '#3f4348', inner: '#4f555c', shoulder: '#5f5c52', edge: '#e5e8ea', center: '#f4d03f' },
    ground: { base: '#75705f', accent: '#5f7a4a' },
    vegetation: { type: 'pine', density: 0.2, primary: '#3a5a40', secondary: '#557050' },
    background: { sky: '#9fbfd4', farMountain: '#6b7a88', nearMountain: '#4a6048', cloudDensity: 0.35 },
    scenery: { trees: 0.25, houses: 0.1, farms: 0, rocks: 0.6, poles: 0.15, signs: 0.3 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'minimal', shoulderStyle: 'gravel' }
  },

  // Fast Track identity entry (schema completeness ONLY — the Fast Track
  // runtime path is EnvironmentRenderer-owned and never consumes this).
  FAST_TRACK: {
    id: 'FAST_TRACK',
    description: 'Kathmandu-Nijgadh expressway identity (runtime untouched).',
    road: { width: 22, asphalt: '#1a252f', inner: '#1a252f', shoulder: '#34495e', edge: '#ffffff', center: '#f4d03f' },
    ground: { base: '#2c3e50', accent: '#1e8449' },
    vegetation: { type: 'broadleaf', density: 0.3, primary: '#1e8449', secondary: '#2e8b57' },
    background: { sky: '#85c1e9', farMountain: '#2980b9', nearMountain: '#1e8449', cloudDensity: 0.3 },
    scenery: { trees: 0.2, houses: 0.1, farms: 0, rocks: 0, poles: 0.4, signs: 0.8 },
    roadFeatures: { guardrail: true, reflectors: true, centerMarking: 'full', shoulderStyle: 'paved' }
  }
};

/**
 * Resolve a stage's regionTheme id to a registry theme, with a safe fallback.
 * Deterministic: the same id always returns the same object.
 * @param {string} id
 * @returns {object} a theme from REGION_THEMES (never null/undefined)
 */
export function resolveRegionTheme(id) {
  if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(REGION_THEMES, id)) {
    return REGION_THEMES[id];
  }
  return REGION_THEMES[DEFAULT_THEME_ID];
}

export default REGION_THEMES;
